create or replace function public.cosplay_update_my_event_cosplay(
  p_registration uuid,
  p_character_name text,
  p_character_photo_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_event_start timestamptz;
  v_event_title text;
  v_name text := trim(coalesce(p_character_name,''));
  v_photo text := nullif(trim(coalesce(p_character_photo_url,'')),'');
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.' using errcode='42501';
  end if;

  select lower(trim(u.email)) into v_email
  from auth.users u
  where u.id=v_uid and u.email_confirmed_at is not null;

  if v_email is null or v_email='' then
    raise exception 'Confirme seu e-mail antes de alterar a inscrição.' using errcode='42501';
  end if;

  if not exists (
    select 1
    from public.cosplay_participant_profiles p
    join public.cosplay_participant_access a
      on a.profile_id=p.id and a.registration_id=p.registration_id
    where p.user_id=v_uid
      and p.registration_status <> 'cancelled'
      and a.status='active'
  ) then
    raise exception 'Perfil de participante ativo obrigatório.' using errcode='42501';
  end if;

  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Informe um personagem entre 2 e 120 caracteres.' using errcode='22023';
  end if;

  if v_photo is not null and (length(v_photo) > 1500 or v_photo !~* '^https://') then
    raise exception 'URL da foto inválida.' using errcode='22023';
  end if;

  select e.start_at,e.title
    into v_event_start,v_event_title
  from public.cosplay_registrations r
  join public.cosplay_events e on e.id=r.event_id
  where r.id=p_registration
    and lower(trim(coalesce(r.email,'')))=v_email
    and r.status='confirmed'
  for update of r;

  if not found then
    raise exception 'Inscrição confirmada não encontrada para esta conta.' using errcode='42501';
  end if;

  if v_event_start is null or v_event_start <= now() then
    raise exception 'As alterações desta inscrição já foram encerradas.' using errcode='22023';
  end if;

  update public.cosplay_registrations
     set character_name=v_name,
         character_photo_url=v_photo,
         updated_at=now()
   where id=p_registration;

  update public.cosplay_participant_profiles
     set character_name=v_name,
         character_photo_url=v_photo,
         updated_at=now()
   where registration_id=p_registration
     and registration_status <> 'cancelled';

  return jsonb_build_object(
    'updated',true,
    'registration_id',p_registration,
    'event_title',v_event_title,
    'character_name',v_name,
    'character_photo_url',v_photo,
    'editable_until',v_event_start
  );
end;
$$;

revoke all on function public.cosplay_update_my_event_cosplay(uuid,text,text) from public;
grant execute on function public.cosplay_update_my_event_cosplay(uuid,text,text) to authenticated;

create or replace function public.cosplay_social_presence_heartbeat()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile uuid;
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.' using errcode='42501';
  end if;

  select p.id into v_profile
  from public.cosplay_participant_profiles p
  join public.cosplay_participant_access a
    on a.profile_id=p.id and a.registration_id=p.registration_id
  where p.user_id=v_uid
    and p.registration_status <> 'cancelled'
    and a.status='active'
  order by p.created_at asc
  limit 1;

  if v_profile is null then
    raise exception 'Perfil social ativo obrigatório.' using errcode='42501';
  end if;

  insert into public.cosplay_profile_social_settings(profile_id,last_seen_at,updated_at,presence_status)
  values(v_profile,now(),now(),'online')
  on conflict (profile_id) do update
    set last_seen_at=excluded.last_seen_at,
        updated_at=excluded.updated_at,
        presence_status='online';

  return jsonb_build_object('profile_id',v_profile,'last_seen_at',now());
end;
$$;

revoke all on function public.cosplay_social_presence_heartbeat() from public;
grant execute on function public.cosplay_social_presence_heartbeat() to authenticated;

create or replace function public.cosplay_message_presence(p_profile_ids uuid[])
returns table(
  profile_id uuid,
  online boolean,
  last_seen_at timestamptz,
  presence_status text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.' using errcode='42501';
  end if;

  if not exists (
    select 1
    from public.cosplay_participant_profiles p
    join public.cosplay_participant_access a
      on a.profile_id=p.id and a.registration_id=p.registration_id
    where p.user_id=auth.uid()
      and p.registration_status <> 'cancelled'
      and a.status='active'
  ) then
    raise exception 'Perfil social ativo obrigatório.' using errcode='42501';
  end if;

  return query
  select
    s.profile_id,
    case when s.show_online is true and s.last_seen_at > now()-interval '5 minutes' then true else false end,
    case when s.show_online is true then s.last_seen_at else null end,
    case when s.show_online is true then coalesce(nullif(s.presence_status,''),'offline') else 'hidden' end
  from public.cosplay_profile_social_settings s
  where s.profile_id = any(coalesce(p_profile_ids,array[]::uuid[]));
end;
$$;

revoke all on function public.cosplay_message_presence(uuid[]) from public;
grant execute on function public.cosplay_message_presence(uuid[]) to authenticated;
