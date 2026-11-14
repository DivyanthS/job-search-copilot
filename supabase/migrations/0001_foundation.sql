-- Phase 1: accounts, invite-only sign-up, admin role.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- ---------------------------------------------------------------------------
-- Invite list: only these emails can create an account.
-- ---------------------------------------------------------------------------
create table public.invites (
  email       text primary key check (email = lower(email)),
  role        text not null default 'member' check (role in ('admin', 'member')),
  invited_by  uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- One profile per signed-in person.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text not null,
  full_name         text,
  role              text not null default 'member' check (role in ('admin', 'member')),
  monthly_kit_limit integer not null default 30 check (monthly_kit_limit >= 0),
  created_at        timestamptz not null default now()
);

-- True when the signed-in person is an admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- When someone signs up: block them unless invited, otherwise create profile.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invites%rowtype;
begin
  select * into inv from public.invites where email = lower(new.email);
  if not found then
    raise exception 'not_invited: % is not on the invite list', new.email;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    inv.role
  );

  update public.invites set accepted_at = now() where email = inv.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Members may change their own name, but not their role or kit limit.
-- (Edits made in the Supabase dashboard are not restricted.)
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' and not public.is_admin() then
    if new.id <> old.id
       or new.email <> old.email
       or new.role <> old.role
       or new.monthly_kit_limit <> old.monthly_kit_limit then
      raise exception 'Only an admin can change role, email or kit limit';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------------
-- Row Level Security: who can see and change which rows.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.invites  enable row level security;

create policy "Read own profile, admins read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "Update own profile, admins update all"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

create policy "Admins manage invites"
  on public.invites for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
