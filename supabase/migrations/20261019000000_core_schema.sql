-- Foundation only: product fields, lifecycle rules and the role matrix are additive.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;
revoke all on schema public from public, anon, authenticated, service_role;
grant usage on schema public to authenticated;

-- New objects require deliberate grants, even in an exposed schema.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private
  revoke all on functions from public, anon, authenticated, service_role;

create type public.app_role as enum ('customer', 'owner', 'admin');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  is_main boolean not null default false
);
create unique index workspaces_one_main on public.workspaces (is_main) where is_main;
insert into public.workspaces (id, is_main)
  values ('00000000-0000-4000-8000-000000000001', true);

create table public.profiles (
  id uuid primary key references auth.users (id),
  workspace_id uuid not null references public.workspaces (id),
  role public.app_role not null,
  unique (id, workspace_id)
);

create table public.cafes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id),
  owner_id uuid not null,
  foreign key (owner_id, workspace_id) references public.profiles (id, workspace_id)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes (id),
  unique (id, cafe_id)
);

create table public.opening_hours (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes (id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes (id),
  customer_id uuid not null references public.profiles (id),
  unique (id, cafe_id),
  unique (id, customer_id)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  menu_item_id uuid not null,
  cafe_id uuid not null,
  foreign key (order_id, cafe_id) references public.orders (id, cafe_id),
  foreign key (menu_item_id, cafe_id) references public.menu_items (id, cafe_id)
);

-- A review's cafe is derived from its order; it has no independently writable cafe edge.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique,
  customer_id uuid not null references public.profiles (id),
  foreign key (order_id, customer_id) references public.orders (id, customer_id)
);

create index profiles_workspace on public.profiles (workspace_id);
create index cafes_owner_workspace on public.cafes (owner_id, workspace_id);
create index cafes_workspace on public.cafes (workspace_id);
create index menu_items_cafe on public.menu_items (cafe_id);
create index opening_hours_cafe on public.opening_hours (cafe_id);
create index orders_customer on public.orders (customer_id);
create index orders_cafe on public.orders (cafe_id);
create index order_items_order_cafe on public.order_items (order_id, cafe_id);
create index order_items_menu_cafe on public.order_items (menu_item_id, cafe_id);
create index reviews_customer on public.reviews (customer_id);

-- Orders inherit workspace through their cafe, without storing another workspace column.
-- SHARE locks also serialize against parent workspace updates until transaction end.
create function private.check_order_workspace() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  actor_workspace uuid;
  cafe_workspace uuid;
begin
  select workspace_id into actor_workspace from public.profiles
    where id = new.customer_id for share;
  select workspace_id into cafe_workspace from public.cafes
    where id = new.cafe_id for share;
  if actor_workspace is distinct from cafe_workspace then
    raise check_violation using message = 'Order customer and cafe must share a workspace';
  end if;
  return new;
end;
$$;
revoke all on function private.check_order_workspace() from public, anon, authenticated, service_role;
create trigger orders_workspace before insert or update of customer_id, cafe_id
  on public.orders for each row execute function private.check_order_workspace();

-- Protect the reverse edges too: changing a parent must not invalidate existing orders.
-- Cafe-owner changes are already protected in both directions by the composite FK.
create function private.check_profile_workspace_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    perform 1 from public.orders o join public.cafes c on c.id = o.cafe_id
      where o.customer_id = old.id and c.workspace_id <> new.workspace_id
      for share of c;
    if found then
      raise check_violation using message = 'Profile workspace must match its existing orders';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.check_profile_workspace_change() from public, anon, authenticated, service_role;
create trigger profiles_workspace_change before update of workspace_id
  on public.profiles for each row execute function private.check_profile_workspace_change();

create function private.check_cafe_workspace_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    perform 1 from public.orders o join public.profiles p on p.id = o.customer_id
      where o.cafe_id = old.id and p.workspace_id <> new.workspace_id
      for share of p;
    if found then
      raise check_violation using message = 'Cafe workspace must match its existing orders';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.check_cafe_workspace_change() from public, anon, authenticated, service_role;
create trigger cafes_workspace_change before update of workspace_id
  on public.cafes for each row execute function private.check_cafe_workspace_change();

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.cafes enable row level security;
alter table public.menu_items enable row level security;
alter table public.opening_hours enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
revoke all on all tables in schema public from public, anon, authenticated, service_role;
revoke all on all sequences in schema public from public, anon, authenticated, service_role;

-- Baseline role lookup only. All other product operations await their owning role matrix.
grant select on public.profiles to authenticated;
create policy profiles_read_self on public.profiles for select to authenticated
  using (id = (select auth.uid()));

-- Automatically protect new public tables as well as explicitly enabling RLS above.
-- Unexposed application schemas still require explicit RLS and are checked by db:check.
create function private.enable_public_table_rls() returns event_trigger
language plpgsql security definer set search_path = '' as $$
declare
  relation record;
begin
  for relation in
    select c.oid from pg_event_trigger_ddl_commands() d
      join pg_catalog.pg_class c on c.oid = d.objid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where d.classid = 'pg_catalog.pg_class'::regclass and not d.in_extension
        and n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute pg_catalog.format('alter table %s enable row level security', relation.oid::regclass);
  end loop;
end;
$$;
revoke all on function private.enable_public_table_rls() from public, anon, authenticated, service_role;
create event trigger homebrew_public_table_rls on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function private.enable_public_table_rls();
