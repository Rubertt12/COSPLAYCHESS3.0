create or replace function public.cosplay_fill_achievement_registration_id()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $$
declare
  v_count integer := 0;
  v_registration_id uuid;
begin
  if new.registration_id is not null or nullif(btrim(new.cosplayer_name),'') is null then
    return new;
  end if;

  select count(*)::integer,
         (array_agg(r.id order by r.id::text))[1]
    into v_count, v_registration_id
  from public.cosplay_registrations r
  where r.status <> 'cancelled'
    and (new.event_id is null or r.event_id = new.event_id)
    and lower(btrim(r.full_name)) = lower(btrim(new.cosplayer_name));

  if v_count = 1 then
    new.registration_id := v_registration_id;
  end if;

  return new;
end;
$$;

revoke all on function public.cosplay_fill_achievement_registration_id() from public;

drop trigger if exists cosplay_fill_achievement_registration_id_trg on public.cosplay_cosplayer_achievements;
create trigger cosplay_fill_achievement_registration_id_trg
before insert or update of registration_id, event_id, cosplayer_name
on public.cosplay_cosplayer_achievements
for each row
execute function public.cosplay_fill_achievement_registration_id();

with matched as (
  select a.id as award_id,
         (array_agg(r.id order by r.id::text))[1] as registration_id,
         count(*)::integer as candidate_count
  from public.cosplay_cosplayer_achievements a
  join public.cosplay_registrations r
    on r.status <> 'cancelled'
   and (a.event_id is null or r.event_id = a.event_id)
   and lower(btrim(r.full_name)) = lower(btrim(a.cosplayer_name))
  where a.registration_id is null
  group by a.id
)
update public.cosplay_cosplayer_achievements a
set registration_id = m.registration_id
from matched m
where a.id = m.award_id
  and a.registration_id is null
  and m.candidate_count = 1;

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
  v_registration_id uuid;
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

  select p.registration_id
    into v_registration_id
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
      join public.cosplay_profile_blocks b
        on ((b.blocker_profile_id = me.id and b.blocked_profile_id = p.id)
         or (b.blocker_profile_id = p.id and b.blocked_profile_id = me.id))
      where me.user_id = v_uid
    )
  limit 1;

  if v_registration_id is null then
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
  where ca.registration_id = v_registration_id
    and (ca.event_id is null or coalesce(ev.published,false) = true)
  order by ca.awarded_at desc, ach.sort_order asc, ach.title asc;
end;
$$;

revoke all on function public.cosplay_community_profile_achievements(uuid) from public;
grant execute on function public.cosplay_community_profile_achievements(uuid) to authenticated;
