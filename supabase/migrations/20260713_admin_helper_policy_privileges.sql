-- The helper is in the non-exposed private schema. Authenticated users need EXECUTE
-- for RLS policies to evaluate it; anon/public callers do not.
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;
