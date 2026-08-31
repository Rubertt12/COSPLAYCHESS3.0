(() => {
  'use strict';
  if (window.__CC_MESSAGE_ALERTS_V13__) return;
  window.__CC_MESSAGE_ALERTS_V13__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const seen = new Set();
  let me = null;
  let channel = null;
  let audioCtx = null;
  let originalTitle = document.title;
  let pendingTitleCount = 0;

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const safeImage = (value) => {
    try {
      const url = new URL(String(value || ''), location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const displayName = (p) => p?.display_name || p?.nick || 'Participante';

  function injectStyle() {
    if (document.getElementById('ccMessageAlertsV13Style')) return;
    const style = document.createElement('style');
    style.id = 'ccMessageAlertsV13Style';
    style.textContent = `
      #cc-message-alert-stack{position:fixed;right:18px;top:18px;z-index:100050;display:grid;gap:10px;width:min(360px,calc(100vw - 28px));pointer-events:none}
      .cc-message-alert{pointer-events:auto;display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center;padding:11px 12px;border:1px solid rgba(180,116,255,.42);border-radius:14px;background:rgba(8,10,16,.97);color:#f8f4ff;box-shadow:0 18px 52px rgba(0,0,0,.42);backdrop-filter:blur(14px);cursor:pointer;animation:ccMessageAlertIn .2s ease-out}
      .cc-message-alert:hover{border-color:rgba(240,182,47,.65);transform:translateY(-1px)}
      .cc-message-alert-avatar{width:44px;height:44px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#17121f;border:1px solid rgba(255,255,255,.12);font-size:20px}
      .cc-message-alert-avatar img{width:100%;height:100%;object-fit:cover}
      .cc-message-alert-copy{min-width:0;display:grid;gap:3px}
      .cc-message-alert-copy b{font:800 12px Inter,system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cc-message-alert-copy span{font:600 10px/1.35 Inter,system-ui;color:#c9c3d3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cc-message-alert-close{border:0;background:transparent;color:#9c95a8;font-size:17px;cursor:pointer;padding:4px}
      @keyframes ccMessageAlertIn{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:none}}
      @media(max-width:720px){#cc-message-alert-stack{top:10px;right:10px;width:calc(100vw - 20px)}.cc-message-alert{grid-template-columns:40px 1fr auto}.cc-message-alert-avatar{width:40px;height:40px}}
    `;
    document.head.appendChild(style);
  }

  function unlockAudio() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    } catch {}
  }

  function playMessageSound() {
    try {
      unlockAudio();
      if (!audioCtx || audioCtx.state !== 'running') return;
      const now = audioCtx.currentTime;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      gain.connect(audioCtx.destination);
      [659.25, 783.99].forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.11);
        osc.connect(gain);
        osc.start(now + index * 0.11);
        osc.stop(now + 0.31 + index * 0.11);
      });
    } catch {}
  }

  function messagePreview(message) {
    if (message?.attachment_type === 'audio') return '🎙️ Enviou um áudio';
    if (message?.attachment_type === 'image') return message.body?.trim() || '📷 Enviou uma foto';
    const body = String(message?.body || '').trim();
    return body || 'Nova mensagem';
  }

  async function loadProfile(id) {
    if (!id) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url')
      .eq('id', id)
      .maybeSingle();
    return data || { id, display_name: 'Participante' };
  }

  function openConversation(senderId) {
    window.focus?.();
    const nav = q('.community-nav [data-community-view="messages"], [data-community-view="messages"]');
    nav?.click();
    let tries = 0;
    const open = () => {
      tries++;
      const selector = `[data-cc12-thread="${CSS.escape(String(senderId))}"],[data-cc12-peer="${CSS.escape(String(senderId))}"]`;
      const target = q(selector);
      if (target) { target.click(); return; }
      if (tries < 7) setTimeout(open, 180);
      else {
        const url = new URL(location.href);
        url.searchParams.set('message', senderId);
        location.href = url.href;
      }
    };
    setTimeout(open, 120);
  }

  function showInAppAlert(profile, message) {
    injectStyle();
    let stack = document.getElementById('cc-message-alert-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'cc-message-alert-stack';
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const card = document.createElement('div');
    card.className = 'cc-message-alert';
    const image = safeImage(profile?.character_photo_url);
    card.innerHTML = `<span class="cc-message-alert-avatar">${image ? `<img src="${image}" alt="">` : '♜'}</span><span class="cc-message-alert-copy"><b>Nova mensagem de ${displayName(profile)}</b><span></span></span><button class="cc-message-alert-close" type="button" aria-label="Fechar">×</button>`;
    card.querySelector('.cc-message-alert-copy span').textContent = messagePreview(message);
    card.addEventListener('click', (event) => {
      if (event.target.closest('.cc-message-alert-close')) return;
      card.remove();
      openConversation(message.sender_profile_id);
    });
    card.querySelector('.cc-message-alert-close')?.addEventListener('click', (event) => {
      event.stopPropagation();
      card.remove();
    });
    stack.prepend(card);
    while (stack.children.length > 4) stack.lastElementChild?.remove();
    setTimeout(() => card.remove(), 6500);
  }

  function showBrowserNotification(profile, message) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const currentThread = q(`[data-cc12-thread="${CSS.escape(String(message.sender_profile_id))}"].active`);
    if (document.visibilityState === 'visible' && currentThread) return;
    try {
      const notification = new Notification(`Mensagem de ${displayName(profile)}`, {
        body: messagePreview(message),
        icon: safeImage(profile?.character_photo_url) || './img/logofergoverse.png',
        badge: './img/logofergoverse.png',
        tag: `cc-dm-${message.sender_profile_id}`,
        renotify: true,
        silent: true
      });
      notification.onclick = () => {
        notification.close();
        openConversation(message.sender_profile_id);
      };
      setTimeout(() => notification.close(), 9000);
    } catch {}
  }

  async function refreshBadges() {
    if (!me) return;
    const [{ count: messageCount }, { count: notificationCount }] = await Promise.all([
      db.from('cosplay_direct_messages').select('id', { count: 'exact', head: true }).eq('recipient_profile_id', me.id).is('read_at', null).eq('moderation_status', 'active'),
      db.from('cosplay_social_notifications').select('id', { count: 'exact', head: true }).eq('recipient_profile_id', me.id).is('read_at', null)
    ]);
    const nav = q('.community-nav [data-community-view="messages"]');
    let messageBadge = q('.cc9-nav-badge', nav || document);
    if (!messageBadge && nav) {
      messageBadge = document.createElement('b');
      messageBadge.className = 'cc9-nav-badge';
      nav.appendChild(messageBadge);
    }
    if (messageBadge) {
      messageBadge.textContent = String(messageCount || 0);
      messageBadge.hidden = !(messageCount || 0);
    }
    qa('[data-community-view="notifications"] .social-v2-badge').forEach((badge) => {
      badge.textContent = String(notificationCount || 0);
      badge.hidden = !(notificationCount || 0);
    });
    const mirror = document.getElementById('ccNotificationBadge');
    if (mirror) {
      mirror.textContent = String(notificationCount || 0);
      mirror.hidden = !(notificationCount || 0);
    }
  }

  async function handleIncoming(message) {
    if (!message?.id || !me || message.recipient_profile_id !== me.id || message.sender_profile_id === me.id) return;
    if (message.moderation_status && message.moderation_status !== 'active') return;
    if (seen.has(message.id)) return;
    seen.add(message.id);
    if (seen.size > 300) seen.delete(seen.values().next().value);
    const profile = await loadProfile(message.sender_profile_id);
    playMessageSound();
    showInAppAlert(profile, message);
    showBrowserNotification(profile, message);
    pendingTitleCount++;
    if (document.visibilityState !== 'visible') document.title = `(${pendingTitleCount}) 💬 CosplayChess`;
    setTimeout(refreshBadges, 120);
  }

  async function boot() {
    const { data: auth } = await db.auth.getSession();
    const userId = auth?.session?.user?.id;
    if (!userId) return;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,user_id')
      .eq('user_id', userId)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return;
    me = data;
    await refreshBadges();
    channel = db.channel(`cc-message-alerts-v13-${me.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cosplay_direct_messages',
        filter: `recipient_profile_id=eq.${me.id}`
      }, (payload) => handleIncoming(payload.new).catch(() => {}))
      .subscribe();
  }

  document.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });
  document.addEventListener('keydown', unlockAudio, { capture: true });
  document.addEventListener('click', (event) => {
    if (!event.target.closest?.('[data-community-view="messages"]')) return;
    unlockAudio();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          const el = document.getElementById('cc12Toast');
          if (el) { el.textContent = 'Notificações de mensagens ativadas ✓'; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => el.hidden = true, 2200); }
        }
      }).catch(() => {});
    }
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pendingTitleCount = 0;
      document.title = originalTitle;
      refreshBadges().catch(() => {});
    }
  });

  window.addEventListener('beforeunload', () => {
    try { channel?.unsubscribe(); } catch {}
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot().catch(() => {}), { once: true });
  else boot().catch(() => {});
})();
