revoke execute on function public.cosplay_update_my_event_cosplay(uuid,text,text) from anon;
revoke execute on function public.cosplay_social_presence_heartbeat() from anon;
revoke execute on function public.cosplay_message_presence(uuid[]) from anon;

grant execute on function public.cosplay_update_my_event_cosplay(uuid,text,text) to authenticated;
grant execute on function public.cosplay_social_presence_heartbeat() to authenticated;
grant execute on function public.cosplay_message_presence(uuid[]) to authenticated;
