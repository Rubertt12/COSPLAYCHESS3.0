(() => {
  document.body.classList.add('capacitor-mobile');

  const isAndroid = /Android/i.test(navigator.userAgent);
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

  const setupGraveyard = () => {
    const box = document.querySelector('.graveyard-container');
    if (!box) return;
    box.classList.add('mobile-collapsed');
    const title = box.querySelector('h4');
    if (!title) return;
    title.style.cursor = 'pointer';
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    title.setAttribute('aria-label', 'Mostrar ou ocultar peças eliminadas');
    title.addEventListener('click', () => box.classList.toggle('mobile-collapsed'));
    title.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        box.classList.toggle('mobile-collapsed');
      }
    });
  };

  const cleanupDesktopHints = () => {
    document.querySelectorAll('.dashboard-controls-left input[type="range"]').forEach((el) => {
      el.setAttribute('tabindex', '-1');
    });
  };

  window.addEventListener('load', () => {
    addMobileActionBar();
    setupGraveyard();
    cleanupDesktopHints();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
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
