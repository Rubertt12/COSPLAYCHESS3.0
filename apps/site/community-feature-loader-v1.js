(() => {
  'use strict';
  if (window.__CC_COMMUNITY_FEATURE_LOADER_V1__) return;
  window.__CC_COMMUNITY_FEATURE_LOADER_V1__ = true;

  const scripts = new Map();
  const styles = new Set();

  function loadStyle(href, key = href) {
    if (styles.has(key) || document.querySelector(`link[data-cc-lazy-style="${CSS.escape(key)}"]`)) return;
    styles.add(key);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.ccLazyStyle = key;
    document.head.appendChild(link);
  }

  function loadScript(src, key = src) {
    if (scripts.has(key)) return scripts.get(key);
    const existing = document.querySelector(`script[data-cc-lazy-script="${CSS.escape(key)}"]`);
    if (existing) return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.dataset.ccLazyScript = key;
      script.onload = () => resolve();
      script.onerror = reject;
      document.body.appendChild(script);
    });
    scripts.set(key, promise);
    return promise;
  }

  async function loadExplore() {
    await loadScript('./social-explore-follow-v10.js?v=20260902-1', 'explore');
  }

  async function loadCommunityCreate() {
    loadStyle('./social-community-create-v1.css?v=20260831-2', 'community-create');
    await loadScript('./social-community-create-v1.js?v=20260831-3', 'community-create');
  }

  async function loadChat() {
    loadStyle('./social-chat-v12.css?v=20260831-1', 'chat');
    loadStyle('./social-chat-white-v18.css?v=20260901-2', 'chat-white');
    await loadScript('./social-chat-v12.js?v=20260831-1', 'chat');
    await loadScript('./social-chat-v12-fixes.js?v=20260901-3', 'chat-fixes');
  }

  async function loadLightbox() {
    loadStyle('./social-photo-lightbox.css?v=20260831-2', 'lightbox');
    await loadScript('./social-photo-lightbox.js?v=20260831-2', 'lightbox');
  }

  function loadSettingsStyle() {
    loadStyle('./social-settings-v6.css?v=20260831-2', 'settings');
  }

  function loadMobile() {
    if (!matchMedia('(max-width: 920px)').matches) return;
    loadScript('./social-mobile-v10.js?v=20260831-1', 'mobile').catch(() => {});
  }

  document.addEventListener('click', async event => {
    const discover = event.target.closest('[data-community-view="discover"]');
    if (discover) loadExplore().catch(() => {});

    const messages = event.target.closest('[data-community-view="messages"]');
    if (messages) loadChat().catch(() => {});

    const settings = event.target.closest('[data-community-view="social-settings"],[data-settings-open]');
    if (settings) loadSettingsStyle();

    const create = event.target.closest('#communityCreateGroupToggle');
    if (create && !scripts.has('community-create')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        await loadCommunityCreate();
        requestAnimationFrame(() => create.click());
      } catch {}
      return;
    }

    const photo = event.target.closest('[data-photo-lightbox]');
    if (photo && !scripts.has('lightbox')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        await loadLightbox();
        requestAnimationFrame(() => photo.click());
      } catch {}
    }
  }, true);

  loadMobile();
  addEventListener('resize', loadMobile, { passive:true });

  const idle = () => {
    loadStyle('./social-photo-lightbox.css?v=20260831-2', 'lightbox');
    loadStyle('./social-settings-v6.css?v=20260831-2', 'settings');
  };
  if ('requestIdleCallback' in window) requestIdleCallback(idle, { timeout:2200 });
  else setTimeout(idle, 1600);
})();
