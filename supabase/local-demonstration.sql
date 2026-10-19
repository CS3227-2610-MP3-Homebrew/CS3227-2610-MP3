-- Explicit local Docker seed data, never a migration or automatic hosted seed.
-- Stable domain identities; random credentials returned only on first creation.
begin;
do $$ begin
  perform pg_catalog.pg_advisory_xact_lock(382039);
end $$;

create temporary table local_demo_accounts (
  id uuid primary key, email text not null, role public.app_role not null,
  password text
) on commit drop;
insert into local_demo_accounts (id, email, role) values
  ('10000000-0000-4000-8000-000000000001', 'customer@homebrew.local', 'customer'),
  ('10000000-0000-4000-8000-000000000002', 'second-customer@homebrew.local', 'customer'),
  ('10000000-0000-4000-8000-000000000003', 'owner@homebrew.local', 'owner'),
  ('10000000-0000-4000-8000-000000000004', 'second-owner@homebrew.local', 'owner'),
  ('10000000-0000-4000-8000-000000000005', 'admin@homebrew.local', 'admin');

-- A pre-existing identity must match this dataset; never take over another account.
do $$ begin
  if exists (
    select 1 from local_demo_accounts a join auth.users u on u.id = a.id or u.email = a.email
      where u.id <> a.id or u.email is distinct from a.email
  ) or exists (
    select 1 from local_demo_accounts a join public.profiles p on p.id = a.id
      join public.workspaces w on w.id = p.workspace_id
      where p.role <> a.role or not w.is_main
  ) then
    raise exception 'Local demonstration account identity conflict';
  end if;
end $$;

update local_demo_accounts a set password = encode(extensions.gen_random_bytes(24), 'hex')
  where not exists (select 1 from auth.users u where u.id = a.id);
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  email, extensions.crypt(password, extensions.gen_salt('bf')), '2020-01-01T00:00:00Z',
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  '2020-01-01T00:00:00Z', '2020-01-01T00:00:00Z', '', '', '', ''
from local_demo_accounts where password is not null;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
select gen_random_uuid(), id, id::text,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', '2020-01-01T00:00:00Z', '2020-01-01T00:00:00Z'
from local_demo_accounts a
where not exists (select 1 from auth.identities i where i.user_id = a.id and i.provider = 'email');

insert into public.profiles (id, workspace_id, role)
select a.id, w.id, a.role from local_demo_accounts a cross join public.workspaces w
  where w.is_main
on conflict (id) do nothing;

insert into public.cafes (id, workspace_id, owner_id, application_state, suspended)
select seed.id, w.id, seed.owner_id, 'approved', false
from (values
  ('20000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000003'::uuid),
  ('20000000-0000-4000-8000-000000000002'::uuid, '10000000-0000-4000-8000-000000000004'::uuid)
) seed(id, owner_id) cross join public.workspaces w where w.is_main
on conflict (id) do nothing;

insert into public.menu_items (id, cafe_id, name) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Local latte'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Local filter coffee')
on conflict (id) do nothing;
insert into public.opening_hours (id, cafe_id, opens_at) values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '09:00:00'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '10:00:00')
on conflict (id) do nothing;
insert into public.orders (id, cafe_id, customer_id, placed_at) values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '2020-01-01T01:00:00Z'),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '2020-01-02T02:00:00Z')
on conflict (id) do nothing;
insert into public.order_items (id, order_id, menu_item_id, cafe_id) values
  ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

select coalesce(json_agg(json_build_object('email', email, 'password', password) order by id), '[]'::json)
  from local_demo_accounts where password is not null;
commit;
