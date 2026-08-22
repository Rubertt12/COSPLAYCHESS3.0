(() => {
  if (typeof syncSession !== 'function') return;

  const originalSyncSession = syncSession;
  let syncPromise = null;

  function showAdminError(error) {
    console.error('[CosplayChess Admin]', error);
    const dashboard = document.getElementById('dashboardPanel');
    const authPanel = document.getElementById('authPanel');
    const authStatus = document.getElementById('authStatus');
    const message = error?.message || String(error || 'Erro inesperado ao carregar o painel.');

    // Se a sessão já autenticou e o dashboard foi aberto, não volta para o login.
    if (dashboard && !dashboard.hidden) {
      let box = document.getElementById('adminLoadError');
      if (!box) {
        box = document.createElement('div');
        box.id = 'adminLoadError';
        box.style.cssText = 'grid-column:1/-1;margin:14px 22px 0;padding:13px 15px;border:1px solid #6d3340;border-radius:10px;background:#2b1118;color:#ffd7dc;font:600 11px/1.5 Inter,Segoe UI,Arial,sans-serif;';
        const content = dashboard.querySelector('.v5-content');
        if (content) content.prepend(box);
        else dashboard.prepend(box);
      }
      box.textContent = `O painel abriu, mas parte dos dados não carregou: ${message}. Atualize a página para tentar novamente.`;
      return;
    }

    if (authPanel) authPanel.hidden = false;
    if (authStatus) {
      authStatus.className = 'form-status error';
      authStatus.textContent = `Não foi possível carregar o painel: ${message}`;
    }
  }

  // Garante que apenas uma sincronização rode por vez. O login dispara tanto
  // pelo submit quanto pelo onAuthStateChange, então sem esse lock duas cargas
  // pesadas podiam acontecer simultaneamente.
  syncSession = function guardedSyncSession() {
    if (syncPromise) return syncPromise;
    syncPromise = Promise.resolve()
      .then(() => originalSyncSession())
      .catch(error => {
        showAdminError(error);
        return null;
      })
      .finally(() => {
        syncPromise = null;
      });
    return syncPromise;
  };

  // Evita que erros dos módulos auxiliares deixem a tela parecendo congelada.
  window.addEventListener('unhandledrejection', event => {
    showAdminError(event.reason || new Error('Falha ao carregar um módulo do painel.'));
  });

  window.addEventListener('error', event => {
    if (!event.error) return;
    showAdminError(event.error);
  });

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const oldSubmit = loginForm.onsubmit;
    loginForm.onsubmit = async event => {
      const submit = loginForm.querySelector('button[type="submit"]');
      if (submit?.disabled) {
        event.preventDefault();
        return;
      }
      if (submit) {
        submit.disabled = true;
        submit.dataset.originalText = submit.textContent;
        submit.textContent = 'Entrando...';
      }
      try {
        await oldSubmit?.call(loginForm, event);
      } catch (error) {
        showAdminError(error);
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = submit.dataset.originalText || 'Entrar no painel';
        }
      }
    };
  }
})();
