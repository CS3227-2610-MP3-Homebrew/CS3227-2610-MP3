-- Customer purchases extend the existing T-29 states and suspension writer.
-- A missing legacy profile name is a specified account-setup conflict, never
-- an email/invented-name fallback. Registration capture belongs to SYS-01.
alter table public.profiles add column name text;
alter table public.orders
  add column pickup_at timestamptz not null default now(),
  add column cafe_name text not null default '',
  add column customer_name text,
  add column total_cents bigint not null default 0 check (total_cents between 0 and 9007199254740991),
  add column currency text not null default 'SGD' check (currency='SGD'),
  add column accepted_at timestamptz,
  add column ready_at timestamptz,
  add column collected_at timestamptz,
  add column rejected_at timestamptz,
  add column rejection_reason text,
  add column submission_key uuid,
  add column submission_content jsonb;
create unique index orders_customer_submission on public.orders(customer_id,submission_key) where submission_key is not null;
create index orders_customer_history on public.orders(customer_id,placed_at desc,id);
alter table public.order_items
  add column item_ref uuid,
  add column name text not null default '',
  add column quantity integer not null default 1 check (quantity between 1 and 20),
  add column unit_price_cents bigint not null default 0 check (unit_price_cents between 0 and 9007199254740991),
  add column line_total_cents bigint not null default 0 check (line_total_cents between 0 and 9007199254740991);
update public.order_items set item_ref=menu_item_id;
-- Keep the original item reference and snapshots if the live menu row is removed.
-- The nullable live FK still rejects every non-null orphan/cross-cafe reference.
alter table public.order_items alter column menu_item_id drop not null;
alter table public.order_items drop constraint order_items_menu_item_id_cafe_id_fkey;
alter table public.order_items add constraint order_items_menu_item_id_cafe_id_fkey
  foreign key(menu_item_id,cafe_id) references public.menu_items(id,cafe_id) on delete set null (menu_item_id);
create function private.order_item_reference() returns trigger language plpgsql set search_path='' as $$
begin new.item_ref := coalesce(new.item_ref,new.menu_item_id); return new; end;
$$;
revoke all on function private.order_item_reference() from public,anon,authenticated,service_role;
create trigger order_item_reference before insert on public.order_items for each row execute function private.order_item_reference();

-- Mutation functions independently derive actor, role and workspace, including
-- direct Data API RPC callers. No raw domain-write grant is added.
create function private.order_customer() returns public.profiles language plpgsql stable security definer set search_path='' as $$
declare actor public.profiles;
begin
  select * into actor from public.profiles where id=(select auth.uid()) and role='customer';
  if actor.id is null then raise insufficient_privilege using message='Customer access required'; end if;
  return actor;
end;
$$;
revoke all on function private.order_customer() from public,anon,authenticated,service_role;
grant execute on function private.order_customer() to authenticated;

create function private.order_json(o public.orders) returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('orderId',o.id,'cafeId',o.cafe_id,'cafeName',o.cafe_name,
    'placedAt',o.placed_at,'pickupAt',o.pickup_at,'state',o.state,
    'items',coalesce((select jsonb_agg(jsonb_build_object('itemId',coalesce(i.item_ref,i.menu_item_id),
      'name',i.name,'quantity',i.quantity,'unitPriceCents',i.unit_price_cents,'lineTotalCents',i.line_total_cents)
      order by coalesce(i.item_ref,i.menu_item_id)) from public.order_items i where i.order_id=o.id),'[]'::jsonb),
    'totalCents',o.total_cents,'currency',o.currency,'cancellationReason',o.cancellation_reason,
    'rejectionReason',case when o.state='rejected' then o.rejection_reason else null end,
    'acceptedAt',o.accepted_at,'readyAt',o.ready_at,'collectedAt',o.collected_at,'rejectedAt',o.rejected_at,'cancelledAt',o.cancelled_at);
$$;
revoke all on function private.order_json(public.orders) from public,anon,authenticated,service_role;
grant execute on function private.order_json(public.orders) to authenticated;

