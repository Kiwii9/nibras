-- Nibras v1 Supabase starter schema
-- Run this in Supabase SQL editor before replacing local demo auth.

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

alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.study_materials enable row level security;
alter table public.generated_quizzes enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.bug_reports enable row level security;

create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);

create policy "exams_manage_own"
on public.exams for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "materials_manage_own"
on public.study_materials for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "quizzes_manage_own"
on public.generated_quizzes for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "usage_select_own"
on public.ai_usage_logs for select
using (auth.uid() = user_id);

create policy "bug_reports_insert_own"
on public.bug_reports for insert
with check (auth.uid() = user_id or user_id is null);

create policy "bug_reports_select_own"
on public.bug_reports for select
using (auth.uid() = user_id);

-- Admin helper. Use carefully; role is stored in profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'developer')
  );
$$;

create policy "admins_read_usage_logs"
on public.ai_usage_logs for select
using (public.is_admin());

create policy "admins_manage_bug_reports"
on public.bug_reports for all
using (public.is_admin())
with check (public.is_admin());
