(() => {
  const button = document.getElementById('participantForgotPassword');
  const form = document.getElementById('participantLoginForm');
  const status = document.getElementById('participantLoginStatus');
  const cfg = window.COSPLAYCHESS_CONFIG || {};
  if (!button || !form || !status || !cfg.functionsBase || !cfg.supabaseKey) return;

  const setStatus = (message = '', kind = '') => {
    status.textContent = message;
    status.className = `participant-status${kind ? ` ${kind}` : ''}`;
  };

  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const emailInput = form.querySelector('input[name="email"]');
    const email = String(emailInput?.value || '').trim();
    if (!email) {
      setStatus('Informe primeiro o e-mail usado na sua inscrição.', 'error');
      emailInput?.focus();
      return;
    }

    button.disabled = true;
    setStatus('Enviando recuperação...');
    try {
      const response = await fetch(`${cfg.functionsBase}/cosplaychess-participant-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.supabaseKey
        },
        body: JSON.stringify({ email })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível enviar a recuperação agora.');
      setStatus(payload?.message || 'Se houver uma conta ativa para esse e-mail, o link de recuperação será enviado.', 'success');
    } catch (error) {
      setStatus(String(error?.message || 'Não foi possível enviar a recuperação agora.'), 'error');
    } finally {
      button.disabled = false;
    }
  }, true);
})();