-- Phase 3: details read from job postings.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

alter table public.jobs
  add column description text check (description is null or char_length(description) <= 60000),
  add column salary      text check (salary is null or char_length(salary) <= 200),
  add column work_mode   text check (work_mode is null or work_mode in ('remote', 'hybrid', 'onsite'));
