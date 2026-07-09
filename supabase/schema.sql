-- Nibras v1 Supabase schema
-- Applied to project: syhypibwebtfqzqlvrlh
-- Project URL: https://syhypibwebtfqzqlvrlh.supabase.co

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin', 'developer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  exam_date date not null,
  exam_time time,
  location text,
  notes text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  material_type text not null default 'text',
  content text,
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.generated_quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_material_id uuid references public.study_materials(id) on delete set null,
  format text not null,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_key text,
  feature text not null,
  provider text,
  model text,
  prompt_chars int not null default 0,
  prompt_tokens int,
  completion_tokens int,
  created_at timestamptz not null default now()
);

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null,
  severity text not null default 'normal' check (severity in ('low', 'normal', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'reviewing', 'fixed', 'wont_fix')),
  created_at timestamptz not null default now()
);

create index if not exists idx_exams_user_id on public.exams(user_id);
create index if not exists idx_study_materials_user_id on public.study_materials(user_id);
create index if not exists idx_generated_quizzes_user_id on public.generated_quizzes(user_id);
create index if not exists idx_generated_quizzes_source_material_id on public.generated_quizzes(source_material_id);
create index if not exists idx_ai_usage_logs_user_id on public.ai_usage_logs(user_id);
create index if not exists idx_ai_usage_logs_anonymous_key_created_at on public.ai_usage_logs(anonymous_key, created_at desc);
create index if not exists idx_ai_usage_logs_created_at on public.ai_usage_logs(created_at desc);
create index if not exists idx_bug_reports_user_id on public.bug_reports(user_id);
create index if not exists idx_bug_reports_status on public.bug_reports(status);

alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.study_materials enable row level security;
alter table public.generated_quizzes enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.bug_reports enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'developer')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Security-definer helpers should not be directly callable through RPC.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.is_admin() from anon, authenticated, public;

create policy "profiles_select_own_or_admin"
on public.profiles for select
using ((select auth.uid()) = id or (select public.is_admin()));

create policy "profiles_insert_own"
on public.profiles for insert
with check ((select auth.uid()) = id);

create policy "profiles_update_own_or_admin"
on public.profiles for update
using ((select auth.uid()) = id or (select public.is_admin()))
with check (
  (select public.is_admin())
  or ((select auth.uid()) = id and role = (select p.role from public.profiles p where p.id = (select auth.uid())))
);

create policy "exams_manage_own"
on public.exams for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "materials_manage_own"
on public.study_materials for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "quizzes_manage_own"
on public.generated_quizzes for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "usage_select_own_or_admin"
on public.ai_usage_logs for select
using ((select auth.uid()) = user_id or (select public.is_admin()));

create policy "usage_insert_own_or_anonymous"
on public.ai_usage_logs for insert
with check ((select auth.uid()) = user_id or user_id is null);

create policy "bug_reports_insert_own_or_anonymous"
on public.bug_reports for insert
with check ((select auth.uid()) = user_id or user_id is null);

create policy "bug_reports_select_own_or_admin"
on public.bug_reports for select
using ((select auth.uid()) = user_id or (select public.is_admin()));

create policy "admins_update_bug_reports"
on public.bug_reports for update
using ((select public.is_admin()))
with check ((select public.is_admin()));
