-- Allow social stats for an authenticated Community member without publishing the profile to anon users.

create or replace function public.cosplay_public_profile_social_stats(target_profile_id uuid)
returns table(friend_count bigint, post_count bigint, photo_count bigint)
language sql
stable
security definer
set search_path to 'pg_catalog','public'
as $$
  select
    (select count(*) from public.cosplay_friendships f
      where f.status='accepted'
        and (f.requester_profile_id=target_profile_id or f.addressee_profile_id=target_profile_id)) as friend_count,
    (select count(*) from public.cosplay_social_posts p
      where p.author_profile_id=target_profile_id
        and p.moderation_status='active'
        and p.visibility='public') as post_count,
    (select count(*) from public.cosplay_social_posts p
      where p.author_profile_id=target_profile_id
        and p.moderation_status='active'
        and p.visibility='public'
        and p.image_path is not null) as photo_count
  where exists (
    select 1
    from public.cosplay_participant_profiles pr
    left join public.cosplay_participant_access a
      on a.profile_id=pr.id and a.registration_id=pr.registration_id
    left join public.cosplay_profile_social_settings s on s.profile_id=pr.id
    where pr.id=target_profile_id
      and pr.registration_status <> 'cancelled'
      and (
        pr.profile_visible=true
        or (
          auth.uid() is not null
          and pr.user_id is not null
          and a.status='active'
          and coalesce(s.community_visible,true)=true
          and exists (
            select 1
            from public.cosplay_participant_profiles viewer
            join public.cosplay_participant_access va
              on va.profile_id=viewer.id and va.registration_id=viewer.registration_id
            where viewer.user_id=auth.uid()
              and viewer.registration_status <> 'cancelled'
              and va.status='active'
          )
        )
      )
  );
$$;

revoke all on function public.cosplay_public_profile_social_stats(uuid) from public;
grant execute on function public.cosplay_public_profile_social_stats(uuid) to anon, authenticated;
