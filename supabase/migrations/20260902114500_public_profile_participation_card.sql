create or replace function public.cosplay_public_profile_participations(target_slug text)
returns table(
  profile_id uuid,
  event_id uuid,
  event_title text,
  event_city text,
  event_start_at timestamptz,
  event_end_at timestamptz,
  character_name text,
  is_upcoming boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with target as (
    select p.id, p.user_id
    from public.cosplay_participant_profiles p
    where p.public_slug = target_slug
      and p.profile_visible = true
      and p.registration_status <> 'cancelled'
      and p.user_id is not null
    limit 1
  ),
  canonical as (
    select p.id
    from public.cosplay_participant_profiles p
    join target t on t.user_id = p.user_id
    where p.registration_status <> 'cancelled'
    order by p.created_at asc, p.id asc
    limit 1
  )
  select
    p.id as profile_id,
    e.id as event_id,
    e.title as event_title,
    e.city as event_city,
    e.start_at as event_start_at,
    e.end_at as event_end_at,
    p.character_name,
    coalesce(e.start_at >= now(), false) as is_upcoming
  from target t
  join canonical c on c.id = t.id
  join public.cosplay_participant_profiles p
    on p.user_id = t.user_id
   and p.id <> t.id
   and p.registration_status = 'confirmed'
  join public.cosplay_registrations r
    on r.id = p.registration_id
   and r.status = 'confirmed'
  join public.cosplay_participant_access a
    on a.profile_id = p.id
   and a.registration_id = p.registration_id
   and a.status = 'active'
  join public.cosplay_events e
    on e.id = p.event_id
   and e.published = true
  order by
    case when e.start_at >= now() then 0 else 1 end,
    case when e.start_at >= now() then e.start_at end asc nulls last,
    e.start_at desc nulls last,
    p.created_at desc;
$$;

revoke all on function public.cosplay_public_profile_participations(text) from public;
grant execute on function public.cosplay_public_profile_participations(text) to anon, authenticated, service_role;
