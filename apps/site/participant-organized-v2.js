(() => {
  'use strict';
  if (window.__CC_PARTICIPANT_ORGANIZED_V5__) return;
  window.__CC_PARTICIPANT_ORGANIZED_V5__ = true;

  const STORE = 'cosplaychess-participant-sections-v4';
  const ready = new WeakSet();
  let saved = {};
  let scanTimer = 0;

  try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { saved = {}; }

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch {} };

  const injectStyle = () => {
    if (q('#ccParticipantOrganizedV5Style')) return;
    const style = document.createElement('style');
    style.id = 'ccParticipantOrganizedV5Style';
    style.textContent = `
      body.participant-page:has(.participant-dashboard:not([hidden])) .participant-shell{
        width:min(1460px,calc(100% - 36px))!important;
        max-width:1460px!important;
        padding-top:12px!important;
        padding-bottom:24px!important;
      }
      body.participant-page:has(.participant-dashboard:not([hidden])) .participant-premium-content{
        display:flex!important;
        flex-direction:column!important;
        gap:12px!important;
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        align-content:initial!important;
        overflow:visible!important;
      }
      #ccParticipantBoard{
        display:grid!important;
        grid-template-columns:minmax(0,1.38fr) minmax(340px,.82fr)!important;
        gap:12px!important;
        align-items:start!important;
        width:100%!important;
        min-width:0!important;
      }
      #ccParticipantBoard>.cc-participant-column{
        display:grid!important;
        grid-auto-rows:max-content!important;
        gap:12px!important;
        align-content:start!important;
        min-width:0!important;
      }
      body.participant-page .premium-main-grid,
      body.participant-page .premium-bottom-grid{display:none!important}
      body.participant-page .premium-card,
      body.participant-page .participant-extra-card{
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        align-self:start!important;
        margin:0!important;
      }
      body.participant-page .premium-profile-card,
      body.participant-page .premium-achievements-card,
      body.participant-page .premium-community-card,
      body.participant-page .premium-share-card{width:100%!important}

      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-hero-card{
        min-height:150px!important;
        border-radius:20px!important;
        border:1px solid rgba(232,182,77,.28)!important;
        box-shadow:0 18px 46px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.035)!important;
      }
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-card:not(.premium-hero-card){
        border-radius:16px!important;
        border:1px solid rgba(255,255,255,.085)!important;
        background:linear-gradient(155deg,rgba(15,17,26,.96),rgba(9,11,18,.97))!important;
        box-shadow:0 10px 28px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,255,.025)!important;
      }
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-card:not(.premium-hero-card):hover{
        transform:none!important;
        border-color:rgba(232,182,77,.20)!important;
        box-shadow:0 12px 32px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.03)!important;
      }

      body.participant-page .cc-participant-organizer{
        min-height:40px!important;
        padding:0 2px!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
        gap:10px!important;
      }
      body.participant-page .cc-participant-organizer-copy{gap:8px!important}
      body.participant-page .cc-participant-organizer-icon{
        width:28px!important;height:28px!important;flex-basis:28px!important;
        border-radius:8px!important;font-size:13px!important;
        border-color:rgba(232,182,77,.15)!important;
        background:rgba(232,182,77,.045)!important;
      }
      body.participant-page .cc-participant-organizer-copy b{font-size:10px!important;color:#ddd7e1!important}
      body.participant-page .cc-participant-organizer-copy small{font-size:8px!important;color:#77717e!important}
      body.participant-page .cc-participant-organizer-actions{gap:5px!important}
      body.participant-page .cc-participant-organizer .cc-organizer-btn{
        min-height:30px!important;
        padding:0 10px!important;
        border-radius:8px!important;
        border:1px solid rgba(255,255,255,.075)!important;
        background:rgba(255,255,255,.025)!important;
        color:#a9a3ae!important;
        font-size:8px!important;
        font-weight:800!important;
        letter-spacing:.02em!important;
      }
      body.participant-page .cc-participant-organizer .cc-organizer-btn:hover{
        color:#f4dda3!important;
        border-color:rgba(232,182,77,.25)!important;
        background:rgba(232,182,77,.055)!important;
      }
      body.participant-page .cc-participant-organizer .cc-organizer-btn.primary{
        color:#d9c287!important;
        border-color:rgba(232,182,77,.16)!important;
        background:rgba(232,182,77,.04)!important;
      }

      body.participant-page .cc-participant-collapsible{overflow:hidden!important}
      body.participant-page .cc-participant-collapsible:after,
      body.participant-page .cc-participant-collapsible.cc-is-collapsed:after{
        content:none!important;display:none!important
      }
      body.participant-page .cc-participant-section-head{
        min-height:50px!important;
        margin:0!important;
        padding:13px 54px 13px 17px!important;
        border-bottom:1px solid rgba(255,255,255,.065)!important;
        background:linear-gradient(90deg,rgba(255,255,255,.018),transparent 62%)!important;
      }
      body.participant-page .cc-participant-section-head .premium-section-title,
      body.participant-page .cc-participant-section-head.premium-section-title{
        margin:0!important;
      }
      body.participant-page .premium-section-title{
        font-size:11px!important;
        letter-spacing:.085em!important;
        line-height:1.25!important;
        color:#e8d298!important;
      }
      body.participant-page .premium-section-title .icon{font-size:16px!important}
      body.participant-page .cc-participant-collapse-toggle{
        right:12px!important;
        width:28px!important;
        height:28px!important;
        border-radius:8px!important;
        border:1px solid rgba(255,255,255,.08)!important;
        background:rgba(255,255,255,.025)!important;
        color:#aaa4af!important;
        box-shadow:none!important;
      }
      body.participant-page .cc-participant-collapse-toggle:hover{
        border-color:rgba(232,182,77,.25)!important;
        background:rgba(232,182,77,.055)!important;
        color:#f0cf78!important;
      }
      body.participant-page .cc-participant-collapse-toggle svg{width:11px!important;height:11px!important}
      body.participant-page .cc-participant-collapsible.cc-is-collapsed{
        opacity:.94!important;
        box-shadow:0 7px 18px rgba(0,0,0,.11)!important;
      }
      body.participant-page .cc-participant-collapsible.cc-is-collapsed>.cc-participant-collapse-body{display:none!important}
      body.participant-page .cc-participant-collapsible.cc-is-collapsed>.cc-participant-section-head{
        min-height:48px!important;
        margin:0!important;
        border-bottom:0!important;
        background:transparent!important;
      }

      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-profile-card{padding:0 18px 17px!important}
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-profile-card>.cc-participant-section-head{margin:0 -18px 14px!important}
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-achievements-card,
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-community-card,
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-share-card{padding:0 16px 16px!important}
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-achievements-card>.cc-participant-section-head,
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-community-card>.cc-participant-section-head,
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-share-card>.cc-participant-section-head{margin:0 -16px 14px!important}
      body.participant-page:has(.participant-dashboard:not([hidden])) .participant-extra-card>.cc-participant-section-head{margin-bottom:12px!important}

      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-profile-form{gap:11px 12px!important}
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-profile-form input,
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-profile-form select{min-height:40px!important}
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-profile-form textarea{min-height:92px!important}
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-photo-drop{
        border-radius:12px!important;
        border-color:rgba(255,255,255,.10)!important;
        background:rgba(5,7,13,.30)!important;
      }
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-save-row{
        padding-top:4px!important;
        border-top:1px solid rgba(255,255,255,.055)!important;
      }
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-save-row .btn{
        min-height:42px!important;
        padding-inline:16px!important;
      }

      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-achievements-card .participant-achievements{
        min-height:104px!important;
        height:auto!important;
        max-height:none!important;
      }
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-progress{gap:7px!important}
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-stat{
        padding:10px 6px!important;
        background:rgba(255,255,255,.018)!important;
        border-color:rgba(255,255,255,.065)!important;
      }
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-stat:hover{transform:none!important}

      body.participant-page:has(.participant-dashboard:not([hidden])) .participant-profile-gallery{margin:8px 0 4px!important}
      body.participant-page:has(.participant-dashboard:not([hidden])) .participant-extra-intro{margin:-1px 0 10px!important}
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-community-toolbar{gap:7px!important}
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-community-toolbar input{min-width:0!important}

      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-bottom-actions{
        margin:0!important;
        min-height:58px!important;
        padding:10px 12px!important;
        display:grid!important;
        grid-template-columns:minmax(0,1fr) auto auto!important;
        align-items:center!important;
        gap:8px!important;
        border:1px solid rgba(255,255,255,.075)!important;
        border-radius:14px!important;
        background:linear-gradient(135deg,rgba(14,16,24,.94),rgba(8,10,16,.96))!important;
        box-shadow:0 9px 24px rgba(0,0,0,.13)!important;
      }
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-bottom-actions .premium-public-hint{
        grid-column:1!important;
        grid-row:1!important;
        margin:0!important;
        padding:0 4px!important;
        font-size:9px!important;
      }
      body.participant-page:has(.participant-dashboard:not([hidden])) #participantPublicLink{grid-column:2!important;grid-row:1!important}
      body.participant-page:has(.participant-dashboard:not([hidden])) #participantShareProfile{grid-column:3!important;grid-row:1!important}
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-bottom-actions .btn{
        min-height:36px!important;
        border-radius:9px!important;
        white-space:nowrap!important;
      }

      body.participant-page .cc-participant-collapse-toggle:focus-visible,
      body.participant-page .cc-organizer-btn:focus-visible,
      body.participant-page .btn:focus-visible,
      body.participant-page input:focus-visible,
      body.participant-page textarea:focus-visible,
      body.participant-page select:focus-visible{
        outline:2px solid #e8b64d!important;
        outline-offset:2px!important;
      }

      @media(max-width:1100px){
        body.participant-page:has(.participant-dashboard:not([hidden])) .participant-shell{width:min(100% - 22px,1100px)!important}
        #ccParticipantBoard{grid-template-columns:1fr!important}
        #ccParticipantBoard>.cc-participant-column{gap:10px!important}
      }
      @media(max-width:720px){
        body.participant-page:has(.participant-dashboard:not([hidden])) .participant-shell{width:calc(100% - 14px)!important;padding:7px 0 16px!important}
        body.participant-page .cc-participant-organizer{align-items:center!important;flex-direction:row!important}
        body.participant-page .cc-participant-organizer-copy small{display:none!important}
        body.participant-page .cc-participant-organizer-actions{
          width:auto!important;
          display:flex!important;
          flex:1!important;
          justify-content:flex-end!important;
          flex-wrap:nowrap!important;
          overflow-x:auto!important;
          scrollbar-width:none!important;
        }
        body.participant-page .cc-participant-organizer-actions::-webkit-scrollbar{display:none!important}
        body.participant-page .cc-participant-organizer .cc-organizer-btn{padding:0 8px!important;white-space:nowrap!important}
        body.participant-page:has(.participant-dashboard:not([hidden])) .premium-profile-card{padding:0 13px 13px!important}
        body.participant-page:has(.participant-dashboard:not([hidden])) .premium-profile-card>.cc-participant-section-head{margin:0 -13px 12px!important}
        body.participant-page:has(.participant-dashboard:not([hidden])) .premium-achievements-card,
        body.participant-page:has(.participant-dashboard:not([hidden])) .premium-community-card,
        body.participant-page:has(.participant-dashboard:not([hidden])) .premium-share-card{padding:0 13px 13px!important}
        body.participant-page:has(.participant-dashboard:not([hidden])) .premium-achievements-card>.cc-participant-section-head,
        body.participant-page:has(.participant-dashboard:not([hidden])) .premium-community-card>.cc-participant-section-head,
        body.participant-page:has(.participant-dashboard:not([hidden])) .premium-share-card>.cc-participant-section-head{margin:0 -13px 12px!important}
        body.participant-page .cc-participant-section-head{padding-left:13px!important;padding-right:47px!important}
        body.participant-page .cc-participant-collapse-toggle{right:9px!important}
        body.participant-page:has(.participant-dashboard:not([hidden])) .premium-bottom-actions{
          grid-template-columns:1fr 1fr!important;
          padding:10px!important;
        }
        body.participant-page:has(.participant-dashboard:not([hidden])) .premium-bottom-actions .premium-public-hint{
          grid-column:1 / -1!important;grid-row:1!important;text-align:center!important;margin-bottom:2px!important
        }
        body.participant-page:has(.participant-dashboard:not([hidden])) #participantPublicLink{grid-column:1!important;grid-row:2!important}
        body.participant-page:has(.participant-dashboard:not([hidden])) #participantShareProfile{grid-column:2!important;grid-row:2!important}
        body.participant-page:has(.participant-dashboard:not([hidden])) .premium-bottom-actions .btn{width:100%!important;justify-content:center!important}
      }
      @media(max-width:440px){
        body.participant-page .cc-participant-organizer-copy b{display:none!important}
        body.participant-page .cc-participant-organizer-icon{width:30px!important;height:30px!important;flex-basis:30px!important}
        body.participant-page .cc-participant-organizer .cc-organizer-btn{font-size:7.5px!important;padding:0 7px!important}
      }
      @media(prefers-reduced-motion:reduce){
        body.participant-page *,body.participant-page *:before,body.participant-page *:after{
          scroll-behavior:auto!important;transition:none!important;animation:none!important
        }
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
    if (!content) return;
    let bar = q('#ccParticipantOrganizer');
    if (!bar) {
      const hero = q(':scope > .premium-hero-card', content);
      bar = document.createElement('div');
      bar.id = 'ccParticipantOrganizer';
      bar.className = 'cc-participant-organizer';
      if (hero) hero.insertAdjacentElement('afterend', bar); else content.prepend(bar);
      bar.addEventListener('click', (event) => {
        const button = event.target.closest('[data-cc-action]');
        if (!button) return;
        const list = panels();
        if (button.dataset.ccAction === 'collapse') list.forEach((panel) => setCollapsed(panel, true));
        if (button.dataset.ccAction === 'expand') list.forEach((panel) => setCollapsed(panel, false));
        if (button.dataset.ccAction === 'default') list.forEach((panel) => setCollapsed(panel, panel.dataset.ccDefaultOpen !== '1'));
      });
    }
    bar.innerHTML = `<div class="cc-participant-organizer-copy"><span class="cc-participant-organizer-icon">☷</span><div><b>Seu painel</b><small>Organize as seções</small></div></div><div class="cc-participant-organizer-actions"><button type="button" class="cc-organizer-btn primary" data-cc-action="collapse">− Recolher</button><button type="button" class="cc-organizer-btn" data-cc-action="expand">＋ Expandir</button><button type="button" class="cc-organizer-btn" data-cc-action="default">↺ Padrão</button></div>`;
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
