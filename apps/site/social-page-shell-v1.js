(() => {
  'use strict';
  if (window.__CC_SOCIAL_PAGE_SHELL_V1__) return;
  window.__CC_SOCIAL_PAGE_SHELL_V1__ = true;

  const installPrimaryProfileGuard = () => {
    const client = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
    if (!client || client.__ccSocialPrimaryProfileGuard) return;
    const originalFrom = client.from.bind(client);
    const wrappedFilters = new WeakSet();

    const wrapFilter = (filter, initialUserScoped = false) => {
      if (!filter || typeof filter !== 'object' || wrappedFilters.has(filter)) return filter;
      wrappedFilters.add(filter);
      let userScoped = initialUserScoped;
      if (typeof filter.eq === 'function') {
        const originalEq = filter.eq.bind(filter);
        filter.eq = (column, value) => {
          if (column === 'user_id') userScoped = true;
          const result = originalEq(column, value);
          return result === filter ? filter : wrapFilter(result, userScoped);
        };
      }
      if (typeof filter.order === 'function') {
        const originalOrder = filter.order.bind(filter);
        filter.order = (column, options) => {
          if (userScoped && column === 'created_at' && options?.ascending === false) {
            return originalOrder(column, { ...options, ascending:true });
          }
          return originalOrder(column, options);
        };
      }
      return filter;
    };

    client.from = (table) => {
      const query = originalFrom(table);
      if (table !== 'cosplay_participant_profiles' || !query || typeof query.select !== 'function') return query;
      const originalSelect = query.select.bind(query);
      query.select = (...args) => wrapFilter(originalSelect(...args));
      return query;
    };
    try { Object.defineProperty(client, '__ccSocialPrimaryProfileGuard', { value:true, configurable:false }); }
    catch { client.__ccSocialPrimaryProfileGuard = true; }
  };

  installPrimaryProfileGuard();

  const byPath = {
    'comunidade.html':'feed',
    'explorar.html':'discover',
    'comunidades.html':'communities',
    'mensagens.html':'messages',
    'notificacoes.html':'notifications',
    'amigos.html':'friends',
    'ranking.html':'ranking',
    'ranking-social.html':'ranking',
    'albuns.html':'photos',
    'eventos.html':'events',
    'salvos.html':'saved',
    'configuracoes.html':'social-settings',
    'moderacao.html':'moderation'
  };
  const file = location.pathname.split('/').pop() || 'comunidade.html';
  const view = document.body.dataset.entryView || byPath[file] || 'feed';
  document.body.dataset.entryView = view;
  document.body.dataset.ccView = view;
  document.body.classList.add('community-page','cc-v4');

  const navItems = [
    ['feed','⌂','Feed'],['discover','⌕','Explorar'],['communities','♙','Comunidades'],['messages','✉','Mensagens'],
    ['notifications','♧','Notificações'],['friends','♙','Amigos'],['ranking','♛','Ranking'],['photos','▧','Álbuns'],
    ['events','▣','Eventos'],['saved','♡','Salvos']
  ];

  const panelMarkup = {
    discover:`<section class="community-view active" data-community-panel="discover"><label class="community-search"><span>⌕</span><input id="communityPeopleSearch" type="search" placeholder="Buscar por nome, nick ou personagem..."></label><div id="communityPeople" class="community-people-grid"><div class="community-empty">Carregando participantes...</div></div></section>`,
    friends:`<section class="community-view active" data-community-panel="friends"><section class="community-subsection" id="communityRequestsSection" hidden><div class="community-subhead"><h3>Solicitações</h3><span id="communityRequestsCount">0</span></div><div id="communityRequests" class="community-people-grid"></div></section><section class="community-subsection"><div class="community-subhead"><h3>Amigos</h3><span id="communityFriendsCount">0</span></div><div id="communityFriends" class="community-people-grid"><div class="community-empty">Carregando...</div></div></section></section>`,
    communities:`<section class="community-view active" data-community-panel="communities"><div class="community-subhead"><h3>Comunidades</h3><button class="btn gold" id="communityCreateGroupToggle" type="button">＋ Criar comunidade</button></div><div id="communityGroups" class="community-group-grid"><div class="community-empty">Carregando comunidades...</div></div></section>`,
    messages:`<section class="community-view active" data-community-panel="messages"><div class="cc9-empty">Carregando mensagens...</div></section>`,
    notifications:`<section class="community-view active" data-community-panel="notifications"><div class="cc9-empty">Carregando notificações...</div></section>`,
    ranking:`<section class="community-view active" data-community-panel="ranking"><div class="cc9-empty">Carregando ranking...</div></section>`,
    photos:`<section class="community-view active" data-community-panel="photos"><div class="cc9-empty">Carregando álbuns...</div></section>`,
    events:`<section class="community-view active" data-community-panel="events"><div class="cc9-empty">Carregando eventos...</div></section>`,
    saved:`<section class="community-view active" data-community-panel="saved"><div class="cc9-empty">Carregando salvos...</div></section>`,
    'social-settings':`<section class="community-view active" data-community-panel="social-settings"><div class="cc9-empty">Carregando configurações...</div></section>`,
    moderation:`<section class="community-view active" data-community-panel="moderation"><div class="cc9-empty">Carregando moderação...</div></section>`
  };

  if (!document.querySelector('.cc-app-shell')) {
    const nav = navItems.map(([key,icon,label]) => `<button class="${key===view?'active':''}" type="button" data-community-view="${key}"><span>${icon}</span>${label}${key==='notifications'?'<b class="social-v2-badge" hidden>0</b>':''}${key==='friends'?'<b id="communityRequestBadge" hidden>0</b>':''}</button>`).join('');
    const settingsTab = new URLSearchParams(location.search).get('tab') || 'privacy';
    document.body.insertAdjacentHTML('afterbegin', `
      <div class="grain"></div>
      <main class="cc-app-shell">
        <aside class="cc-left community-sidebar">
          <div class="cc-left-head"><a class="cc-brand" href="./index.html"><img src="./img/logofergoverse.png" alt="CosplayChess"><span class="cc-brand-copy"><b>COSPLAY</b><b>CHESS</b></span></a><button class="cc-collapse" type="button" aria-label="Recolher menu">«</button></div>
          <nav class="community-nav" aria-label="Rede Social">${nav}<a class="cc-nav-link" href="./passaporte.html"><span>♛</span>Conquistas</a><button id="cc9ModerationNav" type="button" data-community-view="moderation" hidden><span>⚑</span>Moderação</button></nav>
          <div class="cc-left-divider"></div>
          <button class="cc-nav-link${view==='social-settings'&&settingsTab==='appearance'?' active':''}" type="button" data-community-view="social-settings" data-settings-open="appearance"><span>◔</span>Temas</button>
          <button class="cc-nav-link${view==='social-settings'&&settingsTab!=='appearance'?' active':''}" type="button" data-community-view="social-settings" data-settings-open="privacy"><span>⚙</span>Configurações</button>
          <section class="community-me-card cc-left-user"><div class="cc-left-user-top"><div class="community-me-avatar" id="communityMyAvatar"><span>♜</span></div><div class="community-me-copy"><span class="kicker">MINHA REDE</span><h1 id="communityMyName">Participante</h1><p id="communityMyCharacter">CosplayChess</p></div></div><div class="cc-level-row"><span>Nível social</span><b class="cc-level-pill" id="ccSocialLevel">1</b></div><div class="cc-xp"><i id="ccSocialXpBar" style="width:0%"></i></div><div class="cc-xp-copy" id="ccSocialXpCopy">0 pontos sociais</div><div class="cc-member-since">♜ Participante CosplayChess</div><div class="community-me-cover"></div><div class="community-me-stats"></div></section>
        </aside>
        <section class="cc-center"><div class="cc-center-head"><label class="cc-global-search"><span>⌕</span><input id="ccGlobalSearch" type="search" autocomplete="off" placeholder="Buscar pessoas, comunidades, eventos, hashtags..."><kbd>Ctrl /</kbd></label></div><section class="community-main">${panelMarkup[view] || panelMarkup.notifications}</section></section>
        <aside class="cc-right community-orkut-rail">
          <div class="cc-right-head"><a class="cc-icon-btn" id="ccCreatePost" href="./comunidade.html#communityPostBody" aria-label="Criar publicação">＋</a><button class="cc-icon-btn subtle" type="button" data-community-view="notifications" aria-label="Notificações">♧<b id="ccNotificationBadge" hidden>0</b></button><a class="cc-account" href="./participante.html"><span class="cc-mirror-avatar"><span>♜</span></span><b data-cc-profile-name>Participante</b><span>⌄</span></a></div>
          <section class="cc-card cc-profile-card"><div class="cc-profile-cover"></div><div class="cc-profile-body"><div class="cc-profile-row"><div class="cc-profile-identity"><div class="cc-mirror-avatar"><span>♜</span></div><div class="cc-profile-name"><b data-cc-profile-name>Participante</b><span>Cosplay: <span data-cc-profile-character>CosplayChess</span></span></div></div><button class="cc-profile-gear" type="button" data-community-view="social-settings" data-settings-open="privacy" aria-label="Configurações">⚙</button></div><p class="cc-profile-tagline">Xadrez • Cosplay • Performance</p><div class="cc-profile-stats"><div><b id="communityPostCount" data-cc-count="posts">0</b><span>Publicações</span></div><div><b id="communityFriendCount" data-cc-count="friends">0</b><span>Seguidores</span></div><div><b id="communityPhotoCount" data-cc-count="photos">0</b><span>Seguindo</span></div></div><a class="community-profile-link" id="communityMyProfileLink" href="#">Ver perfil cosplay</a></div></section>
          <section class="cc-card"><div class="cc-card-head"><b>STORIES</b><button type="button" id="ccStoriesAll">Ver todos</button></div><div class="cc-stories" id="ccStories"><div class="cc-story"><div class="cc-story-avatar cc-mirror-avatar"><span>♜</span></div><span>Você</span></div></div></section>
          <section class="cc-card"><div class="cc-card-head"><b>COMUNIDADES EM DESTAQUE</b><button type="button" data-community-view="communities">Ver todas</button></div><div class="cc-highlight-list" id="ccHighlightedGroups"><div class="community-empty">Carregando comunidades...</div></div></section>
          <section class="cc-card" id="ccAchievementsCard"><div class="cc-card-head"><b>CONQUISTAS SOCIAIS</b><a href="./passaporte.html">Ver todas</a></div><div class="cc-achievements"><div class="community-empty">Carregando conquistas...</div></div></section>
        </aside>
      </main>
      <div class="community-auth-block" id="communityAuthBlock" hidden><div><span>♜</span><h1>Entre na Área do Participante</h1><p>A rede social é exclusiva para participantes com acesso liberado.</p><a class="btn gold" href="./participante.html">Entrar</a></div></div>`);
  }

  // A identidade social principal precisa existir em TODAS as páginas multipágina.
  // Carregamos o restaurador diretamente aqui, em vez de depender de módulos secundários.
  if (!document.getElementById('ccSocialShellStateV2Js')) {
    const identityScript = document.createElement('script');
    identityScript.id = 'ccSocialShellStateV2Js';
    identityScript.src = './social-shell-state-v2.js?v=20260902-2';
    identityScript.defer = true;
    document.body.appendChild(identityScript);
  }

  const activate = () => {
    const settingsTab = new URLSearchParams(location.search).get('tab') || 'privacy';
    document.querySelectorAll('[data-community-view]').forEach(el => {
      const same = el.dataset.communityView === view;
      const settingsMatch = view !== 'social-settings' || el.dataset.settingsOpen == null || el.dataset.settingsOpen === settingsTab;
      el.classList.toggle('active', same && settingsMatch);
    });
    document.querySelectorAll('[data-community-panel]').forEach(panel => {
      const on = panel.dataset.communityPanel === view;
      panel.hidden = !on;
      panel.classList.toggle('active', on);
    });
    const selector = view === 'social-settings' ? `[data-community-view="social-settings"][data-settings-open="${settingsTab}"]` : `.community-nav [data-community-view="${view}"]`;
    const trigger = document.querySelector(selector) || document.querySelector(`[data-community-view="${view}"]`);
    if (trigger && view !== 'feed') trigger.click();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(activate, 220), {once:true});
  else setTimeout(activate, 220);
})();