(() => {
  document.body.classList.add('capacitor-mobile');

  const isAndroid = /Android/i.test(navigator.userAgent);

  // O APK agora é portrait-first. Não força mais landscape.
  if (isAndroid && screen.orientation && screen.orientation.unlock) {
    try { screen.orientation.unlock(); } catch (_) {}
  }

  const makeButton = (label, icon, className, handler) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `mobile-action-btn ${className || ''}`.trim();
    button.innerHTML = `<span class="ico">${icon}</span><span>${label}</span>`;
    button.addEventListener('click', () => {
      try { handler(); } catch (_) {}
    });
    return button;
  };

  const addMobileActionBar = () => {
    if (document.querySelector('.mobile-action-bar')) return;

    const bar = document.createElement('nav');
    bar.className = 'mobile-action-bar';
    bar.setAttribute('aria-label', 'Ações rápidas do jogo');

    bar.append(
      makeButton('DESFAZER', '↶', 'primary', () => window.undoMove && window.undoMove()),
      makeButton('PAUSAR', 'Ⅱ', '', () => window.pauseGame && window.pauseGame()),
      makeButton('REINICIAR', '↻', '', () => window.resetGame && window.resetGame()),
      makeButton('MENU', '☰', 'danger', () => window.toggleMenu && window.toggleMenu())
    );

    document.body.appendChild(bar);
  };

  const enhanceLabels = () => {
    const pause = [...document.querySelectorAll('.dash-btn')].find(btn => btn.textContent.includes('PAUSA'));
    if (pause) pause.innerHTML = 'Ⅱ <span style="font-size:9px">PAUSAR</span>';

    const playButtons = [...document.querySelectorAll('.dash-btn')];
    playButtons.forEach((btn) => {
      const title = (btn.getAttribute('title') || '').toLowerCase();
      if (title.includes('subir')) btn.setAttribute('aria-label', 'Escolher áudio');
      if (title === 'play') btn.setAttribute('aria-label', 'Tocar áudio ambiente');
      if (title === 'pause') btn.setAttribute('aria-label', 'Pausar áudio ambiente');
    });
  };

  window.addEventListener('load', () => {
    addMobileActionBar();
    enhanceLabels();
    window.scrollTo(0, 0);
  }, { once: true });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 280) event.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('button, .piece, .sq, img')) event.preventDefault();
  });
})();
