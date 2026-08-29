create or replace function public.cosplay_my_achievement_profile()
returns table(
  profile_id uuid,
  public_slug text,
  display_name text,
  nick text,
  character_name text,
  character_photo_url text,
  cover_photo_url text
)
language sql
stable
security definer
set search_path to 'pg_catalog','public'
as $$
  select
    p.id,
    p.public_slug,
    p.display_name,
    p.nick,
    p.character_name,
    p.character_photo_url,
    p.cover_photo_url
  from public.cosplay_participant_profiles p
  join public.cosplay_participant_access a
    on a.profile_id = p.id
   and a.registration_id = p.registration_id
  where p.user_id = auth.uid()
    and p.registration_status <> 'cancelled'
    and a.status = 'active'
  order by p.created_at desc
  limit 1;
$$;

revoke all on function public.cosplay_my_achievement_profile() from public;
grant execute on function public.cosplay_my_achievement_profile() to authenticated;

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
    join public.cosplay_participant_access ma
      on ma.profile_id = me.id
     and ma.registration_id = me.registration_id
    where me.user_id = v_uid
      and me.registration_status <> 'cancelled'
      and ma.status = 'active'
  ) then
    raise exception 'Active participant profile required.' using errcode='42501';
  end if;

  return query
  select
    p.id,
    p.public_slug,
    p.display_name,
    p.nick,
    p.character_name,
    p.character_photo_url,
    p.cover_photo_url,
    p.cover_position_x,
    p.cover_position_y,
    p.bio,
    p.profile_visible
  from public.cosplay_participant_profiles p
  join public.cosplay_participant_access a
    on a.profile_id = p.id
   and a.registration_id = p.registration_id
  left join public.cosplay_profile_social_settings s
    on s.profile_id = p.id
  where p.public_slug = trim(coalesce(p_slug,''))
    and p.user_id is not null
    and p.registration_status <> 'cancelled'
    and a.status = 'active'
    and (p.user_id = v_uid or coalesce(s.community_visible,true) = true)
    and (
      p.user_id = v_uid
      or not exists (
        select 1
        from public.cosplay_participant_profiles me
        join public.cosplay_profile_blocks b
          on ((b.blocker_profile_id = me.id and b.blocked_profile_id = p.id)
           or (b.blocker_profile_id = p.id and b.blocked_profile_id = me.id))
        where me.user_id = v_uid
      )
    )
  limit 1;
end;
$$;

revoke all on function public.cosplay_community_profile_by_slug(text) from public;
grant execute on function public.cosplay_community_profile_by_slug(text) to authenticated;
