create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    if new.id is distinct from old.id then
      raise exception 'Profile id cannot be changed' using errcode = '42501';
    end if;
    if new.role is distinct from old.role then
      raise exception 'Profile role cannot be changed' using errcode = '42501';
    end if;
    if new.email is distinct from old.email then
      raise exception 'Profile email cannot be changed here' using errcode = '42501';
    end if;
    if new.created_at is distinct from old.created_at then
      raise exception 'Profile creation time cannot be changed' using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.protect_profile_security_fields() from public, anon, authenticated;

drop trigger if exists protect_profile_security_fields_trigger on public.profiles;
create trigger protect_profile_security_fields_trigger
before update on public.profiles
for each row execute function public.protect_profile_security_fields();

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id or (select private.is_admin()))
with check ((select auth.uid()) = id or (select private.is_admin()));
