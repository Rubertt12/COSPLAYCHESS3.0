(() => {
  if (window.__COSPLAY_PROFILE_VISIBILITY_SETTING__) return;
  window.__COSPLAY_PROFILE_VISIBILITY_SETTING__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  let profile = null;
  let observer = null;

  const getOwnedProfile = async () => {
    if (profile) return profile;
    const { data: sessionData } = await db.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id')
      .eq('user_id', user.id)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    profile = data || null;
    return profile;
  };

  const getVisibility = async (profileId) => {
    const { data } = await db.from('cosplay_profile_social_settings')
      .select('community_visible')
      .eq('profile_id', profileId)
      .maybeSingle();
    return data?.community_visible !== false;
  };

  const setStatus = (message, kind = '') => {
    const st = document.getElementById('socialV2SettingsStatus');
    if (!st) return;
    st.textContent = message;
    st.className = `social-v2-status${kind ? ` ${kind}` : ''}`;
  };

  const inject = async () => {
    const form = document.getElementById('socialV2SettingsForm');
    if (!form || form.querySelector('[data-community-visible-setting]')) return;

    const label = document.createElement('label');
    label.className = 'social-v2-setting wide';
    label.dataset.communityVisibleSetting = '1';
    label.innerHTML = '<span><b>Perfil social visível</b><span>Quando ativado, outros participantes podem encontrar e abrir sua comunidade social.</span></span><input type="checkbox" name="community_visible" aria-label="Perfil social visível" checked>';
    const input = label.querySelector('input');
    const statusRow = form.querySelector('.social-v2-settings-actions');
    form.insertBefore(label, statusRow || null);

    const p = await getOwnedProfile();
    if (!p || !input.isConnected) return;
    input.checked = await getVisibility(p.id);

    input.addEventListener('change', async () => {
      const next = input.checked;
      input.disabled = true;
      const { error } = await db.from('cosplay_profile_social_settings')
        .upsert({ profile_id: p.id, community_visible: next, updated_at: new Date().toISOString() }, { onConflict: 'profile_id' });
      input.disabled = false;
      if (error) {
        input.checked = !next;
        setStatus('Não foi possível alterar a visibilidade do perfil social.', 'error');
        return;
      }
      setStatus(next ? 'Perfil social visível.' : 'Perfil social oculto.', 'success');
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