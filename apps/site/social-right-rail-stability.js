(() => {
  'use strict';
  if (window.__CC_SOCIAL_RIGHT_RAIL_STABILITY__) return;
  window.__CC_SOCIAL_RIGHT_RAIL_STABILITY__ = true;

  const routeByView = {
    feed:'./comunidade.html',
    discover:'./explorar.html',
    communities:'./comunidades.html',
    messages:'./mensagens.html',
    notifications:'./notificacoes.html',
    friends:'./amigos.html',
    ranking:'./ranking.html',
    photos:'./albuns.html',
    events:'./eventos.html',
    saved:'./salvos.html',
    'social-settings':'./configuracoes.html',
    moderation:'./moderacao.html'
  };
  const viewByFile = Object.fromEntries(Object.entries(routeByView).map(([view,url]) => [url.replace('./',''),view]));
  const currentFile = location.pathname.split('/').pop() || 'comunidade.html';
  const currentView = document.body.dataset.entryView || viewByFile[currentFile] || 'feed';

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-community-view]');
    if (!trigger) return;
    const view = trigger.dataset.communityView;
    if (!routeByView[view] || view === currentView) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    let target = routeByView[view];
    if (view === 'social-settings') target += `?tab=${encodeURIComponent(trigger.dataset.settingsOpen || 'privacy')}`;
    location.href = target;
  }, true);

  const rail = document.querySelector('.cc-right');
  if (!rail) return;

  let lastHealthyHTML = '';
  let restoring = false;
  let settleTimer = 0;

  const isHealthy = () => {
    if (!rail.isConnected) return false;
    const cards = rail.querySelectorAll('.cc-card');
    const profile = rail.querySelector('.cc-profile-card');
    const stories = rail.querySelector('#ccStories');
    const groups = rail.querySelector('#ccHighlightedGroups');
    const achievements = rail.querySelector('#ccAchievementsCard');
    return cards.length >= 4 && !!profile && !!stories && !!groups && !!achievements;
  };

  const hasVisibleContent = () => {
    const profileName = rail.querySelector('[data-cc-profile-name]')?.textContent?.trim();
    const stories = rail.querySelector('#ccStories');
    const groups = rail.querySelector('#ccHighlightedGroups');
    const achievements = rail.querySelector('#ccAchievementsCard');
    return Boolean(profileName && stories && groups && achievements);
  };

  const remember = () => {
    if (restoring || !isHealthy() || !hasVisibleContent()) return;
    lastHealthyHTML = rail.innerHTML;
  };

  const restoreIfNeeded = () => {
    if (restoring) return;
    if (isHealthy() && hasVisibleContent()) {
      remember();
      return;
    }
    if (!lastHealthyHTML) return;
    restoring = true;
    rail.innerHTML = lastHealthyHTML;
    restoring = false;
    window.dispatchEvent(new CustomEvent('cosplay:right-rail-restored'));
  };

  const scheduleCheck = () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      if (isHealthy() && hasVisibleContent()) remember();
      else restoreIfNeeded();
    }, 180);
  };

  const observer = new MutationObserver(scheduleCheck);
  observer.observe(rail, { childList: true, subtree: true, characterData: true });

  [800, 1800, 3200, 5500].forEach(ms => setTimeout(remember, ms));

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(restoreIfNeeded, 120);
  });

  window.addEventListener('pageshow', () => setTimeout(restoreIfNeeded, 120));
  window.addEventListener('focus', () => setTimeout(restoreIfNeeded, 120));
})();
