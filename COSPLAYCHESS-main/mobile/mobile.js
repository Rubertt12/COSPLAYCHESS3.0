(() => {
  document.body.classList.add('capacitor-mobile');

  const isAndroid = /Android/i.test(navigator.userAgent);
  if (!isAndroid) return;

  const tryLandscape = async () => {
    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape');
      }
    } catch (_) {
      // Some Android/WebView versions only allow locking after user interaction.
    }
  };

  window.addEventListener('load', tryLandscape, { once: true });
  document.addEventListener('pointerdown', tryLandscape, { once: true });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 280) event.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('button, .piece, .square, img')) event.preventDefault();
  });
})();
