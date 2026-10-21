-- Only server account provisioning may insert a protected signup profile.
-- Identity creation deliberately carries no role metadata, preserving the
-- existing trigger boundary while allowing bounded compensation on failure.
create function public.create_signup_profile(identity_id uuid, selected_role text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  main_workspace uuid;
begin
  if selected_role not in ('customer', 'owner') or selected_role is null then
    raise check_violation using message = 'Unsupported signup role';
  end if;
  select id into strict main_workspace from public.workspaces where is_main;
  insert into public.profiles(id, workspace_id, role)
    values (identity_id, main_workspace, selected_role::public.app_role);
  return pg_catalog.jsonb_build_object('id', identity_id, 'workspaceId', main_workspace, 'role', selected_role);
end;
$$;
revoke all on function public.create_signup_profile(uuid, text) from public, anon, authenticated, service_role;
grant usage on schema public to service_role;
grant execute on function public.create_signup_profile(uuid, text) to service_role;
