-- ADM-01/ADM-02 consume the merged owner application and order vocabulary.
-- Submission/settings and fulfilment writers remain owned by their story pairs.
alter table public.cafes
  add column description text not null default '' check (char_length(description) <= 500),
  add column area text not null default 'Central' check (area in ('Central','North','South','East','West')),
  add column pickup_address text not null default '' check (char_length(pickup_address) <= 200),
  add column submitted_at timestamptz not null default now(),
  add column pickup_cutoff_minutes integer not null default 15 check (pickup_cutoff_minutes between 0 and 180),
  add column suspension_version bigint not null default 0 check (suspension_version between 0 and 9007199254740991);
alter table public.opening_hours
  add column weekday integer not null default 1 check (weekday between 1 and 7),
  add column closes_at time without time zone not null default '17:00',
  add column closes_next_day boolean not null default false;

create type public.order_state as enum ('pending','accepted','ready','collected','rejected','cancelled');
alter table public.orders
  add column state public.order_state not null default 'pending',
  add column cancellation_reason text check (cancellation_reason = 'Cafe is suspended'),
  add column cancelled_at timestamptz;

-- A customer-readable cafe row must never contain an Admin's private reason.
-- Owner and workspace Admin reads use this separately scoped RLS relation.
create table public.cafe_admin_reasons (
  cafe_id uuid primary key references public.cafes(id),
  decision text check (decision in ('approve','reject')),
  decision_reason text check (char_length(decision_reason) between 1 and 300 and private.moderation_nonblank(decision_reason)),
  decided_at timestamptz,
  suspension_reason text check (char_length(suspension_reason) between 1 and 300 and private.moderation_nonblank(suspension_reason)),
  suspension_changed_at timestamptz
);
alter table public.cafe_admin_reasons enable row level security;
revoke all on public.cafe_admin_reasons from public,anon,authenticated,service_role;
grant select on public.cafe_admin_reasons to authenticated;
create policy cafe_admin_reasons_read on public.cafe_admin_reasons for select to authenticated
  using (private.cafe_permission(cafe_id,array['owner','admin']::public.app_role[]));

create index cafes_application_queue on public.cafes(workspace_id,application_state,submitted_at,id);
create index cafes_approved_queue on public.cafes(workspace_id,application_state,name,id);
create index orders_suspension on public.orders(cafe_id,state);

