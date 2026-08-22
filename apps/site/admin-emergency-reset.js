(() => {
  const loginForm = document.getElementById('loginForm');
  const forgotBtn = document.getElementById('forgotPasswordBtn');
  const authStatus = document.getElementById('authStatus');
  if (!loginForm || !forgotBtn || !authStatus) return;

  /* Restaura o visual clássico do login sem mexer no dashboard V6.3. */
  const authCard = document.querySelector('.auth-card');
  if (authCard && !authCard.querySelector('.classic-login-brand')) {
    const brand = document.createElement('div');
    brand.className = 'classic-login-brand';
    brand.innerHTML = `
      <img src="./img/fergorverse-logo.webp" alt="CosplayChess">
      <strong>COSPLAY <span>CHESS</span></strong>
      <small>Acesso Administrativo</small>
    `;
    authCard.insertBefore(brand, authCard.firstChild);
  }

  if (!document.querySelector('style[data-classic-login]')) {
    const style = document.createElement('style');
    style.dataset.classicLogin = '1';
    style.textContent = `
      #authPanel.auth-grid{grid-template-columns:minmax(420px,1fr) minmax(380px,520px)!important;align-items:center!important;gap:clamp(36px,6vw,90px)!important;padding:clamp(28px,5vw,72px)!important;background:radial-gradient(circle at 18% 20%,rgba(130,72,220,.16),transparent 32%),radial-gradient(circle at 86% 74%,rgba(232,177,69,.09),transparent 30%),#070b12!important}
      #authPanel .auth-card{padding:30px!important;border:1px solid rgba(218,174,84,.22)!important;border-radius:22px!important;background:linear-gradient(160deg,rgba(18,20,29,.98),rgba(8,10,16,.99))!important;box-shadow:0 36px 100px rgba(0,0,0,.58),0 0 0 1px rgba(255,255,255,.02)!important}
      .classic-login-brand{display:grid;justify-items:center;gap:6px;margin:-2px 0 22px;text-align:center}.classic-login-brand img{width:92px;height:92px;object-fit:contain;filter:drop-shadow(0 12px 24px rgba(0,0,0,.38))}.classic-login-brand strong{font-size:21px;letter-spacing:2.4px;color:#f5f1e9}.classic-login-brand strong span{color:#e5ad42}.classic-login-brand small{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#847c8e}
      #authPanel .auth-tabs{margin-bottom:18px!important;background:#090b11!important;border:1px solid rgba(255,255,255,.055)!important}
      #authPanel .stack label>span:first-child{color:#b9b2c2!important;font-size:10px!important;font-weight:800!important;letter-spacing:.45px!important}
      #authPanel .stack input{min-height:46px!important;padding:0 48px 0 13px!important;border:1px solid #302b38!important;border-radius:11px!important;background:#090b11!important;color:#f5f3f7!important}
      #authPanel .stack input:focus{border-color:#b48235!important;box-shadow:0 0 0 3px rgba(218,166,68,.11)!important}
      #authPanel .password-field{position:relative;display:block}.password-toggle{position:absolute!important;right:6px!important;top:50%!important;transform:translateY(-50%)!important;width:36px!important;height:36px!important;min-width:36px!important;border:0!important;background:transparent!important;box-shadow:none!important;font-size:0!important;padding:0!important}.password-toggle::before{content:'🙈';font-size:19px;line-height:1}.password-toggle[data-visible='1']::before{content:'🙉'}.password-toggle:hover{transform:translateY(-50%) scale(1.08)!important;background:rgba(255,255,255,.04)!important}.password-toggle:active{transform:translateY(-50%) scale(.96)!important}
      #authPanel #loginForm>.v5-btn.gold{min-height:46px!important;margin-top:2px!important;border-color:#c9902e!important;background:linear-gradient(135deg,#f2bd4b,#d89a2f)!important;color:#17110a!important;font-weight:900!important}.admin-intro:before{content:'';display:block;width:74px;height:4px;border-radius:99px;margin-bottom:24px;background:linear-gradient(90deg,#e6ae43,#8a5eea)}
      @media(max-width:900px){#authPanel.auth-grid{grid-template-columns:1fr!important;padding:24px!important}.admin-intro{display:none!important}#authPanel .auth-card{width:min(100%,520px)!important;margin:auto!important}}
    `;
    document.head.appendChild(style);
  }

  document.querySelectorAll('.password-toggle').forEach(button => {
    const syncMonkey = () => {
      const input = button.parentElement?.querySelector('input');
      if (!input) return;
      button.dataset.visible = input.type === 'text' ? '1' : '0';
      button.setAttribute('aria-label', input.type === 'text' ? 'Ocultar senha' : 'Mostrar senha');
      button.title = input.type === 'text' ? 'Ocultar senha' : 'Mostrar senha';
    };
    syncMonkey();
    button.addEventListener('click', () => requestAnimationFrame(syncMonkey));
  });

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