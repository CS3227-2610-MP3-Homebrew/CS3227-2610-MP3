-- Shared permission fields only; story-specific payloads and transitions remain additive.
create type public.cafe_application_state as enum ('pending', 'approved', 'rejected');
create type public.review_moderation_state as enum ('pending', 'kept', 'hidden');

alter table public.cafes
  add column application_state public.cafe_application_state not null default 'pending',
  add column suspended boolean not null default false;
alter table public.menu_items add column name text not null default '';
alter table public.opening_hours add column opens_at time without time zone not null default '09:00:00';
alter table public.orders add column placed_at timestamptz not null default now();
alter table public.reviews
  add column moderation_state public.review_moderation_state not null default 'pending';

-- These predicates deliberately bypass parent RLS: review visibility, for example,
-- must not require permission to read another customer's underlying order.
-- Every predicate derives identity/role/workspace from the protected profile.
create function private.cafe_permission(target uuid, allowed_roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.cafes c join public.profiles p on p.workspace_id = c.workspace_id
    where c.id = target and p.id = (select auth.uid()) and p.role = any(allowed_roles)
      and (p.role = 'admin'
        or (p.role = 'owner' and c.owner_id = p.id)
        or (p.role = 'customer' and c.application_state = 'approved' and not c.suspended))
  );
$$;

create function private.order_permission(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders o join public.cafes c on c.id = o.cafe_id
      join public.profiles p on p.workspace_id = c.workspace_id
    where o.id = target and p.id = (select auth.uid())
      and ((p.role = 'customer' and o.customer_id = p.id)
        or (p.role = 'owner' and c.owner_id = p.id))
  );
$$;

create function private.review_permission(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.reviews r join public.orders o on o.id = r.order_id
      join public.cafes c on c.id = o.cafe_id
      join public.profiles p on p.workspace_id = c.workspace_id
    where r.id = target and p.id = (select auth.uid())
      and (p.role = 'admin' or (p.role = 'customer' and
        (r.customer_id = p.id or (r.moderation_state in ('pending', 'kept')
          and c.application_state = 'approved' and not c.suspended))))
  );
$$;

revoke all on function private.cafe_permission(uuid, public.app_role[]) from public, anon, authenticated, service_role;
revoke all on function private.order_permission(uuid) from public, anon, authenticated, service_role;
revoke all on function private.review_permission(uuid) from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;
grant execute on function private.cafe_permission(uuid, public.app_role[]) to authenticated;
grant execute on function private.order_permission(uuid) to authenticated;
grant execute on function private.review_permission(uuid) to authenticated;

grant select on public.cafes, public.menu_items, public.opening_hours,
  public.orders, public.order_items, public.reviews to authenticated;
-- Column grants prevent changing identity/parent ownership, including between two
-- cafes belonging to the same owner. No generic protected-state write is granted.
grant update (name) on public.menu_items to authenticated;
grant update (opens_at) on public.opening_hours to authenticated;

create policy cafes_read on public.cafes for select to authenticated
  using (private.cafe_permission(id, array['customer', 'owner', 'admin']::public.app_role[]));
create policy menu_read on public.menu_items for select to authenticated
  using (private.cafe_permission(cafe_id, array['customer', 'owner']::public.app_role[]));
create policy hours_read on public.opening_hours for select to authenticated
  using (private.cafe_permission(cafe_id, array['customer', 'owner']::public.app_role[]));
create policy menu_owner_update on public.menu_items for update to authenticated
  using (private.cafe_permission(cafe_id, array['owner']::public.app_role[]))
  with check (private.cafe_permission(cafe_id, array['owner']::public.app_role[]));
create policy hours_owner_update on public.opening_hours for update to authenticated
  using (private.cafe_permission(cafe_id, array['owner']::public.app_role[]))
  with check (private.cafe_permission(cafe_id, array['owner']::public.app_role[]));
create policy orders_read on public.orders for select to authenticated
  using (private.order_permission(id));
create policy order_items_read on public.order_items for select to authenticated
  using (private.order_permission(order_id));
create policy reviews_read on public.reviews for select to authenticated
  using (private.review_permission(id));

-- Auth accepts a selected role as input, never authority. Only these two values
-- can provision an application profile, always in the protected main workspace.
-- Platform/maintenance inserts without a selection create no application role;
-- their owning privileged operation must explicitly create a protected profile.
create function private.provision_signup_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  selected_role text := new.raw_user_meta_data ->> 'role';
  main_workspace uuid;
begin
  if selected_role is null then
    return new;
  end if;
  if selected_role not in ('customer', 'owner') then
    raise check_violation using message = 'Unsupported signup role';
  end if;
  select id into strict main_workspace from public.workspaces where is_main;
  insert into public.profiles (id, workspace_id, role)
    values (new.id, main_workspace, selected_role::public.app_role);
  return new;
end;
$$;
revoke all on function private.provision_signup_profile() from public, anon, authenticated, service_role;
create trigger homebrew_signup_profile after insert on auth.users
  for each row execute function private.provision_signup_profile();
