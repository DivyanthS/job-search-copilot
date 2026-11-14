-- Phase 4: priority, follow-up reminders, interviews, contacts and notes.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

alter table public.jobs
  -- 0 = not set, 1–3 stars
  add column priority     smallint not null default 0 check (priority between 0 and 3),
  add column follow_up_on date,
  add column notes        text check (notes is null or char_length(notes) <= 20000),
  -- [{ id, name, role, email, phone }]
  add column contacts     jsonb not null default '[]'::jsonb
    check (jsonb_typeof(contacts) = 'array' and jsonb_array_length(contacts) <= 20),
  -- [{ id, date: "YYYY-MM-DD", time: "HH:MM" or "", label }]
  add column interviews   jsonb not null default '[]'::jsonb
    check (jsonb_typeof(interviews) = 'array' and jsonb_array_length(interviews) <= 30);

create index jobs_user_follow_up_idx on public.jobs (user_id, follow_up_on) where follow_up_on is not null;
