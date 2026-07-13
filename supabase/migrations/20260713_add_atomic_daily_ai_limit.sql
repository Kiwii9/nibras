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
    when 'ai_daily' then v_limit := 25; v_window_seconds := 86400;
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
