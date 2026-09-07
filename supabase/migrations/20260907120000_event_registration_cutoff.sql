alter table public.cosplay_events
  add column if not exists registration_closes_day_before boolean not null default false;