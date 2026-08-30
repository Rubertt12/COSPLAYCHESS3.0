(() => {
  'use strict';

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const topOffset = () => (document.querySelector('.community-premium-topbar')?.offsetHeight || 72) + 14;

  const focusActiveView = () => {
    const active = document.querySelector('.community-view.active:not([hidden])');
    if (!active) return;
    active.classList.remove('community-view-focus');
    void active.offsetWidth;
    active.classList.add('community-view-focus');
    const main = document.querySelector('.community-main');
    if (!main) return;
    const y = main.getBoundingClientRect().top + window.scrollY - topOffset();
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    setTimeout(() => active.classList.remove('community-view-focus'), 520);
  };

  const bindSidebarNavigation = () => {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('.community-nav [data-community-view], [data-orkut-open]');
      if (!button) return;
      setTimeout(focusActiveView, 90);
    });
  };

  const keepConversationAtBottom = () => {
    const scroll = () => {
      const panel = document.querySelector('[data-community-panel="messages"].active:not([hidden])');
      const stream = panel?.querySelector('.social-v2-message-stream');
      if (stream) stream.scrollTop = stream.scrollHeight;
    };
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-community-view="messages"], .social-v2-thread')) setTimeout(scroll, 120);
    });
    const observer = new MutationObserver(() => {
      const panel = document.querySelector('[data-community-panel="messages"].active:not([hidden])');
      const stream = panel?.querySelector('.social-v2-message-stream');
      if (!stream) return;
      const nearBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 180;
      if (nearBottom) requestAnimationFrame(() => { stream.scrollTop = stream.scrollHeight; });
    });
    const root = document.querySelector('.community-main');
    if (root) observer.observe(root, { childList: true, subtree: true });
  };

  const getProfile = async () => {
    if (!db?.auth?.getSession) return null;
    const { data: auth } = await db.auth.getSession();
    const user = auth?.session?.user;
    if (!user) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,registration_id')
      .eq('user_id', user.id)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data || null;
  };

  const loadAchievements = async () => {
    const profile = await getProfile();
    if (!profile?.registration_id) return [];
    const { data: awards } = await db.from('cosplay_cosplayer_achievements')
      .select('achievement_id,note,awarded_at')
      .eq('registration_id', profile.registration_id)
      .order('awarded_at', { ascending: false })
      .limit(8);
    if (!awards?.length) return [];
    const ids = [...new Set(awards.map(x => x.achievement_id).filter(Boolean))];
    if (!ids.length) return [];
    const { data: defs } = await db.from('cosplay_achievements')
      .select('id,title,description,icon,tier')
      .in('id', ids);
    const map = new Map((defs || []).map(item => [item.id, item]));
    return awards.map(award => ({ ...award, definition: map.get(award.achievement_id) })).filter(item => item.definition);
  };

  const buildAchievementRail = async () => {
    const rail = document.querySelector('.community-orkut-rail');
    if (!rail || rail.querySelector('.community-achievements-rail')) return;

    const oldCosplay = [...rail.querySelectorAll('.orkut-module')].find(section =>
      /meu\s*cosplaychess/i.test(section.querySelector('h3')?.textContent || '')
    );

    const card = document.createElement('section');
    card.className = 'community-achievements-rail';
    card.innerHTML = `
      <div class="community-achievements-rail-head">
        <h3>🏆 Minhas conquistas</h3>
        <a href="./conquistas.html">Ver todas</a>
      </div>
      <div class="community-achievements-rail-body">
        <div class="community-achievements-empty">Carregando suas conquistas...</div>
      </div>
      <div class="community-achievements-summary"><span>Total desbloqueado</span><b>0</b></div>`;

    if (oldCosplay) oldCosplay.replaceWith(card);
    else rail.appendChild(card);

    const body = card.querySelector('.community-achievements-rail-body');
    const total = card.querySelector('.community-achievements-summary b');

    try {
      const achievements = await loadAchievements();
      total.textContent = String(achievements.length);
      body.replaceChildren();
      if (!achievements.length) {
        body.innerHTML = '<div class="community-achievements-empty">Você ainda não desbloqueou conquistas. Elas aparecerão aqui assim que forem concedidas.</div>';
        return;
      }
      achievements.slice(0, 4).forEach(item => {
        const row = document.createElement('a');
        row.className = 'community-achievement-mini';
        row.href = './conquistas.html';
        row.style.textDecoration = 'none';
        const icon = document.createElement('div');
        icon.className = 'community-achievement-mini-icon';
        icon.textContent = item.definition.icon || '🏆';
        const copy = document.createElement('div');
        const title = document.createElement('b');
        title.textContent = item.definition.title || 'Conquista';
        const desc = document.createElement('span');
        desc.textContent = item.definition.description || item.note || 'Conquista desbloqueada no CosplayChess.';
        copy.append(title, desc);
        row.append(icon, copy);
        body.appendChild(row);
      });
    } catch (_) {
      body.innerHTML = '<div class="community-achievements-empty">Não foi possível carregar as conquistas agora.</div>';
    }
  };

  const run = () => {
    bindSidebarNavigation();
    keepConversationAtBottom();
    setTimeout(buildAchievementRail, 250);
    setTimeout(buildAchievementRail, 1000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
