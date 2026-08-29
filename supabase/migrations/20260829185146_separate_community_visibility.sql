-- Keep internal Community visibility separate from the public internet profile.

alter table public.cosplay_profile_social_settings
  add column if not exists community_visible boolean not null default true;

insert into public.cosplay_profile_social_settings(profile_id,community_visible)
select p.id,true
from public.cosplay_participant_profiles p
join public.cosplay_participant_access a on a.profile_id=p.id and a.registration_id=p.registration_id
where p.user_id is not null
  and p.registration_status <> 'cancelled'
  and a.status='active'
on conflict (profile_id) do update
set community_visible=true,
    updated_at=now();

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

create or replace function public.cosplay_social_post_can_read(post_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog','public'
as $$
  select exists (
    select 1
    from public.cosplay_social_posts sp
    join public.cosplay_participant_profiles author on author.id=sp.author_profile_id
    where sp.id=post_id
      and (
        public.cosplay_profile_owned_by_me(sp.author_profile_id)
        or (
          sp.moderation_status='active'
          and (
            (
              sp.visibility='public'
              and (
                author.profile_visible=true
                or (
                  auth.uid() is not null
                  and exists (
                    select 1
                    from public.cosplay_participant_profiles viewer
                    join public.cosplay_participant_access va on va.profile_id=viewer.id and va.registration_id=viewer.registration_id
                    where viewer.user_id=auth.uid()
                      and viewer.registration_status <> 'cancelled'
                      and va.status='active'
                  )
                  and exists (
                    select 1
                    from public.cosplay_participant_access aa
                    left join public.cosplay_profile_social_settings s on s.profile_id=author.id
                    where aa.profile_id=author.id
                      and aa.registration_id=author.registration_id
                      and aa.status='active'
                      and author.user_id is not null
                      and author.registration_status <> 'cancelled'
                      and coalesce(s.community_visible,true)=true
                  )
                )
              )
            )
            or (
              auth.uid() is not null
              and sp.visibility='friends'
              and exists (
                select 1
                from public.cosplay_participant_profiles mine
                where mine.user_id=auth.uid()
                  and public.cosplay_profiles_are_friends(mine.id,sp.author_profile_id)
              )
            )
          )
        )
      )
  );
$$;

revoke all on function public.cosplay_activate_my_social_profile() from public, anon;
grant execute on function public.cosplay_activate_my_social_profile() to authenticated;
