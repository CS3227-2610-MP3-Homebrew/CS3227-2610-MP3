-- OWN-03 owner menu. Reads stay session-bound RLS reads. Mutations go only
-- through public.owner_menu_write, which derives the verified owner/workspace,
-- repeats strict validation for direct Data API callers and applies the
-- boundary's check order under the café row lock. No insert/delete grant is
-- added for authenticated callers.

-- OWN-03.9: the existing direct name-update grant also requires an approved café,
-- suspended or not. The café lookup runs under the caller's own cafes RLS.
drop policy menu_owner_update on public.menu_items;
create policy menu_owner_update on public.menu_items for update to authenticated
  using (private.cafe_permission(cafe_id, array['owner']::public.app_role[])
    and exists (select 1 from public.cafes c where c.id = cafe_id and c.application_state = 'approved'))
  with check (private.cafe_permission(cafe_id, array['owner']::public.app_role[])
    and exists (select 1 from public.cafes c where c.id = cafe_id and c.application_state = 'approved'));

-- Per-café duplicate key: all ECMAScript whitespace removed, Unicode lowercase.
create function private.menu_name_key(value text) returns text
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(value, U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]', '', 'g') collate "und-x-icu");
$$;

create function private.menu_item_json(m public.menu_items) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('itemId', m.id, 'name', m.name, 'drinkType', m.drink_type,
    'priceCents', m.price_cents, 'soldOut', m.sold_out);
$$;

-- GET /api/owner/menu: up to 21 rows so the caller can derive hasNextPage.
-- Names sort by Unicode code point (UTF-8 bytes under "C"), then reference.
create function public.owner_menu(p_page bigint) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare actor public.profiles; c public.cafes;
begin
  actor := private.owner_actor();
  if p_page is null or p_page < 1 or p_page > 9007199254740991 then return jsonb_build_object('error', 'INVALID_REQUEST'); end if;
  select * into c from public.cafes where owner_id = actor.id and workspace_id = actor.workspace_id order by created_at, id limit 1;
  if c.id is null then return jsonb_build_object('items', '[]'::jsonb); end if;
  return jsonb_build_object('items', coalesce((select jsonb_agg(private.menu_item_json(m) order by m.name collate "C", m.id)
    from (select * from public.menu_items where cafe_id = c.id order by name collate "C", id
      offset (p_page - 1) * 20 limit 21) m), '[]'::jsonb));
end;
$$;

-- POST create/save/remove. Check order: validation, no café, application state,
-- item scope, suspension version, then duplicate name.
create function public.owner_menu_write(p_action text, p_item_ref text, p_input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor public.profiles; c public.cafes; m public.menu_items; fields text[]; optional text[] := array[]::text[];
begin
  actor := private.owner_actor();
  fields := case p_action
    when 'create' then array['name', 'drinkType', 'priceCents', 'expectedSuspensionVersion']
    when 'save' then array['name', 'drinkType', 'priceCents', 'soldOut', 'expectedSuspensionVersion']
    when 'remove' then array['expectedSuspensionVersion'] end;
  if p_action = 'create' then optional := array['soldOut']; end if;
  if fields is null or jsonb_typeof(p_input) is distinct from 'object'
    or not (p_input ?& fields)
    or (p_input - fields - optional) <> '{}'::jsonb
    or not private.owner_version_valid(p_input->'expectedSuspensionVersion')
    or (p_action <> 'create' and p_item_ref is null)
    or (p_action <> 'remove' and not coalesce(
      private.owner_text_valid(p_input->'name', 2, 100)
      and private.menu_name_key(p_input->>'name') <> ''
      and jsonb_typeof(p_input->'drinkType') = 'string'
      and (p_input->>'drinkType') in ('coffee', 'matcha', 'tea', 'chocolate', 'juice', 'other')
      and jsonb_typeof(p_input->'priceCents') = 'number'
      and (p_input->>'priceCents') ~ '^[1-9][0-9]{0,6}$'
      and (p_input->>'priceCents')::integer <= 1000000
      and (not (p_input ? 'soldOut') or jsonb_typeof(p_input->'soldOut') = 'boolean'), false)) then
    return jsonb_build_object('error', 'INVALID_REQUEST');
  end if;
  -- The café row lock serializes menu mutations with each other and with
  -- ADM-01 decisions and ADM-02 suspension.
  select * into c from public.cafes where owner_id = actor.id and workspace_id = actor.workspace_id order by created_at, id limit 1 for update;
  if c.id is null then return jsonb_build_object('error', 'NOT_FOUND'); end if;
  if c.application_state <> 'approved' then return jsonb_build_object('error', 'STATE_CONFLICT', 'approval', true); end if;
  if p_action <> 'create' then
    select * into m from public.menu_items where cafe_id = c.id and id::text = p_item_ref for update;
    if m.id is null then return jsonb_build_object('error', 'NOT_FOUND'); end if;
  end if;
  if c.suspension_version <> (p_input->>'expectedSuspensionVersion')::numeric then
    return jsonb_build_object('error', 'STATE_CONFLICT', 'suspension', true);
  end if;
  if p_action = 'remove' then
    -- Order lines keep item_ref and snapshots; only the live reference clears.
    delete from public.menu_items where id = m.id;
    return jsonb_build_object('removed', true);
  end if;
  if exists (select 1 from public.menu_items o where o.cafe_id = c.id and o.id is distinct from m.id
      and private.menu_name_key(o.name) = private.menu_name_key(p_input->>'name')) then
    return jsonb_build_object('error', 'STATE_CONFLICT');
  end if;
  if p_action = 'create' then
    insert into public.menu_items(cafe_id, name, drink_type, price_cents, sold_out)
      values (c.id, p_input->>'name', p_input->>'drinkType', (p_input->>'priceCents')::integer,
        coalesce((p_input->>'soldOut')::boolean, false))
      returning * into m;
  else
    update public.menu_items set name = p_input->>'name', drink_type = p_input->>'drinkType',
        price_cents = (p_input->>'priceCents')::integer, sold_out = (p_input->>'soldOut')::boolean
      where id = m.id returning * into m;
  end if;
  return jsonb_build_object('item', private.menu_item_json(m));
end;
$$;

revoke all on function private.menu_name_key(text), private.menu_item_json(public.menu_items)
  from public, anon, authenticated, service_role;
-- The invoker read needs the item projection.
grant execute on function private.menu_item_json(public.menu_items) to authenticated;
revoke all on function public.owner_menu(bigint), public.owner_menu_write(text, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.owner_menu(bigint), public.owner_menu_write(text, text, jsonb) to authenticated;
