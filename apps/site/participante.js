(() => {
  const cfg = window.COSPLAYCHESS_CONFIG;
  const db = window.getCosplayChessDb ? window.getCosplayChessDb() : window.COSPLAYCHESS_DB;
  const loginView = document.querySelector('[data-participant-login]');
  const dashboardView = document.querySelector('[data-participant-dashboard]');
  const form = document.getElementById('participantLoginForm');
  const status = document.getElementById('participantLoginStatus');
  const nameEl = document.getElementById('participantName');
  const emailEl = document.getElementById('participantEmail');
  const logoutBtn = document.getElementById('participantLogout');

  const setStatus = (message = '', kind = '') => {
    if (!status) return;
    status.textContent = message;
    status.className = `participant-status${kind ? ` ${kind}` : ''}`;
  };

  const renderSession = (session) => {
    const user = session?.user;
    const logged = !!user;
    if (loginView) loginView.hidden = logged;
    if (dashboardView) dashboardView.hidden = !logged;
    if (!user) return;
    const meta = user.user_metadata || {};
    const displayName = meta.display_name || meta.full_name || meta.name || 'Participante';
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = user.email || '';
  };

  const init = async () => {
    if (!cfg || !db?.auth) {
      setStatus('Não foi possível iniciar o acesso agora.', 'error');
      return;
    }
    const { data } = await db.auth.getSession();
    renderSession(data?.session || null);
    db.auth.onAuthStateChange((_event, session) => renderSession(session));
  };

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    if (!email || !password) return;
    setStatus('Entrando...');
    if (submit) submit.disabled = true;
    try {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setStatus('Acesso liberado.', 'success');
      renderSession(data?.session || null);
      form.reset();
    } catch (error) {
      const msg = String(error?.message || '');
      setStatus(msg.toLowerCase().includes('invalid login') ? 'E-mail ou senha inválidos.' : 'Não foi possível entrar. Confira seus dados e tente novamente.', 'error');
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    if (!db?.auth) return;
    logoutBtn.disabled = true;
    try { await db.auth.signOut(); }
    finally { logoutBtn.disabled = false; }
  });

  init();
})();