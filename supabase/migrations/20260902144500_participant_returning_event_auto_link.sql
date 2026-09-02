-- Mantém uma única conta da Área do Participante para inscrições futuras
-- feitas com o mesmo e-mail já confirmado/ativo.

-- 1) Garante que todo perfil participante tenha uma linha de controle de acesso.
insert into public.cosplay_participant_access (registration_id, profile_id, status)
select
  p.registration_id,
  p.id,
  case when p.user_id is null then 'not_sent' else 'active' end
from public.cosplay_participant_profiles p
left join public.cosplay_participant_access a
  on a.registration_id = p.registration_id
where a.registration_id is null
on conflict (registration_id) do nothing;

-- 2) Novos perfis também passam a receber automaticamente o registro de acesso.
create or replace function public.cosplay_ensure_participant_access_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.cosplay_participant_access (registration_id, profile_id, status)
  values (
    new.registration_id,
    new.id,
    case when new.user_id is null then 'not_sent' else 'active' end
  )
  on conflict (registration_id) do nothing;

  return new;
end;
$$;

revoke all on function public.cosplay_ensure_participant_access_row() from public, anon, authenticated;

drop trigger if exists cosplay_participant_profile_ensure_access on public.cosplay_participant_profiles;
create trigger cosplay_participant_profile_ensure_access
after insert on public.cosplay_participant_profiles
for each row execute function public.cosplay_ensure_participant_access_row();

-- 3) Faz o backfill das inscrições confirmadas de quem já possuía uma conta ativa.
with returning_accounts as (
  select distinct
    u.id as user_id,
    lower(trim(u.email)) as email
  from auth.users u
  where u.email_confirmed_at is not null
    and coalesce(trim(u.email), '') <> ''
    and exists (
      select 1
      from public.cosplay_participant_profiles existing_profile
      join public.cosplay_participant_access existing_access
        on existing_access.profile_id = existing_profile.id
       and existing_access.registration_id = existing_profile.registration_id
      where existing_profile.user_id = u.id
        and existing_profile.registration_status <> 'cancelled'
        and existing_access.status = 'active'
    )
), candidates as (
  select p.id as profile_id, ra.user_id
  from public.cosplay_participant_profiles p
  join public.cosplay_registrations r on r.id = p.registration_id
  join public.cosplay_participant_access a
    on a.profile_id = p.id
   and a.registration_id = p.registration_id
  join returning_accounts ra
    on lower(trim(coalesce(r.email, ''))) = ra.email
  where p.user_id is null
    and r.status = 'confirmed'
    and p.registration_status <> 'cancelled'
    and a.status <> 'blocked'
)
update public.cosplay_participant_profiles p
set user_id = c.user_id,
    updated_at = now()
from candidates c
where p.id = c.profile_id;

update public.cosplay_participant_access a
set status = 'active',
    activated_at = coalesce(a.activated_at, now()),
    blocked_at = null,
    updated_at = now()
from public.cosplay_participant_profiles p
join public.cosplay_registrations r on r.id = p.registration_id
join auth.users u on u.id = p.user_id
where a.profile_id = p.id
  and a.registration_id = p.registration_id
  and a.status <> 'blocked'
  and r.status = 'confirmed'
  and p.registration_status <> 'cancelled'
  and u.email_confirmed_at is not null
  and lower(trim(coalesce(r.email, ''))) = lower(trim(coalesce(u.email, '')));

