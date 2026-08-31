alter table public.cosplay_social_posts
  add column if not exists post_type text not null default 'post',
  add column if not exists video_path text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.cosplay_social_posts
  drop constraint if exists cosplay_social_posts_post_type_check;
alter table public.cosplay_social_posts
  add constraint cosplay_social_posts_post_type_check
  check (post_type in ('post','poll','event'));

alter table public.cosplay_social_posts
  drop constraint if exists cosplay_social_posts_metadata_check;
alter table public.cosplay_social_posts
  add constraint cosplay_social_posts_metadata_check
  check (jsonb_typeof(metadata) = 'object');

drop policy if exists social_posts_insert_own on public.cosplay_social_posts;
create policy social_posts_insert_own on public.cosplay_social_posts
for insert to authenticated
with check (
  public.cosplay_profile_owned_by_me(author_profile_id)
  and (image_path is null or split_part(image_path,'/',1)=auth.uid()::text)
  and (video_path is null or split_part(video_path,'/',1)=auth.uid()::text)
);

drop policy if exists social_posts_update_own on public.cosplay_social_posts;
create policy social_posts_update_own on public.cosplay_social_posts
for update to authenticated
using (public.cosplay_profile_owned_by_me(author_profile_id))
with check (
  public.cosplay_profile_owned_by_me(author_profile_id)
  and (image_path is null or split_part(image_path,'/',1)=auth.uid()::text)
  and (video_path is null or split_part(video_path,'/',1)=auth.uid()::text)
);

