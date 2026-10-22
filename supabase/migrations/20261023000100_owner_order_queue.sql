-- OWN-05 owner queue. Reads stay SECURITY INVOKER under session-bound RLS;
-- transitions use the T-29 rendezvous (cafe lock, then order) shared with
-- suspension and Customer cancellation. No raw owner order write is granted.
create function private.order_owner() returns public.profiles language plpgsql stable security definer set search_path='' as $$
declare actor public.profiles;
begin
  select * into actor from public.profiles where id=(select auth.uid()) and role='owner';
  if actor.id is null then raise insufficient_privilege using message='Owner access required'; end if;
  return actor;
end;
$$;
revoke all on function private.order_owner() from public,anon,authenticated,service_role;
grant execute on function private.order_owner() to authenticated;

create function private.owner_order_json(o public.orders) returns jsonb language sql stable security invoker set search_path='' as $$
  select private.order_json(o)||jsonb_build_object('customerName',coalesce(o.customer_name,''));
$$;
revoke all on function private.owner_order_json(public.orders) from public,anon,authenticated,service_role;
grant execute on function private.owner_order_json(public.orders) to authenticated;

create function public.owner_order_queue(p_view text,p_filter text,p_page bigint) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare actor public.profiles; selected public.order_state[]; result jsonb;
begin
  actor:=private.order_owner();
  if p_page is null or p_page<1 or p_page>9007199254740991 then return jsonb_build_object('error','INVALID_REQUEST'); end if;
  if p_view='active' and p_filter='all' then selected:=array['pending','accepted','ready']::public.order_state[];
  elsif p_view='active' and p_filter in ('pending','accepted','ready') then selected:=array[p_filter::public.order_state];
  elsif p_view='history' and p_filter='all' then selected:=array['cancelled','rejected','collected']::public.order_state[];
  elsif p_view='history' and p_filter in ('cancelled','rejected','collected') then selected:=array[p_filter::public.order_state];
  else return jsonb_build_object('error','INVALID_REQUEST'); end if;
  -- orders_read RLS limits an owner to its own cafes in its workspace,
  -- including suspended ones. No-cafe owners receive an empty page.
  select coalesce(jsonb_agg(private.owner_order_json(t.o) order by t.pickup_at,t.placed_at,t.id),'[]'::jsonb) into result from (
    select target as o,target.pickup_at,target.placed_at,target.id from public.orders target
      where target.state=any(selected)
      order by target.pickup_at,target.placed_at,target.id limit 11 offset least((p_page::numeric-1)*10,9223372036854775807)::bigint
  ) t;
  return jsonb_build_object('items',result,'hasCafe',exists(select 1 from public.cafes c where c.owner_id=actor.id and c.workspace_id=actor.workspace_id));
end;
$$;

create function public.owner_order_action(p_order_ref text,p_action text,p_reason text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; o public.orders; cafe uuid; reason text; event_time timestamptz;
  -- ECMAScript WhiteSpace and LineTerminator code points.
  ws constant text:=E'[\\t\\n\\x0b\\f\\r    -     　﻿]';
begin
  actor:=private.order_owner();
  if p_order_ref is null or char_length(p_order_ref) not between 1 and 128 or p_action is null
    or p_action not in ('accept','reject','ready','collect') then return jsonb_build_object('error','INVALID_REQUEST'); end if;
  if p_action='reject' then
    reason:=regexp_replace(regexp_replace(coalesce(p_reason,''),'^'||ws||'+',''),ws||'+$','');
    if reason='' or array_length(regexp_split_to_array(reason,ws||'+'),1)>100 then return jsonb_build_object('error','INVALID_REQUEST'); end if;
  elsif p_reason is not null then return jsonb_build_object('error','INVALID_REQUEST');
  end if;
  select target.cafe_id into cafe from public.orders target join public.cafes c on c.id=target.cafe_id
    where target.id::text=p_order_ref and c.owner_id=actor.id and c.workspace_id=actor.workspace_id;
  if cafe is null then return jsonb_build_object('error','NOT_FOUND'); end if;
  perform id from public.cafes where id=cafe for update;
  select target.* into o from public.orders target join public.cafes c on c.id=target.cafe_id
    where target.id::text=p_order_ref and c.owner_id=actor.id and c.workspace_id=actor.workspace_id for update of target;
  if o.id is null then return jsonb_build_object('error','NOT_FOUND'); end if;
  -- Parenthesised: PL/pgSQL ends an IF condition at the first bare THEN.
  if o.state<>(case p_action when 'accept' then 'pending' when 'reject' then 'pending' when 'ready' then 'accepted' else 'ready' end)::public.order_state then
    return jsonb_build_object('error','STATE_CONFLICT');
  end if;
  event_time:=clock_timestamp();
  if p_action='accept' then update public.orders set state='accepted',accepted_at=event_time where id=o.id returning * into o;
  elsif p_action='reject' then update public.orders set state='rejected',rejected_at=event_time,rejection_reason=reason where id=o.id returning * into o;
  elsif p_action='ready' then update public.orders set state='ready',ready_at=event_time where id=o.id returning * into o;
  else update public.orders set state='collected',collected_at=event_time where id=o.id returning * into o;
  end if;
  return jsonb_build_object('order',private.owner_order_json(o));
end;
$$;
revoke all on function public.owner_order_queue(text,text,bigint),public.owner_order_action(text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.owner_order_queue(text,text,bigint),public.owner_order_action(text,text,text) to authenticated;
