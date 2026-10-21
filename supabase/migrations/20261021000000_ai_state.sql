-- Scope-bound AI infrastructure only. Domain/Admin audit storage is separate.
create table private.ai_result_caches (
  environment text not null check (environment in ('local', 'ci', 'dev', 'prod')),
  cache_key text not null check (cache_key ~ '^[0-9a-f]{64}$'),
  envelope jsonb not null,
  expires_at timestamptz not null,
  primary key (environment, cache_key)
);
create table private.ai_audit_events (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('local', 'ci', 'dev', 'prod')),
  operation_id uuid not null,
  actor_id uuid not null references public.profiles(id),
  feature text not null check (feature in ('brew_finder', 'prep_advisor', 'moderation_assistant')),
  outcome text not null check (outcome in ('started', 'cache', 'provider_attempt', 'ready', 'success', 'fallback', 'denied')),
  created_at timestamptz not null,
  input_tokens bigint check (input_tokens between 0 and 9007199254740991),
  output_tokens bigint check (output_tokens between 0 and 9007199254740991),
  total_tokens bigint check (total_tokens between 0 and 9007199254740991)
);
alter table private.ai_result_caches enable row level security;
alter table private.ai_audit_events enable row level security;
revoke all on private.ai_result_caches from public, anon, authenticated, service_role;
revoke all on private.ai_audit_events from public, anon, authenticated, service_role;
create index ai_result_caches_expiry on private.ai_result_caches(environment, expires_at);
create index ai_audit_events_retention on private.ai_audit_events(environment, created_at);

-- Content-free historical authorization for terminal audit only. No cache,
-- source or dispatch permission follows from a stored binding.
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

-- This RPC is an infrastructure capability, not an ordinary domain-query API.
-- Only the server secret-key adapter can execute it. p_now is a construction-only
-- local/CI testing seam and is rejected in deployed environments.
create function public.ai_state(
  p_environment text, p_action text, p_request jsonb default '{}'::jsonb,
  p_now timestamptz default null
) returns table (result jsonb)
language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz;
  v_actor uuid;
  v_cafe uuid;
  v_workspace uuid;
  v_role public.app_role;
  v_feature text;
  v_scope jsonb;
  v_identity jsonb;
  v_envelope jsonb;
  v_expires timestamptz;
  v_key text;
  v_suggestion jsonb;
  v_created timestamptz;
  v_operation uuid;
  v_meta jsonb;
  v_bound jsonb;
  v_historical boolean;
