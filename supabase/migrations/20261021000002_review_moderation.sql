-- Review display fields and a separate, permanent domain-action ledger.
-- Match ECMAScript trim() for nonblankness without changing stored strings.
create function private.moderation_nonblank(value text) returns boolean
language sql immutable strict set search_path = '' as $$
  select btrim(value, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') <> '';
$$;
revoke all on function private.moderation_nonblank(text) from public,anon,authenticated,service_role;
alter table public.cafes add column name text not null default '';
alter table public.reviews
  add column rating integer not null default 1 check (rating between 1 and 5),
  add column text text not null default 'Review' check (char_length(text) between 1 and 1000 and private.moderation_nonblank(text)),
  add column submitted_at timestamptz not null default now();

create table public.admin_audit_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  admin_id uuid not null,
  action text not null check (action in ('approve','reject','suspend','un-suspend','keep','hide','restore')),
  target_type text not null check (target_type in ('review','cafe')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 300 and private.moderation_nonblank(reason)),
  created_at timestamptz not null default clock_timestamp(),
  foreign key (admin_id, workspace_id) references public.profiles(id, workspace_id),
  check ((target_type = 'review') = (action in ('keep','hide','restore')))
);
alter table public.admin_audit_entries enable row level security;
grant select on public.admin_audit_entries to authenticated;
create policy admin_audit_read on public.admin_audit_entries for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.role = 'admin' and p.workspace_id = admin_audit_entries.workspace_id));
create index admin_audit_page on public.admin_audit_entries(workspace_id, created_at desc, id);
create index admin_audit_action_page on public.admin_audit_entries(workspace_id, action, created_at desc, id);
create index reviews_queue on public.reviews(moderation_state, submitted_at, id);

create function private.preserve_review() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Reviews are immutable'; end if;
  if (new.id,new.order_id,new.customer_id,new.rating,new.text,new.submitted_at)
    is distinct from (old.id,old.order_id,old.customer_id,old.rating,old.text,old.submitted_at) then
    raise exception 'Review content is immutable';
  end if;
  return new;
end;
$$;
create trigger preserve_review before update or delete on public.reviews
  for each row execute function private.preserve_review();
create function private.preserve_admin_audit() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'Admin history is append-only'; end;
$$;
create trigger preserve_admin_audit before update or delete on public.admin_audit_entries
  for each row execute function private.preserve_admin_audit();

-- Every exposed operation derives role and workspace from the session, never arguments.
create function private.moderation_admin() returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare actor public.profiles;
begin
  select * into actor from public.profiles where id = (select auth.uid()) and role = 'admin';
  if actor.id is null then raise insufficient_privilege using message = 'Admin required'; end if;
  return actor;
end;
$$;

create function public.moderate_review(p_review_ref text, p_action text, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor public.profiles; target public.reviews; next_state public.review_moderation_state;
begin
  actor := private.moderation_admin();
  if p_review_ref is null or char_length(p_review_ref) not between 1 and 128
    or p_action is null or p_action not in ('keep','hide','restore')
    or p_reason is null or char_length(p_reason) not between 1 and 300 or not private.moderation_nonblank(p_reason) then
    return jsonb_build_object('error','INVALID_REQUEST');
  end if;
  select r.* into target from public.reviews r join public.orders o on o.id = r.order_id
    join public.cafes c on c.id = o.cafe_id
    where r.id::text = p_review_ref and c.workspace_id = actor.workspace_id for update of r;
  if target.id is null then return jsonb_build_object('error','NOT_FOUND'); end if;
  next_state := case
    when p_action = 'keep' and target.moderation_state = 'pending' then 'kept'::public.review_moderation_state
    when p_action = 'hide' and target.moderation_state in ('pending','kept') then 'hidden'::public.review_moderation_state
    when p_action = 'restore' and target.moderation_state = 'hidden' then 'kept'::public.review_moderation_state
    else null end;
  if next_state is null then
    return jsonb_build_object('error','STATE_CONFLICT','currentState',target.moderation_state);
  end if;
  update public.reviews set moderation_state = next_state where id = target.id;
  insert into public.admin_audit_entries(workspace_id,admin_id,action,target_type,target_id,reason)
    values (actor.workspace_id,actor.id,p_action,'review',target.id,p_reason);
  return jsonb_build_object('moderationState',next_state);
end;
$$;

create function public.admin_review_queue(p_state text, p_page integer, p_size integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor public.profiles; result jsonb;
begin
  actor := private.moderation_admin();
  if p_state is null or p_state not in ('pending','kept','hidden') or p_page is null or p_page < 1
    or p_size is null or p_size not between 1 and 20 then raise exception 'Invalid queue'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.submitted_at,t.id),'[]') into result from (
    select r.id,r.rating,r.text,r.submitted_at,r.moderation_state,c.name as cafe_name
    from public.reviews r join public.orders o on o.id = r.order_id join public.cafes c on c.id = o.cafe_id
    where c.workspace_id = actor.workspace_id and r.moderation_state::text = p_state
    order by r.submitted_at,r.id limit p_size + 1 offset (p_page::bigint - 1) * p_size
  ) t;
  return result;
end;
$$;

create function public.admin_audit_page(p_action text, p_page integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor public.profiles; result jsonb;
begin
  actor := private.moderation_admin();
  if p_page is null or p_page < 1 or p_action is null
    or p_action not in ('all','approve','reject','suspend','un-suspend','keep','hide','restore') then
    raise exception 'Invalid audit page';
  end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id),'[]') into result from (
    select a.id,a.created_at,u.email as admin_email,a.action,a.target_type,a.target_id,a.reason,c.name as cafe_name
    from public.admin_audit_entries a
    join public.profiles p on p.id = a.admin_id and p.workspace_id = a.workspace_id and p.role = 'admin'
    join auth.users u on u.id = p.id
    left join public.reviews r on a.target_type = 'review' and r.id = a.target_id
    left join public.orders o on o.id = r.order_id
    join public.cafes c on c.id = case when a.target_type = 'cafe' then a.target_id else o.cafe_id end
      and c.workspace_id = a.workspace_id
    where a.workspace_id = actor.workspace_id and (p_action = 'all' or a.action = p_action)
    order by a.created_at desc,a.id limit 51 offset (p_page::bigint - 1) * 50
  ) t;
  return result;
end;
$$;
revoke all on function private.preserve_review(), private.preserve_admin_audit(), private.moderation_admin() from public,anon,authenticated,service_role;
revoke all on function public.moderate_review(text,text,text), public.admin_review_queue(text,integer,integer), public.admin_audit_page(text,integer) from public,anon,authenticated,service_role;
grant execute on function public.moderate_review(text,text,text), public.admin_review_queue(text,integer,integer), public.admin_audit_page(text,integer) to authenticated;
