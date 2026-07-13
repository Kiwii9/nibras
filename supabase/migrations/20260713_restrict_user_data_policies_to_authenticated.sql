drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "exams_manage_own" on public.exams;
create policy "exams_manage_own"
on public.exams for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "materials_manage_own" on public.study_materials;
create policy "materials_manage_own"
on public.study_materials for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "quizzes_manage_own" on public.generated_quizzes;
create policy "quizzes_manage_own"
on public.generated_quizzes for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "usage_select_own_or_admin" on public.ai_usage_logs;
create policy "usage_select_own_or_admin"
on public.ai_usage_logs for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));

drop policy if exists "bug_reports_insert_own_or_anonymous" on public.bug_reports;
drop policy if exists "bug_reports_insert_own" on public.bug_reports;
create policy "bug_reports_insert_own"
on public.bug_reports for insert to authenticated
with check ((select auth.uid()) = user_id and user_id is not null);

drop policy if exists "bug_reports_select_own_or_admin" on public.bug_reports;
create policy "bug_reports_select_own_or_admin"
on public.bug_reports for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));

drop policy if exists "admins_update_bug_reports" on public.bug_reports;
create policy "admins_update_bug_reports"
on public.bug_reports for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
