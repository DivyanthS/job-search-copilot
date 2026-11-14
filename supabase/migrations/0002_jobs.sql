-- Phase 2: jobs on the pipeline board.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status      text not null default 'wishlist'
              check (status in ('wishlist', 'applied', 'interviewing', 'offer', 'rejected')),
  -- Order within a column: smaller numbers are higher up.
  position    double precision not null default 0,
  title       text not null check (char_length(title) between 1 and 200),
  company     text not null check (char_length(company) between 1 and 200),
  url         text check (url is null or char_length(url) <= 2000),
  location    text check (location is null or char_length(location) <= 200),
  applied_on  date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index jobs_user_status_position_idx on public.jobs (user_id, status, position);

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- Everyone sees and changes only their own jobs.
alter table public.jobs enable row level security;

create policy "Own jobs: read"
  on public.jobs for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Own jobs: add"
  on public.jobs for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Own jobs: change"
  on public.jobs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own jobs: delete"
  on public.jobs for delete to authenticated
  using (user_id = (select auth.uid()));
