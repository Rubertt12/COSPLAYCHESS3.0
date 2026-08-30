(() => {
  if (window.__COSPLAY_PROFILE_VISIBILITY_SETTING__) return;
  window.__COSPLAY_PROFILE_VISIBILITY_SETTING__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  let profile = null;
  let observer = null;

  const getProfile = async () => {
    if (profile) return profile;
    const { data: sessionData } = await db.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,community_visible')
      .eq('user_id', user.id)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    profile = data || null;
    return profile;
  };

  const inject = async () => {
    const form = document.getElementById('socialV2SettingsForm');
    if (!form || form.querySelector('[data-community-visible-setting]')) return;
    const p = await getProfile();
    if (!p || !form.isConnected) return;

    const label = document.createElement('label');
    label.className = 'social-v2-setting wide';
    label.dataset.communityVisibleSetting = '1';
    label.innerHTML = '<span><b>Perfil social visível</b><span>Permite que outros participantes encontrem e abram sua comunidade social. Amigos continuam sujeitos às regras de bloqueio.</span></span><input type="checkbox" name="community_visible" aria-label="Perfil social visível">';
    const input = label.querySelector('input');
    input.checked = p.community_visible !== false;

    const statusRow = form.querySelector('.social-v2-settings-actions');
    form.insertBefore(label, statusRow || null);

    input.addEventListener('change', async () => {
      input.disabled = true;
      const next = input.checked;
      const { error } = await db.from('cosplay_participant_profiles').update({ community_visible: next }).eq('id', p.id);
      input.disabled = false;
      if (error) {
        input.checked = !next;
        const st = document.getElementById('socialV2SettingsStatus');
        if (st) { st.textContent = 'Não foi possível alterar a visibilidade do perfil social.'; st.className = 'social-v2-status error'; }
        return;
      }
      p.community_visible = next;
      const st = document.getElementById('socialV2SettingsStatus');
      if (st) { st.textContent = next ? 'Perfil social visível.' : 'Perfil social oculto.'; st.className = 'social-v2-status success'; }
    });
  };

  const start = () => {
    inject().catch(() => {});
    observer = new MutationObserver(() => {
      if (document.getElementById('socialV2SettingsForm') && !document.querySelector('[data-community-visible-setting]')) inject().catch(() => {});
    });
    observer.observe(document.querySelector('.community-main') || document.body, { childList: true, subtree: true });
    setTimeout(() => { observer?.disconnect(); observer = null; }, 30000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();