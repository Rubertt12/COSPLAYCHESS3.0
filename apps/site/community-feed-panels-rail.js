(() => {
  'use strict';
  if (window.__COSPLAY_FEED_PANELS_RAIL__) return;
  window.__COSPLAY_FEED_PANELS_RAIL__ = true;

  const movePanels = () => {
    const rail = document.querySelector('.community-orkut-rail');
    const wrap = document.querySelector('.premium-feed-bottom');
    if (!rail || !wrap) return false;

    const panels = [...wrap.querySelectorAll(':scope > .premium-mini-panel')];
    if (!panels.length) return false;

    let railWrap = rail.querySelector('.community-feed-side-panels');
    if (!railWrap) {
      railWrap = document.createElement('div');
      railWrap.className = 'community-feed-side-panels';

      const achievements = rail.querySelector('.community-achievements-rail');
      if (achievements) achievements.insertAdjacentElement('afterend', railWrap);
      else rail.prepend(railWrap);
    }

    panels.forEach((panel) => {
      panel.classList.add('premium-mini-panel-rail');
      railWrap.appendChild(panel);
    });

    if (!wrap.children.length) wrap.remove();
    return true;
  };

  const boot = () => {
    if (movePanels()) return;
    const observer = new MutationObserver(() => {
      if (movePanels()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 12000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.addEventListener('cosplay:social-shell-ready', () => setTimeout(movePanels, 120));
  setTimeout(movePanels, 500);
  setTimeout(movePanels, 1200);
  setTimeout(movePanels, 2500);
})();
