create table if not exists public.cosplay_onedrive_event_links (
  event_id uuid primary key references public.cosplay_events(id) on delete cascade,
  folder_id text,
  folder_name text,
  folder_web_url text,
  drive_id text,
  sync_enabled boolean not null default false,
  last_synced_at timestamptz,
  last_sync_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cosplay_onedrive_event_links enable row level security;

drop policy if exists "admin read onedrive event links" on public.cosplay_onedrive_event_links;
create policy "admin read onedrive event links"
on public.cosplay_onedrive_event_links
for select to authenticated
using (true);

drop policy if exists "admin write onedrive event links" on public.cosplay_onedrive_event_links;
create policy "admin write onedrive event links"
on public.cosplay_onedrive_event_links
for all to authenticated
using (true)
with check (true);
