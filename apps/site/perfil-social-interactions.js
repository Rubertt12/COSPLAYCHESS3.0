(() => {
  'use strict';
  if (window.__COSPLAY_SOCIAL_PROFILE_INTERACTIONS__) return;
  window.__COSPLAY_SOCIAL_PROFILE_INTERACTIONS__ = true;

  const db = window.getCosplayChessParticipantDb
    ? window.getCosplayChessParticipantDb()
    : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const slug = String(new URLSearchParams(location.search).get('slug') || '').trim();
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  const loadContext = async () => {
    const { data: sessionData } = await db.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user || !slug) return null;

    const [{ data: mine }, { data: targetData, error: targetError }] = await Promise.all([
      db.from('cosplay_participant_profiles')
        .select('id,display_name,nick')
        .eq('user_id', user.id)
        .neq('registration_status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.rpc('cosplay_community_profile_by_slug', { p_slug: slug })
    ]);

    const target = Array.isArray(targetData) ? targetData[0] : targetData;
    if (!mine || targetError || !target?.profile_id) return null;
    return { mine, target };
  };

  const showComposer = ({ mine, target }, button) => {
    if (document.getElementById('socialProfileMessageDialog')) return;

    const overlay = document.createElement('div');
    overlay.id = 'socialProfileMessageDialog';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(5,7,12,.72);display:grid;place-items:center;padding:20px;';

    const panel = document.createElement('div');
    panel.style.cssText = 'width:min(520px,100%);background:#121621;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:20px;box-shadow:0 24px 70px rgba(0,0,0,.45);';

    const title = document.createElement('h3');
    title.textContent = `Mensagem para ${target.display_name || target.nick || 'participante'}`;
    title.style.margin = '0 0 10px';

    const text = document.createElement('textarea');
    text.maxLength = 1200;
    text.rows = 5;
    text.placeholder = 'Escreva uma mensagem...';
    text.style.cssText = 'width:100%;box-sizing:border-box;resize:vertical;border-radius:12px;padding:12px;margin:0 0 12px;background:#0c1018;color:inherit;border:1px solid rgba(255,255,255,.14);';

    const status = document.createElement('div');
    status.style.cssText = 'min-height:20px;font-size:13px;opacity:.82;margin-bottom:10px;';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;';

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn dark';
    cancel.textContent = 'Cancelar';
    cancel.addEventListener('click', () => overlay.remove());

    const send = document.createElement('button');
    send.type = 'button';
    send.className = 'btn gold';
    send.textContent = 'Enviar mensagem';
    send.addEventListener('click', async () => {
      const body = String(text.value || '').trim();
      if (!body) {
        status.textContent = 'Escreva uma mensagem antes de enviar.';
        return;
      }
      send.disabled = true;
      send.textContent = 'Enviando...';
      const { error } = await db.from('cosplay_direct_messages').insert({
        sender_profile_id: mine.id,
        recipient_profile_id: target.profile_id,
        body,
        moderation_status: 'active'
      });
      if (error) {
        send.disabled = false;
        send.textContent = 'Enviar mensagem';
        status.textContent = 'Não foi possível enviar. O participante pode aceitar mensagens apenas de amigos.';
        return;
      }
      status.textContent = 'Mensagem enviada ✓';
      button.textContent = 'Mensagem enviada ✓';
      setTimeout(() => overlay.remove(), 700);
    });

    actions.append(cancel, send);
    panel.append(title, text, status, actions);
    overlay.appendChild(panel);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    setTimeout(() => text.focus(), 0);
  };

  const init = async () => {
    const ctx = await loadContext();
    if (!ctx || ctx.mine.id === ctx.target.profile_id) return;

    for (let i = 0; i < 40; i++) {
      const actions = document.getElementById('socialProfileActions');
      const content = document.getElementById('socialProfileContent');
      if (actions && content && !content.hidden) {
        if (!document.getElementById('socialProfileMessageAction')) {
          const button = document.createElement('button');
          button.id = 'socialProfileMessageAction';
          button.type = 'button';
          button.className = 'btn dark';
          button.textContent = '✉ Enviar mensagem';
          button.addEventListener('click', () => showComposer(ctx, button));
          actions.appendChild(button);
        }
        return;
      }
      await wait(150);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
