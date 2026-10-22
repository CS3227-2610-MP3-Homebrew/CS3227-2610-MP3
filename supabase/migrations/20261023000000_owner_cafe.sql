-- OWN-01/OWN-02/OWN-04 owner café application, profile/hours and pickup cutoff.
-- Owner writes go only through the functions below. Each derives the verified
-- owner/workspace from the protected profile, repeats strict validation for
-- direct Data API callers and never writes approval, suspension, the suspension
-- version, ownership, workspace, Admin reasons or audit history. No raw domain
-- write grant is added for authenticated callers.

-- Stable creation order for an owner's café identity. Every owner operation
-- addresses the owner's earliest café; one pending/approved café is enforced by
-- the application writers below rather than by a table constraint.
alter table public.cafes add column created_at timestamptz not null default clock_timestamp();
create index cafes_owner_identity on public.cafes(owner_id, workspace_id, created_at, id);

-- Application attempts and their idempotency keys stay with the café identity.
-- Neither is readable or writable through the Data API.
create table public.cafe_application_attempts (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id),
  content jsonb not null,
  submitted_at timestamptz not null
);
create index cafe_application_attempts_cafe on public.cafe_application_attempts(cafe_id, submitted_at desc, id desc);
create table public.cafe_application_keys (
  attempt_id uuid not null references public.cafe_application_attempts(id),
  submission_key uuid not null,
  primary key (attempt_id, submission_key)
);
create index cafe_application_keys_key on public.cafe_application_keys(submission_key);
alter table public.cafe_application_attempts enable row level security;
alter table public.cafe_application_keys enable row level security;
revoke all on public.cafe_application_attempts from public, anon, authenticated, service_role;
revoke all on public.cafe_application_keys from public, anon, authenticated, service_role;

create function private.owner_actor() returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare actor public.profiles;
begin
  select * into actor from public.profiles where id = (select auth.uid()) and role = 'owner';
  if actor.id is null then raise insufficient_privilege using message = 'Owner access required'; end if;
  return actor;
end;
$$;