create table if not exists public.cosplay_social_poll_votes (
  post_id uuid not null references public.cosplay_social_posts(id) on delete cascade,
  profile_id uuid not null references public.cosplay_participant_profiles(id) on delete cascade,
  option_index smallint not null check (option_index between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

alter table public.cosplay_social_poll_votes enable row level security;

drop policy if exists poll_votes_select_visible on public.cosplay_social_poll_votes;
create policy poll_votes_select_visible on public.cosplay_social_poll_votes
for select to authenticated
using (public.cosplay_social_post_can_read(post_id));

drop policy if exists poll_votes_insert_own on public.cosplay_social_poll_votes;
create policy poll_votes_insert_own on public.cosplay_social_poll_votes
for insert to authenticated
with check (
  public.cosplay_profile_owned_by_me(profile_id)
  and public.cosplay_social_post_can_read(post_id)
  and exists (
    select 1 from public.cosplay_social_posts sp
    where sp.id=post_id
      and sp.post_type='poll'
      and jsonb_typeof(sp.metadata->'options')='array'
      and option_index < jsonb_array_length(sp.metadata->'options')
  )
);

drop policy if exists poll_votes_update_own on public.cosplay_social_poll_votes;
create policy poll_votes_update_own on public.cosplay_social_poll_votes
for update to authenticated
using (public.cosplay_profile_owned_by_me(profile_id))
with check (
  public.cosplay_profile_owned_by_me(profile_id)
  and public.cosplay_social_post_can_read(post_id)
  and exists (
    select 1 from public.cosplay_social_posts sp
    where sp.id=post_id
      and sp.post_type='poll'
      and jsonb_typeof(sp.metadata->'options')='array'
      and option_index < jsonb_array_length(sp.metadata->'options')
  )
);

drop policy if exists poll_votes_delete_own on public.cosplay_social_poll_votes;
create policy poll_votes_delete_own on public.cosplay_social_poll_votes
for delete to authenticated
using (public.cosplay_profile_owned_by_me(profile_id));

grant select,insert,update,delete on public.cosplay_social_poll_votes to authenticated;

create table if not exists public.cosplay_social_stories (
  id uuid primary key default gen_random_uuid(),
  author_profile_id uuid not null references public.cosplay_participant_profiles(id) on delete cascade,
  media_path text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  caption text not null default '',
  visibility text not null default 'friends' check (visibility in ('friends','public')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists cosplay_social_stories_active_idx on public.cosplay_social_stories(expires_at desc, created_at desc);
create index if not exists cosplay_social_stories_author_idx on public.cosplay_social_stories(author_profile_id, created_at desc);

create or replace function public.cosplay_social_story_can_read(story_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog','public'
as $$
  select exists (
    select 1
    from public.cosplay_social_stories s
    join public.cosplay_participant_profiles author on author.id=s.author_profile_id
    left join public.cosplay_profile_social_settings settings on settings.profile_id=author.id
    where s.id=story_id
      and s.expires_at > now()
      and author.user_id is not null
      and author.registration_status <> 'cancelled'
      and coalesce(settings.community_visible,true)=true
      and (
        public.cosplay_profile_owned_by_me(s.author_profile_id)
        or (
          auth.uid() is not null
          and not exists (
            select 1
            from public.cosplay_profile_blocks b
            join public.cosplay_participant_profiles viewer on viewer.user_id=auth.uid()
            where (b.blocker_profile_id=viewer.id and b.blocked_profile_id=s.author_profile_id)
               or (b.blocker_profile_id=s.author_profile_id and b.blocked_profile_id=viewer.id)
          )
          and (
            s.visibility='public'
            or (
              s.visibility='friends'
              and exists (
                select 1 from public.cosplay_participant_profiles viewer
                where viewer.user_id=auth.uid()
                  and public.cosplay_profiles_are_friends(viewer.id,s.author_profile_id)
              )
            )
          )
        )
      )
  );
$$;

grant execute on function public.cosplay_social_story_can_read(uuid) to authenticated;

alter table public.cosplay_social_stories enable row level security;

drop policy if exists stories_select_visible on public.cosplay_social_stories;
create policy stories_select_visible on public.cosplay_social_stories
for select to authenticated
using (public.cosplay_social_story_can_read(id));

drop policy if exists stories_insert_own on public.cosplay_social_stories;
create policy stories_insert_own on public.cosplay_social_stories
for insert to authenticated
with check (
  public.cosplay_profile_owned_by_me(author_profile_id)
  and split_part(media_path,'/',1)=auth.uid()::text
  and expires_at <= now() + interval '25 hours'
  and expires_at > now()
);

drop policy if exists stories_update_own on public.cosplay_social_stories;
create policy stories_update_own on public.cosplay_social_stories
for update to authenticated
using (public.cosplay_profile_owned_by_me(author_profile_id))
with check (
  public.cosplay_profile_owned_by_me(author_profile_id)
  and split_part(media_path,'/',1)=auth.uid()::text
);

drop policy if exists stories_delete_own on public.cosplay_social_stories;
create policy stories_delete_own on public.cosplay_social_stories
for delete to authenticated
using (public.cosplay_profile_owned_by_me(author_profile_id));

grant select,insert,update,delete on public.cosplay_social_stories to authenticated;

create table if not exists public.cosplay_social_story_views (
  story_id uuid not null references public.cosplay_social_stories(id) on delete cascade,
  viewer_profile_id uuid not null references public.cosplay_participant_profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_profile_id)
);
alter table public.cosplay_social_story_views enable row level security;

drop policy if exists story_views_select_related on public.cosplay_social_story_views;
create policy story_views_select_related on public.cosplay_social_story_views
for select to authenticated
using (
  public.cosplay_profile_owned_by_me(viewer_profile_id)
  or exists (
    select 1 from public.cosplay_social_stories s
    where s.id=story_id and public.cosplay_profile_owned_by_me(s.author_profile_id)
  )
);

drop policy if exists story_views_insert_own on public.cosplay_social_story_views;
create policy story_views_insert_own on public.cosplay_social_story_views
for insert to authenticated
with check (
  public.cosplay_profile_owned_by_me(viewer_profile_id)
  and public.cosplay_social_story_can_read(story_id)
);

drop policy if exists story_views_update_own on public.cosplay_social_story_views;
create policy story_views_update_own on public.cosplay_social_story_views
for update to authenticated
using (public.cosplay_profile_owned_by_me(viewer_profile_id))
with check (public.cosplay_profile_owned_by_me(viewer_profile_id));

grant select,insert,update on public.cosplay_social_story_views to authenticated;

update storage.buckets
set file_size_limit=26214400,
    allowed_mime_types=array['image/jpeg','image/png','image/webp','video/mp4','video/webm']
where id='cosplaychess-social-media';

drop policy if exists social_media_select_visible_posts on storage.objects;
create policy social_media_select_visible_posts on storage.objects
for select to authenticated
using (
  bucket_id='cosplaychess-social-media'
  and exists (
    select 1 from public.cosplay_social_posts sp
    where (sp.image_path=storage.objects.name or sp.video_path=storage.objects.name)
      and public.cosplay_social_post_can_read(sp.id)
  )
);

drop policy if exists social_media_select_visible_stories on storage.objects;
create policy social_media_select_visible_stories on storage.objects
for select to authenticated
using (
  bucket_id='cosplaychess-social-media'
  and exists (
    select 1 from public.cosplay_social_stories s
    where s.media_path=storage.objects.name
      and public.cosplay_social_story_can_read(s.id)
  )
);
