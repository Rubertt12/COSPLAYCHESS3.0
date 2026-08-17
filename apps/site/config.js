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

window.addEventListener('load', () => {
  const page = location.pathname.split('/').pop() || 'index.html';
  const previewMode = new URLSearchParams(location.search).get('cmsPreview') === '1';
  const loadScript = (src, onload) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    if (onload) script.onload = onload;
    document.body.appendChild(script);
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

  if (page === 'index.html' || page === '') {
    loadStyle('./hero-instagram.css');
    loadScript('./site-cms.js', () => {
      loadScript('./hero-instagram.js', () => {
        loadScript('./landing-intro-video.js', () => {
          loadScript('./landing-intro-external.js', () => {
            if (previewMode) loadScript('./site-preview-runtime.js');
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

  if (['universo.html','hall-da-fama.html','ranking.html','conquistas.html'].includes(page)) {
    loadScript('./community-cms-runtime.js');
  }
});