-- 4) Atualiza o vínculo executado ao abrir/logar na Área do Participante.
create or replace function public.cosplay_link_my_profiles()
returns table(profile_id uuid, public_slug text)
language plpgsql
security definer
set search_path = pg_catalog, public, cosplay_private
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_has_active_account boolean := false;
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

  select exists (
    select 1
    from public.cosplay_participant_profiles p
    join public.cosplay_participant_access a
      on a.profile_id = p.id
     and a.registration_id = p.registration_id
    where p.user_id = v_user_id
      and p.registration_status <> 'cancelled'
      and a.status = 'active'
  ) into v_has_active_account;

  -- Compatibilidade para perfis antigos/novos que eventualmente estejam sem a linha de acesso.
  insert into public.cosplay_participant_access (registration_id, profile_id, status)
  select
    p.registration_id,
    p.id,
    case when p.user_id = v_user_id then 'active' else 'not_sent' end
  from public.cosplay_participant_profiles p
  join public.cosplay_registrations r on r.id = p.registration_id
  left join public.cosplay_participant_access a on a.registration_id = p.registration_id
  where a.registration_id is null
    and lower(trim(coalesce(r.email, ''))) = v_email
    and r.status = 'confirmed'
    and p.registration_status <> 'cancelled'
  on conflict (registration_id) do nothing;

  update public.cosplay_participant_profiles p
  set user_id = v_user_id,
      updated_at = now()
  from public.cosplay_registrations r
  join public.cosplay_participant_access a on a.registration_id = r.id
  where p.registration_id = r.id
    and a.profile_id = p.id
    and lower(trim(coalesce(r.email, ''))) = v_email
    and r.status = 'confirmed'
    and p.registration_status <> 'cancelled'
    and (
      a.status in ('invited', 'active')
      or (v_has_active_account and a.status = 'not_sent')
    )
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
    and (
      a.status in ('invited', 'active')
      or (v_has_active_account and a.status = 'not_sent')
    );

  if v_linked = 0 and not exists (
    select 1
    from public.cosplay_participant_profiles p
    join public.cosplay_participant_access a
      on a.profile_id = p.id
     and a.registration_id = p.registration_id
    where p.user_id = v_user_id
      and p.registration_status <> 'cancelled'
      and a.status = 'active'
  ) then
    raise exception 'Seu acesso ainda não foi liberado pela organização.' using errcode = '42501';
  end if;

  return query
  select p.id, p.public_slug
  from public.cosplay_participant_profiles p
  join public.cosplay_participant_access a
    on a.profile_id = p.id
   and a.registration_id = p.registration_id
  where p.user_id = v_user_id
    and p.registration_status <> 'cancelled'
    and a.status = 'active'
  order by p.created_at;
end;
$$;

revoke all on function public.cosplay_link_my_profiles() from public, anon;
grant execute on function public.cosplay_link_my_profiles() to authenticated, service_role;

-- Mantém o RPC legado de claim com a mesma regra para evitar comportamentos diferentes.
create or replace function public.claim_cosplay_participant_profiles()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_has_active_account boolean := false;
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

  select exists (
    select 1
    from public.cosplay_participant_profiles p
    join public.cosplay_participant_access a
      on a.profile_id = p.id
     and a.registration_id = p.registration_id
    where p.user_id = v_uid
      and p.registration_status <> 'cancelled'
      and a.status = 'active'
  ) into v_has_active_account;

  insert into public.cosplay_participant_access (registration_id, profile_id, status)
  select
    p.registration_id,
    p.id,
    case when p.user_id = v_uid then 'active' else 'not_sent' end
  from public.cosplay_participant_profiles p
  join public.cosplay_registrations r on r.id = p.registration_id
  left join public.cosplay_participant_access a on a.registration_id = p.registration_id
  where a.registration_id is null
    and lower(trim(coalesce(r.email, ''))) = v_email
    and r.status = 'confirmed'
    and p.registration_status <> 'cancelled'
  on conflict (registration_id) do nothing;

  update public.cosplay_participant_profiles p
  set user_id = v_uid,
      updated_at = now()
  from public.cosplay_registrations r
  join public.cosplay_participant_access a on a.registration_id = r.id
  where p.registration_id = r.id
    and a.profile_id = p.id
    and lower(trim(coalesce(r.email, ''))) = v_email
    and r.status = 'confirmed'
    and p.registration_status <> 'cancelled'
    and (
      a.status in ('invited', 'active')
      or (v_has_active_account and a.status = 'not_sent')
    )
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
    and (
      a.status in ('invited', 'active')
      or (v_has_active_account and a.status = 'not_sent')
    );

  if v_count = 0 and not exists (
    select 1
    from public.cosplay_participant_profiles p
    join public.cosplay_participant_access a
      on a.profile_id = p.id
     and a.registration_id = p.registration_id
    where p.user_id = v_uid
      and p.registration_status <> 'cancelled'
      and a.status = 'active'
  ) then
    raise exception 'Seu acesso ainda não foi liberado pela organização.' using errcode = '42501';
  end if;

  return v_count;
end;
$$;

revoke all on function public.claim_cosplay_participant_profiles() from public, anon;
grant execute on function public.claim_cosplay_participant_profiles() to authenticated, service_role;
