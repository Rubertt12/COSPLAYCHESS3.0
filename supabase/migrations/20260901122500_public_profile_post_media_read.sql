drop policy if exists social_media_select_public_profile_posts on storage.objects;

create policy social_media_select_public_profile_posts
on storage.objects
for select
to anon
using (
  bucket_id = 'cosplaychess-social-media'
  and exists (
    select 1
    from public.cosplay_social_posts sp
    join public.cosplay_participant_profiles p on p.id = sp.author_profile_id
    where (sp.image_path = storage.objects.name or sp.video_path = storage.objects.name)
      and sp.visibility = 'public'
      and coalesce(sp.moderation_status, 'active') = 'active'
      and p.profile_visible = true
      and p.registration_status <> 'cancelled'
  )
);
