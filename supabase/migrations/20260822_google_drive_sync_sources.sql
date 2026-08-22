alter table public.cosplay_event_photos
  add column if not exists source_provider text,
  add column if not exists source_file_id text;

create unique index if not exists cosplay_event_photos_source_unique
  on public.cosplay_event_photos(event_id, source_provider, source_file_id)
  where source_file_id is not null;

create table if not exists public.cosplay_google_drive_event_links (
  event_id uuid primary key references public.cosplay_events(id) on delete cascade,
  folder_id text not null,
  folder_name text not null,
  folder_url text,
  drive_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cosplay_google_drive_event_links enable row level security;

drop policy if exists "Admins can read google drive links" on public.cosplay_google_drive_event_links;
create policy "Admins can read google drive links"
on public.cosplay_google_drive_event_links
for select to authenticated
using (true);

drop policy if exists "Admins can manage google drive links" on public.cosplay_google_drive_event_links;
create policy "Admins can manage google drive links"
on public.cosplay_google_drive_event_links
for all to authenticated
using (true)
with check (true);
