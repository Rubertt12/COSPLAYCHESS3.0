(() => {
  if (window.__cosplayChampionCardMagicLoaded) return;
  window.__cosplayChampionCardMagicLoaded = true;

  const REST_DELAY = 6000;
  const VANISH_MS = 2600;
  const REVIVE_HOLD = 5200;
  const timers = new WeakMap();

  function clearTimer(shell) {
    const timer = timers.get(shell);
    if (timer) clearTimeout(timer);
    timers.delete(shell);
  }

  function scheduleRest(shell, delay = REST_DELAY) {
    clearTimer(shell);
    const timer = setTimeout(() => vanish(shell), delay);
    timers.set(shell, timer);
  }

  function vanish(shell) {
    if (!shell?.isConnected || shell.classList.contains('is-resting')) return;
    clearTimer(shell);
    shell.classList.remove('is-reviving');
    shell.classList.add('is-vanishing');
    setTimeout(() => {
      if (!shell?.isConnected) return;
      shell.classList.remove('is-vanishing');
      shell.classList.add('is-resting');
    }, VANISH_MS);
  }

  function revive(shell) {
    if (!shell?.isConnected) return;
    clearTimer(shell);
    shell.classList.remove('is-resting', 'is-vanishing');
    shell.classList.add('is-reviving');
    setTimeout(() => {
      if (!shell?.isConnected) return;
      shell.classList.remove('is-reviving');
      scheduleRest(shell, REVIVE_HOLD);
    }, 1100);
  }

  function makeParticles() {
    const particles = document.createElement('div');
    particles.className = 'cc-magic-particles';
    for (let i = 0; i < 14; i++) {
      const dot = document.createElement('i');
      dot.style.setProperty('--x', `${8 + ((i * 17) % 84)}%`);
      dot.style.setProperty('--y', `${12 + ((i * 23) % 72)}%`);
      dot.style.setProperty('--d', `${(i % 7) * 120}ms`);
      dot.style.setProperty('--s', `${2 + (i % 4)}px`);
      particles.appendChild(dot);
    }
    return particles;
  }

  function enhanceCard(modal) {
    if (!modal || modal.dataset.magicPortrait === '1') return;
    const photo = modal.querySelector('.cc-card-photo');
    if (!photo) return;
    modal.dataset.magicPortrait = '1';

    const shell = document.createElement('div');
    shell.className = 'cc-card-photo-magic';
    photo.parentNode.insertBefore(shell, photo);
    shell.appendChild(photo);

    const mist = document.createElement('div');
    mist.className = 'cc-magic-mist';
    mist.innerHTML = '<span></span><span></span><span></span>';
    shell.appendChild(mist);
    shell.appendChild(makeParticles());

    const sigil = document.createElement('div');
    sigil.className = 'cc-magic-sigil';
    sigil.innerHTML = '<span>♛</span><small>RETRATO ENCANTADO</small>';
    shell.appendChild(sigil);

    const hint = document.createElement('div');
    hint.className = 'cc-magic-hint';
    hint.textContent = 'Passe o mouse ou toque para chamar o retrato de volta';
    shell.appendChild(hint);

    shell.addEventListener('pointerenter', () => {
      if (shell.classList.contains('is-resting') || shell.classList.contains('is-vanishing')) revive(shell);
    });
    shell.addEventListener('click', event => {
      if (event.target.closest('button,a')) return;
      revive(shell);
    });

    scheduleRest(shell);
  }

  function enhanceExisting() {
    document.querySelectorAll('.cc-card-modal').forEach(enhanceCard);
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.('.cc-card-modal')) enhanceCard(node);
        node.querySelectorAll?.('.cc-card-modal').forEach(enhanceCard);
      }
    }
  });

  const boot = () => {
    enhanceExisting();
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
