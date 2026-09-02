alter table public.cosplay_social_albums
  add column if not exists system_key text;

create unique index if not exists cosplay_social_albums_owner_system_key_uidx
  on public.cosplay_social_albums(owner_profile_id, system_key)
  where system_key is not null;

create or replace function public.cosplay_sync_post_photo_to_album()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_key text;
  v_name text;
begin
  if new.image_path is null or btrim(new.image_path) = '' then
    return new;
  end if;

  v_key := case when new.visibility = 'public' then 'feed_public' else 'feed_friends' end;
  v_name := case when new.visibility = 'public' then 'Publicações' else 'Publicações — Amigos' end;

  insert into public.cosplay_social_albums(owner_profile_id, name, description, visibility, system_key, updated_at)
  values (
    new.author_profile_id,
    v_name,
    'Fotos preservadas automaticamente a partir das publicações do feed.',
    case when new.visibility = 'public' then 'public' else 'friends' end,
    v_key,
    now()
  )
  on conflict (owner_profile_id, system_key) where system_key is not null
  do update set
    name = excluded.name,
    description = excluded.description,
    visibility = excluded.visibility,
    updated_at = now()
  returning id into v_album_id;

  delete from public.cosplay_social_album_photos ap
  using public.cosplay_social_albums a
  where ap.album_id = a.id
    and ap.owner_profile_id = new.author_profile_id
    and ap.image_path = new.image_path
    and a.system_key like 'feed_%'
    and a.id <> v_album_id;

  if not exists (
    select 1
    from public.cosplay_social_album_photos
    where album_id = v_album_id
      and owner_profile_id = new.author_profile_id
      and image_path = new.image_path
  ) then
    insert into public.cosplay_social_album_photos(album_id, owner_profile_id, image_path, caption)
    values (v_album_id, new.author_profile_id, new.image_path, left(coalesce(new.body, ''), 600));
  else
    update public.cosplay_social_album_photos
       set caption = left(coalesce(new.body, ''), 600)
     where album_id = v_album_id
       and owner_profile_id = new.author_profile_id
       and image_path = new.image_path;
  end if;

  return new;
end;
$$;

revoke all on function public.cosplay_sync_post_photo_to_album() from public;

drop trigger if exists cosplay_social_posts_sync_photo_album on public.cosplay_social_posts;
create trigger cosplay_social_posts_sync_photo_album
after insert or update of image_path, visibility, body
on public.cosplay_social_posts
for each row
execute function public.cosplay_sync_post_photo_to_album();

create or replace function public.cosplay_delete_album_photo(p_photo uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_path text;
begin
  select owner_profile_id, image_path
    into v_owner, v_path
  from public.cosplay_social_album_photos
  where id = p_photo;

  if v_owner is null or not exists (
    select 1 from public.cosplay_participant_profiles p
    where p.id = v_owner and p.user_id = auth.uid()
  ) then
    raise exception 'Foto não encontrada ou sem permissão' using errcode = '42501';
  end if;

  delete from public.cosplay_social_posts
   where author_profile_id = v_owner
     and image_path = v_path
     and nullif(btrim(coalesce(body, '')), '') is null;

  update public.cosplay_social_posts
     set image_path = null,
         updated_at = now()
   where author_profile_id = v_owner
     and image_path = v_path
     and nullif(btrim(coalesce(body, '')), '') is not null;

  delete from public.cosplay_social_album_photos where id = p_photo;
  return v_path;
end;
$$;

revoke all on function public.cosplay_delete_album_photo(uuid) from public, anon;
grant execute on function public.cosplay_delete_album_photo(uuid) to authenticated;

create or replace function public.cosplay_delete_album(p_album uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_paths text[];
begin
  select owner_profile_id into v_owner
  from public.cosplay_social_albums
  where id = p_album;

  if v_owner is null or not exists (
    select 1 from public.cosplay_participant_profiles p
    where p.id = v_owner and p.user_id = auth.uid()
  ) then
    raise exception 'Álbum não encontrado ou sem permissão' using errcode = '42501';
  end if;

  select coalesce(array_agg(image_path), array[]::text[])
    into v_paths
  from public.cosplay_social_album_photos
  where album_id = p_album;

  if coalesce(array_length(v_paths, 1), 0) > 0 then
    delete from public.cosplay_social_posts
     where author_profile_id = v_owner
       and image_path = any(v_paths)
       and nullif(btrim(coalesce(body, '')), '') is null;

    update public.cosplay_social_posts
       set image_path = null,
           updated_at = now()
     where author_profile_id = v_owner
       and image_path = any(v_paths)
       and nullif(btrim(coalesce(body, '')), '') is not null;
  end if;

  delete from public.cosplay_social_albums where id = p_album;
  return v_paths;
end;
$$;

revoke all on function public.cosplay_delete_album(uuid) from public, anon;
grant execute on function public.cosplay_delete_album(uuid) to authenticated;

insert into public.cosplay_social_albums(owner_profile_id, name, description, visibility, system_key)
select distinct
  sp.author_profile_id,
  case when sp.visibility = 'public' then 'Publicações' else 'Publicações — Amigos' end,
  'Fotos preservadas automaticamente a partir das publicações do feed.',
  case when sp.visibility = 'public' then 'public' else 'friends' end,
  case when sp.visibility = 'public' then 'feed_public' else 'feed_friends' end
from public.cosplay_social_posts sp
where sp.image_path is not null
on conflict (owner_profile_id, system_key) where system_key is not null do nothing;

insert into public.cosplay_social_album_photos(album_id, owner_profile_id, image_path, caption)
select a.id, sp.author_profile_id, sp.image_path, left(coalesce(sp.body, ''), 600)
from public.cosplay_social_posts sp
join public.cosplay_social_albums a
  on a.owner_profile_id = sp.author_profile_id
 and a.system_key = case when sp.visibility = 'public' then 'feed_public' else 'feed_friends' end
where sp.image_path is not null
  and not exists (
    select 1
    from public.cosplay_social_album_photos ap
    where ap.owner_profile_id = sp.author_profile_id
      and ap.image_path = sp.image_path
      and ap.album_id = a.id
  );

drop policy if exists social_media_delete_own_folder on storage.objects;
create policy social_media_delete_own_folder
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cosplaychess-social-media'
  and (storage.foldername(name))[1] = (auth.uid())::text
  and not exists (
    select 1
    from public.cosplay_social_album_photos ap
    where ap.image_path = storage.objects.name
  )
);