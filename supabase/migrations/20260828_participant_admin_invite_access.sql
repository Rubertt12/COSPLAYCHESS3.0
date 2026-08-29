create table if not exists public.cosplay_participant_access (
  registration_id uuid primary key references public.cosplay_registrations(id) on delete cascade,
  profile_id uuid not null unique references public.cosplay_participant_profiles(id) on delete cascade,
  status text not null default 'not_sent' check (status in ('not_sent','invited','active','blocked')),
  invite_count integer not null default 0 check (invite_count >= 0),
  invited_at timestamptz,
  last_invited_at timestamptz,
  activated_at timestamptz,
  blocked_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.cosplay_participant_access enable row level security;

revoke all on table public.cosplay_participant_access from anon;
grant select, insert, update, delete on table public.cosplay_participant_access to authenticated;
grant all on table public.cosplay_participant_access to service_role;

drop policy if exists cosplay_participant_access_admin_select on public.cosplay_participant_access;
create policy cosplay_participant_access_admin_select
on public.cosplay_participant_access for select to authenticated
using (public.is_cosplay_admin());

drop policy if exists cosplay_participant_access_admin_insert on public.cosplay_participant_access;
create policy cosplay_participant_access_admin_insert
on public.cosplay_participant_access for insert to authenticated
with check (public.is_cosplay_admin());

drop policy if exists cosplay_participant_access_admin_update on public.cosplay_participant_access;
create policy cosplay_participant_access_admin_update
on public.cosplay_participant_access for update to authenticated
using (public.is_cosplay_admin()) with check (public.is_cosplay_admin());

drop policy if exists cosplay_participant_access_admin_delete on public.cosplay_participant_access;
create policy cosplay_participant_access_admin_delete
on public.cosplay_participant_access for delete to authenticated
using (public.is_cosplay_admin());

insert into public.cosplay_participant_access (registration_id, profile_id, status)
select p.registration_id, p.id, case when p.user_id is null then 'not_sent' else 'active' end
from public.cosplay_participant_profiles p
on conflict (registration_id) do nothing;

create or replace function public.cosplay_link_my_profiles()
returns table(profile_id uuid, public_slug text)
language plpgsql
security definer
set search_path = pg_catalog, public, cosplay_private
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_linked integer := 0;
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  select lower(trim(u.email))
    into v_email
  from auth.users u
  where u.id = v_user_id
    and u.email_confirmed_at is not null;

  if v_email is null or v_email = '' then
    raise exception 'Confirme seu e-mail antes de acessar o perfil.' using errcode = '42501';
  end if;

  update public.cosplay_participant_profiles p
  set user_id = v_user_id,
      updated_at = now()
  from public.cosplay_registrations r,
       public.cosplay_participant_access a
  where p.registration_id = r.id
    and a.registration_id = r.id
    and a.profile_id = p.id
    and lower(trim(coalesce(r.email, ''))) = v_email
    and r.status = 'confirmed'
    and p.registration_status <> 'cancelled'
    and a.status in ('invited','active')
    and (p.user_id is null or p.user_id = v_user_id);

  get diagnostics v_linked = row_count;

  update public.cosplay_participant_access a
  set status = 'active',
      activated_at = coalesce(a.activated_at, now()),
      blocked_at = null,
      updated_at = now()
  from public.cosplay_participant_profiles p
  where p.id = a.profile_id
    and p.registration_id = a.registration_id
    and p.user_id = v_user_id
    and a.status in ('invited','active');

  if v_linked = 0 and not exists (
    select 1
    from public.cosplay_participant_profiles p
    join public.cosplay_participant_access a on a.profile_id = p.id and a.registration_id = p.registration_id
    where p.user_id = v_user_id
      and a.status = 'active'
  ) then
    raise exception 'Seu acesso ainda não foi liberado pela organização.' using errcode = '42501';
  end if;

  return query
  select p.id, p.public_slug
  from public.cosplay_participant_profiles p
  join public.cosplay_participant_access a on a.profile_id = p.id and a.registration_id = p.registration_id
  where p.user_id = v_user_id
    and a.status = 'active'
  order by p.created_at;
end;
$$;

revoke all on function public.cosplay_link_my_profiles() from public, anon;
grant execute on function public.cosplay_link_my_profiles() to authenticated, service_role;

create or replace function public.claim_cosplay_participant_profiles()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  select lower(trim(u.email)) into v_email
  from auth.users u
  where u.id = v_uid
    and u.email_confirmed_at is not null;

  if v_email is null or v_email = '' then
    raise exception 'Confirme seu e-mail antes de vincular a inscrição.' using errcode = '42501';
  end if;

  update public.cosplay_participant_profiles p
  set user_id = v_uid,
      updated_at = now()
  from public.cosplay_registrations r,
       public.cosplay_participant_access a
  where r.id = p.registration_id
    and a.registration_id = r.id
    and a.profile_id = p.id
    and lower(trim(coalesce(r.email, ''))) = v_email
    and r.status = 'confirmed'
    and p.registration_status <> 'cancelled'
    and a.status in ('invited','active')
    and (p.user_id is null or p.user_id = v_uid);

  get diagnostics v_count = row_count;

  update public.cosplay_participant_access a
  set status = 'active',
      activated_at = coalesce(a.activated_at, now()),
      blocked_at = null,
      updated_at = now()
  from public.cosplay_participant_profiles p
  where p.id = a.profile_id
    and p.registration_id = a.registration_id
    and p.user_id = v_uid
    and a.status in ('invited','active');

  if v_count = 0 and not exists (
    select 1
    from public.cosplay_participant_profiles p
    join public.cosplay_participant_access a on a.profile_id = p.id and a.registration_id = p.registration_id
    where p.user_id = v_uid
      and a.status = 'active'
  ) then
    raise exception 'Seu acesso ainda não foi liberado pela organização.' using errcode = '42501';
  end if;

  return v_count;
end;
$$;

revoke all on function public.claim_cosplay_participant_profiles() from public, anon;
grant execute on function public.claim_cosplay_participant_profiles() to authenticated, service_role;
