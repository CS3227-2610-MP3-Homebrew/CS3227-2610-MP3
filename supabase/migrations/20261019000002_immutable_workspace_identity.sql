-- Workspace membership defines the identity boundary; no relocation operation is granted.
-- Checking reverse edges with SELECT alone is unsafe under an older transaction snapshot.
-- Keep the boundary fixed so all actor/cafe checks hold at every isolation level.
create function private.keep_workspace_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise check_violation using message = 'Workspace membership cannot be reassigned';
  end if;
  return new;
end;
$$;
revoke all on function private.keep_workspace_identity() from public, anon, authenticated, service_role;

drop trigger profiles_workspace_change on public.profiles;
drop trigger cafes_workspace_change on public.cafes;
drop function private.check_profile_workspace_change();
drop function private.check_cafe_workspace_change();

create trigger profiles_workspace_identity before update of workspace_id on public.profiles
  for each row execute function private.keep_workspace_identity();
create trigger cafes_workspace_identity before update of workspace_id on public.cafes
  for each row execute function private.keep_workspace_identity();
