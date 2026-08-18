window.COSPLAYCHESS_CONFIG = {
  supabaseUrl: 'https://cotudgzjyzkljahnknuf.supabase.co',
  supabaseKey: 'sb_publishable_FU4bO8phnJybvgQWgDrm8A_A-X8fz84',
  functionsBase: 'https://cotudgzjyzkljahnknuf.supabase.co/functions/v1',
  organizer: 'CosplayChess',
  timezone: 'America/Sao_Paulo'
};

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
    const loadScript = (src, onload) => {
      const existing = [...document.scripts].find(s => s.getAttribute('src') === src);
      if (existing) {
        if (onload) {
          if (existing.dataset.loaded === '1') onload();
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
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    };

    if (page === 'admin.html') {
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
        loadScript('./admin-privacy.js', () => loadScript('./admin-private-groups.js'));
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
      loadScript('./site-cms.js', () => {
        loadScript('./entry-yatta.js', () => {
          loadScript('./hero-instagram.js', () => {
            loadScript('./instagram-button-icon.js', () => {
              loadScript('./landing-intro-video.js', () => {
                loadScript('./landing-intro-external.js', () => {
                  if (previewMode) loadScript('./site-preview-runtime.js');
                });
              });
            });
          });
        });
      });
      return;
    }

    if (page === 'cadastro.html') {
      loadScript('./registration-dynamic.js', () => {
        if (previewMode) loadScript('./site-preview-runtime.js');
      });
      return;
    }

    if (page === 'sobre.html') {
      loadScript('./sobre-cms-runtime.js');
      return;
    }

    if (['universo.html','hall-da-fama.html','ranking.html','conquistas.html'].includes(page)) {
      loadScript('./community-cms-runtime.js');
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
