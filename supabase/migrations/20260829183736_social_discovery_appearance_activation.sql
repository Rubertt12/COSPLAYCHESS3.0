-- Social discovery, appearance preferences, recent visitors and automatic social activation.

alter table public.cosplay_profile_social_settings
  add column if not exists community_background text not null default 'classic';

alter table public.cosplay_profile_social_settings
  add column if not exists community_visible boolean not null default true;

alter table public.cosplay_profile_social_settings
  drop constraint if exists cosplay_profile_social_settings_theme_check;

alter table public.cosplay_profile_social_settings
  add constraint cosplay_profile_social_settings_theme_check
  check (theme in ('cosplay-dark','orkut-night','royal-purple','chess-gold','white-mode'));

alter table public.cosplay_profile_social_settings
  drop constraint if exists cosplay_profile_social_settings_community_background_check;

alter table public.cosplay_profile_social_settings
  add constraint cosplay_profile_social_settings_community_background_check
  check (community_background in ('classic','chessboard','nebula','sakura','minimal','stars'));

create or replace function public.cosplay_update_my_social_profile(
  p_profile_id uuid,
  p_settings jsonb default '{}'::jsonb,
  p_interests jsonb default null::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $$
declare
  v_uid uuid := auth.uid();
  v_settings jsonb := coalesce(p_settings,'{}'::jsonb);
  v_interests jsonb := p_interests;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  if not exists (
    select 1 from public.cosplay_participant_profiles p
    where p.id=p_profile_id and p.user_id=v_uid and p.registration_status <> 'cancelled'
  ) then
    raise exception 'Profile not owned by current participant.' using errcode='42501';
  end if;

  if exists (
    select 1 from jsonb_object_keys(v_settings) k
    where k not in (
      'status_message','allow_friend_requests','allow_testimonials','allow_messages','allow_tags',
      'record_visits','show_visitors','show_online','theme','accent','birthday_day','birthday_month','show_birthday',
      'community_background'
    )
  ) then
    raise exception 'Unsupported social setting.' using errcode='22023';
  end if;

  if v_settings ? 'theme' and coalesce(v_settings->>'theme','') not in ('cosplay-dark','orkut-night','royal-purple','chess-gold','white-mode') then
    raise exception 'Invalid theme.' using errcode='22023';
  end if;
  if v_settings ? 'accent' and coalesce(v_settings->>'accent','') not in ('gold','blue','pink','purple') then
    raise exception 'Invalid accent.' using errcode='22023';
  end if;
  if v_settings ? 'community_background' and coalesce(v_settings->>'community_background','') not in ('classic','chessboard','nebula','sakura','minimal','stars') then
    raise exception 'Invalid community background.' using errcode='22023';
  end if;
  if v_settings ? 'allow_messages' and coalesce(v_settings->>'allow_messages','') not in ('friends','participants','none') then
    raise exception 'Invalid message privacy.' using errcode='22023';
  end if;
  if v_settings ? 'birthday_day' and nullif(v_settings->>'birthday_day','') is not null
     and (v_settings->>'birthday_day')::int not between 1 and 31 then
    raise exception 'Invalid birthday day.' using errcode='22023';
  end if;
  if v_settings ? 'birthday_month' and nullif(v_settings->>'birthday_month','') is not null
     and (v_settings->>'birthday_month')::int not between 1 and 12 then
    raise exception 'Invalid birthday month.' using errcode='22023';
  end if;

  insert into public.cosplay_profile_social_settings(profile_id)
  values (p_profile_id)
  on conflict (profile_id) do nothing;

  update public.cosplay_profile_social_settings s
  set
    status_message = case when v_settings ? 'status_message' then left(coalesce(v_settings->>'status_message',''),180) else s.status_message end,
    allow_friend_requests = case when v_settings ? 'allow_friend_requests' then (v_settings->>'allow_friend_requests')::boolean else s.allow_friend_requests end,
    allow_testimonials = case when v_settings ? 'allow_testimonials' then (v_settings->>'allow_testimonials')::boolean else s.allow_testimonials end,
    allow_messages = case when v_settings ? 'allow_messages' then v_settings->>'allow_messages' else s.allow_messages end,
    allow_tags = case when v_settings ? 'allow_tags' then (v_settings->>'allow_tags')::boolean else s.allow_tags end,
    record_visits = case when v_settings ? 'record_visits' then (v_settings->>'record_visits')::boolean else s.record_visits end,
    show_visitors = case when v_settings ? 'show_visitors' then (v_settings->>'show_visitors')::boolean else s.show_visitors end,
    show_online = case when v_settings ? 'show_online' then (v_settings->>'show_online')::boolean else s.show_online end,
    theme = case when v_settings ? 'theme' then v_settings->>'theme' else s.theme end,
    accent = case when v_settings ? 'accent' then v_settings->>'accent' else s.accent end,
    birthday_day = case when v_settings ? 'birthday_day' then nullif(v_settings->>'birthday_day','')::smallint else s.birthday_day end,
    birthday_month = case when v_settings ? 'birthday_month' then nullif(v_settings->>'birthday_month','')::smallint else s.birthday_month end,
    show_birthday = case when v_settings ? 'show_birthday' then (v_settings->>'show_birthday')::boolean else s.show_birthday end,
    community_background = case when v_settings ? 'community_background' then v_settings->>'community_background' else s.community_background end,
    updated_at = now()
  where s.profile_id=p_profile_id;

  if v_interests is not null then
    if exists (
      select 1 from jsonb_object_keys(v_interests) k
      where k not in ('anime','games','films_series','music','hobbies')
    ) then
      raise exception 'Unsupported interest field.' using errcode='22023';
    end if;

    insert into public.cosplay_profile_interests(profile_id)
    values (p_profile_id)
    on conflict (profile_id) do nothing;

    update public.cosplay_profile_interests i
    set
      anime = case when v_interests ? 'anime' then left(coalesce(v_interests->>'anime',''),400) else i.anime end,
      games = case when v_interests ? 'games' then left(coalesce(v_interests->>'games',''),400) else i.games end,
      films_series = case when v_interests ? 'films_series' then left(coalesce(v_interests->>'films_series',''),400) else i.films_series end,
      music = case when v_interests ? 'music' then left(coalesce(v_interests->>'music',''),400) else i.music end,
      hobbies = case when v_interests ? 'hobbies' then left(coalesce(v_interests->>'hobbies',''),400) else i.hobbies end,
      updated_at = now()
    where i.profile_id=p_profile_id;
  end if;

  select jsonb_build_object('settings',to_jsonb(s),'interests',to_jsonb(i))
    into v_result
  from public.cosplay_profile_social_settings s
  left join public.cosplay_profile_interests i on i.profile_id=s.profile_id
  where s.profile_id=p_profile_id;

  return coalesce(v_result,'{}'::jsonb);
end;
$$;

create or replace function public.cosplay_activate_my_social_profile()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','cosplay_private'
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer := 0;
  v_slugs jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  perform public.cosplay_link_my_profiles();

  insert into public.cosplay_profile_social_settings(profile_id,community_visible)
  select p.id,true
  from public.cosplay_participant_profiles p
  join public.cosplay_participant_access a on a.profile_id=p.id and a.registration_id=p.registration_id
  where p.user_id=v_uid
    and p.registration_status <> 'cancelled'
    and a.status='active'
  on conflict (profile_id) do update
    set community_visible=true,
        updated_at=now();
  get diagnostics v_count=row_count;

  select coalesce(jsonb_agg(p.public_slug order by p.created_at) filter (where p.public_slug is not null),'[]'::jsonb)
    into v_slugs
  from public.cosplay_participant_profiles p
  join public.cosplay_participant_access a on a.profile_id=p.id and a.registration_id=p.registration_id
  where p.user_id=v_uid
    and p.registration_status <> 'cancelled'
    and a.status='active';

  return jsonb_build_object('activated',true,'profiles_updated',v_count,'public_slugs',v_slugs);
end;
$$;

create or replace function public.cosplay_discover_participants(
  p_search text default null,
  p_page integer default 1,
  p_page_size integer default 10
)
returns table(
  profile_id uuid,
  public_slug text,
  display_name text,
  nick text,
  character_name text,
  character_photo_url text,
  cover_photo_url text,
  cover_position_x smallint,
  cover_position_y smallint,
  public_profile_visible boolean,
  friendship_id uuid,
  friendship_status text,
  friendship_incoming boolean,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public'
as $$
declare
  v_uid uuid := auth.uid();
  v_me uuid;
  v_page integer := greatest(coalesce(p_page,1),1);
  v_size integer := least(greatest(coalesce(p_page_size,10),1),10);
  v_term text := nullif(trim(coalesce(p_search,'')),'');
begin
  if v_uid is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  select p.id into v_me
  from public.cosplay_participant_profiles p
  join public.cosplay_participant_access a on a.profile_id=p.id and a.registration_id=p.registration_id
  where p.user_id=v_uid
    and p.registration_status <> 'cancelled'
    and a.status='active'
  order by p.created_at desc
  limit 1;

  if v_me is null then
    raise exception 'Active participant profile required.' using errcode='42501';
  end if;

  return query
  with candidates as (
    select p.*
    from public.cosplay_participant_profiles p
    join public.cosplay_participant_access a on a.profile_id=p.id and a.registration_id=p.registration_id
    left join public.cosplay_profile_social_settings s on s.profile_id=p.id
    where p.id <> v_me
      and p.user_id is not null
      and p.registration_status <> 'cancelled'
      and a.status='active'
      and coalesce(s.community_visible,true)=true
      and not exists (
        select 1 from public.cosplay_profile_blocks b
        where (b.blocker_profile_id=v_me and b.blocked_profile_id=p.id)
           or (b.blocker_profile_id=p.id and b.blocked_profile_id=v_me)
      )
      and (
        v_term is null or
        coalesce(p.display_name,'') ilike '%'||v_term||'%' or
        coalesce(p.nick,'') ilike '%'||v_term||'%' or
        coalesce(p.character_name,'') ilike '%'||v_term||'%'
      )
  ), ranked as (
    select c.*,count(*) over() as cnt
    from candidates c
  )
  select
    r.id,r.public_slug,r.display_name,r.nick,r.character_name,r.character_photo_url,
    r.cover_photo_url,r.cover_position_x,r.cover_position_y,r.profile_visible,
    f.id,f.status,
    case when f.id is null then false else f.addressee_profile_id=v_me end,
    r.cnt
  from ranked r
  left join lateral (
    select fr.id,fr.status,fr.requester_profile_id,fr.addressee_profile_id
    from public.cosplay_friendships fr
    where (fr.requester_profile_id=v_me and fr.addressee_profile_id=r.id)
       or (fr.requester_profile_id=r.id and fr.addressee_profile_id=v_me)
    order by fr.created_at desc
    limit 1
  ) f on true
  order by lower(coalesce(r.display_name,r.nick,r.character_name,'')),r.id
  limit v_size offset ((v_page-1)*v_size);
end;
$$;

create or replace function public.cosplay_my_recent_visitors(p_limit integer default 12)
returns table(
  visitor_profile_id uuid,
  public_slug text,
  display_name text,
  nick text,
  character_name text,
  character_photo_url text,
  visited_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public'
as $$
declare
  v_uid uuid := auth.uid();
  v_me uuid;
  v_limit integer := least(greatest(coalesce(p_limit,12),1),30);
begin
  if v_uid is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  select p.id into v_me
  from public.cosplay_participant_profiles p
  join public.cosplay_participant_access a on a.profile_id=p.id and a.registration_id=p.registration_id
  where p.user_id=v_uid
    and p.registration_status <> 'cancelled'
    and a.status='active'
  order by p.created_at desc
  limit 1;

  if v_me is null then return; end if;
  if coalesce((select s.show_visitors from public.cosplay_profile_social_settings s where s.profile_id=v_me),true) is not true then return; end if;

  return query
  select distinct on (v.visitor_profile_id)
    p.id,p.public_slug,p.display_name,p.nick,p.character_name,p.character_photo_url,v.visited_at
  from public.cosplay_profile_visits v
  join public.cosplay_participant_profiles p on p.id=v.visitor_profile_id
  join public.cosplay_participant_access a on a.profile_id=p.id and a.registration_id=p.registration_id
  left join public.cosplay_profile_social_settings s on s.profile_id=p.id
  where v.target_profile_id=v_me
    and p.user_id is not null
    and p.registration_status <> 'cancelled'
    and a.status='active'
    and coalesce(s.community_visible,true)=true
    and not exists (
      select 1 from public.cosplay_profile_blocks b
      where (b.blocker_profile_id=v_me and b.blocked_profile_id=p.id)
         or (b.blocker_profile_id=p.id and b.blocked_profile_id=v_me)
    )
  order by v.visitor_profile_id,v.visited_at desc
  limit v_limit;
end;
$$;

create or replace function public.cosplay_record_profile_visit(p_target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $$
declare
  v_uid uuid := auth.uid();
  v_visitor uuid;
  v_existing uuid;
begin
  if v_uid is null then return false; end if;

  select p.id into v_visitor
  from public.cosplay_participant_profiles p
  join public.cosplay_participant_access a on a.profile_id=p.id and a.registration_id=p.registration_id
  where p.user_id=v_uid
    and p.registration_status <> 'cancelled'
    and a.status='active'
  order by p.created_at desc
  limit 1;

  if v_visitor is null or v_visitor=p_target_profile_id then return false; end if;

  if not exists (
    select 1
    from public.cosplay_participant_profiles p
    join public.cosplay_participant_access a on a.profile_id=p.id and a.registration_id=p.registration_id
    left join public.cosplay_profile_social_settings s on s.profile_id=p.id
    where p.id=p_target_profile_id
      and p.user_id is not null
      and p.registration_status <> 'cancelled'
      and a.status='active'
      and coalesce(s.community_visible,true)=true
      and coalesce(s.record_visits,true)=true
  ) then return false; end if;

  select v.id into v_existing
  from public.cosplay_profile_visits v
  where v.target_profile_id=p_target_profile_id
    and v.visitor_profile_id=v_visitor
    and v.visited_at > now()-interval '30 minutes'
  order by v.visited_at desc
  limit 1;

  if v_existing is not null then
    update public.cosplay_profile_visits set visited_at=now() where id=v_existing;
  else
    insert into public.cosplay_profile_visits(target_profile_id,visitor_profile_id,visited_at)
    values(p_target_profile_id,v_visitor,now());
  end if;
  return true;
end;
$$;

create or replace function public.cosplay_community_profile_by_slug(p_slug text)
returns table(
  profile_id uuid,
  public_slug text,
  display_name text,
  nick text,
  character_name text,
  character_photo_url text,
  cover_photo_url text,
  cover_position_x smallint,
  cover_position_y smallint,
  bio text,
  public_profile_visible boolean
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (
    select 1
    from public.cosplay_participant_profiles me
    join public.cosplay_participant_access ma on ma.profile_id=me.id and ma.registration_id=me.registration_id
    where me.user_id=v_uid
      and me.registration_status <> 'cancelled'
      and ma.status='active'
  ) then
    raise exception 'Active participant profile required.' using errcode='42501';
  end if;

  return query
  select
    p.id,p.public_slug,p.display_name,p.nick,p.character_name,p.character_photo_url,
    p.cover_photo_url,p.cover_position_x,p.cover_position_y,p.bio,p.profile_visible
  from public.cosplay_participant_profiles p
  join public.cosplay_participant_access a on a.profile_id=p.id and a.registration_id=p.registration_id
  left join public.cosplay_profile_social_settings s on s.profile_id=p.id
  where p.public_slug=trim(coalesce(p_slug,''))
    and p.user_id is not null
    and p.registration_status <> 'cancelled'
    and a.status='active'
    and coalesce(s.community_visible,true)=true
    and not exists (
      select 1
      from public.cosplay_participant_profiles me
      join public.cosplay_profile_blocks b on (
        (b.blocker_profile_id=me.id and b.blocked_profile_id=p.id)
        or (b.blocker_profile_id=p.id and b.blocked_profile_id=me.id)
      )
      where me.user_id=v_uid
    )
  limit 1;
end;
$$;

revoke all on function public.cosplay_update_my_social_profile(uuid,jsonb,jsonb) from public, anon;
revoke all on function public.cosplay_activate_my_social_profile() from public, anon;
revoke all on function public.cosplay_discover_participants(text,integer,integer) from public, anon;
revoke all on function public.cosplay_my_recent_visitors(integer) from public, anon;
revoke all on function public.cosplay_record_profile_visit(uuid) from public, anon;
revoke all on function public.cosplay_community_profile_by_slug(text) from public, anon;

grant execute on function public.cosplay_update_my_social_profile(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.cosplay_activate_my_social_profile() to authenticated;
grant execute on function public.cosplay_discover_participants(text,integer,integer) to authenticated;
grant execute on function public.cosplay_my_recent_visitors(integer) to authenticated;
grant execute on function public.cosplay_record_profile_visit(uuid) to authenticated;
grant execute on function public.cosplay_community_profile_by_slug(text) to authenticated;
