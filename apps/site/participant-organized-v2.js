(() => {
  'use strict';
  if (window.__CC_PARTICIPANT_ORGANIZED_V2__) return;
  window.__CC_PARTICIPANT_ORGANIZED_V2__ = true;

  const STORE = 'cosplaychess-participant-sections-v2';
  const enhanced = new WeakSet();
  let saved = {};
  let scanTimer = 0;

  try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { saved = {}; }

  const normalize = (value) => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const slug = (value) => normalize(value).replace(/\s+/g, '-').slice(0, 54) || 'secao';

  const save = () => {
    try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch {}
  };

  const titleText = (panel) => {
    const heading = panel.querySelector(':scope > .participant-extra-head h3, :scope > .premium-achievements-head h3, :scope > .participant-card-head h2, :scope > .participant-card-head h3, :scope > .premium-section-title, :scope > h2, :scope > h3');
    if (heading) return String(heading.textContent || '').trim();
    return String(panel.getAttribute('aria-label') || panel.dataset.title || '').trim();
  };

  const classify = (panel) => {
    if (panel.classList.contains('premium-profile-card') || panel.querySelector('#participantProfileForm')) return { key:'perfil', open:true, label:'Meu perfil público' };
    if (panel.classList.contains('premium-achievements-card') || panel.querySelector('#participantAchievements')) return { key:'conquistas', open:false, label:'Conquistas' };
    if (panel.classList.contains('premium-community-card')) return { key:'comunidade', open:false, label:'Comunidade & amigos' };
    if (panel.classList.contains('premium-share-card')) return { key:'jornada', open:false, label:'Compartilhe sua jornada' };
    if (panel.id === 'participantInterestsCard') return { key:'interesses', open:false, label:'Meus interesses' };
    if (panel.id === 'participantProfileGalleryCard') return { key:'galeria', open:false, label:'Fotos do meu perfil' };

    const text = normalize(`${titleText(panel)} ${panel.className || ''} ${panel.id || ''}`);
    if (/eventos? e particip|agenda cosplay|participacoes|participant agenda/.test(text)) return { key:'eventos', open:true, label:titleText(panel) || 'Eventos e participações' };
    if (/redes sociais|social links|social profile/.test(text)) return { key:'redes-sociais', open:false, label:titleText(panel) || 'Redes sociais' };
    if (/conquistas|badges|achievements/.test(text)) return { key:'conquistas-extra', open:false, label:titleText(panel) || 'Conquistas' };
    if (/qr publico|compartilhe seu perfil|qr card/.test(text)) return { key:'qr-perfil', open:false, label:titleText(panel) || 'QR do perfil' };
    if (/passaporte/.test(text)) return { key:'passaporte', open:false, label:titleText(panel) || 'Passaporte' };
    if (/preferencias|permissoes|privacidade|configuracoes/.test(text)) return { key:'preferencias', open:false, label:titleText(panel) || 'Preferências' };
    if (/perfil publico|preview|pre visual|pre-visual|rede social/.test(text)) return { key:`preview-${slug(titleText(panel))}`, open:false, label:titleText(panel) || 'Perfil público' };
    return { key:`secao-${slug(titleText(panel) || panel.id || [...panel.classList].join(' '))}`, open:false, label:titleText(panel) || 'Seção' };
  };

  const directHeader = (panel) => panel.querySelector(
    ':scope > .participant-extra-head, :scope > .premium-achievements-head, :scope > .participant-card-head, :scope > .participant-section-head, :scope > .agenda-head, :scope > .premium-section-title, :scope > h2, :scope > h3'
  );

  const icon = () => '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const setCollapsed = (panel, collapsed, persist = true) => {
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

  const markBody = (panel, head) => {
    [...panel.children].forEach((child) => {
      if (child === head) return;
      if (child.classList?.contains('cc-participant-collapse-toggle')) return;
      child.classList.add('cc-participant-collapse-body');
    });
  };

  const enhance = (panel) => {
    if (!(panel instanceof HTMLElement)) return;
    if (panel.matches('.premium-hero-card,[data-participant-dashboard],.participant-login,.participant-activation')) return;
    if (panel.closest('[hidden]') && !panel.closest('[data-participant-dashboard]')) return;

    const config = classify(panel);
    let head = directHeader(panel);
    if (!head) {
      head = document.createElement('div');
      head.className = 'cc-participant-synthetic-head';
      head.textContent = config.label;
      panel.prepend(head);
    }

    if (!enhanced.has(panel)) {
      enhanced.add(panel);
      panel.classList.add('cc-participant-collapsible');
      panel.dataset.ccSectionKey = config.key;
      panel.dataset.ccDefaultOpen = config.open ? '1' : '0';
      head.classList.add('cc-participant-section-head');

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cc-participant-collapse-toggle';
      button.innerHTML = icon();
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setCollapsed(panel, !panel.classList.contains('cc-is-collapsed'));
      });
      head.appendChild(button);

      head.addEventListener('click', (event) => {
        if (event.target.closest('button,a,input,select,textarea,label')) return;
        setCollapsed(panel, !panel.classList.contains('cc-is-collapsed'));
      });

      const open = Object.prototype.hasOwnProperty.call(saved, config.key) ? !!saved[config.key] : config.open;
      setCollapsed(panel, !open, false);
    }

    markBody(panel, head);
  };

  const candidateFromHeading = (heading) => {
    const text = normalize(heading.textContent);
    if (!/(eventos?|particip|agenda|redes sociais|conquistas|badges|qr|passaporte|preferencias|permissoes|privacidade|perfil publico|fotos do meu perfil|interesses|comunidade|jornada)/.test(text)) return null;
    const candidate = heading.closest('.premium-card,.participant-card,.participant-extra-card,section,article,[class*="panel"]');
    if (!candidate || candidate.matches('.premium-hero-card,[data-participant-dashboard],.participant-login,.participant-activation')) return null;
    return candidate;
  };

  const ensureToolbar = () => {
    const content = document.getElementById('participantDashboardContent');
    if (!content || document.getElementById('ccParticipantOrganizer')) return;
    const hero = content.querySelector(':scope > .premium-hero-card');
    const bar = document.createElement('div');
    bar.id = 'ccParticipantOrganizer';
    bar.className = 'cc-participant-organizer';
    bar.innerHTML = `<div class="cc-participant-organizer-copy"><span class="cc-participant-organizer-icon">☷</span><div><b>Organizar painel</b><small>Abra só o que estiver usando. O painel lembra suas escolhas.</small></div></div><div class="cc-participant-organizer-actions"><button type="button" class="cc-organizer-btn primary" data-cc-action="collapse">Recolher</button><button type="button" class="cc-organizer-btn" data-cc-action="expand">Expandir tudo</button><button type="button" class="cc-organizer-btn" data-cc-action="default">Padrão</button></div>`;
    if (hero) hero.insertAdjacentElement('afterend', bar); else content.prepend(bar);

    bar.addEventListener('click', (event) => {
      const button = event.target.closest('[data-cc-action]');
      if (!button) return;
      const panels = [...document.querySelectorAll('#participantDashboardContent .cc-participant-collapsible, [data-participant-dashboard] .cc-participant-collapsible')];
      if (button.dataset.ccAction === 'collapse') panels.forEach((panel) => setCollapsed(panel, true));
      if (button.dataset.ccAction === 'expand') panels.forEach((panel) => setCollapsed(panel, false));
      if (button.dataset.ccAction === 'default') {
        panels.forEach((panel) => {
          const open = panel.dataset.ccDefaultOpen === '1';
          setCollapsed(panel, !open);
        });
      }
    });
  };

  const scan = () => {
    ensureToolbar();
    const dashboard = document.querySelector('[data-participant-dashboard]');
    if (!dashboard) return;

    const panels = new Set(dashboard.querySelectorAll('.premium-card:not(.premium-hero-card), .participant-extra-card'));
    dashboard.querySelectorAll('h2,h3,.section-kicker,.premium-section-title').forEach((heading) => {
      const panel = candidateFromHeading(heading);
      if (panel) panels.add(panel);
    });
    panels.forEach(enhance);
  };

  const scheduleScan = () => {
    clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scan, 70);
  };

  const start = () => {
    scan();
    setTimeout(scan, 350);
    setTimeout(scan, 900);
    setTimeout(scan, 1800);
    const dashboard = document.querySelector('[data-participant-dashboard]');
    if (dashboard) new MutationObserver(scheduleScan).observe(dashboard, { childList:true, subtree:true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
