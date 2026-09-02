(() => {
  'use strict';
  if (window.__CC_NOTIFICATIONS_MANAGE_V1__) return;
  window.__CC_NOTIFICATIONS_MANAGE_V1__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;
  let profile = null;
  let timer = null;

  const toast = (message, kind='') => {
    let el = document.getElementById('ccNotificationManageToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ccNotificationManageToast';
      el.className = 'cc-notification-manage-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.dataset.kind = kind;
    el.hidden = false;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.hidden = true; }, 2400);
  };

  const loadProfile = async () => {
    if (profile) return profile;
    const { data:sessionData } = await db.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,user_id,created_at')
      .eq('user_id', user.id)
      .neq('registration_status', 'cancelled')
      .order('created_at', {ascending:true})
      .limit(1)
      .maybeSingle();
    profile = data || null;
    return profile;
  };

  const refreshBadges = async () => {
    const me = await loadProfile();
    if (!me) return;
    const { count } = await db.from('cosplay_social_notifications')
      .select('id', {count:'exact', head:true})
      .eq('recipient_profile_id', me.id)
      .is('read_at', null);
    const value = Number(count || 0);
    document.querySelectorAll('[data-community-view="notifications"] .social-v2-badge').forEach((badge) => {
      badge.textContent = String(value);
      badge.hidden = value === 0;
    });
    const top = document.getElementById('ccNotificationBadge');
    if (top) {
      top.textContent = String(value);
      top.hidden = value === 0;
    }
  };

  const deleteOne = async (row, button) => {
    const me = await loadProfile();
    const id = row?.dataset?.id;
    if (!me || !id || button.disabled) return;
    button.disabled = true;
    const { error } = await db.from('cosplay_social_notifications')
      .delete()
      .eq('id', id)
      .eq('recipient_profile_id', me.id);
    if (error) {
      button.disabled = false;
      toast('Não foi possível apagar a notificação.', 'error');
      return;
    }
    row.remove();
    const list = document.getElementById('cc9NotificationList');
    if (list && !list.querySelector('.cc9-notification')) list.innerHTML = '<div class="cc9-empty">Nenhuma notificação nesta categoria.</div>';
    await refreshBadges();
    toast('Notificação apagada.');
  };

  const clearAll = async (button) => {
    const me = await loadProfile();
    if (!me || button.disabled) return;
    if (!confirm('Apagar todas as suas notificações? Esta ação não pode ser desfeita.')) return;
    button.disabled = true;
    const { error } = await db.from('cosplay_social_notifications')
      .delete()
      .eq('recipient_profile_id', me.id);
    if (error) {
      button.disabled = false;
      toast('Não foi possível limpar as notificações.', 'error');
      return;
    }
    const list = document.getElementById('cc9NotificationList');
    if (list) list.innerHTML = '<div class="cc9-empty">Você não tem notificações.</div>';
    await refreshBadges();
    toast('Todas as notificações foram apagadas.');
    button.disabled = false;
  };

  const decorate = () => {
    const panel = document.querySelector('[data-community-panel="notifications"]');
    if (!panel) return;
    const toolbar = panel.querySelector('.cc9-panel-toolbar');
    if (toolbar && !toolbar.querySelector('#cc9DeleteAllNotifications')) {
      const button = document.createElement('button');
      button.id = 'cc9DeleteAllNotifications';
      button.className = 'cc9-chip cc-notification-clear';
      button.type = 'button';
      button.textContent = 'Apagar todas';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearAll(button);
      });
      toolbar.appendChild(button);
    }

    panel.querySelectorAll('.cc9-notification[data-id]').forEach((row) => {
      if (row.dataset.ccDeleteReady === '1') return;
      row.dataset.ccDeleteReady = '1';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cc-notification-delete';
      button.title = 'Apagar notificação';
      button.setAttribute('aria-label', 'Apagar notificação');
      button.textContent = '×';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        deleteOne(row, button);
      });
      row.appendChild(button);
    });
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(decorate, 80);
  };

  const boot = () => {
    const panel = document.querySelector('[data-community-panel="notifications"]');
    if (panel && !panel.__ccNotificationManageObserver) {
      panel.__ccNotificationManageObserver = true;
      new MutationObserver(schedule).observe(panel, {childList:true, subtree:true});
    }
    schedule();
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-community-view="notifications"]')) setTimeout(schedule, 160);
    }, true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 350), {once:true});
  else setTimeout(boot, 350);
})();