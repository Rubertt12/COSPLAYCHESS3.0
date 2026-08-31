(() => {
  'use strict';
  if (window.__CC_SOCIAL_LAZY_FEATURES__) return;
  window.__CC_SOCIAL_LAZY_FEATURES__ = true;

  const loaded = new Map();
  const loadScript = (src) => {
    if (loaded.has(src)) return loaded.get(src);
    const promise = new Promise((resolve, reject) => {
      if (document.querySelector(`script[src^="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = `${src}${src.includes('?') ? '&' : '?'}lazy=20260831-2`;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
    loaded.set(src, promise);
    return promise;
  };

  const loadMany = (sources) => Promise.all(sources.map(loadScript));
  const waitForPanel = (name, timeout = 5000) => new Promise((resolve) => {
    const started = performance.now();
    const tick = () => {
      const panel = document.querySelector(`[data-community-panel="${name}"]`);
      if (panel) return resolve(panel);
      if (performance.now() - started >= timeout) return resolve(null);
      setTimeout(tick, 60);
    };
    tick();
  });

  const secondary = {
    discover: ['./community-social-access-fix.js'],
    communities: ['./community-groups-links.js', './community-group-avatar.js'],
    photos: ['./community-album-browser.js', './community-event-photo-tags.js'],
  };

  const extended = ['./community-social-extended.js', './community-team-links.js'];
  let bypass = false;

  document.addEventListener('click', async (event) => {
    const viewButton = event.target.closest('[data-community-view]');
    if (!viewButton || bypass) return;
    const view = viewButton.dataset.communityView;

    if (view === 'events' || view === 'saved' || view === 'teams') {
      if (document.querySelector(`[data-community-panel="${view}"]`)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      viewButton.classList.add('cc-loading-feature');
      try {
        await loadMany(extended);
        await waitForPanel(view);
        bypass = true;
        viewButton.click();
      } catch (error) {
        console.error('Falha ao carregar recurso social:', view, error);
      } finally {
        bypass = false;
        viewButton.classList.remove('cc-loading-feature');
      }
      return;
    }

    const scripts = secondary[view];
    if (scripts?.length) {
      requestAnimationFrame(() => loadMany(scripts).catch((error) => console.error('Falha ao carregar módulo social:', view, error)));
    }
  }, true);

  document.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-feed-mode="following"]');
    if (!tab) return;
    loadScript('./community-following.js').catch((error) => console.error('Falha ao carregar feed Seguindo:', error));
  }, { passive: true });
})();