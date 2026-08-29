(() => {
  const nav = document.querySelector('.community-nav');
  if (!nav) return;

  let observer = null;
  let timer = null;
  let organizing = false;

  const setContent = (node, icon, label) => {
    if (!node) return;
    const badge = node.querySelector('b');
    node.innerHTML = `<span aria-hidden="true">${icon}</span><span class="community-nav-text">${label}</span>`;
    if (badge) node.appendChild(badge);
  };

  const configure = (node, { order, group, icon, label, secondary = false, journey = false, hidden = false }) => {
    if (!node) return;
    node.style.order = String(order);
    node.dataset.navGroup = group;
    node.dataset.navSecondary = secondary ? '1' : '0';
    node.dataset.navJourney = journey ? '1' : '0';
    node.dataset.navHidden = hidden ? '1' : '0';
    if (icon && label) setContent(node, icon, label);
  };

  const ensureLabel = (key, text, order) => {
    let label = nav.querySelector(`[data-nav-section="${key}"]`);
    if (!label) {
      label = document.createElement('div');
      label.className = 'community-nav-section-label';
      label.dataset.navSection = key;
      label.setAttribute('aria-hidden', 'true');
      nav.appendChild(label);
    }
    label.textContent = text;
    label.style.order = String(order);
    return label;
  };

  const ensureMoreToggle = () => {
    let toggle = nav.querySelector('[data-community-more-toggle]');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'community-nav-more-toggle';
      toggle.dataset.communityMoreToggle = '1';
      toggle.style.order = '30';
      toggle.addEventListener('click', () => {
        const open = nav.dataset.moreOpen === '1';
        nav.dataset.moreOpen = open ? '0' : '1';
        sessionStorage.setItem('cosplay-community-more-open', nav.dataset.moreOpen);
        paintMoreToggle(toggle);
      });
      nav.appendChild(toggle);
    }
    paintMoreToggle(toggle);
    return toggle;
  };

  const paintMoreToggle = (toggle) => {
    if (!toggle) return;
    const open = nav.dataset.moreOpen === '1';
    toggle.innerHTML = `<span aria-hidden="true">${open ? '−' : '+'}</span><span>${open ? 'Menos opções' : 'Mais opções'}</span><small>${open ? 'recolher' : '4 atalhos'}</small>`;
    toggle.setAttribute('aria-expanded', String(open));
  };

  const organize = () => {
    if (organizing) return;
    organizing = true;
    observer?.disconnect();

    const item = (name) => nav.querySelector(`[data-community-view="${name}"]`);
    const link = (href) => nav.querySelector(`a[href="${href}"]`);

    ensureLabel('social', 'SOCIAL', 10);
    configure(item('feed'), { order: 11, group: 'social', icon: '⌂', label: 'Feed' });
    configure(item('friends'), { order: 12, group: 'social', icon: '♟', label: 'Amigos' });
    configure(item('communities'), { order: 13, group: 'social', icon: '◉', label: 'Comunidades' });
    configure(item('discover'), { order: 14, group: 'social', icon: '⌕', label: 'Explorar' });
    configure(item('messages'), { order: 15, group: 'social', icon: '✉', label: 'Mensagens' });

    ensureLabel('activity', 'ATIVIDADE', 20);
    configure(item('events'), { order: 21, group: 'activity', icon: '▣', label: 'Eventos' });
    configure(item('photos'), { order: 22, group: 'activity', icon: '▧', label: 'Fotos' });

    configure(item('following'), { order: 31, group: 'more', icon: '◎', label: 'Seguindo', secondary: true });
    configure(item('teams'), { order: 32, group: 'more', icon: '⚔', label: 'Times', secondary: true });
    configure(item('saved'), { order: 33, group: 'more', icon: '★', label: 'Salvos', secondary: true });
    configure(item('social-settings'), { order: 34, group: 'more', icon: '⚙', label: 'Configurações', secondary: true });

    // Notifications remain accessible through the topbar bell; hiding the duplicate keeps the sidebar compact.
    configure(item('notifications'), { order: 35, group: 'more', icon: '◌', label: 'Notificações', secondary: true, hidden: true });

    const moreToggle = ensureMoreToggle();

    ensureLabel('journey', 'JORNADA', 40);
    configure(link('./passaporte.html'), { order: 41, group: 'journey', icon: '▣', label: 'Passaporte', journey: true });
    configure(link('./conquistas.html'), { order: 42, group: 'journey', icon: '♕', label: 'Conquistas', journey: true });

    if (!nav.dataset.moreOpen) {
      nav.dataset.moreOpen = sessionStorage.getItem('cosplay-community-more-open') === '1' ? '1' : '0';
    }
    const activeSecondary = nav.querySelector('[data-nav-secondary="1"].active');
    if (activeSecondary) nav.dataset.moreOpen = '1';
    paintMoreToggle(moreToggle);

    // The old promotional Passaporte card duplicates the Journey shortcuts.
    document.querySelector('.premium-sidebar-foot')?.setAttribute('hidden', '');

    observer?.observe(nav, { childList: true });
    organizing = false;
  };

  observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(organize, 80);
  });

  nav.addEventListener('click', (event) => {
    const target = event.target.closest('[data-nav-secondary="1"]');
    if (!target) return;
    nav.dataset.moreOpen = '1';
    sessionStorage.setItem('cosplay-community-more-open', '1');
    paintMoreToggle(nav.querySelector('[data-community-more-toggle]'));
  });

  organize();
  window.addEventListener('cosplay:social-shell-ready', organize);
  window.addEventListener('load', organize, { once: true });
  setTimeout(organize, 450);
  setTimeout(organize, 1400);
  setTimeout(organize, 3100);
})();
