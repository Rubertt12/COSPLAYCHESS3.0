(() => {
  const loginForm = document.getElementById('loginForm');
  const forgotBtn = document.getElementById('forgotPasswordBtn');
  const authStatus = document.getElementById('authStatus');
  if (!loginForm || !forgotBtn || !authStatus) return;

  const emergencyBtn = document.createElement('button');
  emergencyBtn.id = 'emergencyResetBtn';
  emergencyBtn.className = 'btn ghost';
  emergencyBtn.type = 'button';
  emergencyBtn.textContent = 'Tenho código de emergência';
  forgotBtn.insertAdjacentElement('afterend', emergencyBtn);

  const form = document.createElement('form');
  form.id = 'emergencyResetForm';
  form.className = 'stack';
  form.hidden = true;
  form.autocomplete = 'off';
  form.innerHTML = `
    <p class="hint">Use o código temporário fornecido para esta recuperação. Ele expira e só funciona uma vez.</p>
    <label>
      <span>E-mail administrativo</span>
      <input type="email" name="email" required value="cosplaychess@outlook.com" autocomplete="email">
    </label>
    <label>
      <span>Código de emergência</span>
      <input name="code" required autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="CC-XXXXXXXXXXXX">
    </label>
    <label>
      <span>Nova senha</span>
      <input type="password" name="password" minlength="8" required autocomplete="new-password" placeholder="Mínimo de 8 caracteres">
    </label>
    <label>
      <span>Confirmar nova senha</span>
      <input type="password" name="confirmPassword" minlength="8" required autocomplete="new-password" placeholder="Repita a nova senha">
    </label>
    <button class="btn gold" type="submit">Alterar senha agora</button>
    <button id="cancelEmergencyReset" class="btn ghost" type="button">Voltar ao login</button>
  `;
  loginForm.insertAdjacentElement('afterend', form);

  function setStatus(text, type = '') {
    authStatus.className = `form-status ${type}`;
    authStatus.textContent = text;
  }

  function showEmergency() {
    document.getElementById('bootstrapForm')?.setAttribute('hidden', '');
    document.getElementById('recoveryForm')?.setAttribute('hidden', '');
    loginForm.hidden = true;
    form.hidden = false;
    document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.remove('active'));
    setStatus('Informe o código de emergência e escolha sua nova senha.');
    form.elements.code.focus();
  }

  function showLogin(message = '') {
    form.hidden = true;
    loginForm.hidden = false;
    const loginTab = document.querySelector('[data-auth-tab="login"]');
    document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.toggle('active', b === loginTab));
    if (message) setStatus(message, 'success');
    else setStatus('');
  }

  emergencyBtn.addEventListener('click', showEmergency);
  form.querySelector('#cancelEmergencyReset').addEventListener('click', () => showLogin());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data.password !== data.confirmPassword) {
      setStatus('As senhas não coincidem.', 'error');
      return;
    }
    if (String(data.password || '').length < 8) {
      setStatus('A senha precisa ter pelo menos 8 caracteres.', 'error');
      return;
    }

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Alterando senha...';
    setStatus('Validando o código de emergência...');

    try {
      const cfg = window.COSPLAYCHESS_CONFIG;
      const response = await fetch(`${cfg.functionsBase}/cosplaychess-admin-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.supabaseKey,
        },
        body: JSON.stringify({
          email: String(data.email || '').trim(),
          code: String(data.code || '').trim(),
          newPassword: String(data.password || ''),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível alterar a senha.');

      form.reset();
      form.elements.email.value = 'cosplaychess@outlook.com';
      showLogin('Senha alterada com sucesso. Entre com a nova senha.');
      loginForm.elements.email.value = 'cosplaychess@outlook.com';
      loginForm.elements.password.focus();
    } catch (error) {
      setStatus(error.message || 'Não foi possível alterar a senha.', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Alterar senha agora';
    }
  });
})();
