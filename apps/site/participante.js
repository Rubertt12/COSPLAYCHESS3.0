(() => {
  const cfg = window.COSPLAYCHESS_CONFIG;
  const db = window.getCosplayChessDb ? window.getCosplayChessDb() : window.COSPLAYCHESS_DB;
  const loginView = document.querySelector('[data-participant-login]');
  const activationView = document.querySelector('[data-participant-activation]');
  const dashboardView = document.querySelector('[data-participant-dashboard]');
  const loginForm = document.getElementById('participantLoginForm');
  const activationForm = document.getElementById('participantActivationForm');
  const loginStatus = document.getElementById('participantLoginStatus');
  const activationStatus = document.getElementById('participantActivationStatus');
  const forgotBtn = document.getElementById('participantForgotPassword');
  const nameEl = document.getElementById('participantName');
  const emailEl = document.getElementById('participantEmail');
  const logoutBtn = document.getElementById('participantLogout');
  const params = new URLSearchParams(location.search);
  const activationMode = params.get('activate') === '1';
  let rendering = false;

  const setStatus = (target, message = '', kind = '') => {
    if (!target) return;
    target.textContent = message;
    target.className = `participant-status${kind ? ` ${kind}` : ''}`;
  };

  const setView = (view) => {
    if (loginView) loginView.hidden = view !== 'login';
    if (activationView) activationView.hidden = view !== 'activation';
    if (dashboardView) dashboardView.hidden = view !== 'dashboard';
  };

  const accessNotReleased = (error) => {
    const text = String(error?.message || error || '').toLowerCase();
    return text.includes('ainda não foi liberado') || text.includes('acesso ainda não') || text.includes('organização');
  };

  async function linkAccount() {
    const { data, error } = await db.rpc('cosplay_link_my_profiles');
    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) throw new Error('Seu acesso ainda não foi liberado pela organização.');
    return data;
  }

  async function loadOwnProfile(user) {
    if (!user?.id) return null;
    const { data, error } = await db
      .from('cosplay_participant_profiles')
      .select('id,display_name,nick,character_name,public_slug,profile_visible')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) console.warn('[CosplayChess] Não foi possível carregar o perfil:', error.message);
    return data || null;
  }

  async function showDashboard(session) {
    const user = session?.user;
    if (!user) {
      setView(activationMode ? 'activation' : 'login');
      return;
    }
    if (rendering) return;
    rendering = true;
    try {
      await linkAccount();
      const profile = await loadOwnProfile(user);
      const meta = user.user_metadata || {};
      const displayName = profile?.display_name || profile?.nick || meta.display_name || meta.full_name || meta.name || 'Participante';
      if (nameEl) nameEl.textContent = displayName;
      if (emailEl) emailEl.textContent = user.email || '';
      setView('dashboard');
    } catch (error) {
      if (accessNotReleased(error)) {
        await db.auth.signOut().catch(() => {});
        setView('login');
        setStatus(loginStatus, 'Sua inscrição existe, mas o acesso à Área do Participante ainda não foi liberado pela organização.', 'error');
      } else {
        setView('login');
        setStatus(loginStatus, 'Não foi possível vincular sua conta à inscrição. Tente novamente ou fale com a organização.', 'error');
      }
    } finally {
      rendering = false;
    }
  }

  function cleanActivationUrl() {
    try {
      const url = new URL(location.href);
      url.searchParams.delete('activate');
      url.hash = '';
      history.replaceState({}, document.title, `${url.pathname}${url.search}${url.search ? '' : ''}`);
    } catch {}
  }

  async function init() {
    if (!cfg || !db?.auth) {
      setView('login');
      setStatus(loginStatus, 'Não foi possível iniciar o acesso agora.', 'error');
      return;
    }

    if (activationMode) setView('activation');
    const { data, error } = await db.auth.getSession();
    if (error) console.warn('[CosplayChess] Falha ao restaurar sessão:', error.message);
    const session = data?.session || null;
    if (activationMode) {
      if (session?.user) setStatus(activationStatus, 'Link validado. Crie sua nova senha para continuar.', 'success');
    } else if (session?.user) {
      await showDashboard(session);
    } else {
      setView('login');
    }

    db.auth.onAuthStateChange((event, nextSession) => {
      setTimeout(() => {
        if (event === 'PASSWORD_RECOVERY') {
          setView('activation');
          setStatus(activationStatus, 'Link validado. Crie sua nova senha para continuar.', 'success');
          return;
        }
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && nextSession?.user) {
          if (activationMode) {
            setView('activation');
            setStatus(activationStatus, 'Link validado. Crie sua nova senha para continuar.', 'success');
          } else {
            showDashboard(nextSession);
          }
          return;
        }
        if (event === 'SIGNED_OUT') setView('login');
      }, 0);
    });
  }

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = loginForm.querySelector('button[type="submit"]');
    const formData = new FormData(loginForm);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    if (!email || !password) return;
    setStatus(loginStatus, 'Entrando...');
    if (submit) submit.disabled = true;
    try {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await linkAccount();
      setStatus(loginStatus, 'Acesso liberado.', 'success');
      loginForm.reset();
      await showDashboard(data?.session || null);
    } catch (error) {
      if (accessNotReleased(error)) {
        await db.auth.signOut().catch(() => {});
        setStatus(loginStatus, 'Seu acesso ainda não foi liberado pela organização. Aguarde o convite enviado após a confirmação da inscrição.', 'error');
      } else {
        const msg = String(error?.message || '').toLowerCase();
        setStatus(loginStatus, msg.includes('invalid login') || msg.includes('invalid credentials') ? 'E-mail ou senha inválidos.' : 'Não foi possível entrar. Confira seus dados e tente novamente.', 'error');
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  activationForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = activationForm.querySelector('button[type="submit"]');
    const formData = new FormData(activationForm);
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');
    if (password.length < 8) {
      setStatus(activationStatus, 'Use uma senha com pelo menos 8 caracteres.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      setStatus(activationStatus, 'As senhas não conferem.', 'error');
      return;
    }
    if (submit) submit.disabled = true;
    setStatus(activationStatus, 'Salvando sua senha...');
    try {
      const { data: sessionData } = await db.auth.getSession();
      if (!sessionData?.session?.user) throw new Error('Este link expirou ou já foi utilizado. Peça um novo acesso à organização.');
      const { error: passwordError } = await db.auth.updateUser({ password });
      if (passwordError) throw passwordError;
      await linkAccount();
      const { data: refreshed } = await db.auth.getSession();
      cleanActivationUrl();
      setStatus(activationStatus, 'Senha criada. Seu acesso está ativo.', 'success');
      await showDashboard(refreshed?.session || sessionData.session);
    } catch (error) {
      if (accessNotReleased(error)) {
        await db.auth.signOut().catch(() => {});
        setView('login');
        setStatus(loginStatus, 'Este e-mail ainda não teve o acesso liberado pela organização.', 'error');
      } else {
        setStatus(activationStatus, String(error?.message || 'Não foi possível concluir a ativação.'), 'error');
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  forgotBtn?.addEventListener('click', async () => {
    const emailInput = loginForm?.querySelector('input[name="email"]');
    const email = String(emailInput?.value || '').trim();
    if (!email) {
      setStatus(loginStatus, 'Informe primeiro o e-mail usado na sua inscrição.', 'error');
      emailInput?.focus();
      return;
    }
    forgotBtn.disabled = true;
    setStatus(loginStatus, 'Enviando link de recuperação...');
    try {
      const redirectTo = `${location.origin}${location.pathname}?activate=1`;
      const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setStatus(loginStatus, 'Se houver uma conta ativa para esse e-mail, o link de recuperação será enviado.', 'success');
    } catch {
      setStatus(loginStatus, 'Não foi possível solicitar a recuperação agora. Tente novamente.', 'error');
    } finally {
      forgotBtn.disabled = false;
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    if (!db?.auth) return;
    logoutBtn.disabled = true;
    try {
      await db.auth.signOut();
      setView('login');
      setStatus(loginStatus, 'Você saiu da sua conta.', 'success');
    } finally {
      logoutBtn.disabled = false;
    }
  });

  init();
})();