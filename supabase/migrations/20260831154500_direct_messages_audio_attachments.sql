alter table public.cosplay_direct_messages
  drop constraint if exists cosplay_direct_messages_attachment_type_check;

alter table public.cosplay_direct_messages
  add constraint cosplay_direct_messages_attachment_type_check
  check (attachment_type in ('text','image','audio'));

alter table public.cosplay_direct_messages
  drop constraint if exists cosplay_direct_messages_body_check;

alter table public.cosplay_direct_messages
  add constraint cosplay_direct_messages_body_check
  check (
    char_length(trim(body)) <= 2000
    and (char_length(trim(body)) >= 1 or attachment_path is not null)
  );

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp',
  'video/mp4','video/webm',
  'audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/x-m4a'
]
where id='cosplaychess-social-media';

drop policy if exists social_media_select_direct_messages on storage.objects;
create policy social_media_select_direct_messages on storage.objects
for select to authenticated
using (
  bucket_id='cosplaychess-social-media'
  and exists (
    select 1
    from public.cosplay_direct_messages dm
    where dm.attachment_path=storage.objects.name
      and dm.moderation_status='active'
      and (
        public.cosplay_profile_owned_by_me(dm.sender_profile_id)
        or public.cosplay_profile_owned_by_me(dm.recipient_profile_id)
      )
  )
);

drop policy if exists messages_delete_sender on public.cosplay_direct_messages;
create policy messages_delete_sender on public.cosplay_direct_messages
for delete to authenticated
using (public.cosplay_profile_owned_by_me(sender_profile_id));
