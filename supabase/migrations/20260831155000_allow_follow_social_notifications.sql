alter table public.cosplay_social_notifications
  drop constraint if exists cosplay_social_notifications_kind_check;

alter table public.cosplay_social_notifications
  add constraint cosplay_social_notifications_kind_check
  check (kind in (
    'friend_request','friend_accepted','post_like','post_comment','testimonial',
    'community_join','message','tag','achievement','system','follow'
  ));
