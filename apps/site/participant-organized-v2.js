(() => {
  'use strict';
  if (window.__CC_PARTICIPANT_ORGANIZED_V4__) return;
  window.__CC_PARTICIPANT_ORGANIZED_V4__ = true;

  const STORE = 'cosplaychess-participant-sections-v4';
  const ready = new WeakSet();
  let saved = {};
  let scanTimer = 0;

  try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { saved = {}; }

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch {} };

  const injectStyle = () => {
    if (q('#ccParticipantOrganizedV4Style')) return;
    const style = document.createElement('style');
    style.id = 'ccParticipantOrganizedV4Style';
    style.textContent = `
      body.participant-page:has(.participant-dashboard:not([hidden])) .participant-premium-content{
        display:flex!important;flex-direction:column!important;gap:10px!important;
        height:auto!important;min-height:0!important;max-height:none!important;
        align-content:initial!important;overflow:visible!important;
      }
      #ccParticipantBoard{display:grid!important;grid-template-columns:minmax(0,1.45fr) minmax(330px,.75fr)!important;gap:10px!important;align-items:start!important;width:100%!important;min-width:0!important}
      #ccParticipantBoard>.cc-participant-column{display:grid!important;grid-auto-rows:max-content!important;gap:10px!important;align-content:start!important;min-width:0!important}
      body.participant-page .premium-main-grid,
      body.participant-page .premium-bottom-grid{display:none!important}
      body.participant-page .premium-card,
      body.participant-page .participant-extra-card{height:auto!important;min-height:0!important;max-height:none!important;align-self:start!important;margin:0!important}
      body.participant-page .premium-profile-card,
      body.participant-page .premium-achievements-card,
      body.participant-page .premium-community-card,
      body.participant-page .premium-share-card{width:100%!important}
      body.participant-page .premium-achievements-card .participant-achievements{min-height:110px!important;height:auto!important;max-height:none!important}
      body.participant-page .participant-profile-gallery{margin:10px 0 6px!important}
      body.participant-page .participant-extra-intro{margin:-2px 0 10px!important}
      body.participant-page .premium-bottom-actions{margin:0!important}
      body.participant-page .cc-participant-collapsible{overflow:hidden!important}
      body.participant-page .cc-participant-collapsible.cc-is-collapsed{height:auto!important;min-height:0!important;max-height:none!important;padding-top:0!important;padding-bottom:0!important}
      body.participant-page .cc-participant-collapsible.cc-is-collapsed>.cc-participant-collapse-body{display:none!important}
      body.participant-page .cc-participant-collapsible.cc-is-collapsed>.cc-participant-section-head{min-height:42px!important;margin:0!important;border-bottom:0!important}
      @media(max-width:1100px){
        #ccParticipantBoard{grid-template-columns:1fr!important}
        #ccParticipantBoard>.cc-participant-column{gap:8px!important}
      }
    `;
    document.head.appendChild(style);
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

  const directHeader = (panel) => panel.querySelector(':scope > .participant-extra-head, :scope > .premium-achievements-head, :scope > .participant-card-head, :scope > .premium-section-title, :scope > h2, :scope > h3');
  const icon = () => '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const setCollapsed = (panel, collapsed, persist = true) => {
    const config = configFor(panel);
    if (!config) return;
    panel.classList.toggle('cc-is-collapsed', collapsed);
    panel.dataset.ccCollapsed = collapsed ? '1' : '0';
    const button = panel.querySelector(':scope > .cc-participant-section-head .cc-participant-collapse-toggle');
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
    [...panel.children].forEach((child) => { if (child !== head) child.classList?.add('cc-participant-collapse-body'); });
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

    let button = head.querySelector(':scope > .cc-participant-collapse-toggle');
    head.querySelectorAll(':scope > .cc-participant-collapse-toggle').forEach((item, index) => { if (index > 0) item.remove(); });
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'cc-participant-collapse-toggle';
      button.innerHTML = icon();
      head.appendChild(button);
    }

    if (!ready.has(panel)) {
      ready.add(panel);
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setCollapsed(panel, !panel.classList.contains('cc-is-collapsed'));
      };
      head.onclick = (event) => {
        if (event.target.closest('button,a,input,select,textarea,label')) return;
        setCollapsed(panel, !panel.classList.contains('cc-is-collapsed'));
      };
      const open = Object.prototype.hasOwnProperty.call(saved, config.key) ? !!saved[config.key] : config.open;
      setCollapsed(panel, !open, false);
    }
  };

  const ensureToolbar = () => {
    const content = q('#participantDashboardContent');
    if (!content || q('#ccParticipantOrganizer')) return;
    const hero = q(':scope > .premium-hero-card', content);
    const bar = document.createElement('div');
    bar.id = 'ccParticipantOrganizer';
    bar.className = 'cc-participant-organizer';
    bar.innerHTML = `<div class="cc-participant-organizer-copy"><span class="cc-participant-organizer-icon">☷</span><div><b>Organizar painel</b><small>Abra somente as áreas que quiser usar.</small></div></div><div class="cc-participant-organizer-actions"><button type="button" class="cc-organizer-btn primary" data-cc-action="collapse">Recolher</button><button type="button" class="cc-organizer-btn" data-cc-action="expand">Expandir tudo</button><button type="button" class="cc-organizer-btn" data-cc-action="default">Padrão</button></div>`;
    if (hero) hero.insertAdjacentElement('afterend', bar); else content.prepend(bar);

    bar.addEventListener('click', (event) => {
      const button = event.target.closest('[data-cc-action]');
      if (!button) return;
      const list = panels();
      if (button.dataset.ccAction === 'collapse') list.forEach((panel) => setCollapsed(panel, true));
      if (button.dataset.ccAction === 'expand') list.forEach((panel) => setCollapsed(panel, false));
      if (button.dataset.ccAction === 'default') list.forEach((panel) => setCollapsed(panel, panel.dataset.ccDefaultOpen !== '1'));
    });
  };

  const ensureBoard = () => {
    const content = q('#participantDashboardContent');
    const organizer = q('#ccParticipantOrganizer');
    if (!content || !organizer) return null;
    let board = q('#ccParticipantBoard');
    if (!board) {
      board = document.createElement('div');
      board.id = 'ccParticipantBoard';
      board.className = 'cc-participant-board';
      board.innerHTML = '<div class="cc-participant-column cc-participant-column-left"></div><div class="cc-participant-column cc-participant-column-right"></div>';
      organizer.insertAdjacentElement('afterend', board);
    }
    return board;
  };

  const arrangeBoard = () => {
    const board = ensureBoard();
    if (!board) return;
    const left = q('.cc-participant-column-left', board);
    const right = q('.cc-participant-column-right', board);
    const dashboard = q('[data-participant-dashboard]');
    if (!left || !right || !dashboard) return;

    const profile = q('.premium-profile-card', dashboard);
    const gallery = q('#participantProfileGalleryCard', dashboard);
    const community = q('.premium-community-card', dashboard);
    const interests = q('#participantInterestsCard', dashboard);
    const achievements = q('.premium-achievements-card', dashboard);
    const share = q('.premium-share-card', dashboard);

    [profile, gallery, community].filter(Boolean).forEach((card) => { if (card.parentElement !== left) left.appendChild(card); });
    [interests, achievements, share].filter(Boolean).forEach((card) => { if (card.parentElement !== right) right.appendChild(card); });
  };

  const panels = () => {
    const dashboard = q('[data-participant-dashboard]');
    if (!dashboard) return [];
    return qa('.premium-profile-card,.premium-achievements-card,.premium-community-card,.premium-share-card,#participantInterestsCard,#participantProfileGalleryCard', dashboard)
      .filter((panel, index, arr) => arr.indexOf(panel) === index && !!configFor(panel));
  };

  const cleanupLegacy = () => {
    qa('.cc-participant-synthetic-head').forEach((el) => el.remove());
    qa('#participantDashboardContent .cc-participant-column:not(#ccParticipantBoard .cc-participant-column)').forEach((el) => el.remove());
  };

  const scan = () => {
    injectStyle();
    cleanupLegacy();
    ensureToolbar();
    arrangeBoard();
    panels().forEach(enhance);
  };

  const scheduleScan = () => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 100);
  };

  const start = () => {
    scan();
    [250,700,1400,2400].forEach((ms) => setTimeout(scan, ms));
    const dashboard = q('[data-participant-dashboard]');
    if (dashboard) new MutationObserver(scheduleScan).observe(dashboard, { childList:true, subtree:true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
