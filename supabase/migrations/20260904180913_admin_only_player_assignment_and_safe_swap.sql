create or replace function cosplay_private.manage_registration_player_role()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'cosplay_private'
as $$
declare
  backup jsonb;
  caller_is_admin boolean := public.is_cosplay_admin();
begin
  if tg_op = 'INSERT' then
    if new.game_role in ('player1','player2') and not caller_is_admin then
      raise exception 'PLAYER_ROLE_ADMIN_ONLY' using errcode = '42501';
    end if;

    if new.game_role = 'player1' then
      new.side_preference := 'Brancas';
    elsif new.game_role = 'player2' then
      new.side_preference := 'Pretas';
    end if;

    return new;
  end if;

  if new.game_role in ('player1','player2') and new.status <> 'cancelled' then
    if not caller_is_admin and (
      old.game_role is distinct from new.game_role
      or old.event_id is distinct from new.event_id
      or old.status is distinct from new.status
    ) then
      raise exception 'PLAYER_ROLE_ADMIN_ONLY' using errcode = '42501';
    end if;

    if caller_is_admin then
      if old.game_role = 'piece' then
        backup := jsonb_build_object(
          'side_preference', old.side_preference,
          'piece_preference', old.piece_preference,
          'second_piece_preference', old.second_piece_preference,
          'participation_type', old.participation_type
        );
        new.extra_fields := coalesce(new.extra_fields, '{}'::jsonb) || jsonb_build_object('_player_role_backup', backup);
      elsif old.game_role in ('player1','player2') and old.extra_fields ? '_player_role_backup' then
        new.extra_fields := coalesce(new.extra_fields, '{}'::jsonb) || jsonb_build_object('_player_role_backup', old.extra_fields -> '_player_role_backup');
      end if;

      if new.game_role = 'player1' then
        new.side_preference := 'Brancas';
      else
        new.side_preference := 'Pretas';
      end if;
      new.piece_preference := 'Sem preferência';
      new.second_piece_preference := 'Sem segunda preferência';
      new.participation_type := 'Jogador';

      update public.cosplay_registrations
      set game_role = 'piece',
          updated_at = now()
      where event_id = new.event_id
        and game_role = new.game_role
        and status <> 'cancelled'
        and id <> new.id;
    end if;

    return new;
  end if;

  if old.game_role in ('player1','player2') and new.game_role = 'piece' then
    backup := old.extra_fields -> '_player_role_backup';
    if jsonb_typeof(backup) = 'object' then
      new.side_preference := coalesce(nullif(backup ->> 'side_preference', ''), 'Sem preferência');
      new.piece_preference := coalesce(nullif(backup ->> 'piece_preference', ''), 'Sem preferência');
      new.second_piece_preference := coalesce(nullif(backup ->> 'second_piece_preference', ''), 'Sem segunda preferência');
      new.participation_type := coalesce(nullif(backup ->> 'participation_type', ''), 'Cosplayer');
    else
      new.side_preference := 'Sem preferência';
      if new.piece_preference in ('Não se aplica', '') then new.piece_preference := 'Sem preferência'; end if;
      if new.second_piece_preference in ('Não se aplica', '') then new.second_piece_preference := 'Sem segunda preferência'; end if;
      if new.participation_type = 'Jogador' then new.participation_type := 'Cosplayer'; end if;
    end if;
    new.extra_fields := coalesce(new.extra_fields, '{}'::jsonb) - '_player_role_backup';
  end if;

  return new;
end;
$$;

revoke all on function cosplay_private.manage_registration_player_role() from public;

drop trigger if exists cosplay_registration_player_role_insert_guard on public.cosplay_registrations;
create trigger cosplay_registration_player_role_insert_guard
before insert on public.cosplay_registrations
for each row execute function cosplay_private.manage_registration_player_role();

drop trigger if exists cosplay_registration_player_role_update_guard on public.cosplay_registrations;
create trigger cosplay_registration_player_role_update_guard
before update of event_id, game_role, status on public.cosplay_registrations
for each row execute function cosplay_private.manage_registration_player_role();
