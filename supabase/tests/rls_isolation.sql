-- Run in the Supabase SQL editor against a non-production branch when possible.
-- The transaction is rolled back; no test rows are retained.

begin;

create temp table rls_context (
  owner_id uuid,
  stranger_id uuid,
  exam_id uuid,
  material_id uuid,
  quiz_id uuid,
  usage_id uuid,
  bug_id uuid,
  error_id uuid
);

create temp table rls_results (
  test_name text,
  passed boolean,
  observed integer,
  expected integer
);

insert into rls_context
select
  id,
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid()
from public.profiles
order by created_at
limit 1;

insert into public.exams (id, user_id, subject, exam_date)
select exam_id, owner_id, 'RLS test exam', current_date from rls_context;
insert into public.study_materials (id, user_id, title, content)
select material_id, owner_id, 'RLS test material', 'private' from rls_context;
insert into public.generated_quizzes (id, user_id, title, format, questions)
select quiz_id, owner_id, 'RLS test quiz', 'mcq', '[]'::jsonb from rls_context;
insert into public.ai_usage_logs (id, user_id, feature)
select usage_id, owner_id, 'rls_test' from rls_context;
insert into public.bug_reports (id, user_id, title, description)
select bug_id, owner_id, 'RLS test bug', 'private test report' from rls_context;
insert into public.client_error_logs (id, user_id, message)
select error_id, owner_id, 'RLS test error' from rls_context;

grant select on rls_context to authenticated;
grant insert, select on rls_results to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', (select stranger_id::text from rls_context), true);

insert into rls_results
select 'User B cannot read User A profile', count(*) = 0, count(*)::int, 0
from public.profiles where id = (select owner_id from rls_context);
insert into rls_results
select 'User B cannot read User A exam', count(*) = 0, count(*)::int, 0
from public.exams where id = (select exam_id from rls_context);
insert into rls_results
select 'User B cannot read User A material', count(*) = 0, count(*)::int, 0
from public.study_materials where id = (select material_id from rls_context);
insert into rls_results
select 'User B cannot read User A quiz', count(*) = 0, count(*)::int, 0
from public.generated_quizzes where id = (select quiz_id from rls_context);
insert into rls_results
select 'User B cannot read User A AI usage', count(*) = 0, count(*)::int, 0
from public.ai_usage_logs where id = (select usage_id from rls_context);
insert into rls_results
select 'User B cannot read User A bug report', count(*) = 0, count(*)::int, 0
from public.bug_reports where id = (select bug_id from rls_context);
insert into rls_results
select 'User B cannot read User A client error', count(*) = 0, count(*)::int, 0
from public.client_error_logs where id = (select error_id from rls_context);

reset role;
select * from rls_results order by test_name;

-- Fail the script if any policy leaks a row.
do $$
begin
  if exists (select 1 from rls_results where not passed) then
    raise exception 'RLS isolation test failed';
  end if;
end $$;

rollback;
