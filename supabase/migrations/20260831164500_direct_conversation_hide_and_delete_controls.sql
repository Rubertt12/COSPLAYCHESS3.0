create table if not exists public.cosplay_direct_conversation_hides (
  profile_id uuid not null references public.cosplay_participant_profiles(id) on delete cascade,
  peer_profile_id uuid not null references public.cosplay_participant_profiles(id) on delete cascade,
  hidden_before timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, peer_profile_id),
  constraint cosplay_direct_conversation_hides_not_self check (profile_id <> peer_profile_id)
);

alter table public.cosplay_direct_conversation_hides enable row level security;

drop policy if exists direct_conversation_hides_select_own on public.cosplay_direct_conversation_hides;
create policy direct_conversation_hides_select_own on public.cosplay_direct_conversation_hides for select to authenticated using (public.cosplay_profile_owned_by_me(profile_id));
drop policy if exists direct_conversation_hides_insert_own on public.cosplay_direct_conversation_hides;
create policy direct_conversation_hides_insert_own on public.cosplay_direct_conversation_hides for insert to authenticated with check (public.cosplay_profile_owned_by_me(profile_id));
drop policy if exists direct_conversation_hides_update_own on public.cosplay_direct_conversation_hides;
create policy direct_conversation_hides_update_own on public.cosplay_direct_conversation_hides for update to authenticated using (public.cosplay_profile_owned_by_me(profile_id)) with check (public.cosplay_profile_owned_by_me(profile_id));
drop policy if exists direct_conversation_hides_delete_own on public.cosplay_direct_conversation_hides;
create policy direct_conversation_hides_delete_own on public.cosplay_direct_conversation_hides for delete to authenticated using (public.cosplay_profile_owned_by_me(profile_id));
grant select,insert,update,delete on public.cosplay_direct_conversation_hides to authenticated;

create or replace function public.cosplay_hide_direct_conversation(p_peer uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_me uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select p.id into v_me from public.cosplay_participant_profiles p where p.user_id=auth.uid() and p.registration_status<>'cancelled' order by p.created_at desc limit 1;
  if v_me is null then raise exception 'profile_not_found'; end if;
  if p_peer is null or p_peer=v_me then raise exception 'invalid_peer'; end if;
  if not exists(select 1 from public.cosplay_participant_profiles p where p.id=p_peer) then raise exception 'peer_not_found'; end if;
  insert into public.cosplay_direct_conversation_hides(profile_id,peer_profile_id,hidden_before,updated_at) values(v_me,p_peer,now(),now())
  on conflict(profile_id,peer_profile_id) do update set hidden_before=excluded.hidden_before,updated_at=now();
  return true;
end;$$;
revoke all on function public.cosplay_hide_direct_conversation(uuid) from public;
grant execute on function public.cosplay_hide_direct_conversation(uuid) to authenticated;

drop policy if exists messages_select_parties on public.cosplay_direct_messages;
create policy messages_select_parties on public.cosplay_direct_messages for select to authenticated using (
  moderation_status='active'
  and exists(select 1 from public.cosplay_participant_profiles p where p.id=any(array[cosplay_direct_messages.sender_profile_id,cosplay_direct_messages.recipient_profile_id]) and p.user_id=(select auth.uid()))
  and not exists(
    select 1 from public.cosplay_direct_conversation_hides h
    where public.cosplay_profile_owned_by_me(h.profile_id)
      and ((h.profile_id=cosplay_direct_messages.sender_profile_id and h.peer_profile_id=cosplay_direct_messages.recipient_profile_id) or (h.profile_id=cosplay_direct_messages.recipient_profile_id and h.peer_profile_id=cosplay_direct_messages.sender_profile_id))
      and cosplay_direct_messages.created_at<=h.hidden_before
  )
);
