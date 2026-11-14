-- Phase 6: application kits and AI usage tracking.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- ---------------------------------------------------------------------------
-- One kit per job. Each section can be edited after it's generated.
-- ---------------------------------------------------------------------------
create table public.kits (
  job_id              uuid primary key references public.jobs (id) on delete cascade,
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cover_letter        text check (cover_letter is null or char_length(cover_letter) <= 20000),
  resume_bullets      text check (resume_bullets is null or char_length(resume_bullets) <= 20000),
  interview_questions text check (interview_questions is null or char_length(interview_questions) <= 20000),
  company_brief       text check (company_brief is null or char_length(company_brief) <= 30000),
  -- [{ url, title }] used for the company brief
  sources             jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  model               text,
  generated_at        timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index kits_user_idx on public.kits (user_id);

create trigger kits_set_updated_at
  before update on public.kits
  for each row execute function public.set_updated_at();

alter table public.kits enable row level security;

-- A kit can only be attached to one of your own jobs.
create policy "Own kits: read"
  on public.kits for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Own kits: add"
  on public.kits for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.jobs j where j.id = job_id and j.user_id = (select auth.uid()))
  );

create policy "Own kits: change"
  on public.kits for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own kits: delete"
  on public.kits for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- AI usage: one row per kit generated (or failed sections retried).
-- People can add rows and read their own, but never change or delete them,
-- so the monthly limit can't be reset by hand.
-- ---------------------------------------------------------------------------
create table public.kit_usage (
  id                bigint generated always as identity primary key,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_id            uuid references public.jobs (id) on delete set null,
  kind              text not null default 'kit' check (kind in ('kit', 'retry')),
  model             text,
  prompt_tokens     integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  cost_usd          numeric(10, 5) not null default 0 check (cost_usd >= 0),
  created_at        timestamptz not null default now()
);

create index kit_usage_user_month_idx on public.kit_usage (user_id, created_at);

alter table public.kit_usage enable row level security;

create policy "Own usage: read, admins read all"
  on public.kit_usage for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "Own usage: add"
  on public.kit_usage for insert to authenticated
  with check (user_id = (select auth.uid()));

-- How many kits someone has generated this calendar month (UTC).
create or replace function public.kits_used_this_month()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.kit_usage
  where user_id = (select auth.uid())
    and kind = 'kit'
    and created_at >= date_trunc('month', now());
$$;