begin
  if p_environment is null or p_environment not in ('local','ci','dev','prod')
    or (p_now is not null and p_environment not in ('local','ci'))
    or jsonb_typeof(p_request) is distinct from 'object'
    or p_action is null or p_action not in ('authorize','read','write','audit','cleanup') then
    return query select null::jsonb; return;
  end if;
  v_now := coalesce(p_now, pg_catalog.clock_timestamp());
  if not pg_catalog.isfinite(v_now) then return query select null::jsonb; return; end if;
  -- Normalize to the RFC3339 millisecond precision of the stored envelope.
  v_now := date_trunc('milliseconds', v_now);
  if p_action = 'cleanup' then
    if p_request <> '{}'::jsonb then return query select null::jsonb; return; end if;
    -- Serialize against admission so no active operation or single-use state is reset.
    perform pg_catalog.pg_advisory_xact_lock(42009, case p_environment when 'local' then 1 when 'ci' then 2 when 'dev' then 3 else 4 end);
    delete from private.ai_result_caches c where c.environment=p_environment and c.expires_at <= v_now;
    delete from private.ai_audit_events a where a.environment=p_environment and a.created_at <= v_now - interval '30 days';
    delete from private.ai_audit_bindings b where b.environment=p_environment and b.authorized_at <= v_now - interval '30 days';
    delete from private.ai_usage_admissions a where a.environment=p_environment and a.window_end <= v_now - interval '7 days';
    delete from private.ai_usage_operations o where o.environment=p_environment and o.window_end <= v_now - interval '7 days'
      and not exists (select 1 from private.ai_usage_admissions a where a.environment=o.environment and a.operation_id=o.operation_id);
    delete from private.ai_usage_counters c where c.environment=p_environment and c.window_end <= v_now - interval '7 days';
    return query select jsonb_build_object('ok',true); return;
  end if;
  if exists (select 1 from jsonb_object_keys(p_request) k(key)
    where key not in ('actorId','cafeId','operationId','feature','scope','key','identity','data','outcome','tokens')) then
    return query select null::jsonb; return;
  end if;
  v_actor := (p_request->>'actorId')::uuid;
  v_operation := (p_request->>'operationId')::uuid;
  v_cafe := (p_request->>'cafeId')::uuid;
  v_feature := p_request->>'feature';
  v_scope := p_request->'scope';
  if v_actor is null or (p_request->>'operationId')::uuid is null or v_feature is null
    or v_feature not in ('brew_finder','prep_advisor','moderation_assistant') then return query select null::jsonb; return; end if;
  v_meta := jsonb_build_object('operationId',v_operation,'actorId',v_actor,'feature',v_feature,'scope',v_scope);
  if v_cafe is not null then v_meta := v_meta || jsonb_build_object('cafeId',v_cafe); end if;
  select b.metadata into v_bound from private.ai_audit_bindings b where b.environment=p_environment and b.operation_id=v_operation;
  if v_bound is not null and v_bound <> v_meta then return query select null::jsonb; return; end if;
  v_historical := coalesce(p_action='audit' and v_bound is not null and p_request->>'outcome' in ('fallback','denied','success','cache'),false);
  if v_feature='moderation_assistant' and p_request->>'outcome'='cache' then return query select null::jsonb; return; end if;
  if not v_historical then
    select p.workspace_id,p.role into v_workspace,v_role from public.profiles p where p.id=v_actor for share;
    if not found then return query select null::jsonb; return; end if;
    if v_feature='brew_finder' then
      if v_role <> 'customer' or v_cafe is not null or v_scope is distinct from jsonb_build_object('actorId',v_actor) then
        return query select null::jsonb; return;
      end if;
    elsif v_feature='moderation_assistant' then
      if v_role <> 'admin' or v_cafe is not null or v_scope is distinct from jsonb_build_object('actorId',v_actor)
        or p_action not in ('authorize','audit') or p_request->>'outcome'='cache' then
        return query select null::jsonb; return;
      end if;
    else
      if v_role <> 'owner' or v_cafe is null
        or v_scope is distinct from jsonb_build_object('cafeId',v_cafe,'businessDate',p_request->'scope'->>'businessDate')
        or (v_scope->>'businessDate') is distinct from to_char(v_now at time zone 'Asia/Singapore','YYYY-MM-DD') then
        return query select null::jsonb; return;
      end if;
      perform 1 from public.cafes c where c.id=v_cafe and c.owner_id=v_actor and c.workspace_id=v_workspace
        and c.application_state='approved' and not c.suspended for share;
      if not found then return query select null::jsonb; return; end if;
    end if;
  end if;
  if p_action in ('authorize','audit') then
    insert into private.ai_audit_bindings(environment,operation_id,metadata,authorized_at)
      values(p_environment,v_operation,v_meta,v_now) on conflict do nothing;
    select b.metadata into v_bound from private.ai_audit_bindings b where b.environment=p_environment and b.operation_id=v_operation;
    if v_bound <> v_meta then raise exception using message='AI operation unavailable'; end if;
  end if;
  if p_action='authorize' then
    return query select jsonb_build_object('now',to_char(v_now at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')); return;
  end if;
  if p_action='audit' then
    if exists(select 1 from jsonb_object_keys(p_request) k(key) where key not in ('actorId','cafeId','operationId','feature','scope','outcome','tokens'))
      or p_request->>'outcome' is null or p_request->>'outcome' not in ('started','cache','provider_attempt','ready','success','fallback','denied') then
      return query select null::jsonb; return;
    end if;
    if p_request ? 'tokens' then
      if jsonb_typeof(p_request->'tokens') is distinct from 'object'
        or (p_request->'tokens') - array['input','output','total'] <> '{}'::jsonb
        or exists (select 1 from jsonb_each(p_request->'tokens') t where jsonb_typeof(t.value) <> 'number'
          or t.value::text !~ '^[0-9]+$' or (t.value::text)::numeric > 9007199254740991) then
        return query select null::jsonb; return;
      end if;
    end if;
    insert into private.ai_audit_events(environment,operation_id,actor_id,feature,outcome,created_at,input_tokens,output_tokens,total_tokens)
      values(p_environment,(p_request->>'operationId')::uuid,v_actor,v_feature,p_request->>'outcome',v_now,
        (p_request->'tokens'->>'input')::bigint,(p_request->'tokens'->>'output')::bigint,(p_request->'tokens'->>'total')::bigint);
    return query select jsonb_build_object('ok',true); return;
  end if;
  v_key := p_request->>'key';
  v_identity := p_request->'identity';
  if v_key is null or v_key !~ '^[0-9a-f]{64}$' or jsonb_typeof(v_identity) is distinct from 'object'
    or v_identity - array['inputFingerprint','sourceRevision','modelIdentity','contractIdentity'] <> '{}'::jsonb
    or exists (select 1 from unnest(array['inputFingerprint','sourceRevision','modelIdentity','contractIdentity']) k(key)
      where v_identity->>key is null or v_identity->>key !~ '^[0-9a-f]{64}$') then
    return query select null::jsonb; return;
  end if;
  if p_action='read' then
    select c.envelope into v_envelope from private.ai_result_caches c
      where c.environment=p_environment and c.cache_key=v_key and c.expires_at > v_now;
    if not found then return query select null::jsonb; return; end if;
    if v_envelope->>'version' is distinct from '1' or v_envelope->>'feature' is distinct from v_feature
      or v_envelope->>'environment' is distinct from p_environment or v_envelope->'scope' is distinct from v_scope
      or not v_envelope @> v_identity then return query select null::jsonb; return; end if;
    v_created := (v_envelope->>'createdAt')::timestamptz;
    v_expires := (v_envelope->>'expiresAt')::timestamptz;
    if v_created is null or v_expires is null or v_created > v_now or v_created >= v_expires or v_expires <= v_now
      or v_expires is distinct from (case when v_feature='brew_finder' then v_created + interval '10 minutes'
        else (date_trunc('day',v_created at time zone 'Asia/Singapore') + interval '1 day') at time zone 'Asia/Singapore' end) then
      return query select null::jsonb; return;
    end if;
  else
    if jsonb_typeof(p_request->'data') is distinct from 'object' or jsonb_typeof(p_request->'data'->'suggestions') is distinct from 'array' then
      return query select null::jsonb; return;
    end if;
    v_expires := case when v_feature='brew_finder' then v_now + interval '10 minutes'
      else (date_trunc('day',v_now at time zone 'Asia/Singapore') + interval '1 day') at time zone 'Asia/Singapore' end;
    v_envelope := v_identity || jsonb_build_object('version','1','feature',v_feature,'environment',p_environment,'scope',v_scope,
      'createdAt',to_char(v_now at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'expiresAt',to_char(v_expires at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'data',p_request->'data');
  end if;
  if jsonb_typeof(v_envelope->'data'->'suggestions') is distinct from 'array' then return query select null::jsonb; return; end if;
  -- Cache data never grants cafe/workspace visibility, even through this privileged RPC.
  if v_feature='brew_finder' then
    for v_suggestion in select value from jsonb_array_elements(v_envelope->'data'->'suggestions') loop
      perform 1 from public.cafes c where c.id=(v_suggestion->>'cafeId')::uuid and c.workspace_id=v_workspace
        and c.application_state='approved' and not c.suspended for share;
      if not found then return query select null::jsonb; return; end if;
    end loop;
  end if;
  if p_action='write' then
    -- A validated result commits at this atomic upsert. No earlier response
    -- readiness/audit failure mutates the previous envelope.
    insert into private.ai_result_caches as c(environment,cache_key,envelope,expires_at)
      values(p_environment,v_key,v_envelope,v_expires)
      on conflict(environment,cache_key) do update set envelope=excluded.envelope,expires_at=excluded.expires_at;
  end if;
  return query select v_envelope;
end;
$$;
revoke all on function public.ai_state(text,text,jsonb,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.ai_state(text,text,jsonb,timestamptz) to service_role;
