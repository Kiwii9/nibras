alter table public.profiles
  add column if not exists accepted_terms_at timestamptz,
  add column if not exists accepted_privacy_at timestamptz,
  add column if not exists accepted_security_notice_at timestamptz,
  add column if not exists accepted_policy_version text,
  add column if not exists cookie_preferences jsonb not null default '{"essential": true, "analytics": false}'::jsonb;

create table if not exists private.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, scope, window_start)
);

revoke all on private.api_rate_limits from public, anon, authenticated;
create index if not exists idx_private_api_rate_limits_updated_at on private.api_rate_limits(updated_at);

create table if not exists public.client_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 1000),
  stack text check (stack is null or char_length(stack) <= 8000),
  route text check (route is null or char_length(route) <= 500),
  user_agent text check (user_agent is null or char_length(user_agent) <= 1000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_client_error_logs_user_created_at on public.client_error_logs(user_id, created_at desc);
create index if not exists idx_client_error_logs_created_at on public.client_error_logs(created_at desc);
alter table public.client_error_logs enable row level security;

drop policy if exists "client_errors_insert_own" on public.client_error_logs;
create policy "client_errors_insert_own"
on public.client_error_logs for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "client_errors_select_own_or_admin" on public.client_error_logs;
create policy "client_errors_select_own_or_admin"
on public.client_error_logs for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));

create or replace function public.consume_rate_limit(p_scope text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_limit integer;
  v_window_seconds integer;
  v_window_start timestamptz;
  v_count integer;
  v_reset_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  case p_scope
    when 'ai_burst' then v_limit := 12; v_window_seconds := 60;
    when 'client_error' then v_limit := 10; v_window_seconds := 3600;
    when 'bug_report' then v_limit := 5; v_window_seconds := 3600;
    else raise exception 'Unknown rate-limit scope' using errcode = '22023';
  end case;

  v_window_start := to_timestamp(floor(extract(epoch from clock_timestamp()) / v_window_seconds) * v_window_seconds);
  v_reset_at := v_window_start + make_interval(secs => v_window_seconds);

  insert into private.api_rate_limits (user_id, scope, window_start, request_count, updated_at)
  values (v_user_id, p_scope, v_window_start, 1, now())
  on conflict (user_id, scope, window_start)
  do update set request_count = private.api_rate_limits.request_count + 1, updated_at = now()
  returning request_count into v_count;

  delete from private.api_rate_limits where updated_at < now() - interval '7 days';

  return jsonb_build_object(
    'allowed', v_count <= v_limit,
    'limit', v_limit,
    'used', v_count,
    'remaining', greatest(v_limit - v_count, 0),
    'reset_at', v_reset_at
  );
end;
$$;

revoke all on function public.consume_rate_limit(text) from public, anon;
grant execute on function public.consume_rate_limit(text) to authenticated;
