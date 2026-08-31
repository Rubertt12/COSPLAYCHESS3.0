-- Community join flow: reliable request state + owner/requester notifications.

create or replace function public.cosplay_community_request_join(p_community uuid)
returns text
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  me uuid;
  pol text;
  vis text;
  owner_id uuid;
  community_name text;
  previous_status text;
begin
  select id into me
  from public.cosplay_participant_profiles
  where user_id = auth.uid()
    and registration_status <> 'cancelled'
  order by created_at desc
  limit 1;

  if me is null then
    raise exception 'participante não encontrado';
  end if;

  if exists (
    select 1
    from public.cosplay_community_bans
    where community_id = p_community
      and profile_id = me
  ) then
    raise exception 'acesso bloqueado';
  end if;

  if exists (
    select 1
    from public.cosplay_community_members
    where community_id = p_community
      and profile_id = me
  ) then
    return 'member';
  end if;

  select join_policy, visibility, owner_profile_id, name
    into pol, vis, owner_id, community_name
  from public.cosplay_communities
  where id = p_community
    and moderation_status = 'active';

  if pol is null then
    raise exception 'comunidade indisponível';
  end if;

  if pol = 'open' then
    insert into public.cosplay_community_members(community_id, profile_id, role)
    values (p_community, me, 'member')
    on conflict do nothing;

    perform private.cosplay_push_notification(
      owner_id,
      me,
      'community_join',
      'community',
      p_community,
      'entrou na comunidade ' || coalesce(community_name, 'CosplayChess') || '.'
    );

    return 'joined';
  end if;

  select status into previous_status
  from public.cosplay_community_join_requests
  where community_id = p_community
    and profile_id = me;

  insert into public.cosplay_community_join_requests(community_id, profile_id, status, updated_at)
  values (p_community, me, 'pending', now())
  on conflict (community_id, profile_id)
  do update set status = 'pending', updated_at = now();

  if previous_status is distinct from 'pending' then
    perform private.cosplay_push_notification(
      owner_id,
      me,
      'community_join',
      'community',
      p_community,
      'solicitou entrada em ' || coalesce(community_name, 'uma comunidade') || '.'
    );
  end if;

  return 'pending';
end
$function$;

create or replace function public.cosplay_community_review_join(
  p_community uuid,
  p_profile uuid,
  p_approve boolean
)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  me uuid;
  allowed boolean;
  community_name text;
  updated_count integer;
begin
  select id into me
  from public.cosplay_participant_profiles
  where user_id = auth.uid()
    and registration_status <> 'cancelled'
  order by created_at desc
  limit 1;

  select exists(
    select 1
    from public.cosplay_communities c
    where c.id = p_community
      and c.owner_profile_id = me
    union all
    select 1
    from public.cosplay_community_members m
    where m.community_id = p_community
      and m.profile_id = me
      and m.role = 'moderator'
  ) into allowed;

  if not coalesce(allowed, false) then
    raise exception 'sem permissão';
  end if;

  select name into community_name
  from public.cosplay_communities
  where id = p_community;

  update public.cosplay_community_join_requests
  set status = case when p_approve then 'approved' else 'declined' end,
      updated_at = now()
  where community_id = p_community
    and profile_id = p_profile
    and status = 'pending';

  get diagnostics updated_count = row_count;

  if updated_count = 0 then
    raise exception 'pedido de entrada não encontrado ou já revisado';
  end if;

  if p_approve then
    insert into public.cosplay_community_members(community_id, profile_id, role)
    values (p_community, p_profile, 'member')
    on conflict do nothing;
  end if;

  perform private.cosplay_push_notification(
    p_profile,
    me,
    'community_join',
    'community',
    p_community,
    case
      when p_approve then 'aprovou sua entrada em ' || coalesce(community_name, 'uma comunidade') || '.'
      else 'não aprovou sua solicitação para ' || coalesce(community_name, 'uma comunidade') || '.'
    end
  );

  return p_approve;
end
$function$;

revoke all on function public.cosplay_community_request_join(uuid) from public, anon;
revoke all on function public.cosplay_community_review_join(uuid, uuid, boolean) from public, anon;
grant execute on function public.cosplay_community_request_join(uuid) to authenticated, service_role;
grant execute on function public.cosplay_community_review_join(uuid, uuid, boolean) to authenticated, service_role;

-- Backfill owner alerts for pending requests that were created before this migration.
insert into public.cosplay_social_notifications(
  recipient_profile_id,
  actor_profile_id,
  kind,
  entity_type,
  entity_id,
  body
)
select
  c.owner_profile_id,
  r.profile_id,
  'community_join',
  'community',
  r.community_id,
  left('solicitou entrada em ' || coalesce(c.name, 'uma comunidade') || '.', 300)
from public.cosplay_community_join_requests r
join public.cosplay_communities c on c.id = r.community_id
where r.status = 'pending'
  and c.owner_profile_id <> r.profile_id
  and not exists (
    select 1
    from public.cosplay_social_notifications n
    where n.recipient_profile_id = c.owner_profile_id
      and n.actor_profile_id = r.profile_id
      and n.kind = 'community_join'
      and n.entity_type = 'community'
      and n.entity_id = r.community_id
      and n.created_at >= r.updated_at - interval '10 minutes'
  );
