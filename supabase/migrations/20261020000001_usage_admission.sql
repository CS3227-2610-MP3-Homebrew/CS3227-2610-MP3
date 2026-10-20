-- AI infrastructure is private. Only the deliberately granted public RPC is
-- exposed through the secret-key Data API; service_role gets no table grants.
create table private.ai_usage_counters (
  environment text not null check (environment in ('local', 'ci', 'dev', 'prod')),
  scope_kind text not null check (scope_kind in ('global', 'actor', 'feature', 'cafe')),
  scope_id text not null,
  feature text not null,
  event text not null,
  window_start timestamptz not null,
  window_end timestamptz not null check (window_end > window_start),
  count bigint not null check (count >= 0),
  primary key (environment, scope_kind, scope_id, feature, event, window_start, window_end)
);
create table private.ai_usage_operations (
  environment text not null check (environment in ('local', 'ci', 'dev', 'prod')),
  operation_id uuid not null,
  actor_id uuid not null references public.profiles(id),
  cafe_id uuid references public.cafes(id),
  feature text not null check (feature in ('brew-finder', 'prep-advisor', 'moderation-assistant')),
  attempts bigint not null check (attempts >= 0),
  window_start timestamptz not null,
  window_end timestamptz not null check (window_end > window_start),
  primary key (environment, operation_id)
);
create table private.ai_usage_admissions (
  environment text not null check (environment in ('local', 'ci', 'dev', 'prod')),
  admission_id uuid not null,
  operation_id uuid not null,
  actor_id uuid not null references public.profiles(id),
  cafe_id uuid references public.cafes(id),
  feature text not null check (feature in ('brew-finder', 'prep-advisor', 'moderation-assistant')),
  event text not null check (event in ('action', 'refresh', 'run', 'provider_attempt')),
  admitted_at timestamptz not null,
  window_start timestamptz not null,
  window_end timestamptz not null check (window_end > window_start),
  primary key (environment, admission_id),
  foreign key (environment, operation_id) references private.ai_usage_operations(environment, operation_id)
);
alter table private.ai_usage_counters enable row level security;
alter table private.ai_usage_operations enable row level security;
alter table private.ai_usage_admissions enable row level security;
revoke all on private.ai_usage_counters from public, anon, authenticated, service_role;
revoke all on private.ai_usage_operations from public, anon, authenticated, service_role;
revoke all on private.ai_usage_admissions from public, anon, authenticated, service_role;
create index ai_usage_counters_closed on private.ai_usage_counters(window_end);
create index ai_usage_operations_closed on private.ai_usage_operations(window_end);
create index ai_usage_admissions_closed on private.ai_usage_admissions(window_end);

