(() => {
  'use strict';
  if (window.__CC_PARTICIPANT_CONCEPT_V7__) return;
  window.__CC_PARTICIPANT_CONCEPT_V7__ = true;

  const STORE = 'cosplaychess-participant-sections-v7';
  const ready = new WeakSet();
  let saved = {};
  let scanTimer = 0;

  try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { saved = {}; }

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch {} };

  const configFor = (panel) => {
    if (panel?.classList?.contains('premium-profile-card')) return { key:'perfil', open:true };
    if (panel?.classList?.contains('premium-achievements-card')) return { key:'conquistas', open:true };
    if (panel?.classList?.contains('premium-community-card')) return { key:'comunidade', open:true };
    if (panel?.classList?.contains('premium-share-card')) return { key:'jornada', open:true };
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

  const setSubtitle = (head, text) => {
    if (!head || q('.cc-v7-section-subtitle', head)) return;
    const subtitle = document.createElement('span');
    subtitle.className = 'cc-v7-section-subtitle';
    subtitle.textContent = text;
    head.appendChild(subtitle);
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

    if (panel.classList.contains('premium-profile-card')) setSubtitle(head, 'Veja como o público verá seu perfil no site do evento.');
    if (panel.classList.contains('premium-achievements-card')) setSubtitle(head, 'Seus feitos e sua evolução no CosplayChess.');
    if (panel.classList.contains('premium-community-card')) setSubtitle(head, 'Conecte-se com outros participantes.');
    if (panel.classList.contains('premium-share-card')) setSubtitle(head, 'Mostre sua participação e convide mais fãs.');

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

    const open = Object.prototype.hasOwnProperty.call(saved, config.key) ? !!saved[config.key] : config.open;
    setCollapsed(panel, !open, false);
  };

  const ensurePageIntro = () => {
    const content = q('#participantDashboardContent');
    if (!content) return;
    if (q('#ccParticipantPageIntro', content)) return;
    const intro = document.createElement('section');
    intro.id = 'ccParticipantPageIntro';
    intro.className = 'cc-v7-page-intro';
    intro.innerHTML = '<div><span>SEU ESPAÇO NO EVENTO</span><h1>Área do Participante</h1><p>Gerencie seu perfil, acompanhe suas conquistas e compartilhe sua jornada.</p></div>';
    content.prepend(intro);
  };

  const ensureSummary = () => {
    const hero = q('#participantDashboardContent > .premium-hero-card');
    if (!hero || q('.cc-v7-summary', hero)) return;

    const identity = q('.premium-identity', hero);
    const eventBox = q('.premium-event', hero);
    const eventLabel = eventBox ? q(':scope > .premium-label', eventBox) : null;
    const eventTitle = q('#participantHeroEvent', hero);
    const characterLine = q('.premium-character-line', hero);
    const picker = q('#participantProfilePickerWrap', hero);
    const logout = q('#participantLogout', hero);
    const backdrop = q('#participantHeroBackdrop', hero);

    const summary = document.createElement('div');
    summary.className = 'cc-v7-summary';

    const identityCell = document.createElement('div');
    identityCell.className = 'cc-v7-summary-identity';
    if (identity) identityCell.appendChild(identity);

    const eventCell = document.createElement('div');
    eventCell.className = 'cc-v7-summary-cell';
    eventCell.innerHTML = '<span class="cc-v7-summary-icon" aria-hidden="true">▣</span><div class="cc-v7-summary-copy"></div>';
    const eventCopy = q('.cc-v7-summary-copy', eventCell);
    if (eventLabel) eventCopy.appendChild(eventLabel);
    if (eventTitle) eventCopy.appendChild(eventTitle);

    const characterCell = document.createElement('div');
    characterCell.className = 'cc-v7-summary-cell';
    characterCell.innerHTML = '<span class="cc-v7-summary-icon" aria-hidden="true">♟</span><div class="cc-v7-summary-copy"></div>';
    const characterCopy = q('.cc-v7-summary-copy', characterCell);
    if (characterLine) characterCopy.appendChild(characterLine);

    const statusCell = document.createElement('div');
    statusCell.className = 'cc-v7-summary-cell cc-v7-status-cell';
    statusCell.innerHTML = '<span class="cc-v7-summary-icon" aria-hidden="true">◇</span><div class="cc-v7-summary-copy"><span class="premium-label">Status</span><b id="ccV7StatusTitle">Perfil ativo</b><small id="ccV7StatusText">Acesso do participante liberado</small></div>';

    const actions = document.createElement('div');
    actions.className = 'cc-v7-summary-actions';
    if (picker) actions.appendChild(picker);
    if (logout) actions.appendChild(logout);

    summary.append(identityCell, eventCell, characterCell, statusCell, actions);
    if (backdrop) backdrop.insertAdjacentElement('afterend', summary);
    else hero.appendChild(summary);
    q('.premium-hero-divider', hero)?.remove();
    if (eventBox) eventBox.remove();
  };

  const ensureOrganizer = () => {
    const content = q('#participantDashboardContent');
    if (!content) return null;
    let bar = q('#ccParticipantOrganizer', content);
    if (!bar) {
      bar = document.createElement('section');
      bar.id = 'ccParticipantOrganizer';
      bar.className = 'cc-v7-organizer';
      bar.innerHTML = `
        <div class="cc-v7-organizer-copy"><span aria-hidden="true">♛</span><div><b>Organizar painel</b><small>Escolha quais áreas quer manter abertas.</small></div></div>
        <div class="cc-v7-organizer-controls">
          <button type="button" class="cc-organizer-btn" data-cc-action="collapse">Recolher tudo</button>
          <button type="button" class="cc-organizer-btn" data-cc-action="expand">Expandir tudo</button>
          <button type="button" class="cc-organizer-btn" data-cc-action="default">Restaurar padrão</button>
        </div>
        <button type="button" class="cc-v7-organizer-toggle" data-cc-toggle>Mostrar controles <span>⌄</span></button>`;
      bar.addEventListener('click', (event) => {
        const toggle = event.target.closest('[data-cc-toggle]');
        if (toggle) {
          const open = bar.classList.toggle('cc-v7-organizer-open');
          toggle.innerHTML = `${open ? 'Ocultar' : 'Mostrar'} controles <span>${open ? '⌃' : '⌄'}</span>`;
          return;
        }
        const button = event.target.closest('[data-cc-action]');
        if (!button) return;
        const list = panels();
        if (button.dataset.ccAction === 'collapse') list.forEach((panel) => setCollapsed(panel, true));
        if (button.dataset.ccAction === 'expand') list.forEach((panel) => setCollapsed(panel, false));
        if (button.dataset.ccAction === 'default') list.forEach((panel) => setCollapsed(panel, panel.dataset.ccDefaultOpen !== '1'));
      });
    }
    return bar;
  };

  const ensureLayout = () => {
    const content = q('#participantDashboardContent');
    const hero = q(':scope > .premium-hero-card', content);
    if (!content || !hero) return null;

    let main = q('#ccParticipantMain', content);
    if (!main) {
      main = document.createElement('div');
      main.id = 'ccParticipantMain';
      main.className = 'cc-v7-main';
      main.innerHTML = `
        <div class="cc-v7-main-left">
          <div id="ccParticipantProfileZone"></div>
          <div id="ccParticipantLower" class="cc-v7-lower"></div>
        </div>
        <aside id="ccParticipantAchievementZone" class="cc-v7-main-right"></aside>`;
      hero.insertAdjacentElement('afterend', main);
    }

    let extras = q('#ccParticipantExtras', content);
    if (!extras) {
      extras = document.createElement('div');
      extras.id = 'ccParticipantExtras';
      extras.className = 'cc-v7-extras';
      main.insertAdjacentElement('afterend', extras);
    }

    const organizer = ensureOrganizer();
    if (organizer && organizer.previousElementSibling !== extras) extras.insertAdjacentElement('afterend', organizer);

    const actions = q('.premium-bottom-actions', content);
    if (actions && organizer && actions.previousElementSibling !== organizer) organizer.insertAdjacentElement('afterend', actions);

    return { main, extras };
  };

  const ensureProfilePreview = () => {
    const card = q('.premium-profile-card');
    const form = q('#participantProfileForm', card || document);
    if (!card || !form) return;
    const head = directHeader(card);
    if (!head) return;

    let edit = q('.cc-v7-edit-button', head);
    if (!edit) {
      edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'cc-v7-edit-button';
      edit.innerHTML = '✎ <span>Editar perfil</span>';
      const toggle = q('.cc-participant-collapse-toggle', head);
      if (toggle) head.insertBefore(edit, toggle);
      else head.appendChild(edit);
      edit.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setCollapsed(card, false);
        const editing = card.classList.toggle('cc-v7-editing');
        edit.innerHTML = editing ? '× <span>Fechar edição</span>' : '✎ <span>Editar perfil</span>';
        if (editing) window.setTimeout(() => form.querySelector('input,textarea')?.focus({preventScroll:true}), 50);
      });
    }

    let preview = q('#ccParticipantProfilePreview', card);
    if (!preview) {
      preview = document.createElement('div');
      preview.id = 'ccParticipantProfilePreview';
      preview.className = 'cc-v7-profile-preview cc-participant-collapse-body';
      preview.innerHTML = `
        <div class="cc-v7-profile-visual">
          <div id="ccV7ProfileCover" class="cc-v7-profile-cover"><span>Adicione uma foto do seu cosplay</span></div>
          <div id="ccV7ProfileAvatar" class="cc-v7-profile-avatar">♜</div>
        </div>
        <div class="cc-v7-profile-details">
          <div class="cc-v7-profile-name-row"><h4 id="ccV7DisplayName">Participante</h4><span class="cc-v7-verified">◆</span></div>
          <p id="ccV7Bio">Conte um pouco sobre você para completar seu perfil público.</p>
          <div class="cc-v7-tags"><span id="ccV7Character">Personagem</span><span id="ccV7Event">Evento CosplayChess</span></div>
        </div>
        <div class="cc-v7-profile-stats">
          <div><b id="ccV7Friends">0</b><span>Amigos</span></div>
          <div><b id="ccV7Achievements">0</b><span>Conquistas</span></div>
          <div><b id="ccV7Events">0</b><span>Eventos</span></div>
          <div><b id="ccV7Photos">0</b><span>Fotos</span></div>
        </div>`;
      form.insertAdjacentElement('beforebegin', preview);
    }

    form.classList.add('cc-v7-edit-panel');
  };

  const syncProfilePreview = () => {
    const form = q('#participantProfileForm');
    const preview = q('#ccParticipantProfilePreview');
    if (!form || !preview) return;

    const display = String(form.elements.namedItem('display_name')?.value || q('#participantName')?.textContent || 'Participante').trim() || 'Participante';
    const character = String(form.elements.namedItem('character_name')?.value || q('#participantHeroCharacter')?.textContent || 'Personagem').trim() || 'Personagem';
    const bio = String(form.elements.namedItem('bio')?.value || '').trim();
    const event = String(q('#participantHeroEvent')?.textContent || 'Evento CosplayChess').trim() || 'Evento CosplayChess';

    const put = (id, value) => { const el = q(`#${id}`); if (el && el.textContent !== String(value)) el.textContent = String(value); };
    put('ccV7DisplayName', display);
    put('ccV7Character', character);
    put('ccV7Event', event);
    put('ccV7Bio', bio || 'Conte um pouco sobre você para completar seu perfil público.');
    put('ccV7Friends', q('#participantFriendCount')?.textContent || '0');
    put('ccV7Achievements', q('#participantAchievementCount')?.textContent || '0');
    put('ccV7Events', q('#participantProgressEvents')?.textContent || '0');
    put('ccV7Photos', String(qa('#participantProfileGallery .participant-gallery-item').length));

    const greeting = q('#participantGreeting');
    if (greeting && greeting.textContent.trim() !== display) greeting.innerHTML = `<strong>${display.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong>`;

    const source = q('#participantPhotoPreview img') || q('#participantHeroAvatar img');
    const cover = q('#ccV7ProfileCover');
    const avatar = q('#ccV7ProfileAvatar');
    const src = source?.src || '';
    if (cover) {
      if (src) {
        if (cover.dataset.src !== src) {
          cover.dataset.src = src;
          cover.replaceChildren();
          const img = document.createElement('img');
          img.src = src; img.alt = 'Foto do cosplay';
          cover.appendChild(img);
        }
      } else if (!cover.querySelector('span')) {
        cover.dataset.src = '';
        cover.innerHTML = '<span>Adicione uma foto do seu cosplay</span>';
      }
    }
    if (avatar) {
      if (src) {
        if (avatar.dataset.src !== src) {
          avatar.dataset.src = src;
          avatar.replaceChildren();
          const img = document.createElement('img');
          img.src = src; img.alt = '';
          avatar.appendChild(img);
        }
      } else if (avatar.textContent !== '♜') {
        avatar.dataset.src = '';
        avatar.textContent = '♜';
      }
    }
  };

  const bindPreviewSources = () => {
    const form = q('#participantProfileForm');
    if (form && !form.dataset.ccV7Bound) {
      form.dataset.ccV7Bound = '1';
      form.addEventListener('input', () => window.requestAnimationFrame(syncProfilePreview));
      form.addEventListener('change', () => window.requestAnimationFrame(syncProfilePreview));
    }

    [q('#participantHeroEvent'), q('#participantFriendCount'), q('#participantAchievementCount'), q('#participantProgressEvents'), q('#participantPhotoPreview')]
      .filter(Boolean)
      .forEach((el) => {
        if (el.dataset?.ccV7Observed) return;
        if (el.dataset) el.dataset.ccV7Observed = '1';
        new MutationObserver(() => window.requestAnimationFrame(syncProfilePreview)).observe(el, {childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['src']});
      });

    const gallery = q('#participantProfileGallery');
    if (gallery && !gallery.dataset.ccV7Observed) {
      gallery.dataset.ccV7Observed = '1';
      new MutationObserver(() => window.requestAnimationFrame(syncProfilePreview)).observe(gallery, {childList:true,subtree:true});
    }
  };

  const arrange = () => {
    const layout = ensureLayout();
    if (!layout) return;
    const profileZone = q('#ccParticipantProfileZone');
    const lower = q('#ccParticipantLower');
    const achievementZone = q('#ccParticipantAchievementZone');
    const extras = q('#ccParticipantExtras');
    const dashboard = q('[data-participant-dashboard]');
    if (!profileZone || !lower || !achievementZone || !extras || !dashboard) return;

    const profile = q('.premium-profile-card', dashboard);
    const achievements = q('.premium-achievements-card', dashboard);
    const community = q('.premium-community-card', dashboard);
    const share = q('.premium-share-card', dashboard);
    const gallery = q('#participantProfileGalleryCard', dashboard);
    const interests = q('#participantInterestsCard', dashboard);

    if (profile && profile.parentElement !== profileZone) profileZone.appendChild(profile);
    if (achievements && achievements.parentElement !== achievementZone) achievementZone.appendChild(achievements);
    [community, share].filter(Boolean).forEach((card) => { if (card.parentElement !== lower) lower.appendChild(card); });
    [gallery, interests].filter(Boolean).forEach((card) => { if (card.parentElement !== extras) extras.appendChild(card); });
  };

  const cleanupLegacy = () => {
    q('#ccParticipantOrganizedV4Style')?.remove();
    q('#ccParticipantOrganizedV5Style')?.remove();
    qa('.cc-participant-synthetic-head').forEach((el) => el.remove());
    const content = q('#participantDashboardContent');
    const oldBoard = q('#ccParticipantBoard', content || document);
    if (oldBoard && content) {
      qa(':scope > .cc-participant-column > *', oldBoard).forEach((child) => content.appendChild(child));
      oldBoard.remove();
    }
    const oldOrganizer = q('.cc-participant-organizer', content || document);
    if (oldOrganizer && oldOrganizer.id !== 'ccParticipantOrganizer') oldOrganizer.remove();
  };

  const scan = () => {
    cleanupLegacy();
    ensurePageIntro();
    ensureSummary();
    arrange();
    panels().forEach(enhance);
    ensureProfilePreview();
    bindPreviewSources();
    syncProfilePreview();
  };

  const scheduleScan = () => {
    clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scan, 120);
  };

  const start = () => {
    scan();
    [250,700,1400,2600,4200].forEach((ms) => window.setTimeout(scan, ms));
    const dashboard = q('[data-participant-dashboard]');
    if (dashboard) new MutationObserver(scheduleScan).observe(dashboard, {childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
