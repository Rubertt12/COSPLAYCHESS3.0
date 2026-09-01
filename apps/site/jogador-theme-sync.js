(() => {
  'use strict';
  if (window.__CC_PLAYER_THEME_SYNC__) return;
  window.__CC_PLAYER_THEME_SYNC__ = true;

  const KEYS = [
    'cosplaychess-social-appearance-v8',
    'cosplaychess-social-appearance-v7',
    'cosplaychess-social-appearance-v6'
  ];

  const readAppearance = () => {
    for (const key of KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const value = JSON.parse(raw);
        if (value && typeof value === 'object') return value;
      } catch {}
    }
    return {};
  };

  const apply = () => {
    const appearance = readAppearance();
    const theme = appearance.theme || 'cosplay-dark';
    const accent = appearance.accent || 'gold';
    const bg = appearance.community_background || 'classic';
    document.documentElement.dataset.communityTheme = theme;
    if (document.body) {
      document.body.dataset.ccTheme = theme;
      document.body.dataset.ccAccent = accent;
      document.body.dataset.ccBg = bg;
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'white-mode' ? '#f4f6fa' : '#080b12';
  };

  apply();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once:true });
  window.addEventListener('storage', (event) => {
    if (!event.key || KEYS.includes(event.key)) apply();
  });
  window.addEventListener('cosplay:social-settings-saved', apply);
})();
