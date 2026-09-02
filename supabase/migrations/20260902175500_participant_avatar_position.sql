alter table public.cosplay_participant_profiles
  add column if not exists avatar_position_x smallint not null default 50,
  add column if not exists avatar_position_y smallint not null default 35;

alter table public.cosplay_participant_profiles
  drop constraint if exists cosplay_participant_profiles_avatar_position_x_check,
  add constraint cosplay_participant_profiles_avatar_position_x_check
    check (avatar_position_x between 0 and 100),
  drop constraint if exists cosplay_participant_profiles_avatar_position_y_check,
  add constraint cosplay_participant_profiles_avatar_position_y_check
    check (avatar_position_y between 0 and 100);
