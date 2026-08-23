(() => {
  if (window.__cosplayAutoLineupSettingsLoaded) return;
  window.__cosplayAutoLineupSettingsLoaded = true;

  const STYLE_ID = 'cosplay-settings-v3-style';
  const PIECE_TYPES = ['P','T','C','B','Q','K'];
  const TYPE_LABEL = { P: 'PEÃO', T: 'TORRE', C: 'CAVALO', B: 'BISPO', Q: 'RAINHA', K: 'REI' };

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const norm = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  function roster() {
    try { return Array.isArray(store?.g?.roster) ? store.g.roster : []; }
    catch (_) { return []; }
  }

  function isNoPreference(value) {
    const v = norm(value);
    return !v || v === 'sem preferencia' || v === 'sem preferencia de peca' || v === 'qualquer' || v === 'qualquer peca' || v === 'indiferente';
  }

  function pieceTypeFromPreference(value) {
    const v = norm(value);
    if (!v || isNoPreference(v)) return '';
    if (/\b(peao|peoes|infantaria|pawn|p)\b/.test(v)) return 'P';
    if (/\b(torre|torres|rook|t)\b/.test(v)) return 'T';
    if (/\b(cavalo|cavalaria|cavalos|knight|horse|c)\b/.test(v)) return 'C';
    if (/\b(bispo|bispos|bishop|b)\b/.test(v)) return 'B';
    if (/\b(rainha|dama|queen|q)\b/.test(v)) return 'Q';
    if (/\b(rei|king|k)\b/.test(v)) return 'K';
    if (v.startsWith('pe')) return 'P';
    if (v.startsWith('to')) return 'T';
    if (v.startsWith('ca')) return 'C';
    if (v.startsWith('bi')) return 'B';
    if (v.startsWith('ra') || v.startsWith('da')) return 'Q';
    if (v.startsWith('re')) return 'K';
    return '';
  }

  function sideFromPreference(value) {
    const v = norm(value);
    if (!v || isNoPreference(v)) return '';
    if (v.includes('branc') || v === 'b' || v === 'white') return 'B';
    if (v.includes('pret') || v === 'p' || v === 'black') return 'P';
    return '';
  }

  function participantMusic(person) {
    const music = person?.music && typeof person.music === 'object' ? person.music : {};
    const url = person?.musicFileUrl || music.fileUrl || person?.musicUrl || music.url || '';
    const name = person?.musicName || music.name || '';
    return { url, name };
  }

  function resetPieceAudio(id) {
    try {
      if (typeof stopPiecePlayback === 'function') stopPiecePlayback(id, false);
      if (typeof pieceSoundAudios !== 'undefined' && pieceSoundAudios[id]) {
        try { pieceSoundAudios[id].pause(); } catch (_) {}
        delete pieceSoundAudios[id];
      }
    } catch (_) {}
  }

  function clearManagedAssignment(pieceId) {
    if (!store.p[pieceId]) store.p[pieceId] = {};
    const piece = store.p[pieceId];
    if (piece.rosterManagedName) delete piece.name;
    if (piece.rosterManagedImg) delete piece.img;
    if (piece.rosterManagedPhotoCrop) delete piece.photoCrop;
    if (piece.rosterManagedSound) {
      delete piece.sound;
      delete piece.soundName;
      delete piece.soundSource;
      resetPieceAudio(pieceId);
    }
    delete piece.participantId;
    delete piece.participant;
    delete piece.participantRealName;
    delete piece.rosterManagedName;
    delete piece.rosterManagedImg;
    delete piece.rosterManagedPhotoCrop;
    delete piece.rosterManagedSound;
    delete piece.autoLineupReason;
  }

  function assignToPiece(pieceId, person, reason) {
    if (!store.p[pieceId]) store.p[pieceId] = {};
    const target = store.p[pieceId];
    const character = String(person.character || person.name || TYPE_LABEL[pieceId.charAt(0)] || pieceId).trim();

    target.name = character;
    target.participantRealName = person.name || '';
    target.participantId = person.id;
    target.participant = { ...person };
    target.rosterManagedName = true;
    target.autoLineupReason = reason;

    if (person.photo) {
      target.img = person.photo;
      target.rosterManagedImg = true;
      target.photoCrop = typeof window.normalizePiecePhotoCrop === 'function'
        ? window.normalizePiecePhotoCrop(person.photoCrop)
        : (person.photoCrop ? { ...person.photoCrop } : { x: 50, y: 50, zoom: 1 });
      target.rosterManagedPhotoCrop = true;
    } else {
      delete target.img;
      delete target.rosterManagedImg;
      if (target.rosterManagedPhotoCrop) delete target.photoCrop;
      delete target.rosterManagedPhotoCrop;
    }

    const music = participantMusic(person);
    if (music.url) {
      target.sound = music.url;
      target.soundName = music.name || 'Música da inscrição';
      target.soundSource = 'registration';
      target.rosterManagedSound = true;
      resetPieceAudio(pieceId);
    } else {
      delete target.sound;
      delete target.soundName;
      delete target.soundSource;
      delete target.rosterManagedSound;
      resetPieceAudio(pieceId);
    }
    if (target.volume === undefined) target.volume = 0.8;
  }

  function allPieceIds() {
    try {
      if (typeof getInitialBoard === 'function') return getInitialBoard().filter(Boolean);
    } catch (_) {}
    return [
      'T1_P','C1_P','B1_P','Q1_P','K1_P','B2_P','C2_P','T2_P',
      'P1_P','P2_P','P3_P','P4_P','P5_P','P6_P','P7_P','P8_P',
      'P1_B','P2_B','P3_B','P4_B','P5_B','P6_B','P7_B','P8_B',
      'T1_B','C1_B','B1_B','Q1_B','K1_B','B2_B','C2_B','T2_B'
    ];
  }

  function candidatesFor(person, available, type) {
    if (!type) return [];
    const side = sideFromPreference(person.team);
    const exact = available.filter(id => id.charAt(0) === type && (!side || id.endsWith('_' + side)));
    if (exact.length) return exact;
    // Se o lado preferido lotou, mantém a preferência de peça e libera o outro lado antes de abandonar o tipo.
    return available.filter(id => id.charAt(0) === type);
  }

  function chooseFreePiece(person, available) {
    const side = sideFromPreference(person.team);
    if (side) {
      const sameSide = available.filter(id => id.endsWith('_' + side));
      if (sameSide.length) return sameSide[0];
    }
    return available[0] || '';
  }

  function countPreferences(people) {
    const stats = { first: 0, second: 0, free: 0 };
    people.forEach(person => {
      if (pieceTypeFromPreference(person.preferredPiece)) stats.first += 1;
      if (pieceTypeFromPreference(person.secondPreferredPiece)) stats.second += 1;
      if (isNoPreference(person.preferredPiece)) stats.free += 1;
    });
    return stats;
  }

  function buildAutomaticLineup() {
    const people = roster();
    if (!people.length) {
      showNotice('Importe primeiro o JSON exportado pelo site.', true);
      return;
    }

    const pieceIds = allPieceIds();
    const capacity = pieceIds.length;

    // Restaura as casas para a posição inicial e limpa somente dados gerenciados pelo elenco.
    try { if (typeof getInitialBoard === 'function') store.board = getInitialBoard(); } catch (_) {}
    pieceIds.forEach(clearManagedAssignment);
    if (Array.isArray(store.graveyard)) store.graveyard = [];
    if (store.g) {
      store.g.killsB = 0;
      store.g.killsP = 0;
      store.g.lastMove = { from: null, to: null };
    }

    let available = [...pieceIds];
    const assignments = [];
    const pending = people.map((person, index) => ({ person, index }));

    function take(entry, pieceId, reason) {
      if (!pieceId) return false;
      assignToPiece(pieceId, entry.person, reason);
      assignments.push({ person: entry.person, pieceId, reason });
      available = available.filter(id => id !== pieceId);
      entry.assigned = true;
      return true;
    }

    // 1) Primeira preferência para todos, antes de considerar segunda preferência.
    pending.forEach(entry => {
      const type = pieceTypeFromPreference(entry.person.preferredPiece);
      if (!type) return;
      const choices = candidatesFor(entry.person, available, type);
      if (choices.length) take(entry, choices[0], 'first');
    });

    // 2) Segunda preferência para quem ainda não conseguiu vaga.
    pending.forEach(entry => {
      if (entry.assigned) return;
      const type = pieceTypeFromPreference(entry.person.secondPreferredPiece);
      if (!type) return;
      const choices = candidatesFor(entry.person, available, type);
      if (choices.length) take(entry, choices[0], 'second');
    });

    // 3) Sem preferência ou preferência lotada: qualquer vaga livre, tentando respeitar lado.
    pending.forEach(entry => {
      if (entry.assigned || !available.length) return;
      const choice = chooseFreePiece(entry.person, available);
      if (choice) take(entry, choice, 'free');
    });

    const overflow = pending.filter(entry => !entry.assigned).map(entry => entry.person);
    const summary = {
      total: people.length,
      capacity,
      assigned: assignments.length,
      first: assignments.filter(a => a.reason === 'first').length,
      second: assignments.filter(a => a.reason === 'second').length,
      free: assignments.filter(a => a.reason === 'free').length,
      overflow
    };

    if (!store.g) store.g = {};
    store.g.autoLineupLastRun = new Date().toISOString();
    store.g.autoLineupSummary = {
      total: summary.total,
      capacity: summary.capacity,
      assigned: summary.assigned,
      first: summary.first,
      second: summary.second,
      free: summary.free,
      overflow: overflow.map(p => ({ id: p.id, name: p.name, character: p.character }))
    };

    try { save(); } catch (_) {}
    try { renderBoard(); renderGraveyard(); updateUI(); } catch (_) {}
    try { if (typeof renderConfigLists === 'function') renderConfigLists(); } catch (_) {}
    refreshAutoCard();
    showResultModal(summary, assignments);
  }

  function showNotice(message, error = false) {
    document.getElementById('auto-lineup-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'auto-lineup-toast';
    toast.textContent = message;
    toast.style.cssText = `position:fixed;right:20px;bottom:20px;z-index:19000;padding:12px 16px;border-radius:10px;background:${error ? '#351018' : '#071f23'};border:1px solid ${error ? '#ff4f77' : 'var(--accent,#00e5ff)'};color:white;font-size:11px;box-shadow:0 16px 40px rgba(0,0,0,.6);max-width:430px;`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
  }

  function showResultModal(summary, assignments) {
    document.getElementById('auto-lineup-result')?.remove();
    const modal = document.createElement('div');
    modal.id = 'auto-lineup-result';
    modal.style.cssText = 'position:fixed;inset:0;z-index:18500;background:rgba(0,0,0,.88);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:18px;';
    const overflowHtml = summary.overflow.length
      ? `<div class="al-result-warning"><strong>${summary.overflow.length} fora do tabuleiro</strong><span>${summary.overflow.map(p => esc(p.character || p.name)).join(', ')}</span></div>`
      : '<div class="al-result-ok">✓ Todos os inscritos couberam no tabuleiro.</div>';
    const rows = assignments.map(item => {
      const character = item.person.character || item.person.name;
      const reason = item.reason === 'first' ? '1ª opção' : item.reason === 'second' ? '2ª opção' : 'vaga livre';
      return `<div class="al-result-row"><span><strong>${esc(character)}</strong>${item.person.name && item.person.name !== character ? `<small>${esc(item.person.name)}</small>` : ''}</span><span>${esc(TYPE_LABEL[item.pieceId.charAt(0)] || item.pieceId)} · ${item.pieceId}</span><em>${reason}</em></div>`;
    }).join('');
    modal.innerHTML = `
      <div class="al-result-panel">
        <div class="al-result-head">
          <div><span>JSON ACIONADO</span><h2>Elenco montado automaticamente</h2></div>
          <button data-close>×</button>
        </div>
        <div class="al-kpis">
          <div><b>${summary.assigned}</b><span>ESCALADOS</span></div>
          <div><b>${summary.first}</b><span>1ª OPÇÃO</span></div>
          <div><b>${summary.second}</b><span>2ª OPÇÃO</span></div>
          <div><b>${summary.free}</b><span>VAGA LIVRE</span></div>
        </div>
        ${overflowHtml}
        <div class="al-result-list">${rows}</div>
        <div class="al-result-actions">
          <button data-close class="al-secondary">REVISAR MANUALMENTE</button>
          <button id="al-result-start" class="al-primary">INICIAR BATALHA</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => modal.remove()));
    modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
    modal.querySelector('#al-result-start')?.addEventListener('click', () => {
      modal.remove();
      try { if (typeof startBattle === 'function') startBattle(); } catch (_) {}
    });
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start-menu-settings-content.cosplay-settings-v3{padding:18px!important;max-height:min(78vh,760px);overflow:auto;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:linear-gradient(180deg,rgba(13,14,19,.96),rgba(7,8,11,.98));box-shadow:0 30px 80px rgba(0,0,0,.45);scrollbar-width:thin}
      .cosplay-settings-v3 .settings-v3-header{padding:4px 2px 16px;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,.08)}
      .cosplay-settings-v3 .settings-v3-kicker{font-size:9px;letter-spacing:2.5px;color:var(--accent,#00e5ff);font-weight:900}.cosplay-settings-v3 .settings-v3-header h2{margin:5px 0 4px;font-size:22px}.cosplay-settings-v3 .settings-v3-header p{margin:0;color:#85858f;font-size:10px;line-height:1.5}
      .cosplay-settings-v3 .menu-section-title{padding:9px 11px!important;margin:14px 0 9px!important;border-radius:9px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.055);font-size:9px!important;letter-spacing:1.8px!important;color:#b9bac2!important}
      .cosplay-settings-v3 .theme-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}.cosplay-settings-v3 .theme-card{min-height:72px!important;border-radius:11px!important;padding:11px!important}.cosplay-settings-v3 .theme-card strong{font-size:10px}.cosplay-settings-v3 .theme-card span{font-size:8px;line-height:1.35}
      .cosplay-settings-v3 .start-config-row{padding:11px 12px!important;margin:7px 0!important;border:1px solid rgba(255,255,255,.065);background:rgba(255,255,255,.025);border-radius:10px;gap:10px;flex-wrap:wrap}.cosplay-settings-v3 select,.cosplay-settings-v3 input[type=file]{border-radius:8px!important;background:#101116!important;border-color:#292b33!important}
      .cosplay-settings-v3 .wall-preset-grid{grid-template-columns:repeat(4,1fr)!important;gap:7px!important}.cosplay-settings-v3 .wall-thumb{border-radius:9px!important;min-height:48px}
      #json-data-settings{padding:15px!important;border-radius:13px!important;background:linear-gradient(135deg,rgba(0,229,255,.075),rgba(108,92,231,.045))!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.025)}
      #json-data-settings .json-settings-help{font-size:10px!important;color:#9b9da7!important;margin:7px 0 12px!important}
      #auto-lineup-card{margin-top:10px;padding:15px;border:1px solid rgba(0,229,255,.24);border-radius:13px;background:linear-gradient(135deg,rgba(0,229,255,.09),rgba(7,8,12,.95));box-shadow:0 15px 35px rgba(0,0,0,.18)}
      .al-card-top{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}.al-card-title span{display:block;font-size:8px;letter-spacing:2px;color:var(--accent,#00e5ff);font-weight:900}.al-card-title strong{display:block;font-size:14px;margin-top:4px}.al-card-title p{margin:5px 0 0;font-size:9px;color:#888;line-height:1.45}.al-status{font-size:8px;padding:5px 8px;border-radius:999px;background:#17181e;color:#777;white-space:nowrap;font-weight:900}.al-status.ready{background:rgba(78,255,166,.09);color:#85ffc0}.al-event{margin-top:11px;padding:10px;border-radius:10px;background:rgba(0,0,0,.22);display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center}.al-event strong{font-size:10px;display:block}.al-event span{font-size:8px;color:#777}.al-count{font-size:18px!important;color:#fff!important;font-weight:900}.al-pref-row{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:9px}.al-pref-row div{padding:8px;border-radius:9px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.045)}.al-pref-row b{display:block;font-size:12px}.al-pref-row span{font-size:7px;color:#777;letter-spacing:.7px}.al-trigger{width:100%;margin-top:10px;padding:13px;border:0;border-radius:10px;background:linear-gradient(90deg,var(--accent,#00e5ff),#7c6cff);color:#041014;font-weight:950;letter-spacing:.8px;cursor:pointer;box-shadow:0 8px 25px rgba(0,229,255,.15)}.al-trigger:disabled{filter:grayscale(1);opacity:.35;cursor:not-allowed}.al-last{font-size:8px;color:#6f7078;margin-top:7px;text-align:center}
      #main-start-options .al-main-trigger{width:100%;margin-top:-12px;margin-bottom:12px;padding:12px;border-radius:10px;border:1px solid rgba(0,229,255,.25);background:rgba(0,229,255,.06);color:var(--accent,#00e5ff);font-size:10px;font-weight:900;letter-spacing:1px;cursor:pointer}.al-main-trigger:disabled{opacity:.3;cursor:not-allowed}
      .al-result-panel{width:min(900px,97vw);max-height:90vh;display:flex;flex-direction:column;background:#090a0e;border:1px solid rgba(0,229,255,.25);border-radius:16px;overflow:hidden;box-shadow:0 30px 100px rgba(0,0,0,.75);color:#fff}.al-result-head{padding:18px 20px;border-bottom:1px solid #222;display:flex;justify-content:space-between;gap:12px}.al-result-head span{font-size:8px;letter-spacing:2px;color:var(--accent,#00e5ff);font-weight:900}.al-result-head h2{margin:4px 0 0;font-size:20px}.al-result-head button{width:36px;height:36px;background:#15161b;border:1px solid #333;border-radius:9px;color:#fff;font-size:18px;cursor:pointer}.al-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px 20px}.al-kpis div{background:#111218;border:1px solid #25262e;border-radius:10px;padding:10px}.al-kpis b{display:block;font-size:20px}.al-kpis span{font-size:7px;color:#777;letter-spacing:1px}.al-result-ok,.al-result-warning{margin:0 20px 10px;padding:10px 12px;border-radius:9px;font-size:9px}.al-result-ok{background:rgba(71,255,155,.07);color:#88ffc0;border:1px solid rgba(71,255,155,.14)}.al-result-warning{background:rgba(255,159,67,.08);border:1px solid rgba(255,159,67,.2);color:#ffc278;display:flex;flex-direction:column;gap:3px}.al-result-list{overflow:auto;padding:2px 20px 14px;display:grid;gap:5px}.al-result-row{display:grid;grid-template-columns:minmax(160px,1fr) 150px 80px;gap:10px;align-items:center;padding:9px 10px;background:#101116;border:1px solid #202129;border-radius:8px;font-size:9px}.al-result-row strong{display:block;font-size:10px}.al-result-row small{display:block;color:#666;margin-top:2px}.al-result-row em{font-style:normal;color:#8adfff;text-align:right}.al-result-actions{padding:12px 20px 16px;border-top:1px solid #222;display:flex;justify-content:flex-end;gap:8px}.al-result-actions button{padding:11px 14px;border-radius:9px;font-size:9px;font-weight:900;cursor:pointer}.al-secondary{background:#16171d;color:#ddd;border:1px solid #2b2c34}.al-primary{background:var(--accent,#00e5ff);color:#001014;border:0}
      @media(max-width:720px){.cosplay-settings-v3 .theme-grid{grid-template-columns:repeat(2,1fr)!important}.cosplay-settings-v3 .wall-preset-grid{grid-template-columns:repeat(2,1fr)!important}.al-kpis{grid-template-columns:repeat(2,1fr)}.al-result-row{grid-template-columns:1fr auto}.al-result-row em{grid-column:1/-1;text-align:left}.al-pref-row{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function enhanceSettingsLayout() {
    injectStyles();
    const settings = document.getElementById('start-menu-settings-content');
    if (!settings) return;
    settings.classList.add('cosplay-settings-v3');
    if (!settings.querySelector('.settings-v3-header')) {
      const header = document.createElement('div');
      header.className = 'settings-v3-header';
      header.innerHTML = '<div class="settings-v3-kicker">CENTRAL DE CONFIGURAÇÃO</div><h2>Preparar partida</h2><p>Visual, operação, elenco do evento e ajustes técnicos em uma única tela.</p>';
      settings.prepend(header);
    }
    ensureAutoCard();
    ensureMainTrigger();
  }

  function ensureAutoCard() {
    const settings = document.getElementById('start-menu-settings-content');
    if (!settings) return;
    let card = document.getElementById('auto-lineup-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'auto-lineup-card';
      const jsonCard = document.getElementById('json-data-settings');
      if (jsonCard?.parentElement === settings) jsonCard.insertAdjacentElement('afterend', card);
      else settings.appendChild(card);
    }
    refreshAutoCard();
  }

  function ensureMainTrigger() {
    const main = document.getElementById('main-start-options');
    if (!main || main.querySelector('.al-main-trigger')) return;
    const settingsButton = Array.from(main.querySelectorAll('button')).find(btn => /CONFIGURA/i.test(btn.textContent || ''));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'al-main-trigger';
    button.textContent = '⚡ ACIONAR JSON E MONTAR ELENCO';
    button.addEventListener('click', buildAutomaticLineup);
    if (settingsButton) main.insertBefore(button, settingsButton);
    else main.appendChild(button);
    refreshMainTrigger();
  }

  function refreshMainTrigger() {
    const button = document.querySelector('#main-start-options .al-main-trigger');
    if (!button) return;
    const people = roster();
    button.disabled = !people.length;
    button.textContent = people.length ? `⚡ ACIONAR JSON · MONTAR ${people.length} INSCRITO${people.length === 1 ? '' : 'S'}` : '⚡ IMPORTE O JSON PARA MONTAR O ELENCO';
  }

  function refreshAutoCard() {
    const card = document.getElementById('auto-lineup-card');
    if (!card) return;
    const people = roster();
    const pref = countPreferences(people);
    const event = store?.g?.rosterEvent || {};
    const summary = store?.g?.autoLineupSummary || null;
    const ready = people.length > 0;
    card.innerHTML = `
      <div class="al-card-top">
        <div class="al-card-title"><span>AUTOMAÇÃO DO ELENCO</span><strong>⚡ Acionar JSON</strong><p>Distribui automaticamente os inscritos nas peças usando 1ª opção, 2ª opção e vagas livres.</p></div>
        <span class="al-status ${ready ? 'ready' : ''}">${ready ? 'JSON PRONTO' : 'AGUARDANDO JSON'}</span>
      </div>
      <div class="al-event"><div><strong>${esc(event.name || event.title || 'Evento atual')}</strong><span>${ready ? 'Elenco importado do site' : 'Importe o arquivo pelo bloco acima'}</span></div><span class="al-count">${people.length}</span></div>
      <div class="al-pref-row">
        <div><b>${pref.first}</b><span>COM 1ª OPÇÃO</span></div>
        <div><b>${pref.second}</b><span>COM 2ª OPÇÃO</span></div>
        <div><b>${pref.free}</b><span>SEM PREFERÊNCIA</span></div>
      </div>
      <button class="al-trigger" ${ready ? '' : 'disabled'}>ACIONAR JSON E MONTAR TABULEIRO</button>
      <div class="al-last">${summary ? `Última montagem: ${summary.assigned}/${summary.total} escalados · ${summary.first} na 1ª opção · ${summary.second} na 2ª · ${summary.free} em vagas livres` : 'Nada será escalado até você acionar o JSON.'}</div>`;
    card.querySelector('.al-trigger')?.addEventListener('click', buildAutomaticLineup);
    refreshMainTrigger();
  }

  // Disponível para outros módulos (inclusive o importador do JSON) atualizarem a interface.
  window.refreshCosplayAutoLineup = refreshAutoCard;
  window.buildCosplayAutomaticLineup = buildAutomaticLineup;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceSettingsLayout, { once: true });
  else enhanceSettingsLayout();

  setTimeout(enhanceSettingsLayout, 250);
  setTimeout(enhanceSettingsLayout, 900);
})();
