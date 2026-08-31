(() => {
  'use strict';
  if (window.__CC_COMMUNITY_OWNER_ACTIONS_V17__) return;
  window.__CC_COMMUNITY_OWNER_ACTIONS_V17__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const $ = id => document.getElementById(id);

  function addStyle() {
    if (document.getElementById('ccCommunityOwnerActionsStyle')) return;
    const style = document.createElement('style');
    style.id = 'ccCommunityOwnerActionsStyle';
    style.textContent = `
      .cc-community-danger{margin-top:22px;padding-top:18px;border-top:1px solid rgba(231,76,60,.24)}
      .cc-community-danger h3{margin:0 0 6px;color:#ff8174;font-size:16px}
      .cc-community-danger p{margin:0 0 12px;color:#a99da9;font-size:12px;line-height:1.55}
      .cc-community-remove-btn{border:1px solid rgba(231,76,60,.55)!important;background:rgba(143,34,28,.16)!important;color:#ff8b7e!important}
      .cc-community-remove-btn:hover{background:rgba(184,43,35,.26)!important}
      .cc-community-remove-status{display:block;margin-top:10px;min-height:18px;font-size:12px;color:#ff8b7e}
    `;
    document.head.appendChild(style);
  }

  async function loadOwnerContext() {
    if (!db) return null;
    const { data: sessionData } = await db.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;

    const { data: profiles, error: profilesError } = await db.from('cosplay_participant_profiles')
      .select('id,user_id')
      .eq('user_id', user.id)
      .neq('registration_status', 'cancelled');
    if (profilesError || !Array.isArray(profiles) || profiles.length === 0) return null;

    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) return null;
    const { data: group } = await db.from('cosplay_communities')
      .select('id,name,slug,owner_profile_id,moderation_status')
      .eq('slug', slug)
      .maybeSingle();
    if (!group) return null;

    const profile = profiles.find(item => item.id === group.owner_profile_id);
    if (!profile) return null;
    return { profile, group };
  }

  function install(ctx) {
    const card = $('groupEditCard');
    if (!card || card.querySelector('[data-cc-community-danger]')) return false;
    addStyle();

    const zone = document.createElement('section');
    zone.className = 'cc-community-danger';
    zone.dataset.ccCommunityDanger = '1';

    const title = document.createElement('h3');
    title.textContent = 'Zona de perigo';
    const copy = document.createElement('p');
    copy.textContent = 'Ao excluir, a comunidade deixa de aparecer e fica inacessível para membros e visitantes. Esta ação exige confirmação pelo nome.';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn dark cc-community-remove-btn';
    button.textContent = 'Excluir comunidade';
    const status = document.createElement('span');
    status.className = 'cc-community-remove-status';

    button.addEventListener('click', async () => {
      const typed = prompt(`Para excluir “${ctx.group.name}”, digite o nome exato da comunidade:`);
      if (typed === null) return;
      if (typed.trim() !== ctx.group.name.trim()) {
        status.textContent = 'O nome digitado não confere. Nada foi alterado.';
        return;
      }
      if (!confirm('Última confirmação: excluir esta comunidade agora?')) return;

      button.disabled = true;
      button.textContent = 'Excluindo…';
      status.textContent = 'Removendo a comunidade…';
      try {
        const { error } = await db.from('cosplay_communities')
          .update({ moderation_status:'removed', updated_at:new Date().toISOString() })
          .eq('id', ctx.group.id)
          .eq('owner_profile_id', ctx.profile.id);
        if (error) throw error;
        status.textContent = 'Comunidade excluída.';
        location.replace('./comunidade.html?deleted=1');
      } catch (error) {
        console.error('[CosplayChess community owner action]', error);
        status.textContent = `Não foi possível excluir a comunidade${error?.message ? `: ${error.message}` : '.'}`;
        button.disabled = false;
        button.textContent = 'Excluir comunidade';
      }
    });

    zone.append(title, copy, button, status);
    card.appendChild(zone);
    return true;
  }

  async function boot() {
    try {
      const ctx = await loadOwnerContext();
      if (!ctx) return;
      const tryInstall = () => install(ctx);
      if (tryInstall()) return;
      [120, 350, 800, 1500].forEach(ms => setTimeout(tryInstall, ms));
    } catch (error) {
      console.error('[CosplayChess community owner actions boot]', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
