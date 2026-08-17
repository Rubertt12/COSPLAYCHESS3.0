window.COSPLAYCHESS_CONFIG = {
  supabaseUrl: 'https://cotudgzjyzkljahnknuf.supabase.co',
  supabaseKey: 'sb_publishable_FU4bO8phnJybvgQWgDrm8A_A-X8fz84',
  functionsBase: 'https://cotudgzjyzkljahnknuf.supabase.co/functions/v1',
  organizer: 'CosplayChess',
  timezone: 'America/Sao_Paulo'
};

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

  if (page === 'admin.html') {
    loadScript('./admin-cms.js', () => loadScript('./admin-live-preview.js', () => loadScript('./admin-registration-builder.js')));
    return;
  }

  if (page === 'index.html' || page === '') {
    loadScript('./site-cms.js', () => {
      if (previewMode) loadScript('./site-preview-runtime.js');
    });
    return;
  }

  if (page === 'cadastro.html') {
    loadScript('./registration-dynamic.js', () => {
      if (previewMode) loadScript('./site-preview-runtime.js');
    });
  }
});
