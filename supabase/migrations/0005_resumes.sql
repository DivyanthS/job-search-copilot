-- Phase 5: one resume per person (the original file plus its text).
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table public.resumes (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- The text the AI uses. People can review and correct it.
  content    text not null check (char_length(content) between 1 and 50000),
  -- The original upload, if any (it's also possible to paste text only).
  file_path  text,
  file_name  text check (file_name is null or char_length(file_name) <= 255),
  file_size  integer check (file_size is null or file_size between 1 and 4194304),
  file_type  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

alter table public.resumes enable row level security;

create policy "Own resume: read"
  on public.resumes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Own resume: add"
  on public.resumes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Own resume: change"
  on public.resumes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own resume: delete"
  on public.resumes for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Private file storage. Files live at "<user id>/<file name>", and each
-- person can only reach files inside their own folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  4194304, -- 4 MB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

create policy "Own resume files: read"
  on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Own resume files: add"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Own resume files: change"
  on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Own resume files: delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
