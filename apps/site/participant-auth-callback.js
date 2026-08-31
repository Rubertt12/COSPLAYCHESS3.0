(() => {
  const params = new URLSearchParams(location.search);
  const tokenHash = String(params.get('token_hash') || '').trim();
  const type = String(params.get('type') || '').trim().toLowerCase();
  const storageKey = 'cosplaychess-participant-activation';
  const allowedTypes = new Set(['invite', 'recovery']);
  const activationLifetimeMs = 6 * 60 * 60 * 1000;

  if (tokenHash && allowedTypes.has(type)) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ tokenHash, type, savedAt: Date.now() }));
      const clean = new URL(location.href);
      clean.searchParams.set('activate', '1');
      clean.searchParams.delete('token_hash');
      clean.searchParams.delete('type');
      clean.hash = '';
      history.replaceState({}, document.title, `${clean.pathname}${clean.search}`);
    } catch (_) {}
  }

  let activation = null;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (raw) activation = JSON.parse(raw);
  } catch (_) {}
  if (!activation?.tokenHash || !allowedTypes.has(String(activation.type || '').toLowerCase())) return;
  if (Date.now() - Number(activation.savedAt || 0) > activationLifetimeMs) {
    try { sessionStorage.removeItem(storageKey); } catch (_) {}
    return;
  }

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
  setStatus('Convite reconhecido. Este link é válido por até 6 horas. Crie sua senha para ativar o acesso.', 'success');

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
    setStatus('Validando seu convite e criando a senha...');
    try {
      const verify = await db.auth.verifyOtp({
        token_hash: activation.tokenHash,
        type: activation.type
      });
      if (verify.error) throw verify.error;
      if (!verify.data?.session?.user) throw new Error('Não foi possível criar sua sessão de acesso.');

      const updated = await db.auth.updateUser({ password });
      if (updated.error) throw updated.error;

      const linked = await db.rpc('cosplay_link_my_profiles');
      if (linked.error) throw linked.error;
      if (!Array.isArray(linked.data) || linked.data.length === 0) {
        throw new Error('Seu acesso ainda não foi liberado pela organização.');
      }

      try { sessionStorage.removeItem(storageKey); } catch (_) {}
      setStatus('Senha criada com sucesso. Abrindo sua Área do Participante...', 'success');
      location.replace('./participante.html');
    } catch (error) {
      const message = String(error?.message || error || '');
      const lower = message.toLowerCase();
      if (lower.includes('expired') || lower.includes('invalid') || lower.includes('token') || lower.includes('otp')) {
        try { sessionStorage.removeItem(storageKey); } catch (_) {}
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
