window.COSPLAYCHESS_CONFIG = {
  supabaseUrl: 'https://cotudgzjyzkljahnknuf.supabase.co',
  supabaseKey: 'sb_publishable_FU4bO8phnJybvgQWgDrm8A_A-X8fz84',
  functionsBase: 'https://cotudgzjyzkljahnknuf.supabase.co/functions/v1',
  organizer: 'CosplayChess',
  timezone: 'America/Sao_Paulo'
};

window.addEventListener('load', () => {
  const page = location.pathname.split('/').pop() || 'index.html';
  const script = document.createElement('script');
  if (page === 'admin.html') script.src = './admin-cms.js';
  else if (page === 'index.html' || page === '') script.src = './site-cms.js';
  else return;
  script.async = false;
  document.body.appendChild(script);
});