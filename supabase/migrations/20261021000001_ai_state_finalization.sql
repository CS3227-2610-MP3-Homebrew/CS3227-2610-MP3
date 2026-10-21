-- Preserve the original cache/dispatch authorization implementation as a private
-- helper. Only the public, allowlisted infrastructure RPC remains executable.
alter function public.ai_state(text,text,jsonb,timestamptz) rename to ai_state_v1;
alter function public.ai_state_v1(text,text,jsonb,timestamptz) set schema private;
revoke all on function private.ai_state_v1(text,text,jsonb,timestamptz) from public,anon,authenticated,service_role;

create table private.ai_audit_bindings (
  environment text not null check (environment in ('local','ci','dev','prod')),
  operation_id uuid not null,
  metadata jsonb not null check (jsonb_typeof(metadata)='object'),
  authorized_at timestamptz not null,
  primary key(environment,operation_id)
);
alter table private.ai_audit_bindings enable row level security;
revoke all on private.ai_audit_bindings from public,anon,authenticated,service_role;
create index ai_audit_bindings_retention on private.ai_audit_bindings(environment,authorized_at);

create function public.ai_state(
  p_environment text, p_action text, p_request jsonb default '{}'::jsonb,
  p_now timestamptz default null
) returns table(result jsonb)
language plpgsql security definer set search_path='' as $$
declare
  v_now timestamptz := coalesce(p_now,pg_catalog.clock_timestamp());
  v_meta jsonb;
  v_bound jsonb;
  v_operation uuid;
  v_result jsonb;
begin
  if p_environment is null or p_environment not in ('local','ci','dev','prod')
    or (p_now is not null and p_environment not in ('local','ci'))
    or not pg_catalog.isfinite(v_now) or jsonb_typeof(p_request) is distinct from 'object'
    or p_action is null or p_action not in ('authorize','read','write','audit','cleanup') then
    return query select null::jsonb; return;
  end if;
  if p_action='cleanup' then
    select r.result into v_result from private.ai_state_v1(p_environment,p_action,p_request,p_now) r;
    if v_result is not null then
      delete from private.ai_audit_bindings b where b.environment=p_environment and b.authorized_at <= v_now - interval '30 days';
    end if;
    return query select v_result; return;
  end if;
  v_operation := (p_request->>'operationId')::uuid;
  v_meta := jsonb_build_object('operationId',v_operation,'actorId',(p_request->>'actorId')::uuid,
    'feature',p_request->>'feature','scope',p_request->'scope');
  if p_request ? 'cafeId' then v_meta := v_meta || jsonb_build_object('cafeId',(p_request->>'cafeId')::uuid); end if;
  select b.metadata into v_bound from private.ai_audit_bindings b where b.environment=p_environment and b.operation_id=v_operation;
  if v_bound is not null and v_bound <> v_meta then return query select null::jsonb; return; end if;

  -- Historical authorization permits only content-free terminal audit. It never
  -- grants a new action/provider attempt, a cache read/write or source disclosure.
  if p_action='audit' and v_bound is not null and p_request->>'outcome' in ('fallback','denied','success','cache') then
    if exists(select 1 from jsonb_object_keys(p_request) k(key) where key not in ('operationId','actorId','cafeId','feature','scope','outcome','tokens'))
      or (p_request->>'feature'='moderation_assistant' and p_request->>'outcome'='cache') then
      return query select null::jsonb; return;
    end if;
    if p_request ? 'tokens' then
      if jsonb_typeof(p_request->'tokens') is distinct from 'object'
        or (p_request->'tokens') - array['input','output','total'] <> '{}'::jsonb
        or exists(select 1 from jsonb_each(p_request->'tokens') t where jsonb_typeof(t.value) <> 'number'
          or t.value::text !~ '^[0-9]+$' or (t.value::text)::numeric > 9007199254740991) then
        return query select null::jsonb; return;
      end if;
    end if;
    insert into private.ai_audit_events(environment,operation_id,actor_id,feature,outcome,created_at,input_tokens,output_tokens,total_tokens)
      values(p_environment,v_operation,(v_meta->>'actorId')::uuid,v_meta->>'feature',p_request->>'outcome',date_trunc('milliseconds',v_now),
        (p_request->'tokens'->>'input')::bigint,(p_request->'tokens'->>'output')::bigint,(p_request->'tokens'->>'total')::bigint);
    return query select jsonb_build_object('ok',true); return;
  end if;

  select r.result into v_result from private.ai_state_v1(p_environment,p_action,p_request,p_now) r;
  if v_result is not null then
    if p_action in ('authorize','audit') then
      insert into private.ai_audit_bindings(environment,operation_id,metadata,authorized_at)
        values(p_environment,v_operation,v_meta,date_trunc('milliseconds',v_now)) on conflict do nothing;
      -- Concurrent use of one operation identity cannot bind two actors/scopes.
      select b.metadata into v_bound from private.ai_audit_bindings b where b.environment=p_environment and b.operation_id=v_operation;
      if v_bound <> v_meta then raise exception using message='AI operation unavailable'; end if;
    end if;
  end if;
  return query select v_result;
end;
$$;
revoke all on function public.ai_state(text,text,jsonb,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.ai_state(text,text,jsonb,timestamptz) to service_role;