-- ECMAScript String.prototype.trim whitespace and line terminators.
create function private.owner_trim(value text) returns text
language sql immutable set search_path = '' as $$
  select btrim(value, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
$$;

-- Strict, already-normalized text: string type, trimmed, code-point bounds.
create function private.owner_text_valid(value jsonb, min_length integer, max_length integer) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(value) = 'string'
    and (value #>> '{}') = private.owner_trim(value #>> '{}')
    and char_length(value #>> '{}') between min_length and max_length, false);
$$;

-- Shared OpeningInterval rules: Singapore-local weekly minutes, positive
-- duration, overnight at most 24 hours, two starts per weekday, fourteen per
-- week, and no overlap including across the Sunday/Monday boundary.
create function private.owner_hours_valid(p_hours jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare h jsonb; starts integer[] := '{}'; ends integer[] := '{}'; opens integer; closes integer; duration integer;
  i integer; j integer; shift integer; total integer;
begin
  if jsonb_typeof(p_hours) is distinct from 'array' or jsonb_array_length(p_hours) > 14 then return false; end if;
  for h in select value from jsonb_array_elements(p_hours) loop
    if jsonb_typeof(h) is distinct from 'object'
      or not (h ?& array['weekday','opensAt','closesAt','closesNextDay'])
      or (h - array['weekday','opensAt','closesAt','closesNextDay']) <> '{}'::jsonb
      or jsonb_typeof(h->'weekday') is distinct from 'number' or (h->>'weekday') !~ '^[1-7]$'
      or jsonb_typeof(h->'opensAt') is distinct from 'string' or (h->>'opensAt') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or jsonb_typeof(h->'closesAt') is distinct from 'string' or (h->>'closesAt') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or jsonb_typeof(h->'closesNextDay') is distinct from 'boolean' then
      return false;
    end if;
    opens := split_part(h->>'opensAt', ':', 1)::integer * 60 + split_part(h->>'opensAt', ':', 2)::integer;
    closes := split_part(h->>'closesAt', ':', 1)::integer * 60 + split_part(h->>'closesAt', ':', 2)::integer;
    if (h->>'closesNextDay')::boolean then
      if closes > opens then return false; end if;
      duration := 1440 - opens + closes;
    else
      if closes <= opens then return false; end if;
      duration := closes - opens;
    end if;
    starts := starts || (((h->>'weekday')::integer - 1) * 1440 + opens);
    ends := ends || (((h->>'weekday')::integer - 1) * 1440 + opens + duration);
  end loop;
  if exists (select 1 from jsonb_array_elements(p_hours) x group by x->>'weekday' having count(*) > 2) then return false; end if;
  total := coalesce(array_length(starts, 1), 0);
  for i in 1..total loop
    for j in i + 1..total loop
      foreach shift in array array[-10080, 0, 10080] loop
        if starts[i] < ends[j] + shift and starts[j] + shift < ends[i] then return false; end if;
      end loop;
    end loop;
  end loop;
  return true;
end;
$$;

create function private.owner_sorted_hours(p_hours jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('weekday', (x->>'weekday')::integer, 'opensAt', x->>'opensAt',
    'closesAt', x->>'closesAt', 'closesNextDay', (x->>'closesNextDay')::boolean)
    order by (x->>'weekday')::integer, x->>'opensAt', x->>'closesAt', (x->>'closesNextDay')::boolean), '[]'::jsonb)
  from jsonb_array_elements(p_hours) x;
$$;

create function private.owner_cutoff_valid(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(value) = 'number' and (value #>> '{}') ~ '^(0|[1-9][0-9]{0,2})$'
    and (value #>> '{}')::integer between 0 and 180, false);
$$;

create function private.owner_version_valid(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(value) = 'number' and (value #>> '{}') ~ '^(0|[1-9][0-9]{0,15})$'
    and (value #>> '{}')::numeric <= 9007199254740991, false);
$$;

-- Normalized application content (excluding submissionKey and the suspension
-- precondition), or null when invalid. Hours are sorted; the cutoff defaults to
-- 15 only when its key is omitted.
create function private.owner_application_content(p jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare settings jsonb;
begin
  if jsonb_typeof(p) is distinct from 'object'
    or not (p ?& array['name','description','area','pickupAddress','openingHours','pickupSettings'])
    or (p - array['name','description','area','pickupAddress','openingHours','pickupSettings']) <> '{}'::jsonb then
    return null;
  end if;
  settings := p->'pickupSettings';
  if not private.owner_text_valid(p->'name', 2, 100)
    or not private.owner_text_valid(p->'description', 0, 500)
    or not private.owner_text_valid(p->'pickupAddress', 10, 200)
    or jsonb_typeof(p->'area') is distinct from 'string' or (p->>'area') not in ('Central','North','South','East','West')
    or not private.owner_hours_valid(p->'openingHours')
    or jsonb_typeof(settings) is distinct from 'object' or (settings - 'pickupCutoffMinutes') <> '{}'::jsonb
    or (settings ? 'pickupCutoffMinutes' and not private.owner_cutoff_valid(settings->'pickupCutoffMinutes')) then
    return null;
  end if;
  return jsonb_build_object('name', p->>'name', 'description', p->>'description', 'area', p->>'area',
    'pickupAddress', p->>'pickupAddress', 'openingHours', private.owner_sorted_hours(p->'openingHours'),
    'pickupCutoffMinutes', coalesce((settings->>'pickupCutoffMinutes')::integer, 15));
end;
$$;

create function private.owner_instant(value timestamptz) returns text
language sql immutable set search_path = '' as $$
  select to_char(value at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;

-- OwnerCafe projection. SECURITY INVOKER: direct callers read hours and private
-- reasons only through their own RLS scope.
create function private.owner_cafe_json(c public.cafes) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('cafeId', c.id, 'name', c.name, 'description', c.description, 'area', c.area,
    'pickupAddress', c.pickup_address,
    'openingHours', coalesce((select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'opensAt', to_char(h.opens_at, 'HH24:MI'),
      'closesAt', to_char(h.closes_at, 'HH24:MI'), 'closesNextDay', h.closes_next_day)
      order by h.weekday, h.opens_at, h.closes_at, h.id) from public.opening_hours h where h.cafe_id = c.id), '[]'::jsonb),
    'pickupSettings', jsonb_build_object('pickupCutoffMinutes', c.pickup_cutoff_minutes),
    'applicationState', c.application_state, 'submittedAt', private.owner_instant(c.submitted_at),
    'suspended', c.suspended, 'suspensionVersion', c.suspension_version,
    'latestDecision', (select case when r.decision is null or r.decision_reason is null or r.decided_at is null then null
      else jsonb_build_object('decision', r.decision, 'reason', r.decision_reason, 'decidedAt', private.owner_instant(r.decided_at)) end
      from public.cafe_admin_reasons r where r.cafe_id = c.id),
    'suspensionReason', case when c.suspended then (select r.suspension_reason from public.cafe_admin_reasons r where r.cafe_id = c.id) else null end);
$$;

create function private.owner_replace_hours(cafe uuid, p_hours jsonb) returns void
language sql security invoker set search_path = '' as $$
  delete from public.opening_hours where cafe_id = cafe;
  insert into public.opening_hours(cafe_id, weekday, opens_at, closes_at, closes_next_day)
    select cafe, (x->>'weekday')::integer, (x->>'opensAt')::time, (x->>'closesAt')::time, (x->>'closesNextDay')::boolean
    from jsonb_array_elements(p_hours) x;
$$;

-- Generic duplicate check: another café identity in the workspace, any state,
-- with the same case-insensitive trimmed name/address pair. Serialized per pair.
create function private.owner_pair_taken(workspace uuid, content jsonb, own uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('owner-cafe-pair:' || workspace::text || ':'
    || lower(content->>'name') || chr(31) || lower(content->>'pickupAddress'), 0));
  return exists (select 1 from public.cafes c where c.workspace_id = workspace and c.id is distinct from own
    and lower(private.owner_trim(c.name)) = lower(content->>'name')
    and lower(private.owner_trim(c.pickup_address)) = lower(content->>'pickupAddress'));
end;
$$;

create function private.owner_latest_attempt(cafe uuid) returns public.cafe_application_attempts
language sql stable security invoker set search_path = '' as $$
  select * from public.cafe_application_attempts a where a.cafe_id = cafe order by a.submitted_at desc, a.id desc limit 1;
$$;

create function private.owner_key_attempt(actor public.profiles, key uuid) returns public.cafe_application_attempts
language sql stable security invoker set search_path = '' as $$
  select a.* from public.cafe_application_keys k join public.cafe_application_attempts a on a.id = k.attempt_id
    join public.cafes c on c.id = a.cafe_id
  where k.submission_key = key and c.owner_id = actor.id and c.workspace_id = actor.workspace_id limit 1;
$$;

-- GET /api/owner/cafe: ordinary session-bound RLS read.
create function public.owner_cafe() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare actor public.profiles; c public.cafes;
begin
  actor := private.owner_actor();
  select * into c from public.cafes where owner_id = actor.id and workspace_id = actor.workspace_id order by created_at, id limit 1;
  if c.id is null then return jsonb_build_object('cafe', null); end if;
  return jsonb_build_object('cafe', private.owner_cafe_json(c));
end;
$$;

-- POST /api/owner/applications.
create function public.submit_owner_cafe_application(p_input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor public.profiles; content jsonb; key uuid; c public.cafes; attempt public.cafe_application_attempts; event_time timestamptz;
begin
  actor := private.owner_actor();
  if jsonb_typeof(p_input) is distinct from 'object' or jsonb_typeof(p_input->'submissionKey') is distinct from 'string'
    or (p_input->>'submissionKey') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('error', 'INVALID_REQUEST');
  end if;
  content := private.owner_application_content(p_input - 'submissionKey');
  if content is null then return jsonb_build_object('error', 'INVALID_REQUEST'); end if;
  key := (p_input->>'submissionKey')::uuid;
  -- First creation and resubmission serialize per owner identity.
  perform pg_advisory_xact_lock(hashtextextended('owner-cafe:' || actor.id::text, 0));
  attempt := private.owner_key_attempt(actor, key);
  if attempt.id is not null then
    if attempt.content <> content then return jsonb_build_object('error', 'STATE_CONFLICT'); end if;
    select * into c from public.cafes where id = attempt.cafe_id;
    return jsonb_build_object('cafe', private.owner_cafe_json(c), 'created', false);
  end if;
  select * into c from public.cafes where owner_id = actor.id and workspace_id = actor.workspace_id order by created_at, id limit 1 for update;
  if c.id is not null then
    -- An identical repeat of the latest submitted content returns the existing
    -- application and binds the fresh key; anything else is a conflict.
    attempt := private.owner_latest_attempt(c.id);
    if attempt.id is null or attempt.content <> content then return jsonb_build_object('error', 'STATE_CONFLICT'); end if;
    insert into public.cafe_application_keys(attempt_id, submission_key) values (attempt.id, key);
    return jsonb_build_object('cafe', private.owner_cafe_json(c), 'created', false);
  end if;
  if private.owner_pair_taken(actor.workspace_id, content, null) then return jsonb_build_object('error', 'STATE_CONFLICT'); end if;
  event_time := clock_timestamp();
  insert into public.cafes(workspace_id, owner_id, name, description, area, pickup_address, pickup_cutoff_minutes,
      application_state, suspended, submitted_at)
    values (actor.workspace_id, actor.id, content->>'name', content->>'description', content->>'area', content->>'pickupAddress',
      (content->>'pickupCutoffMinutes')::integer, 'pending', false, event_time)
    returning * into c;
  perform private.owner_replace_hours(c.id, content->'openingHours');
  insert into public.cafe_application_attempts(cafe_id, content, submitted_at) values (c.id, content, event_time) returning * into attempt;
  insert into public.cafe_application_keys(attempt_id, submission_key) values (attempt.id, key);
  return jsonb_build_object('cafe', private.owner_cafe_json(c), 'created', true);
end;
$$;

-- POST /api/owner/cafe/resubmit.
create function public.resubmit_owner_cafe_application(p_input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor public.profiles; content jsonb; key uuid; c public.cafes; attempt public.cafe_application_attempts; event_time timestamptz;
begin
  actor := private.owner_actor();
  if jsonb_typeof(p_input) is distinct from 'object' or jsonb_typeof(p_input->'submissionKey') is distinct from 'string'
    or (p_input->>'submissionKey') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or not (p_input ? 'expectedSuspensionVersion') or not private.owner_version_valid(p_input->'expectedSuspensionVersion') then
    return jsonb_build_object('error', 'INVALID_REQUEST');
  end if;
  content := private.owner_application_content(p_input - array['submissionKey', 'expectedSuspensionVersion']);
  if content is null then return jsonb_build_object('error', 'INVALID_REQUEST'); end if;
  key := (p_input->>'submissionKey')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('owner-cafe:' || actor.id::text, 0));
  -- The café row lock serializes with ADM-01 decisions and ADM-02 suspension.
  select * into c from public.cafes where owner_id = actor.id and workspace_id = actor.workspace_id order by created_at, id limit 1 for update;
  if c.id is null then return jsonb_build_object('error', 'NOT_FOUND'); end if;
  -- Key replay creates nothing, so it precedes the suspension-version guard.
  attempt := private.owner_key_attempt(actor, key);
  if attempt.id is not null then
    if attempt.content <> content then return jsonb_build_object('error', 'STATE_CONFLICT'); end if;
    select * into c from public.cafes where id = attempt.cafe_id;
    return jsonb_build_object('cafe', private.owner_cafe_json(c), 'created', false);
  end if;
  if c.suspension_version <> (p_input->>'expectedSuspensionVersion')::numeric then
    return jsonb_build_object('error', 'STATE_CONFLICT', 'suspension', true);
  end if;
  if c.application_state = 'pending' then
    attempt := private.owner_latest_attempt(c.id);
    if attempt.id is null or attempt.content <> content then return jsonb_build_object('error', 'STATE_CONFLICT'); end if;
    insert into public.cafe_application_keys(attempt_id, submission_key) values (attempt.id, key);
    return jsonb_build_object('cafe', private.owner_cafe_json(c), 'created', false);
  end if;
  if c.application_state <> 'rejected' then return jsonb_build_object('error', 'STATE_CONFLICT'); end if;
  if private.owner_pair_taken(actor.workspace_id, content, c.id) then return jsonb_build_object('error', 'STATE_CONFLICT'); end if;
  event_time := clock_timestamp();
  update public.cafes set name = content->>'name', description = content->>'description', area = content->>'area',
      pickup_address = content->>'pickupAddress', pickup_cutoff_minutes = (content->>'pickupCutoffMinutes')::integer,
      application_state = 'pending', submitted_at = event_time
    where id = c.id returning * into c;
  perform private.owner_replace_hours(c.id, content->'openingHours');
  insert into public.cafe_application_attempts(cafe_id, content, submitted_at) values (c.id, content, event_time) returning * into attempt;
  insert into public.cafe_application_keys(attempt_id, submission_key) values (attempt.id, key);
  return jsonb_build_object('cafe', private.owner_cafe_json(c), 'created', true);
end;
$$;

-- POST /api/owner/cafe/settings: approved cafés only, last committed save wins.
create function public.save_owner_cafe_settings(p_input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor public.profiles; c public.cafes;
begin
  actor := private.owner_actor();
  if jsonb_typeof(p_input) is distinct from 'object'
    or not (p_input ?& array['description','openingHours','pickupSettings','expectedSuspensionVersion'])
    or (p_input - array['description','openingHours','pickupSettings','expectedSuspensionVersion']) <> '{}'::jsonb
    or not private.owner_text_valid(p_input->'description', 0, 500)
    or not private.owner_hours_valid(p_input->'openingHours')
    or jsonb_typeof(p_input->'pickupSettings') is distinct from 'object'
    or not ((p_input->'pickupSettings') ? 'pickupCutoffMinutes')
    or ((p_input->'pickupSettings') - 'pickupCutoffMinutes') <> '{}'::jsonb
    or not private.owner_cutoff_valid(p_input->'pickupSettings'->'pickupCutoffMinutes')
    or not private.owner_version_valid(p_input->'expectedSuspensionVersion') then
    return jsonb_build_object('error', 'INVALID_REQUEST');
  end if;
  select * into c from public.cafes where owner_id = actor.id and workspace_id = actor.workspace_id order by created_at, id limit 1 for update;
  if c.id is null then return jsonb_build_object('error', 'NOT_FOUND'); end if;
  if c.suspension_version <> (p_input->>'expectedSuspensionVersion')::numeric then
    return jsonb_build_object('error', 'STATE_CONFLICT', 'suspension', true);
  end if;
  if c.application_state <> 'approved' then return jsonb_build_object('error', 'STATE_CONFLICT'); end if;
  update public.cafes set description = p_input->>'description',
      pickup_cutoff_minutes = (p_input->'pickupSettings'->>'pickupCutoffMinutes')::integer
    where id = c.id returning * into c;
  perform private.owner_replace_hours(c.id, p_input->'openingHours');
  return jsonb_build_object('cafe', private.owner_cafe_json(c));
end;
$$;

revoke all on function private.owner_actor(), private.owner_trim(text), private.owner_text_valid(jsonb, integer, integer),
  private.owner_hours_valid(jsonb), private.owner_sorted_hours(jsonb), private.owner_cutoff_valid(jsonb),
  private.owner_version_valid(jsonb), private.owner_application_content(jsonb), private.owner_instant(timestamptz),
  private.owner_cafe_json(public.cafes), private.owner_replace_hours(uuid, jsonb), private.owner_pair_taken(uuid, jsonb, uuid),
  private.owner_latest_attempt(uuid), private.owner_key_attempt(public.profiles, uuid)
  from public, anon, authenticated, service_role;
-- The invoker read needs only the actor resolver and projection helpers.
grant execute on function private.owner_actor(), private.owner_instant(timestamptz), private.owner_cafe_json(public.cafes)
  to authenticated;
revoke all on function public.owner_cafe(), public.submit_owner_cafe_application(jsonb),
  public.resubmit_owner_cafe_application(jsonb), public.save_owner_cafe_settings(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.owner_cafe(), public.submit_owner_cafe_application(jsonb),
  public.resubmit_owner_cafe_application(jsonb), public.save_owner_cafe_settings(jsonb) to authenticated;