-- Authoritative transactional slot validation. This matches pickup.ts's
-- calendar/continuous-interval rule, with the database clock under the cafe lock.
create function private.order_pickup_slots(cafe uuid, at_time timestamptz) returns setof timestamptz
language sql stable security invoker set search_path='' as $$
  with dates as (
    select (at_time at time zone 'Asia/Singapore')::date + n as d from generate_series(-8,14) n
  ), intervals as (
    select (d+h.opens_at) at time zone 'Asia/Singapore' as a,
      (d+h.closes_at+case when h.closes_next_day then interval '1 day' else interval '0' end) at time zone 'Asia/Singapore' as b
    from dates join public.opening_hours h on h.cafe_id=cafe and h.weekday=extract(isodow from d)
  ), previous as (
    select *, max(b) over(order by a,b rows between unbounded preceding and 1 preceding) as prior_end from intervals
  ), groups as (
    select *, sum(case when prior_end is null or a>prior_end then 1 else 0 end) over(order by a,b) as g from previous
  ), merged as (select min(a) as a,max(b) as b from groups group by g),
  slots as (
    select generate_series(((at_time at time zone 'Asia/Singapore')::date::timestamp at time zone 'Asia/Singapore'),
      (((at_time at time zone 'Asia/Singapore')::date+7)::timestamp at time zone 'Asia/Singapore')-interval '15 minutes',interval '15 minutes') as t
  ) select t from slots where t>=at_time+interval '15 minutes' and exists (
    select 1 from merged,public.cafes c where c.id=cafe and t>=a and t<b and t<=b-make_interval(mins=>c.pickup_cutoff_minutes)
  ) order by t;
$$;
revoke all on function private.order_pickup_slots(uuid,timestamptz) from public,anon,authenticated,service_role;

