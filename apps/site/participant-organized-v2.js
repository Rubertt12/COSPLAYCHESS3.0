(() => {
  'use strict';
  if (window.__CC_PARTICIPANT_ORGANIZED_V6__) return;
  window.__CC_PARTICIPANT_ORGANIZED_V6__ = true;

  const STORE = 'cosplaychess-participant-sections-v4';
  const ready = new WeakSet();
  let saved = {};
  let scanTimer = 0;

  try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { saved = {}; }

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const save = () => {
    try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch {}
  };

  const configFor = (panel) => {
    if (panel?.classList?.contains('premium-profile-card')) return { key:'perfil', open:true };
    if (panel?.classList?.contains('premium-achievements-card')) return { key:'conquistas', open:false };
    if (panel?.classList?.contains('premium-community-card')) return { key:'comunidade', open:false };
    if (panel?.classList?.contains('premium-share-card')) return { key:'jornada', open:false };
    if (panel?.id === 'participantInterestsCard') return { key:'interesses', open:false };
    if (panel?.id === 'participantProfileGalleryCard') return { key:'galeria', open:false };
    return null;
  };

  const panels = () => {
    const dashboard = q('[data-participant-dashboard]');
    if (!dashboard) return [];
    return qa('.premium-profile-card,.premium-achievements-card,.premium-community-card,.premium-share-card,#participantInterestsCard,#participantProfileGalleryCard', dashboard)
      .filter((panel, index, list) => list.indexOf(panel) === index && !!configFor(panel));
  };

  const directHeader = (panel) => panel.querySelector(
    ':scope > .participant-extra-head, :scope > .premium-achievements-head, :scope > .participant-card-head, :scope > .premium-section-title, :scope > h2, :scope > h3'
  );

  const chevron = () => '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const setCollapsed = (panel, collapsed, persist = true) => {
    const config = configFor(panel);
    if (!config) return;

    panel.classList.toggle('cc-is-collapsed', collapsed);
    panel.dataset.ccCollapsed = collapsed ? '1' : '0';

    const button = q(':scope > .cc-participant-section-head .cc-participant-collapse-toggle', panel);
    if (button) {
      button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      button.setAttribute('aria-label', collapsed ? 'Expandir seção' : 'Recolher seção');
      button.title = collapsed ? 'Expandir' : 'Recolher';
    }

    if (persist) {
      saved[config.key] = !collapsed;
      save();
    }
  };

  const markBody = (panel, head) => {
    [...panel.children].forEach((child) => child.classList?.remove('cc-participant-collapse-body'));
    [...panel.children].forEach((child) => {
      if (child !== head) child.classList?.add('cc-participant-collapse-body');
    });
  };

  const enhance = (panel) => {
    const config = configFor(panel);
    if (!config || !(panel instanceof HTMLElement)) return;

    const head = directHeader(panel);
    if (!head) return;

    panel.classList.add('cc-participant-collapsible');
    panel.dataset.ccSectionKey = config.key;
    panel.dataset.ccDefaultOpen = config.open ? '1' : '0';
    head.classList.add('cc-participant-section-head');
    markBody(panel, head);

    const duplicates = qa(':scope > .cc-participant-collapse-toggle', head);
    duplicates.slice(1).forEach((item) => item.remove());

    let button = q(':scope > .cc-participant-collapse-toggle', head);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'cc-participant-collapse-toggle';
      button.innerHTML = chevron();
      head.appendChild(button);
    }

    if (ready.has(panel)) return;
    ready.add(panel);

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setCollapsed(panel, !panel.classList.contains('cc-is-collapsed'));
    });

    head.addEventListener('click', (event) => {
      if (event.target.closest('button,a,input,select,textarea,label')) return;
      setCollapsed(panel, !panel.classList.contains('cc-is-collapsed'));
    });

    const open = Object.prototype.hasOwnProperty.call(saved, config.key)
      ? !!saved[config.key]
      : config.open;
    setCollapsed(panel, !open, false);
  };

  const ensureToolbar = () => {
    const content = q('#participantDashboardContent');
    if (!content) return null;

    let bar = q('#ccParticipantOrganizer', content);
    if (bar) return bar;

    bar = document.createElement('div');
    bar.id = 'ccParticipantOrganizer';
    bar.className = 'cc-participant-organizer';
    bar.innerHTML = `
      <div class="cc-participant-organizer-copy">
        <span class="cc-participant-organizer-icon" aria-hidden="true">☷</span>
        <div><b>Painel</b><small>Organize suas seções</small></div>
      </div>
      <div class="cc-participant-organizer-actions">
        <button type="button" class="cc-organizer-btn primary" data-cc-action="collapse">− Recolher</button>
        <button type="button" class="cc-organizer-btn" data-cc-action="expand">＋ Expandir</button>
        <button type="button" class="cc-organizer-btn" data-cc-action="default">↺ Padrão</button>
      </div>`;

    const hero = q(':scope > .premium-hero-card', content);
    if (hero) hero.insertAdjacentElement('afterend', bar);
    else content.prepend(bar);

    bar.addEventListener('click', (event) => {
      const button = event.target.closest('[data-cc-action]');
      if (!button) return;
      const list = panels();

      if (button.dataset.ccAction === 'collapse') {
        list.forEach((panel) => setCollapsed(panel, true));
      }
      if (button.dataset.ccAction === 'expand') {
        list.forEach((panel) => setCollapsed(panel, false));
      }
      if (button.dataset.ccAction === 'default') {
        list.forEach((panel) => setCollapsed(panel, panel.dataset.ccDefaultOpen !== '1'));
      }
    });

    return bar;
  };

  const ensureBoard = () => {
    const content = q('#participantDashboardContent');
    const organizer = ensureToolbar();
    if (!content || !organizer) return null;

    let board = q('#ccParticipantBoard', content);
    if (!board) {
      board = document.createElement('div');
      board.id = 'ccParticipantBoard';
      board.className = 'cc-participant-board';
      board.innerHTML = `
        <div class="cc-participant-column cc-participant-column-left"></div>
        <div class="cc-participant-column cc-participant-column-right"></div>`;
      organizer.insertAdjacentElement('afterend', board);
    }
    return board;
  };

  const arrangeBoard = () => {
    const board = ensureBoard();
    const dashboard = q('[data-participant-dashboard]');
    if (!board || !dashboard) return;

    const left = q('.cc-participant-column-left', board);
    const right = q('.cc-participant-column-right', board);
    if (!left || !right) return;

    const profile = q('.premium-profile-card', dashboard);
    const gallery = q('#participantProfileGalleryCard', dashboard);
    const community = q('.premium-community-card', dashboard);
    const interests = q('#participantInterestsCard', dashboard);
    const achievements = q('.premium-achievements-card', dashboard);
    const share = q('.premium-share-card', dashboard);

    [profile, gallery, community].filter(Boolean).forEach((card) => {
      if (card.parentElement !== left) left.appendChild(card);
    });

    [interests, achievements, share].filter(Boolean).forEach((card) => {
      if (card.parentElement !== right) right.appendChild(card);
    });
  };

  const cleanupLegacy = () => {
    qa('.cc-participant-synthetic-head').forEach((el) => el.remove());
    qa('#participantDashboardContent .cc-participant-column:not(#ccParticipantBoard .cc-participant-column)').forEach((el) => el.remove());
    q('#ccParticipantOrganizedV4Style')?.remove();
    q('#ccParticipantOrganizedV5Style')?.remove();
  };

  const scan = () => {
    cleanupLegacy();
    ensureToolbar();
    arrangeBoard();
    panels().forEach(enhance);
  };

  const scheduleScan = () => {
    clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scan, 120);
  };

  const start = () => {
    scan();
    [250, 700, 1400, 2600].forEach((ms) => window.setTimeout(scan, ms));

    const dashboard = q('[data-participant-dashboard]');
    if (dashboard) {
      const observer = new MutationObserver(scheduleScan);
      observer.observe(dashboard, { childList:true, subtree:true });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();
