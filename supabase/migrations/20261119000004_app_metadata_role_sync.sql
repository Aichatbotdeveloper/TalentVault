-- GoTrue writes app_metadata in a separate UPDATE after inserting the user, so the
-- insert trigger cannot see `tv_role`. Sync administrator roles on update as well.
-- app_metadata is only writable with the service role, never by end users.
create or replace function public.handle_user_app_metadata_change()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role text := new.raw_app_meta_data ->> 'tv_role';
begin
  if v_role is distinct from (old.raw_app_meta_data ->> 'tv_role')
     and v_role in ('super_admin', 'recruitment_admin') then
    update public.profiles
       set role = v_role::public.user_role
     where id = new.id
       and employer_id is null; -- never convert an employer organisation account
  end if;
  return new;
end;
$$;

create trigger on_auth_user_app_metadata_changed
  after update of raw_app_meta_data on auth.users
  for each row execute function public.handle_user_app_metadata_change();

revoke execute on function public.handle_user_app_metadata_change() from public, anon, authenticated;
