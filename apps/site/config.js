window.COSPLAYCHESS_CONFIG = {
  supabaseUrl: 'https://cotudgzjyzkljahnknuf.supabase.co',
  supabaseKey: 'sb_publishable_FU4bO8phnJybvgQWgDrm8A_A-X8fz84',
  functionsBase: 'https://cotudgzjyzkljahnknuf.supabase.co/functions/v1',
  organizer: 'CosplayChess',
  timezone: 'America/Sao_Paulo'
};

/* Um único cliente Supabase por contexto de navegador. */
(() => {
  const cfg = window.COSPLAYCHESS_CONFIG;
  const sdk = window.supabase;
  if (!cfg || !sdk || typeof sdk.createClient !== 'function') return;
  if (sdk.__cosplayChessSingletonInstalled) return;
  const originalCreateClient = sdk.createClient.bind(sdk);
  const sharedClient = originalCreateClient(cfg.supabaseUrl, cfg.supabaseKey);
  window.COSPLAYCHESS_DB = sharedClient;
  window.getCosplayChessDb = () => sharedClient;
  sdk.createClient = function(url, key, options) {
    const sameProject = String(url || '') === String(cfg.supabaseUrl || '');
    const sameKey = String(key || '') === String(cfg.supabaseKey || '');
    if (sameProject && sameKey) return sharedClient;
    return originalCreateClient(url, key, options);
  };
  Object.defineProperty(sdk, '__cosplayChessSingletonInstalled', { value:true, configurable:false, enumerable:false, writable:false });
})();

(() => {
  const page = location.pathname.split('/').pop() || 'index.html';
  if (page === 'admin.html' || page === 'cms.html') return;
  if (document.querySelector('link[data-site-wide]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './site-wide.css';
  link.dataset.siteWide = 'true';
  document.head.appendChild(link);
})();

(() => {
  let booted = false;
  const boot = () => {
    if (booted) return;
    booted = true;
    const page = location.pathname.split('/').pop() || 'index.html';
    const previewMode = new URLSearchParams(location.search).get('cmsPreview') === '1';
    const sameAsset = (candidate, wanted) => {
      try {
        return new URL(candidate, location.href).pathname === new URL(wanted, location.href).pathname;
      } catch {
        return candidate === wanted;
      }
    };
    const loadScript = (src, onload) => {
      const existing = [...document.scripts].find(s => sameAsset(s.getAttribute('src') || '', src));
      if (existing) {
        if (onload) {
          if (existing.dataset.loaded === '1' || !existing.hasAttribute('src')) onload();
          else existing.addEventListener('load', onload, { once:true });
        }
        return existing;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => { script.dataset.loaded = '1'; if (onload) onload(); };
      document.body.appendChild(script);
      return script;
    };
    const loadStyle = (href) => {
      const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find(l => sameAsset(l.getAttribute('href') || '', href));
      if (existing) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    };

    const globalCmsPages = ['index.html', '', 'cadastro.html', 'galeria-eventos.html', 'sobre.html', 'universo.html', 'hall-da-fama.html', 'ranking.html', 'conquistas.html'];
    if (globalCmsPages.includes(page)) loadScript('./site-global-cms.js?v=20260819-global1');
    if (globalCmsPages.includes(page) && !previewMode) loadScript('./visitor-tracker.js?v=20260822-unique1');

    const collectiblePages = ['index.html', '', 'sobre.html', 'universo.html', 'hall-da-fama.html', 'ranking.html', 'conquistas.html'];
    if (collectiblePages.includes(page) && !previewMode) {
      loadStyle('./champion-collectible.css');
      loadStyle('./champion-card-magic.css');
      loadStyle('./champion-card-responsive.css');
      loadScript('./champion-collectible.js', () => loadScript('./champion-card-magic.js'));
    }

    if (page === 'cms.html') {
      loadScript('./cms-partners.js');
      return;
    }

    if (page === 'admin.html') {
      loadStyle('./admin-partners.css');
      loadStyle('./admin-search-v2.css?v=20260822-search2');
      loadScript('./admin-visitor-metric.js?v=20260822-unique1');
      loadScript('./admin-search-v2.js?v=20260822-search2');
      loadScript('./admin-cms.js', () => {
        const stack = document.getElementById('cmsStack');
        if (stack) stack.hidden = true;
        const actions = document.querySelector('.top-actions');
        if (actions && !actions.querySelector('[data-cms-visual-link]')) {
          const link = document.createElement('a');
          link.className = 'btn gold';
          link.href = './cms.html';
          link.textContent = 'CMS Visual';
          link.dataset.cmsVisualLink = 'true';
          actions.insertBefore(link, actions.querySelector('.btn.dark'));
        }
        loadScript('./admin-privacy.js', () => {
          loadScript('./admin-private-groups.js');
          loadScript('./admin-game-link.js');
          loadScript('./admin-partners.js', () => loadScript('./admin-partners-layout-fix.js?v=20260822-fix1'));
        });
      });
      return;
    }

    if (page === 'resultados-admin.html') {
      loadScript('./resultados-team-media.js');
      return;
    }

    if (page === 'index.html' || page === '') {
      loadStyle('./hero-instagram.css');
      loadStyle('./readability.css');
      loadStyle('./partners.css');
      loadScript('./free-button-runtime.js?v=20260819-drag1');
      /* site-cms.js já é carregado explicitamente pelo index.html. */
      loadScript('./entry-yatta.js', () => {
        loadScript('./hero-instagram.js', () => {
          loadScript('./instagram-button-icon.js', () => {
            loadScript('./partners-public.js');
            loadScript('./landing-intro-video.js', () => {
              loadScript('./landing-intro-external.js', () => {
                if (previewMode) loadScript('./site-preview-runtime.js');
              });
            });
          });
        });
      });
      return;
    }

    if (page === 'cadastro.html') {
      /* site-cms.js já é carregado explicitamente pelo cadastro.html. */
      loadScript('./registration-dynamic.js', () => {
        if (previewMode) loadScript('./site-preview-runtime.js');
      });
      return;
    }

    /* Estas páginas já incluem seus runtimes no próprio HTML. Não carregar novamente aqui. */
    if (page === 'sobre.html') return;
    if (['universo.html','hall-da-fama.html','ranking.html','conquistas.html'].includes(page)) return;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();