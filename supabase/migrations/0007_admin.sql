-- Phase 7: usage numbers for the admin page.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- Per-person AI usage. Only admins may call it.
create or replace function public.admin_usage_summary()
returns table (
  user_id          uuid,
  kits_this_month  integer,
  cost_this_month  numeric,
  kits_total       integer,
  cost_total       numeric,
  last_used_at     timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can see usage';
  end if;

  return query
  select
    u.user_id,
    (count(*) filter (where u.kind = 'kit' and u.created_at >= date_trunc('month', now())))::integer,
    coalesce(sum(u.cost_usd) filter (where u.created_at >= date_trunc('month', now())), 0),
    (count(*) filter (where u.kind = 'kit'))::integer,
    coalesce(sum(u.cost_usd), 0),
    max(u.created_at)
  from public.kit_usage u
  group by u.user_id;
end;
$$;

revoke execute on function public.admin_usage_summary() from anon;