create function public.reserve_ai_usage(
  p_environment text, p_request jsonb, p_limits jsonb, p_now timestamptz default null
) returns table (admitted boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz;
  v_minute timestamptz;
  v_day timestamptz;
  v_actor uuid;
  v_cafe uuid;
  v_operation uuid;
  v_admission uuid;
  v_feature text;
  v_event text;
  v_role public.app_role;
  v_key text;
  v_limit numeric;
  v_feature_key text;
  v_operation_key text;
  v_operation_row private.ai_usage_operations%rowtype;
  v_reservations jsonb := '[]'::jsonb;
  v_counter jsonb;
  v_scope text;
  v_scope_id text;
  v_counter_feature text;
  v_counter_event text;
  v_start timestamptz;
  v_end timestamptz;
  v_count bigint;
begin
  -- Recheck policy in SQL as well as in the server parser. No implicit defaults.
  if p_environment is null or p_environment not in ('local', 'ci', 'dev', 'prod')
    or p_limits is null or jsonb_typeof(p_limits) <> 'object'
    or p_request is null or jsonb_typeof(p_request) <> 'object'
    or (p_now is not null and p_environment not in ('local', 'ci')) then
    return query select false; return;
  end if;
  foreach v_key in array array[
    'AI_GLOBAL_CALLS_PER_MINUTE', 'AI_GLOBAL_CALLS_PER_DAY',
    'AI_USER_ACTIONS_PER_MINUTE', 'AI_USER_ACTIONS_PER_DAY',
    'AI_BREW_FINDER_CALLS_PER_MINUTE', 'AI_PREP_ADVISOR_CALLS_PER_MINUTE',
    'AI_MODERATION_CALLS_PER_MINUTE', 'AI_BREW_FINDER_CALLS_PER_ACTION',
    'AI_PREP_ADVISOR_CALLS_PER_ACTION', 'AI_MODERATION_CALLS_PER_ACTION',
    'AI_PREP_REFRESHES_PER_DAY', 'AI_MODERATION_RUNS_PER_DAY', 'AI_MODERATION_REVIEWS_PER_CALL'
  ] loop
    if jsonb_typeof(p_limits -> v_key) is distinct from 'number'
      or (p_limits ->> v_key) !~ '^[0-9]+$' then
      return query select false; return;
    end if;
    v_limit := (p_limits ->> v_key)::numeric;
    if v_limit > 9007199254740991
      or (v_key = 'AI_BREW_FINDER_CALLS_PER_ACTION' and v_limit > 2)
      or (v_key in ('AI_PREP_ADVISOR_CALLS_PER_ACTION', 'AI_MODERATION_CALLS_PER_ACTION') and v_limit > 1)
      or (v_key = 'AI_MODERATION_REVIEWS_PER_CALL' and v_limit > 20) then
      return query select false; return;
    end if;
  end loop;
  -- Reject extra fields (especially a request-supplied clock or scope).
  if exists (select 1 from jsonb_object_keys(p_request) as k(key)
    where key not in ('actorId', 'cafeId', 'operationId', 'admissionId', 'feature', 'event')) then
    return query select false; return;
  end if;
  v_actor := (p_request ->> 'actorId')::uuid;
  v_cafe := (p_request ->> 'cafeId')::uuid;
  v_operation := (p_request ->> 'operationId')::uuid;
  v_admission := (p_request ->> 'admissionId')::uuid;
  v_feature := p_request ->> 'feature';
  v_event := p_request ->> 'event';
  if v_actor is null or v_operation is null or v_admission is null or v_feature is null or v_event is null
    or v_feature not in ('brew-finder', 'prep-advisor', 'moderation-assistant')
    or v_event not in ('action', 'refresh', 'run', 'provider_attempt')
    or (v_event = 'refresh' and v_feature <> 'prep-advisor')
    or (v_event = 'run' and v_feature <> 'moderation-assistant') then
    return query select false; return;
  end if;
  -- The service-key caller supplies a verified identity, not an arbitrary scope.
  -- Authoritative records determine role/ownership and the cafe quota scope.
  select role into v_role from public.profiles where id = v_actor for share;
  if v_role is null
    or (v_feature = 'brew-finder' and v_role <> 'customer')
    or (v_feature = 'prep-advisor' and v_role <> 'owner')
    or (v_feature = 'moderation-assistant' and v_role <> 'admin') then
    return query select false; return;
  end if;
  if v_feature = 'prep-advisor' then
    perform 1 from public.cafes c join public.profiles p on p.id = c.owner_id
      where c.id = v_cafe and c.owner_id = v_actor and c.workspace_id = p.workspace_id
        and c.application_state = 'approved' and not c.suspended for share of c;
    if not found then return query select false; return; end if;
  else
    v_cafe := null;
  end if;

  -- At the adopted small per-environment provider caps a transaction lock makes
  -- the complete multi-counter decision simple and deterministic. It is shared
  -- by every instance and all event kinds, with no process-local quota state.
  perform pg_catalog.pg_advisory_xact_lock(42009, case p_environment
    when 'local' then 1 when 'ci' then 2 when 'dev' then 3 else 4 end);
  v_now := coalesce(p_now, pg_catalog.clock_timestamp());
  if not pg_catalog.isfinite(v_now) then return query select false; return; end if;
  v_minute := date_trunc('minute', v_now at time zone 'UTC') at time zone 'UTC';
  v_day := date_trunc('day', v_now at time zone 'Asia/Singapore') at time zone 'Asia/Singapore';
  if exists (select 1 from private.ai_usage_admissions a
    where a.environment = p_environment and a.admission_id = v_admission) then
    return query select false; return;
  end if;
  select * into v_operation_row from private.ai_usage_operations o
    where o.environment = p_environment and o.operation_id = v_operation;
  if found and (v_operation_row.actor_id <> v_actor or v_operation_row.feature <> v_feature
    or v_operation_row.cafe_id is distinct from v_cafe) then
    return query select false; return;
  end if;

  if v_event = 'provider_attempt' then
    v_feature_key := case v_feature when 'brew-finder' then 'AI_BREW_FINDER_CALLS_PER_MINUTE'
      when 'prep-advisor' then 'AI_PREP_ADVISOR_CALLS_PER_MINUTE' else 'AI_MODERATION_CALLS_PER_MINUTE' end;
    v_operation_key := case v_feature when 'brew-finder' then 'AI_BREW_FINDER_CALLS_PER_ACTION'
      when 'prep-advisor' then 'AI_PREP_ADVISOR_CALLS_PER_ACTION' else 'AI_MODERATION_CALLS_PER_ACTION' end;
    if coalesce(v_operation_row.attempts, 0) >= (p_limits ->> v_operation_key)::bigint then
      return query select false; return;
    end if;
    v_reservations := jsonb_build_array(
      jsonb_build_array('global', '*', '*', 'provider_attempt', v_minute, v_minute + interval '1 minute', p_limits -> 'AI_GLOBAL_CALLS_PER_MINUTE'),
      jsonb_build_array('global', '*', '*', 'provider_attempt', v_day, v_day + interval '24 hours', p_limits -> 'AI_GLOBAL_CALLS_PER_DAY'),
      jsonb_build_array('feature', v_feature, v_feature, 'provider_attempt', v_minute, v_minute + interval '1 minute', p_limits -> v_feature_key)
    );
  else
    -- Each authorized feature action shares the actor-wide action allowance;
    -- refreshes/runs additionally have their independent cafe/Admin daily cap.
    v_reservations := jsonb_build_array(
      jsonb_build_array('actor', v_actor, '*', 'action', v_minute, v_minute + interval '1 minute', p_limits -> 'AI_USER_ACTIONS_PER_MINUTE'),
      jsonb_build_array('actor', v_actor, '*', 'action', v_day, v_day + interval '24 hours', p_limits -> 'AI_USER_ACTIONS_PER_DAY')
    );
    if v_event = 'refresh' then
      v_reservations := v_reservations || jsonb_build_array(jsonb_build_array('cafe', v_cafe, v_feature, 'refresh', v_day, v_day + interval '24 hours', p_limits -> 'AI_PREP_REFRESHES_PER_DAY'));
    elsif v_event = 'run' then
      v_reservations := v_reservations || jsonb_build_array(jsonb_build_array('actor', v_actor, v_feature, 'run', v_day, v_day + interval '24 hours', p_limits -> 'AI_MODERATION_RUNS_PER_DAY'));
    end if;
  end if;
  -- Read all bounds before any mutation: a denial changes no counter, operation
  -- or successful admission. SQL exceptions roll back the entire statement.
  for v_counter in select value from jsonb_array_elements(v_reservations) loop
    v_scope := v_counter ->> 0; v_scope_id := v_counter ->> 1;
    v_counter_feature := v_counter ->> 2; v_counter_event := v_counter ->> 3;
    v_start := (v_counter ->> 4)::timestamptz; v_end := (v_counter ->> 5)::timestamptz;
    select count into v_count from private.ai_usage_counters c where
      c.environment = p_environment and c.scope_kind = v_scope and c.scope_id = v_scope_id
      and c.feature = v_counter_feature and c.event = v_counter_event and c.window_start = v_start and c.window_end = v_end;
    if coalesce(v_count, 0) >= (v_counter ->> 6)::bigint then
      return query select false; return;
    end if;
  end loop;
  for v_counter in select value from jsonb_array_elements(v_reservations) loop
    v_start := (v_counter ->> 4)::timestamptz; v_end := (v_counter ->> 5)::timestamptz;
    insert into private.ai_usage_counters as c
      (environment, scope_kind, scope_id, feature, event, window_start, window_end, count)
      values (p_environment, v_counter ->> 0, v_counter ->> 1, v_counter ->> 2, v_counter ->> 3, v_start, v_end, 1)
      on conflict (environment, scope_kind, scope_id, feature, event, window_start, window_end)
      do update set count = c.count + 1;
  end loop;
  insert into private.ai_usage_operations as o
    (environment, operation_id, actor_id, cafe_id, feature, attempts, window_start, window_end)
    values (p_environment, v_operation, v_actor, v_cafe, v_feature,
      case when v_event = 'provider_attempt' then 1 else 0 end, v_day, v_day + interval '24 hours')
    on conflict (environment, operation_id) do update
      set attempts = o.attempts + excluded.attempts,
        window_end = greatest(o.window_end, excluded.window_end);
  insert into private.ai_usage_admissions
    (environment, admission_id, operation_id, actor_id, cafe_id, feature, event, admitted_at, window_start, window_end)
    values (p_environment, v_admission, v_operation, v_actor, v_cafe, v_feature, v_event, v_now, v_day, v_day + interval '24 hours');
  return query select true;
end;
$$;
revoke all on function public.reserve_ai_usage(text, jsonb, jsonb, timestamptz) from public, anon, authenticated, service_role;
grant usage on schema public to service_role;
grant execute on function public.reserve_ai_usage(text, jsonb, jsonb, timestamptz) to service_role;