-- Ordinary reads remain SECURITY INVOKER and session-bound RLS. Retained order
-- reads deliberately do not join publicly eligible cafe rows.
create function public.customer_order_history(p_page bigint,p_order_ref text default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare actor public.profiles; o public.orders; result jsonb;
begin
  actor:=private.order_customer();
  if p_page is null or p_page<1 or p_page>9007199254740991 then return jsonb_build_object('error','INVALID_REQUEST'); end if;
  if p_order_ref is not null then
    if char_length(p_order_ref) not between 1 and 128 then return jsonb_build_object('error','INVALID_REQUEST'); end if;
    select * into o from public.orders where id::text=p_order_ref and customer_id=actor.id;
    if o.id is null then return jsonb_build_object('error','NOT_FOUND'); end if;
    return jsonb_build_object('order',private.order_json(o));
  end if;
  -- NUMERIC avoids bigint overflow for the maximum safe page; huge pages are empty.
  select coalesce(jsonb_agg(private.order_json(t.o) order by t.placed_at desc,t.id),'[]'::jsonb) into result from (
    select target as o,target.placed_at,target.id from public.orders target where customer_id=actor.id
      order by target.placed_at desc,target.id limit 21 offset least((p_page::numeric-1)*20,9223372036854775807)::bigint
  ) t;
  return jsonb_build_object('items',result);
end;
$$;
create function public.customer_pickup_source(p_cafe_ref text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare actor public.profiles; c public.cafes; result jsonb;
begin
  actor:=private.order_customer();
  select * into c from public.cafes where id::text=p_cafe_ref and workspace_id=actor.workspace_id
    and application_state='approved' and not suspended;
  if c.id is null then return jsonb_build_object('error','NOT_FOUND'); end if;
  select jsonb_build_object('now',statement_timestamp(),'cutoffMinutes',c.pickup_cutoff_minutes,
    'hours',coalesce(jsonb_agg(jsonb_build_object('weekday',h.weekday,'opensAt',to_char(h.opens_at,'HH24:MI'),
      'closesAt',to_char(h.closes_at,'HH24:MI'),'closesNextDay',h.closes_next_day)),'[]'::jsonb)) into result
    from public.opening_hours h where cafe_id=c.id;
  return result;
end;
$$;

create function public.create_customer_order(p_order jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; c public.cafes; existing public.orders; created public.orders;
  pickup timestamptz; event_time timestamptz; item jsonb; m public.menu_items; name_snapshot text;
  content jsonb; item_set jsonb; total bigint:=0; key uuid;
begin
  actor:=private.order_customer();
  -- Repeat strict shape/type/length validation at the directly callable RPC.
  if jsonb_typeof(p_order) is distinct from 'object' or not (p_order ?& array['cafeId','pickupAt','items','expectedTotalCents','submissionKey'])
    or (p_order-array['cafeId','pickupAt','items','expectedTotalCents','submissionKey'])<>'{}'::jsonb then
    return jsonb_build_object('error','INVALID_REQUEST');
  end if;
  if jsonb_typeof(p_order->'cafeId') is distinct from 'string' or char_length(p_order->>'cafeId') not between 1 and 128
    or jsonb_typeof(p_order->'pickupAt') is distinct from 'string' or (p_order->>'pickupAt') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(\.0+)?Z$'
    or jsonb_typeof(p_order->'submissionKey') is distinct from 'string' or (p_order->>'submissionKey') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(p_order->'expectedTotalCents') is distinct from 'number'
    or jsonb_typeof(p_order->'items') is distinct from 'array' then return jsonb_build_object('error','INVALID_REQUEST'); end if;
  if (p_order->>'expectedTotalCents')::numeric not between 0 and 9007199254740991
    or mod((p_order->>'expectedTotalCents')::numeric,1)<>0 or jsonb_array_length(p_order->'items') not between 1 and 20 then
    return jsonb_build_object('error','INVALID_REQUEST'); end if;
  begin pickup:=(p_order->>'pickupAt')::timestamptz; key:=(p_order->>'submissionKey')::uuid;
  exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then return jsonb_build_object('error','INVALID_REQUEST'); end;
  for item in select value from jsonb_array_elements(p_order->'items') loop
    if jsonb_typeof(item) is distinct from 'object' or not (item ?& array['itemId','quantity']) or (item-array['itemId','quantity'])<>'{}'::jsonb
      or jsonb_typeof(item->'itemId') is distinct from 'string' or char_length(item->>'itemId') not between 1 and 128
      or jsonb_typeof(item->'quantity') is distinct from 'number' then return jsonb_build_object('error','INVALID_REQUEST'); end if;
    if (item->>'quantity')::numeric not between 1 and 20 or mod((item->>'quantity')::numeric,1)<>0 then return jsonb_build_object('error','INVALID_REQUEST'); end if;
  end loop;
  if (select count(distinct value->>'itemId') from jsonb_array_elements(p_order->'items'))<>jsonb_array_length(p_order->'items') then return jsonb_build_object('error','INVALID_REQUEST'); end if;
  select jsonb_agg(value order by (value->>'itemId') collate "C") into item_set from jsonb_array_elements(p_order->'items');
  content:=jsonb_build_object('cafeId',p_order->>'cafeId','pickupAt',to_char(pickup at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'items',item_set,'expectedTotalCents',p_order->'expectedTotalCents');
  -- Same-actor key races serialize before either inspecting or recording the key.
  perform pg_advisory_xact_lock(hashtextextended(actor.id::text||':'||key::text,0));
  select o.* into existing from public.orders o join public.cafes cafe on cafe.id=o.cafe_id
    where o.customer_id=actor.id and o.submission_key=key and cafe.workspace_id=actor.workspace_id;
  if existing.id is not null then
    if existing.submission_content<>content then return jsonb_build_object('error','STATE_CONFLICT'); end if;
    return jsonb_build_object('order',private.order_json(existing),'replayed',true);
  end if;
  -- T-29's suspension rendezvous: cafe first, then its orders/items. Recheck
  -- eligibility after acquiring the lock; never implement a second suspension writer.
  select * into c from public.cafes where id::text=p_order->>'cafeId' and workspace_id=actor.workspace_id for update;
  if c.id is null or c.application_state<>'approved' or c.suspended then return jsonb_build_object('error','NOT_FOUND'); end if;
  perform id from public.opening_hours where cafe_id=c.id order by id for share;
  perform id from public.menu_items where cafe_id=c.id and id::text in (select value->>'itemId' from jsonb_array_elements(item_set)) order by id for share;
  select name into name_snapshot from public.profiles where id=actor.id and role='customer' and workspace_id=actor.workspace_id for share;
  -- Take the clock after potentially waiting for source locks. A request must
  -- not preserve an earlier lead-time decision while a menu/profile write waits.
  event_time:=clock_timestamp();
  if mod(extract(epoch from pickup),900)<>0 or pickup<event_time+interval '15 minutes'
    or (pickup at time zone 'Asia/Singapore')::date<(event_time at time zone 'Asia/Singapore')::date
    or (pickup at time zone 'Asia/Singapore')::date>(event_time at time zone 'Asia/Singapore')::date+6 then return jsonb_build_object('error','INVALID_REQUEST'); end if;
  if not exists(select 1 from private.order_pickup_slots(c.id,event_time) s where s=pickup) then return jsonb_build_object('error','STATE_CONFLICT'); end if;
  for item in select value from jsonb_array_elements(item_set) loop
    select * into m from public.menu_items where id::text=item->>'itemId' and cafe_id=c.id;
    if m.id is null then return jsonb_build_object('error','NOT_FOUND'); end if;
    if m.sold_out then return jsonb_build_object('error','STATE_CONFLICT'); end if;
    total:=total+m.price_cents::bigint*(item->>'quantity')::integer;
  end loop;
  if total<>(p_order->>'expectedTotalCents')::bigint then return jsonb_build_object('error','STATE_CONFLICT'); end if;
  if name_snapshot is null or name_snapshot<>btrim(name_snapshot,U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') or char_length(name_snapshot) not between 2 and 100 then
    return jsonb_build_object('error','STATE_CONFLICT','accountName',true);
  end if;
  insert into public.orders(cafe_id,customer_id,state,cafe_name,customer_name,pickup_at,placed_at,total_cents,currency,submission_key,submission_content)
    values(c.id,actor.id,'pending',c.name,name_snapshot,pickup,event_time,total,'SGD',key,content) returning * into created;
  insert into public.order_items(order_id,cafe_id,menu_item_id,item_ref,name,quantity,unit_price_cents,line_total_cents)
    select created.id,c.id,live.id,live.id,live.name,(i->>'quantity')::integer,live.price_cents,live.price_cents::bigint*(i->>'quantity')::integer
      from jsonb_array_elements(item_set) i join public.menu_items live on live.id::text=i->>'itemId' and live.cafe_id=c.id;
  return jsonb_build_object('order',private.order_json(created),'replayed',false);
end;
$$;

create function public.cancel_customer_order(p_order_ref text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; o public.orders; cafe uuid;
begin
  actor:=private.order_customer();
  if p_order_ref is null or char_length(p_order_ref) not between 1 and 128 then return jsonb_build_object('error','INVALID_REQUEST'); end if;
  select target.cafe_id into cafe from public.orders target join public.cafes c on c.id=target.cafe_id
    where target.id::text=p_order_ref and target.customer_id=actor.id and c.workspace_id=actor.workspace_id;
  if cafe is null then return jsonb_build_object('error','NOT_FOUND'); end if;
  perform id from public.cafes where id=cafe for update;
  select target.* into o from public.orders target join public.cafes c on c.id=target.cafe_id
    where target.id::text=p_order_ref and target.customer_id=actor.id and c.workspace_id=actor.workspace_id for update of target;
  if o.id is null then return jsonb_build_object('error','NOT_FOUND'); end if;
  if o.state<>'pending' then return jsonb_build_object('error','STATE_CONFLICT'); end if;
  update public.orders set state='cancelled',cancellation_reason=null,cancelled_at=clock_timestamp() where id=o.id returning * into o;
  return jsonb_build_object('order',private.order_json(o));
end;
$$;
revoke all on function public.customer_order_history(bigint,text),public.customer_pickup_source(text),public.create_customer_order(jsonb),public.cancel_customer_order(text) from public,anon,authenticated,service_role;
grant execute on function public.customer_order_history(bigint,text),public.customer_pickup_source(text),public.create_customer_order(jsonb),public.cancel_customer_order(text) to authenticated;
