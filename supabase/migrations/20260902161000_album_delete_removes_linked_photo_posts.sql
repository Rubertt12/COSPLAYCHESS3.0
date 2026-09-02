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
     and image_path = v_path;

  delete from public.cosplay_social_album_photos
   where owner_profile_id = v_owner
     and image_path = v_path;

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

  select coalesce(array_agg(distinct image_path), array[]::text[])
    into v_paths
  from public.cosplay_social_album_photos
  where album_id = p_album;

  if coalesce(array_length(v_paths, 1), 0) > 0 then
    delete from public.cosplay_social_posts
     where author_profile_id = v_owner
       and image_path = any(v_paths);

    delete from public.cosplay_social_album_photos
     where owner_profile_id = v_owner
       and image_path = any(v_paths);
  end if;

  delete from public.cosplay_social_albums where id = p_album;
  return v_paths;
end;
$$;

revoke all on function public.cosplay_delete_album(uuid) from public, anon;
grant execute on function public.cosplay_delete_album(uuid) to authenticated;
