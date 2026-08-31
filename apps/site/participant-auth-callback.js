(() => {
  const params = new URLSearchParams(location.search);
  const accessToken = String(params.get('access_token') || '').trim();
  const tokenHash = String(params.get('token_hash') || '').trim();
  const type = String(params.get('type') || '').trim().toLowerCase();
  const customStorageKey = 'cosplaychess-participant-access-token';
  const legacyStorageKey = 'cosplaychess-participant-activation';
  const allowedTypes = new Set(['invite', 'recovery']);
  const activationLifetimeMs = 6 * 60 * 60 * 1000;

  if (accessToken) {
    try {
      sessionStorage.setItem(customStorageKey, JSON.stringify({ token: accessToken, savedAt: Date.now() }));
      const clean = new URL(location.href);
      clean.searchParams.set('activate', '1');
      clean.searchParams.delete('access_token');
      clean.hash = '';
      history.replaceState({}, document.title, `${clean.pathname}${clean.search}`);
    } catch (_) {}
  } else if (tokenHash && allowedTypes.has(type)) {
    try {
      sessionStorage.setItem(legacyStorageKey, JSON.stringify({ tokenHash, type, savedAt: Date.now() }));
      const clean = new URL(location.href);
      clean.searchParams.set('activate', '1');
      clean.searchParams.delete('token_hash');
      clean.searchParams.delete('type');
      clean.hash = '';
      history.replaceState({}, document.title, `${clean.pathname}${clean.search}`);
    } catch (_) {}
  }

  let customActivation = null;
  try {
    const raw = sessionStorage.getItem(customStorageKey);
    if (raw) customActivation = JSON.parse(raw);
  } catch (_) {}
  if (customActivation?.token && Date.now() - Number(customActivation.savedAt || 0) > activationLifetimeMs) {
    try { sessionStorage.removeItem(customStorageKey); } catch (_) {}
    customActivation = null;
  }

  let legacyActivation = null;
  try {
    const raw = sessionStorage.getItem(legacyStorageKey);
    if (raw) legacyActivation = JSON.parse(raw);
  } catch (_) {}
  if (legacyActivation?.tokenHash && Date.now() - Number(legacyActivation.savedAt || 0) > activationLifetimeMs) {
    try { sessionStorage.removeItem(legacyStorageKey); } catch (_) {}
    legacyActivation = null;
  }

  const useCustom = Boolean(customActivation?.token);
  const useLegacy = Boolean(legacyActivation?.tokenHash && allowedTypes.has(String(legacyActivation.type || '').toLowerCase()));
  if (!useCustom && !useLegacy) return;

  const loginView = document.querySelector('[data-participant-login]');
  const activationView = document.querySelector('[data-participant-activation]');
  const dashboardView = document.querySelector('[data-participant-dashboard]');
  const form = document.getElementById('participantActivationForm');
  const status = document.getElementById('participantActivationStatus');
  if (loginView) loginView.hidden = true;
  if (activationView) activationView.hidden = false;
  if (dashboardView) dashboardView.hidden = true;
  if (!form) return;

  const setStatus = (message, kind = '') => {
    if (!status) return;
    status.textContent = message;
    status.className = `participant-status${kind ? ` ${kind}` : ''}`;
  };
  setStatus('Link reconhecido. Ele é válido por 6 horas a partir do envio. Crie sua senha para ativar o acesso.', 'success');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const data = new FormData(form);
    const password = String(data.get('password') || '');
    const confirmation = String(data.get('confirmPassword') || '');
    const submit = form.querySelector('button[type="submit"]');
    if (password.length < 8) {
      setStatus('A senha precisa ter pelo menos 8 caracteres.', 'error');
      return;
    }
    if (password !== confirmation) {
      setStatus('As duas senhas precisam ser iguais.', 'error');
      return;
    }

    const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
    if (!db?.auth) {
      setStatus('Não foi possível iniciar a autenticação. Atualize a página e tente novamente.', 'error');
      return;
    }

    if (submit) submit.disabled = true;
    setStatus('Validando o link e criando a senha...');
    try {
      if (useCustom) {
        const cfg = window.COSPLAYCHESS_CONFIG;
        const response = await fetch(`${cfg.functionsBase}/cosplaychess-participant-access-activate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': cfg.supabaseKey
          },
          body: JSON.stringify({ token: customActivation.token, password })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Não foi possível validar este link.');
        if (!result.email) throw new Error('Não foi possível identificar a conta do participante.');

        const signed = await db.auth.signInWithPassword({ email: result.email, password });
        if (signed.error) throw signed.error;
        if (!signed.data?.session?.user) throw new Error('A senha foi criada, mas não foi possível iniciar sua sessão.');
        const linked = await db.rpc('cosplay_link_my_profiles');
        if (linked.error) throw linked.error;
        try { sessionStorage.removeItem(customStorageKey); } catch (_) {}
      } else {
        const verify = await db.auth.verifyOtp({
          token_hash: legacyActivation.tokenHash,
          type: legacyActivation.type
        });
        if (verify.error) throw verify.error;
        if (!verify.data?.session?.user) throw new Error('Não foi possível criar sua sessão de acesso.');
        const updated = await db.auth.updateUser({ password });
        if (updated.error) throw updated.error;
        const linked = await db.rpc('cosplay_link_my_profiles');
        if (linked.error) throw linked.error;
        if (!Array.isArray(linked.data) || linked.data.length === 0) throw new Error('Seu acesso ainda não foi liberado pela organização.');
        try { sessionStorage.removeItem(legacyStorageKey); } catch (_) {}
      }

      setStatus('Senha criada com sucesso. Abrindo sua Área do Participante...', 'success');
      location.replace('./participante.html');
    } catch (error) {
      const message = String(error?.message || error || '');
      const lower = message.toLowerCase();
      if (lower.includes('expir') || lower.includes('invalid') || lower.includes('token') || lower.includes('otp') || lower.includes('utilizado')) {
        try { sessionStorage.removeItem(customStorageKey); sessionStorage.removeItem(legacyStorageKey); } catch (_) {}
        setStatus('Este link já foi usado ou expirou. Peça ao administrador para reenviar o acesso.', 'error');
      } else if (lower.includes('não foi liberado') || lower.includes('organização')) {
        setStatus('Este e-mail ainda não teve o acesso liberado pela organização.', 'error');
      } else {
        setStatus(message || 'Não foi possível concluir a ativação.', 'error');
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  }, true);
})();
