-- Permite que participantes autenticados executem DELETE.
-- A política notifications_delete_own continua restringindo a operação
-- às notificações cujo recipient_profile_id pertence ao auth.uid().
grant delete on table public.cosplay_social_notifications to authenticated;