create function public.decide_cafe(p_cafe_ref text,p_decision text,p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor public.profiles; target public.cafes; next_state public.cafe_application_state; event_time timestamptz;
begin
  actor := private.moderation_admin();
  if p_cafe_ref is null or char_length(p_cafe_ref) not between 1 and 128
    or p_decision is null or p_decision not in ('approve','reject')
    or p_reason is null or char_length(p_reason) not between 1 and 300 or not private.moderation_nonblank(p_reason) then
    return jsonb_build_object('error','INVALID_REQUEST');
  end if;
  select * into target from public.cafes where id::text=p_cafe_ref and workspace_id=actor.workspace_id for update;
  if target.id is null then return jsonb_build_object('error','NOT_FOUND'); end if;
  if target.application_state <> 'pending' then
    return jsonb_build_object('error','STATE_CONFLICT','currentState',target.application_state);
  end if;
  next_state := case when p_decision='approve' then 'approved'::public.cafe_application_state else 'rejected'::public.cafe_application_state end;
  event_time := clock_timestamp();
  update public.cafes set application_state=next_state where id=target.id;
  insert into public.cafe_admin_reasons(cafe_id,decision,decision_reason,decided_at)
    values (target.id,p_decision,p_reason,event_time)
    on conflict (cafe_id) do update set decision=excluded.decision,decision_reason=excluded.decision_reason,decided_at=excluded.decided_at;
  insert into public.admin_audit_entries(workspace_id,admin_id,action,target_type,target_id,reason,created_at)
    values (actor.workspace_id,actor.id,p_decision,'cafe',target.id,p_reason,event_time);
  return jsonb_build_object('applicationState',next_state);
end;
$$;

create function public.set_cafe_suspension(p_cafe_ref text,p_suspended boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor public.profiles; target public.cafes; event_time timestamptz;
begin
  actor := private.moderation_admin();
  if p_cafe_ref is null or char_length(p_cafe_ref) not between 1 and 128 or p_suspended is null
    or p_reason is null or char_length(p_reason) not between 1 and 300 or not private.moderation_nonblank(p_reason) then
    return jsonb_build_object('error','INVALID_REQUEST');
  end if;
  -- Shared rendezvous with future order/owner writers: lock cafe first, then orders.
  -- A creation committed before this lock is included; subsequent creation must
  -- recheck eligibility under the cafe lock (the CUS-03 writer's responsibility).
  select * into target from public.cafes where id::text=p_cafe_ref and workspace_id=actor.workspace_id for update;
  if target.id is null then return jsonb_build_object('error','NOT_FOUND'); end if;
  if target.application_state <> 'approved' then
    return jsonb_build_object('error','STATE_CONFLICT','currentState',target.application_state);
  end if;
  if target.suspended=p_suspended then
    return jsonb_build_object('error','STATE_CONFLICT','currentState',case when target.suspended then 'suspended' else 'not suspended' end);
  end if;
  event_time := clock_timestamp();
  update public.cafes set suspended=p_suspended,suspension_version=suspension_version+1 where id=target.id;
  if p_suspended then
    -- Stable lock order, no mutation of collected/rejected/cancelled rows or snapshots.
    perform id from public.orders where cafe_id=target.id and state in ('pending','accepted','ready') order by id for update;
    update public.orders set state='cancelled',cancellation_reason='Cafe is suspended',cancelled_at=event_time
      where cafe_id=target.id and state in ('pending','accepted','ready');
  end if;
  insert into public.cafe_admin_reasons(cafe_id,suspension_reason,suspension_changed_at)
    values (target.id,p_reason,event_time)
    on conflict (cafe_id) do update set suspension_reason=excluded.suspension_reason,suspension_changed_at=excluded.suspension_changed_at;
  insert into public.admin_audit_entries(workspace_id,admin_id,action,target_type,target_id,reason,created_at)
    values (actor.workspace_id,actor.id,case when p_suspended then 'suspend' else 'un-suspend' end,'cafe',target.id,p_reason,event_time);
  return jsonb_build_object('suspended',p_suspended);
end;
$$;

create function public.admin_cafe_queue(p_applications boolean,p_page integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor public.profiles; result jsonb;
begin
  actor := private.moderation_admin();
  if p_applications is null or p_page is null or p_page < 1 then raise exception 'Invalid cafe page'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.position),'[]') into result from (
    select c.id,c.name,c.description,c.area,c.pickup_address,c.pickup_cutoff_minutes,c.submitted_at,c.suspended,
      coalesce((select jsonb_agg(jsonb_build_object('weekday',h.weekday,'opensAt',to_char(h.opens_at,'HH24:MI'),
        'closesAt',to_char(h.closes_at,'HH24:MI'),'closesNextDay',h.closes_next_day) order by h.weekday,h.opens_at,h.id)
        from public.opening_hours h where h.cafe_id=c.id),'[]') as opening_hours,
      row_number() over (order by case when p_applications then c.submitted_at end,
        case when not p_applications then c.name end,c.id) as position
    from public.cafes c where c.workspace_id=actor.workspace_id
      and c.application_state=case when p_applications then 'pending'::public.cafe_application_state else 'approved'::public.cafe_application_state end
    order by case when p_applications then c.submitted_at end,case when not p_applications then c.name end,c.id
    limit 21 offset (p_page::bigint-1)*20
  ) t;
  return result;
end;
$$;
revoke all on function public.decide_cafe(text,text,text),public.set_cafe_suspension(text,boolean,text),public.admin_cafe_queue(boolean,integer) from public,anon,authenticated,service_role;
grant execute on function public.decide_cafe(text,text,text),public.set_cafe_suspension(text,boolean,text),public.admin_cafe_queue(boolean,integer) to authenticated;
