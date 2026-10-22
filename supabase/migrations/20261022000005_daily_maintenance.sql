-- Only maintenance RPCs may access reservation state. No credential is stored here.
create table private.maintenance_provisioning (
  step text primary key check (step in ('admin','showcase')),
  token uuid not null,
  email text not null,
  lease_until timestamptz,
  cafe_id uuid references public.cafes(id)
);
alter table private.maintenance_provisioning enable row level security;
revoke all on private.maintenance_provisioning from public,anon,authenticated,service_role;

-- Short transactional locks protect admission/publication across app instances.
-- Main Admin's lease fences Auth creation: other callers return conflict without
-- creating identities. An interrupted run never promotes an existing account.
create function public.prepare_maintenance(p_step text,p_email text)
returns table(outcome text,count integer,token uuid,email text,user_id uuid)
language plpgsql security definer set search_path = '' as $$
declare slot private.maintenance_provisioning; main_id uuid; existing_user uuid;
begin
  if p_step is null or p_step not in ('admin','showcase') then raise exception 'Invalid maintenance step'; end if;
  perform pg_advisory_xact_lock(1364607821,1);
  select id into strict main_id from public.workspaces where is_main;
  select * into slot from private.maintenance_provisioning m where m.step=p_step for update;
  if p_step='admin' then
    if exists(select 1 from public.profiles p where p.workspace_id=main_id and p.role='admin') then
      return query select 'success',0,null::uuid,null::text,null::uuid; return;
    end if;
    if p_email is null or char_length(p_email) not between 3 and 320 then raise exception 'Invalid maintenance configuration'; end if;
    if exists(select 1 from auth.users u where lower(u.email)=lower(p_email))
      or slot.lease_until>clock_timestamp() then
      return query select 'conflict',0,null::uuid,null::text,null::uuid; return;
    end if;
    insert into private.maintenance_provisioning as m(step,token,email,lease_until)
      values('admin',gen_random_uuid(),p_email,clock_timestamp()+interval '2 minutes')
      on conflict(step) do update set token=excluded.token,email=excluded.email,lease_until=excluded.lease_until
      returning m.* into slot;
  else
    if slot.cafe_id is not null then
      return query select 'success',0,null::uuid,null::text,null::uuid; return;
    end if;
    if slot.token is null then
      insert into private.maintenance_provisioning as m(step,token,email)
        values('showcase',gen_random_uuid(),'showcase-'||gen_random_uuid()::text||'@example.com') returning m.* into slot;
    end if;
    select u.id into existing_user from auth.users u where u.email=slot.email
      and u.raw_app_meta_data->>'maintenance_token'=slot.token::text;
  end if;
  return query select 'create',0,slot.token,slot.email,existing_user;
end;
$$;

create function public.publish_maintenance(p_step text,p_token uuid,p_user uuid)
returns table(outcome text,count integer)
language plpgsql security definer set search_path = '' as $$
declare slot private.maintenance_provisioning; main_id uuid; identity_id uuid; cafe uuid;
begin
  if p_step is null or p_step not in ('admin','showcase') or p_token is null then raise exception 'Invalid maintenance publication'; end if;
  perform pg_advisory_xact_lock(1364607821,1);
  select id into strict main_id from public.workspaces where is_main;
  select * into slot from private.maintenance_provisioning m where m.step=p_step for update;
  if slot.token is distinct from p_token then
    return query select 'conflict',0; return;
  end if;
  if p_step='admin' and exists(select 1 from public.profiles p where p.workspace_id=main_id and p.role='admin') then
    return query select 'success',0; return;
  end if;
  if p_step='showcase' and slot.cafe_id is not null then
    return query select 'success',0; return;
  end if;
  -- App metadata is writable only through privileged Auth APIs, unlike user metadata.
  select u.id into identity_id from auth.users u where u.email=slot.email
    and u.raw_app_meta_data->>'maintenance_token'=slot.token::text and u.email_confirmed_at is not null
    and (p_user is null or u.id=p_user) for update;
  if identity_id is null or (p_step='admin' and (p_user is null or slot.lease_until<=clock_timestamp()))
    or exists(select 1 from public.profiles p where p.id=identity_id) then
    return query select 'conflict',0; return;
  end if;
  if p_step='admin' then
    insert into public.profiles(id,workspace_id,role) values(identity_id,main_id,'admin');
    update private.maintenance_provisioning m set lease_until=null where m.step='admin';
  else
    cafe := gen_random_uuid();
    insert into public.profiles(id,workspace_id,role) values(identity_id,main_id,'owner');
    insert into public.cafes(id,workspace_id,owner_id,name,description,area,pickup_address,application_state,suspended,pickup_cutoff_minutes)
      values(cafe,main_id,identity_id,'Homebrew Showcase','Explore the menu of a home café. Use a demo kit to try the full ordering journey.','Central','12 Showcase Lane, Singapore','approved',false,15);
    insert into public.menu_items(cafe_id,name,drink_type,price_cents,sold_out)
      values(cafe,'Iced latte','coffee',550,false),(cafe,'Matcha latte','matcha',650,false);
    insert into public.opening_hours(cafe_id,weekday,opens_at,closes_at,closes_next_day)
      select cafe,i,'09:00'::time,'18:00'::time,false from generate_series(1,7) i;
    update private.maintenance_provisioning m set cafe_id=cafe where m.step='showcase';
  end if;
  return query select 'success',1;
end;
$$;
revoke all on function public.prepare_maintenance(text,text),public.publish_maintenance(text,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.prepare_maintenance(text,text),public.publish_maintenance(text,uuid,uuid) to service_role;
