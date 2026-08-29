-- Expose only the safe public/community presence fields.

create or replace function public.cosplay_public_profile_presence(target_profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog','public'
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'online',(s.show_online is true and s.last_seen_at is not null and s.last_seen_at > now()-interval '5 minutes'),
        'status_message',left(coalesce(s.status_message,''),180),
        'birthday_day',case when s.show_birthday is true then s.birthday_day else null end,
        'birthday_month',case when s.show_birthday is true then s.birthday_month else null end
      )
      from public.cosplay_profile_social_settings s
      join public.cosplay_participant_profiles p on p.id=s.profile_id
      left join public.cosplay_participant_access a on a.profile_id=p.id and a.registration_id=p.registration_id
      where s.profile_id=target_profile_id
        and p.registration_status <> 'cancelled'
        and (
          p.profile_visible=true
          or (
            auth.uid() is not null
            and a.status='active'
            and p.user_id is not null
            and s.community_visible=true
            and exists (
              select 1
              from public.cosplay_participant_profiles viewer
              join public.cosplay_participant_access va on va.profile_id=viewer.id and va.registration_id=viewer.registration_id
              where viewer.user_id=auth.uid()
                and viewer.registration_status <> 'cancelled'
                and va.status='active'
            )
          )
        )
      limit 1
    ),
    jsonb_build_object('online',false,'status_message','','birthday_day',null,'birthday_month',null)
  );
$$;

revoke all on function public.cosplay_public_profile_presence(uuid) from public;
grant execute on function public.cosplay_public_profile_presence(uuid) to anon, authenticated;
