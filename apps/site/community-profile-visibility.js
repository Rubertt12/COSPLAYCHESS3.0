(() => {
  if (window.__COSPLAY_PROFILE_VISIBILITY_SETTING__) return;
  window.__COSPLAY_PROFILE_VISIBILITY_SETTING__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  let profile = null;
  let syncing = false;

  const getProfile = async () => {
    if (profile) return profile;
    const { data: sessionData } = await db.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;

    const { data, error } = await db
      .from('cosplay_participant_profiles')
      .select('id,community_visible')
      .eq('user_id', user.id)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    profile = data || null;
    return profile;
  };

  const setStatus = (message, kind = '') => {
    const st = document.getElementById('socialV2SettingsStatus');
    if (!st) return;
    st.textContent = message;
    st.className = `social-v2-status${kind ? ` ${kind}` : ''}`;
  };

  const syncValue = async (input) => {
    if (syncing) return;
    syncing = true;
    try {
      const p = await getProfile();
      if (p && input?.isConnected) input.checked = p.community_visible !== false;
    } finally {
      syncing = false;
    }
  };

  const bindSave = (input) => {
    if (!input || input.dataset.visibilityBound === '1') return;
    input.dataset.visibilityBound = '1';
    input.addEventListener('change', async () => {
      const previous = !input.checked;
      input.disabled = true;
      const next = input.checked;
      const p = await getProfile();

      if (!p) {
        input.checked = previous;
        input.disabled = false;
        setStatus('Não foi possível localizar seu perfil social.', 'error');
        return;
      }

      const { error } = await db
        .from('cosplay_participant_profiles')
        .update({ community_visible: next })
        .eq('id', p.id);

      input.disabled = false;
      if (error) {
        input.checked = previous;
        setStatus('Não foi possível alterar a visibilidade do perfil social.', 'error');
        return;
      }

      p.community_visible = next;
      setStatus(next ? 'Perfil social visível.' : 'Perfil social oculto.', 'success');
    });
  };

  const ensureControl = () => {
    const form = document.getElementById('socialV2SettingsForm');
    if (!form) return false;

    let label = form.querySelector('[data-community-visible-setting]');
    if (!label) {
      label = document.createElement('label');
      label.className = 'social-v2-setting wide';
      label.dataset.communityVisibleSetting = '1';
      label.innerHTML = '<span><b>Perfil social visível</b><span>Permite que outros participantes encontrem e abram sua comunidade social.</span></span><input type="checkbox" name="community_visible" aria-label="Perfil social visível" checked>';
      const actions = form.querySelector('.social-v2-settings-actions');
      form.insertBefore(label, actions || null);
    }

    const input = label.querySelector('input[name="community_visible"]');
    if (!input) return false;
    bindSave(input);
    syncValue(input).catch(() => {});
    return true;
  };

  const start = () => {
    ensureControl();

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      ensureControl();
      if (tries >= 60) clearInterval(timer);
    }, 500);

    const root = document.querySelector('.community-main') || document.body;
    const observer = new MutationObserver(() => ensureControl());
    observer.observe(root, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 30000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();