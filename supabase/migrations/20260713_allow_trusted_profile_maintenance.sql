create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
  trusted_maintenance boolean := session_user in ('postgres', 'supabase_admin') or jwt_role = 'service_role';
begin
  if not trusted_maintenance and not (select private.is_admin()) then
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
