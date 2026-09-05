(() => {
  if (window.__cosplayAdminResultSyncExportLoaded) return;
  window.__cosplayAdminResultSyncExportLoaded = true;

  const PIECE_SLOTS = {
    B: ['T1_B','C1_B','B1_B','Q1_B','K1_B','B2_B','C2_B','T2_B','P1_B','P2_B','P3_B','P4_B','P5_B','P6_B','P7_B','P8_B'],
    P: ['T1_P','C1_P','B1_P','Q1_P','K1_P','B2_P','C2_P','T2_P','P1_P','P2_P','P3_P','P4_P','P5_P','P6_P','P7_P','P8_P']
  };

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  function normalizeGameRole(value) {
    const role = normalizeText(value || 'piece').replace(/\s+/g, '');
    if (role === 'player1' || role === 'player_1' || role === 'p1') return 'player1';
    if (role === 'player2' || role === 'player_2' || role === 'p2') return 'player2';
    return 'piece';
  }

  function registrationRows() {
    try { return Array.isArray(registrations) ? registrations : []; }
    catch (_) { return []; }
  }

  function refreshRegistrationRoleBadges() {
    const source = registrationRows();
    if (!source.length) return false;
    const byId = new Map(source.map(row => [String(row?.id || ''), row]));
    const cards = document.querySelectorAll('[data-registration-id]');
    if (!cards.length) return false;

    cards.forEach(card => {
      const row = byId.get(String(card.dataset.registrationId || ''));
      if (!row) return;
      const role = normalizeGameRole(row.game_role ?? row.gameRole);
      card.dataset.gameRole = role;
      let badge = card.querySelector('[data-admin-player-role-badge]');
      if (role !== 'player1' && role !== 'player2') {
        badge?.remove();
        return;
      }
      const number = role === 'player1' ? 1 : 2;
      const sideName = number === 1 ? 'BRANCAS' : 'PRETAS';
      const label = `PLAYER ${number} · ${sideName}`;
      const host = card.querySelector('.registration-main, .registration-info, .registration-name, .registration-card__main') || card;
      if (!badge) {
        badge = document.createElement('span');
        badge.dataset.adminPlayerRoleBadge = '1';
        badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;width:max-content;max-width:100%;margin-top:5px;padding:4px 8px;border-radius:999px;border:1px solid currentColor;font-size:9px;font-weight:900;letter-spacing:.65px;line-height:1.1;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.14);';
        host.appendChild(badge);
      }
      badge.textContent = `${number === 1 ? '♔' : '♚'} ${label}`;
      badge.title = `Inscrito definido como Player ${number} no jogo`;
      badge.style.color = number === 1 ? '#e9f7ff' : '#ff9ab1';
      badge.style.background = number === 1 ? 'rgba(0,229,255,.10)' : 'rgba(255,70,115,.10)';
    });
    return true;
  }

  function installRegistrationRoleBadges() {
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        refreshRegistrationRoleBadges();
      });
    };
    const root = document.getElementById('registrationsList') || document.body;
    new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
    document.addEventListener('change', event => {
      if (event.target?.closest?.('[data-registration-id], #editRegistrationModal, #registrationEditModal')) setTimeout(schedule, 80);
    }, true);
    window.addEventListener('focus', schedule);
    schedule();
  }

  async function createResultSyncAccess(eventId) {
    const { data: { session } } = await db.auth.getSession();
    if (!session?.access_token) throw new Error('Sua sessão administrativa expirou. Entre novamente no painel.');
    const response = await fetch(`${cfg.functionsBase}/cosplaychess-result-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.supabaseKey,
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ eventId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.token || !data?.endpoint) {
      throw new Error(data?.error || 'Não foi possível preparar a sincronização automática do resultado.');
    }
    return data;
  }

  async function photoData(row) {
    if (!row?.character_photo_url) return '';
    try { return await urlToDataUrl(row.character_photo_url); }
    catch (_) { return ''; }
  }

  async function exportPerson(row, options = {}) {
    if (!row) return null;
    const number = options.playerNumber || null;
    const side = number === 1 ? 'B' : number === 2 ? 'P' : '';
    return {
      registrationId: row.id,
      id: row.id,
      name: row.full_name || '',
      nick: row.nick || '',
      character: row.character_name || '',
      gameRole: normalizeGameRole(row.game_role || 'piece'),
      player: number,
      playerSlot: number,
      navbarSlot: number === 1 ? 'player1' : number === 2 ? 'player2' : null,
      side,
      sideName: number === 1 ? 'Brancas' : number === 2 ? 'Pretas' : '',
      photoUrl: row.character_photo_url || '',
      photoDataUrl: options.includePhotoData === false ? '' : await photoData(row)
    };
  }

  function eventPieceLimit(event) {
    const raw = Number(event?.max_participants);
    if (!Number.isFinite(raw) || raw <= 0) return 32;
    return Math.min(32, Math.max(1, Math.floor(raw)));
  }

  function sideCode(value, counts) {
    const text = normalizeText(value);
    if (text.includes('branc') || text === 'b' || text === 'white') return 'B';
    if (text.includes('pret') || text === 'p' || text === 'black') return 'P';
    return counts.B <= counts.P ? 'B' : 'P';
  }

  function preferredType(value) {
    const text = normalizeText(value);
    if (!text || text.includes('sem prefer') || text === 'qualquer' || text === 'any') return null;
    if (text.includes('rainha') || text.includes('queen') || text.includes('dama')) return 'Q';
    if (text.includes('rei') || text.includes('king')) return 'K';
    if (text.includes('torre') || text.includes('rook')) return 'T';
    if (text.includes('cavalo') || text.includes('cavalaria') || text.includes('knight')) return 'C';
    if (text.includes('bispo') || text.includes('bishop')) return 'B';
    if (text.includes('peao') || text.includes('infantaria') || text.includes('pawn')) return 'P';
    return null;
  }

  function preferredSlot(value, side, used) {
    const type = preferredType(value);
    if (!type) return null;
    const text = normalizeText(value);
    const numberMatch = text.match(/(?:^|\D)([1-8])(?:\D|$)/);
    if (numberMatch) {
      const explicit = `${type}${numberMatch[1]}_${side}`;
      if (PIECE_SLOTS[side].includes(explicit) && !used.has(explicit)) return explicit;
    }
    return PIECE_SLOTS[side].find(id => id.startsWith(type) && !used.has(id)) || null;
  }

  function choosePieceSlot(row, side, used) {
    return preferredSlot(row.piece_preference, side, used)
      || preferredSlot(row.second_piece_preference, side, used)
      || PIECE_SLOTS[side].find(id => !used.has(id))
      || null;
  }

  async function buildGamePieces(pieceRows) {
    const p = {};
    const used = new Set();
    const counts = { B: 0, P: 0 };
    const assignments = [];
    const overflow = [];

    for (const row of pieceRows) {
      const side = sideCode(row.side_preference, counts);
      let slot = choosePieceSlot(row, side, used);
      let finalSide = side;
      if (!slot) {
        const otherSide = side === 'B' ? 'P' : 'B';
        slot = choosePieceSlot(row, otherSide, used);
        if (slot) finalSide = otherSide;
      }
      if (!slot) {
        overflow.push({ registrationId: row.id, name: row.full_name || '', character: row.character_name || '' });
        continue;
      }

      used.add(slot);
      counts[finalSide] += 1;
      const image = await photoData(row);
      const sound = row.theme_music_file_url || row.music_url || row.theme_music_url || '';
      const displayName = row.character_name || row.nick || row.full_name || slot.split('_')[0];
      p[slot] = {
        name: String(displayName).toUpperCase().trim(),
        img: image,
        sound,
        volume: 0.8,
        registrationId: row.id,
        participantName: row.full_name || '',
        nick: row.nick || '',
        character: row.character_name || '',
        side: finalSide,
        sideName: finalSide === 'B' ? 'Brancas' : 'Pretas',
        preference: row.piece_preference || 'Sem preferência',
        secondPreference: row.second_piece_preference || 'Sem segunda preferência'
      };
      assignments.push({
        registrationId: row.id,
        slot,
        side: finalSide,
        name: row.full_name || '',
        character: row.character_name || ''
      });
    }
    return { p, assignments, overflow };
  }

  function ensureResultsNav() {
    const nav = document.querySelector('.v6-nav');
    if (!nav || nav.querySelector('[data-admin-results-link]')) return false;
    const link = document.createElement('a');
    link.href = './resultados-admin.html';
    link.dataset.adminResultsLink = '1';
    link.innerHTML = '<i>♛</i><span>Resultados do Jogo</span>';
    link.title = 'Importar JSON e administrar resultados';
    const backup = [...nav.querySelectorAll('a')].find(a => a.getAttribute('href') === '#backup');
    if (backup) nav.insertBefore(link, backup);
    else nav.appendChild(link);
    return true;
  }

  function downloadJson(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function exportGameJson(target, button) {
    const eventId = document.getElementById('registrationEventFilter')?.value;
    if (!eventId) {
      alert('Selecione um evento antes de exportar o JSON do jogo.');
      return;
    }
    const event = currentEvents.find(e => e.id === eventId);
    const rows = registrations.filter(r => r.event_id === eventId && r.status !== 'cancelled');
    if (!rows.length) {
      alert('Esse evento não possui inscrições para exportar.');
      return;
    }

    const pieceRows = rows.filter(r => normalizeGameRole(r.game_role) === 'piece');
    const player1Row = rows.find(r => normalizeGameRole(r.game_role) === 'player1') || null;
    const player2Row = rows.find(r => normalizeGameRole(r.game_role) === 'player2') || null;
    if (!pieceRows.length) {
      alert('O evento ainda não possui peças humanas para o tabuleiro.');
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = target === 'android-apk' ? 'Preparando Android...' : 'Preparando Windows...';
    try {
      const sync = await createResultSyncAccess(eventId);
      const [player1, player2, gamePieces] = await Promise.all([
        exportPerson(player1Row, { playerNumber: 1 }),
        exportPerson(player2Row, { playerNumber: 2 }),
        buildGamePieces(pieceRows)
      ]);

      const pieceLimit = eventPieceLimit(event);
      const payload = {
        type: 'cosplaychess-game-data',
        version: 1,
        target,
        exportedAt: new Date().toISOString(),
        event: {
          id: event.id,
          name: event.title,
          startAt: event.start_at,
          venue: event.venue,
          city: event.city,
          maxParticipants: event.max_participants ?? null,
          pieceLimit
        },
        p: gamePieces.p,
        g: {
          avatarB: player1?.photoDataUrl || '',
          avatarP: player2?.photoDataUrl || ''
        },
        gamePlayers: { player1, player2 },
        assignment: {
          algorithm: 'preference-second-preference-next-available',
          count: gamePieces.assignments.length,
          pieces: gamePieces.assignments,
          overflow: gamePieces.overflow
        },
        integration: {
          resultSync: {
            version: 1,
            mode: 'automatic',
            endpoint: sync.endpoint,
            apiKey: cfg.supabaseKey,
            token: sync.token,
            expiresAt: sync.expiresAt
          }
        }
      };

      const suffix = target === 'android-apk' ? 'Android_APK' : 'Windows_EXE';
      downloadJson(payload, `CosplayChess_${slugify(event.title)}_${suffix}.json`);
      const overflowMessage = gamePieces.overflow.length
        ? `\n\nAtenção: ${gamePieces.overflow.length} participante(s) ficaram fora porque as 32 casas de peças já estavam ocupadas.`
        : '';
      alert(`${target === 'android-apk' ? 'JSON Android (.APK)' : 'JSON Windows (.EXE)'} criado com sucesso.\n\nPeças configuradas: ${gamePieces.assignments.length}.${overflowMessage}`);
    } catch (error) {
      alert(error?.message || 'Não foi possível gerar o JSON do jogo.');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function installExportButtons() {
    const original = document.getElementById('exportRosterBtn');
    if (!original || original.dataset.targetExportInstalled === '1') return false;
    original.dataset.targetExportInstalled = '1';
    original.textContent = 'JSON Windows (.EXE)';
    original.title = 'Baixar elenco no formato compatível com o jogo Windows';
    original.onclick = event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      exportGameJson('windows-exe', original);
    };

    let android = document.getElementById('exportRosterAndroidBtn');
    if (!android) {
      android = original.cloneNode(true);
      android.id = 'exportRosterAndroidBtn';
      android.dataset.targetExportInstalled = '1';
      android.textContent = 'JSON Android (.APK)';
      android.title = 'Baixar elenco no formato compatível com o APK Android';
      original.insertAdjacentElement('afterend', android);
    }
    android.onclick = event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      exportGameJson('android-apk', android);
    };
    return true;
  }

  function install() {
    ensureResultsNav();
    refreshRegistrationRoleBadges();
    return installExportButtons();
  }

  installRegistrationRoleBadges();
  ensureResultsNav();
  if (!install()) {
    const timer = setInterval(() => {
      ensureResultsNav();
      refreshRegistrationRoleBadges();
      if (install()) clearInterval(timer);
    }, 250);
    setTimeout(() => clearInterval(timer), 10000);
  }
})();

/* Runtime release bridge: guarantees the admin receives the latest mobile sidebar and event-map fixes even when older asset query strings are cached. */
(() => {
  if (window.__CC_ADMIN_RELEASE_BRIDGE_20260901__) return;
  window.__CC_ADMIN_RELEASE_BRIDGE_20260901__ = true;

  const style = document.createElement('style');
  style.id = 'ccAdminMobileScrollEmergencyFix';
  style.textContent = `@media(max-width:1000px){body.admin-mobile-nav-open{overflow:hidden!important;touch-action:auto!important}body.admin-v6.admin-authenticated .v6-shell .v6-sidebar{height:100dvh!important;max-height:100dvh!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important;touch-action:pan-y!important}body.admin-v6.admin-authenticated .v6-sidebar .v6-nav,body.admin-v6.admin-authenticated .v6-sidebar .v6-user-card{flex:0 0 auto!important}body.admin-v6.admin-authenticated .v6-sidebar .v6-user-card{margin-bottom:calc(22px + env(safe-area-inset-bottom))!important}}`;
  document.head.appendChild(style);

  if (!document.querySelector('link[data-admin-event-map-preview]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = './admin-event-map-preview.css?v=20260901-mapfix2';
    css.dataset.adminEventMapPreview = '1';
    document.head.appendChild(css);
  }

  if (!document.querySelector('script[data-admin-event-map-preview]')) {
    const script = document.createElement('script');
    script.src = './admin-event-map-preview.js?v=20260901-mapfix2';
    script.async = false;
    script.dataset.adminEventMapPreview = '1';
    document.body.appendChild(script);
  }
})();
