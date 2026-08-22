create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.cosplay_site_visitors (
  visitor_hash text primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  visit_count bigint not null default 1 check (visit_count > 0)
);

alter table private.cosplay_site_visitors enable row level security;
revoke all on table private.cosplay_site_visitors from public, anon, authenticated;

drop policy if exists "deny_direct_visitor_access"
on private.cosplay_site_visitors;

create policy "deny_direct_visitor_access"
on private.cosplay_site_visitors
as restrictive
for all
to public
using (false)
with check (false);

drop function if exists public.register_cosplay_site_visitor(text);
drop function if exists public.cosplay_unique_visitor_count();
drop table if exists public.cosplay_site_visitors;

create or replace function public.register_cosplay_anonymous_visit(p_visitor_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visitor_id text := lower(btrim(p_visitor_id));
  v_hash text;
begin
  if v_visitor_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'invalid anonymous visitor id' using errcode = '22023';
  end if;

  v_hash := encode(extensions.digest(v_visitor_id, 'sha256'), 'hex');

  insert into private.cosplay_site_visitors (visitor_hash)
  values (v_hash)
  on conflict (visitor_hash) do update
    set last_seen_at = now(),
        visit_count = private.cosplay_site_visitors.visit_count
          + case
              when private.cosplay_site_visitors.last_seen_at <= now() - interval '5 seconds' then 1
              else 0
            end;
end;
$$;

revoke all on function public.register_cosplay_anonymous_visit(text)
from public, anon, authenticated;
grant execute on function public.register_cosplay_anonymous_visit(text)
to anon, authenticated;

create or replace function public.cosplay_site_visitor_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null or not exists (
    select 1
    from public.cosplay_admins
    where user_id = v_user_id
  ) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'unique_visitors', count(*)::bigint,
    'total_visits', coalesce(sum(visit_count), 0)::bigint
  )
  into v_result
  from private.cosplay_site_visitors;

  return v_result;
end;
$$;

revoke all on function public.cosplay_site_visitor_summary()
from public, anon, authenticated;
grant execute on function public.cosplay_site_visitor_summary()
to authenticated;

comment on table private.cosplay_site_visitors is
  'Anonymous browser analytics. Stores only SHA-256 hashes of random browser UUIDs; no IP addresses.';
comment on function public.register_cosplay_anonymous_visit(text) is
  'Registers an anonymous browser visit without storing an IP address.';
comment on function public.cosplay_site_visitor_summary() is
  'Returns anonymous visitor totals only to users present in public.cosplay_admins.';

notify pgrst, 'reload schema';
