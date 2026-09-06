(() => {
  const ICONS = {
    play:'▶', settings:'⚙', exit:'⏻', white:'♔', black:'♚', log:'☷', system:'⚙',
    edit:'✎', move:'↔', pin:'⌖', data:'▣', audio:'♫', board:'▦', tools:'✦', back:'←'
  };

  const setButtonIcon = (button, icon, label) => {
    if (!button || button.dataset.mobileIconified === '1') return;
    button.dataset.mobileIconified = '1';
    const text = label || button.textContent.trim();
    button.innerHTML = `<span class="mobile-btn-icon" aria-hidden="true">${icon}</span><span class="mobile-btn-label">${text}</span>`;
  };

  const decorateStartMenu = () => {
    const main = document.getElementById('main-start-options');
    if (!main) return;
    setButtonIcon(main.querySelector('button[onclick*="startBattle"]'), ICONS.play, 'INICIAR BATALHA');
    setButtonIcon(main.querySelector('button[onclick*="openStartMenuSettings"]'), ICONS.settings, 'CONFIGURAÇÕES');
    setButtonIcon(main.querySelector('#game-exit-btn-start'), ICONS.exit, 'SAIR DO JOGO');

    if (!main.querySelector('.mobile-start-brand')) {
      const brand = document.createElement('div');
      brand.className = 'mobile-start-brand';
      brand.innerHTML = `
        <img src="img/favicon/cosplaychess-app.png" alt="Cosplay Chess">
        <div><b>COSPLAY CHESS</b><span>RUBRA STUDIOS · ANDROID</span></div>`;
      main.prepend(brand);
    }
  };

  const decorateSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const head = sidebar.querySelector('.mobile-menu-head');
    if (head && !head.querySelector('.mobile-menu-brand-icon')) {
      const icon = document.createElement('img');
      icon.className = 'mobile-menu-brand-icon';
      icon.src = 'img/favicon/cosplaychess-app.png';
      icon.alt = '';
      head.prepend(icon);
    }

    const map = [
      ['#t-white', ICONS.white, 'BRANCAS'],
      ['#t-black', ICONS.black, 'PRETAS'],
      ['#t-log', ICONS.log, 'LOG'],
      ['#t-sys', ICONS.system, 'SISTEMA']
    ];
    map.forEach(([selector, icon, label]) => setButtonIcon(sidebar.querySelector(selector), icon, label));

    const labels = sidebar.querySelectorAll('> div:first-of-type:not(.mobile-menu-head) label');
    labels.forEach(label => {
      if (label.dataset.mobileDecorated === '1') return;
      label.dataset.mobileDecorated = '1';
      const text = label.textContent.toUpperCase();
      const symbol = text.includes('EDIÇÃO') ? ICONS.edit : text.includes('LIVRE') ? ICONS.move : ICONS.pin;
      const badge = document.createElement('span');
      badge.className = 'mobile-setting-icon';
      badge.textContent = symbol;
      label.insertBefore(badge, label.firstChild);
    });
  };

  const decorateSettings = () => {
    const settings = document.getElementById('start-menu-settings-content');
    if (!settings) return;

    if (!settings.querySelector('.mobile-settings-hero')) {
      const hero = document.createElement('div');
      hero.className = 'mobile-settings-hero';
      hero.innerHTML = `<span>${ICONS.settings}</span><div><b>CONFIGURAÇÕES</b><small>Visual, partida, áudio, dados e ferramentas</small></div>`;
      settings.prepend(hero);
    }

    settings.querySelectorAll('.mobile-settings-title').forEach(title => {
      if (title.dataset.iconified === '1') return;
      title.dataset.iconified = '1';
      const text = title.textContent.trim().toUpperCase();
      const icon = text.includes('DADOS') ? ICONS.data : text.includes('PARTIDA') ? ICONS.move : text.includes('ÁUDIO') ? ICONS.audio : ICONS.tools;
      title.innerHTML = `<span class="mobile-section-icon">${icon}</span><span>${title.textContent.trim()}</span>`;
    });

    const topTitle = settings.querySelector('.menu-section-title');
    if (topTitle && topTitle.dataset.iconified !== '1') {
      topTitle.dataset.iconified = '1';
      topTitle.innerHTML = `<span class="mobile-section-icon">◈</span><span>ESTILO DO TABULEIRO</span>`;
    }

    const back = settings.querySelector('.btn-back');
    setButtonIcon(back, ICONS.back, 'VOLTAR');

    settings.querySelectorAll('.theme-card').forEach(card => {
      card.classList.add('mobile-theme-card');
    });
  };

  const addMenuQuickActions = () => {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || sidebar.querySelector('.mobile-menu-quick-actions')) return;
    const head = sidebar.querySelector('.mobile-menu-head');
    if (!head) return;
    const actions = document.createElement('div');
    actions.className = 'mobile-menu-quick-actions';
    actions.innerHTML = `
      <button type="button" data-action="undo"><span>↶</span><small>DESFAZER</small></button>
      <button type="button" data-action="settings"><span>⚙</span><small>SISTEMA</small></button>
      <button type="button" data-action="edit"><span>✎</span><small>EDIÇÃO</small></button>`;
    head.insertAdjacentElement('afterend', actions);
    actions.querySelector('[data-action="undo"]')?.addEventListener('click', () => window.undoMove?.());
    actions.querySelector('[data-action="settings"]')?.addEventListener('click', () => window.showTab?.('sys'));
    actions.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
      const input = document.getElementById('edit-mode');
      if (!input) return;
      input.checked = !input.checked;
      input.dispatchEvent(new Event('change', {bubbles:true}));
    });
  };

  const boot = () => {
    decorateStartMenu();
    decorateSidebar();
    decorateSettings();
    addMenuQuickActions();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
  window.addEventListener('load', () => {
    boot();
    setTimeout(boot, 400);
    setTimeout(boot, 1200);
  }, {once:true});
})();
