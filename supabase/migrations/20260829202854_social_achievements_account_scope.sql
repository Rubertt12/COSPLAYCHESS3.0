create or replace function public.cosplay_community_profile_achievements(p_profile_id uuid)
returns table(
  award_id uuid,
  achievement_id uuid,
  achievement_slug text,
  title text,
  description text,
  icon text,
  tier text,
  criteria_text text,
  note text,
  awarded_at timestamptz,
  event_id uuid,
  event_title text,
  character_name text
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public'
as $$
declare
  v_uid uuid := auth.uid();
  v_target_user_id uuid;
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

  select p.user_id
    into v_target_user_id
  from public.cosplay_participant_profiles p
  join public.cosplay_participant_access a
    on a.profile_id = p.id
   and a.registration_id = p.registration_id
  left join public.cosplay_profile_social_settings s
    on s.profile_id = p.id
  where p.id = p_profile_id
    and p.user_id is not null
    and p.registration_status <> 'cancelled'
    and a.status = 'active'
    and (p.user_id = v_uid or coalesce(s.community_visible,true) = true)
    and not exists (
      select 1
      from public.cosplay_participant_profiles me
      join public.cosplay_participant_profiles target_profile
        on target_profile.user_id = p.user_id
      join public.cosplay_profile_blocks b
        on ((b.blocker_profile_id = me.id and b.blocked_profile_id = target_profile.id)
         or (b.blocker_profile_id = target_profile.id and b.blocked_profile_id = me.id))
      where me.user_id = v_uid
    )
  limit 1;

  if v_target_user_id is null then
    return;
  end if;

  return query
  select ca.id,
         ach.id,
         ach.slug,
         ach.title,
         ach.description,
         ach.icon,
         ach.tier,
         ach.criteria_text,
         ca.note,
         ca.awarded_at,
         ca.event_id,
         ev.title,
         ca.character_name
  from public.cosplay_cosplayer_achievements ca
  join public.cosplay_achievements ach
    on ach.id = ca.achievement_id
   and ach.published = true
  left join public.cosplay_events ev
    on ev.id = ca.event_id
  where ca.registration_id in (
    select p2.registration_id
    from public.cosplay_participant_profiles p2
    join public.cosplay_participant_access a2
      on a2.profile_id = p2.id
     and a2.registration_id = p2.registration_id
    where p2.user_id = v_target_user_id
      and p2.registration_status <> 'cancelled'
      and a2.status = 'active'
  )
    and (ca.event_id is null or coalesce(ev.published,false) = true)
  order by ca.awarded_at desc, ach.sort_order asc, ach.title asc;
end;
$$;

revoke all on function public.cosplay_community_profile_achievements(uuid) from public;
grant execute on function public.cosplay_community_profile_achievements(uuid) to authenticated;
