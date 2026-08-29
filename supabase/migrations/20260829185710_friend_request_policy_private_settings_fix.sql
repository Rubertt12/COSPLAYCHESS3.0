-- Check friend-request eligibility without exposing the private social-settings row.

create or replace function public.cosplay_friend_request_target_allowed(
  p_requester_profile_id uuid,
  p_target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog','public'
as $$
  select exists (
    select 1
    from public.cosplay_participant_profiles target
    join public.cosplay_participant_access a
      on a.profile_id=target.id and a.registration_id=target.registration_id
    left join public.cosplay_profile_social_settings s on s.profile_id=target.id
    where target.id=p_target_profile_id
      and target.user_id is not null
      and target.registration_status <> 'cancelled'
      and a.status='active'
      and coalesce(s.community_visible,true)=true
      and coalesce(s.allow_friend_requests,true)=true
      and not exists (
        select 1
        from public.cosplay_profile_blocks b
        where (b.blocker_profile_id=p_requester_profile_id and b.blocked_profile_id=p_target_profile_id)
           or (b.blocker_profile_id=p_target_profile_id and b.blocked_profile_id=p_requester_profile_id)
      )
  );
$$;

revoke all on function public.cosplay_friend_request_target_allowed(uuid,uuid) from public, anon;
grant execute on function public.cosplay_friend_request_target_allowed(uuid,uuid) to authenticated;

drop policy if exists friendships_insert_requester on public.cosplay_friendships;
create policy friendships_insert_requester
on public.cosplay_friendships
for insert
to authenticated
with check (
  status='pending'
  and public.cosplay_profile_owned_by_me(requester_profile_id)
  and public.cosplay_friend_request_target_allowed(requester_profile_id,addressee_profile_id)
);
