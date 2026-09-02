(() => {
  'use strict';
  if (window.__CC_PARTICIPANT_ORGANIZED_V3__) return;
  window.__CC_PARTICIPANT_ORGANIZED_V3__ = true;

  const STORE = 'cosplaychess-participant-sections-v3';
  const ready = new WeakSet();
  let saved = {};
  let scanTimer = 0;

  try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { saved = {}; }

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const normalize = (value) => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const slug = (value) => normalize(value).replace(/\s+/g, '-').slice(0, 54);
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch {} };

  const injectFixes = () => {
    if (q('#ccParticipantOrganizedV3Style')) return;
    const style = document.createElement('style');
    style.id = 'ccParticipantOrganizedV3Style';
    style.textContent = `
      body.participant-page:has(.participant-dashboard:not([hidden])) .participant-premium-content{
        height:auto!important;min-height:0!important;max-height:none!important;
        grid-template-rows:auto!important;grid-auto-rows:auto!important;
        align-content:start!important;overflow:visible!important;
      }
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-main-grid,
      body.participant-page:has(.participant-dashboard:not([hidden])) .premium-bottom-grid{
        height:auto!important;min-height:0!important;max-height:none!important;
        grid-auto-rows:max-content!important;align-items:start!important;overflow:visible!important;
      }
      body.participant-page .premium-main-grid>.cc-participant-column{
        display:grid!important;grid-auto-rows:max-content!important;align-content:start!important;
        gap:14px!important;min-width:0!important;
      }
      body.participant-page .premium-card,
      body.participant-page .participant-extra-card{
        height:auto!important;min-height:0!important;max-height:none!important;align-self:start!important;
      }
      body.participant-page .cc-participant-collapsible.cc-is-collapsed{
        height:auto!important;min-height:0!important;max-height:none!important;
        padding-top:0!important;padding-bottom:0!important;overflow:hidden!important;
      }
      body.participant-page .cc-participant-collapsible.cc-is-collapsed>.cc-participant-section-head{
        min-height:44px!important;margin-top:0!important;margin-bottom:0!important;border-bottom:0!important;
      }
      body.participant-page .cc-participant-collapsible.cc-is-collapsed>.cc-participant-collapse-body{display:none!important}
      body.participant-page .cc-participant-synthetic-head{display:none!important}
      @media(min-width:1101px){
        body.participant-page .premium-main-grid{
          display:grid!important;grid-template-columns:minmax(0,1.48fr) minmax(340px,.72fr)!important;
          gap:14px!important;align-items:start!important;
        }
      }
      @media(max-width:1100px){
        body.participant-page .premium-main-grid{grid-template-columns:1fr!important}
        body.participant-page .premium-main-grid>.cc-participant-column{gap:10px!important}
      }
    `;
    document.head.appendChild(style);
  };

  const titleText = (panel) => {
    const heading = panel.querySelector(
      ':scope > .participant-extra-head h3, :scope > .premium-achievements-head h3, :scope > .participant-card-head h2, :scope > .participant-card-head h3, :scope > .premium-section-title, :scope > h2, :scope > h3'
    );
    return String(heading?.textContent || panel.getAttribute('aria-label') || panel.dataset.title || '').trim();
  };

  const configFor = (panel) => {
    if (panel.classList.contains('premium-profile-card')) return { key:'perfil', open:true };
    if (panel.classList.contains('premium-achievements-card')) return { key:'conquistas', open:false };
    if (panel.classList.contains('premium-community-card')) return { key:'comunidade', open:false };
    if (panel.classList.contains('premium-share-card')) return { key:'jornada', open:false };
    if (panel.id === 'participantInterestsCard') return { key:'interesses', open:false };
    if (panel.id === 'participantProfileGalleryCard') return { key:'galeria', open:false };
    if (panel.classList.contains('participant-extra-card')) {
      const title = titleText(panel);
      if (!title) return null;
      const key = slug(title);
      if (!key) return null;
      return { key:`extra-${key}`, open:false };
    }
    return null;
  };

  const isRealPanel = (panel) => !!configFor(panel) && !!panel.closest('[data-participant-dashboard]');

  const directHeader = (panel) => panel.querySelector(
    ':scope > .participant-extra-head, :scope > .premium-achievements-head, :scope > .participant-card-head, :scope > .participant-section-head, :scope > .agenda-head, :scope > .premium-section-title, :scope > h2, :scope > h3'
  );

  const icon = () => '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const setCollapsed = (panel, collapsed, persist = true) => {
    if (!isRealPanel(panel)) return;
    panel.classList.toggle('cc-is-collapsed', collapsed);
    panel.dataset.ccCollapsed = collapsed ? '1' : '0';
    const button = panel.querySelector(':scope > .cc-participant-section-head .cc-participant-collapse-toggle');
    if (button) {
      button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      button.setAttribute('aria-label', collapsed ? 'Expandir seção' : 'Recolher seção');
      button.title = collapsed ? 'Expandir' : 'Recolher';
    }
    if (persist && panel.dataset.ccSectionKey) {
      saved[panel.dataset.ccSectionKey] = !collapsed;
      save();
    }
  };

  const clearLegacyArtifacts = () => {
    qa('.cc-participant-synthetic-head').forEach((head) => head.remove());
    qa('#participantDashboardContent .cc-participant-collapsible').forEach((panel) => {
      if (isRealPanel(panel)) return;
      panel.classList.remove('cc-participant-collapsible','cc-is-collapsed');
      delete panel.dataset.ccCollapsed;
      delete panel.dataset.ccSectionKey;
      delete panel.dataset.ccDefaultOpen;
      panel.querySelectorAll(':scope > .cc-participant-section-head > .cc-participant-collapse-toggle').forEach((b) => b.remove());
      panel.querySelectorAll(':scope > .cc-participant-collapse-body').forEach((el) => el.classList.remove('cc-participant-collapse-body'));
      panel.querySelectorAll(':scope > .cc-participant-section-head').forEach((el) => el.classList.remove('cc-participant-section-head'));
    });
  };

  const markBody = (panel, head) => {
    [...panel.children].forEach((child) => child.classList?.remove('cc-participant-collapse-body'));
    [...panel.children].forEach((child) => {
      if (child !== head) child.classList?.add('cc-participant-collapse-body');
    });
  };

  const enhance = (panel) => {
    if (!(panel instanceof HTMLElement)) return;
    const config = configFor(panel);
    if (!config) return;
    const head = directHeader(panel);
    if (!head) return;

    panel.classList.add('cc-participant-collapsible');
    panel.dataset.ccSectionKey = config.key;
    panel.dataset.ccDefaultOpen = config.open ? '1' : '0';
    head.classList.add('cc-participant-section-head');
    markBody(panel, head);

    let button = head.querySelector(':scope > .cc-participant-collapse-toggle');
    head.querySelectorAll(':scope > .cc-participant-collapse-toggle').forEach((item, index) => { if (index > 0) item.remove(); });

    if (!ready.has(panel)) {
      ready.add(panel);
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'cc-participant-collapse-toggle';
        button.innerHTML = icon();
        head.appendChild(button);
      }
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

  const arrangeMainColumns = () => {
    const main = q('#participantDashboardContent .premium-main-grid');
    if (!main) return;
    let left = q(':scope > .cc-participant-column-left', main);
    let right = q(':scope > .cc-participant-column-right', main);
    if (!left) {
      left = document.createElement('div');
      left.className = 'cc-participant-column cc-participant-column-left';
      main.prepend(left);
    }
    if (!right) {
      right = document.createElement('div');
      right.className = 'cc-participant-column cc-participant-column-right';
      main.append(right);
    }

    const profile = q('.premium-profile-card', main);
    const gallery = q('#participantProfileGalleryCard', main);
    const interests = q('#participantInterestsCard', main);
    const achievements = q('.premium-achievements-card', main);

    [profile, gallery].filter(Boolean).forEach((card) => { if (card.parentElement !== left) left.appendChild(card); });
    [interests, achievements].filter(Boolean).forEach((card) => { if (card.parentElement !== right) right.appendChild(card); });
  };

  const panels = () => {
    const dashboard = q('[data-participant-dashboard]');
    if (!dashboard) return [];
    return qa('.premium-profile-card,.premium-achievements-card,.premium-community-card,.premium-share-card,.participant-extra-card', dashboard)
      .filter((panel, index, arr) => arr.indexOf(panel) === index && isRealPanel(panel));
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

  const scan = () => {
    injectFixes();
    clearLegacyArtifacts();
    ensureToolbar();
    arrangeMainColumns();
    panels().forEach(enhance);
  };

  const scheduleScan = () => {
    clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scan, 90);
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
