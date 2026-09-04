(() => {
  if (window.__cosplayAdminResultSyncExportLoaded) return;
  window.__cosplayAdminResultSyncExportLoaded = true;

  function normalizeGameRole(value) {
    const role = String(value || 'piece').trim().toLowerCase();
    if (role === 'player1' || role === 'player_1' || role === 'p1') return 'player1';
    if (role === 'player2' || role === 'player_2' || role === 'p2') return 'player2';
    return 'piece';
  }

  function registrationRows() {
    try {
      return Array.isArray(registrations) ? registrations : [];
    } catch (_) {
      return [];
    }
  }

  function refreshRegistrationRoleBadges() {
    const source = registrationRows();
    if (!source.length) return false;

    const byId = new Map(source.map(row => [String(row?.id || ''), row]));
    const cards = document.querySelectorAll('[data-registration-id]');
    if (!cards.length) return false;

    cards.forEach(card => {
      const id = String(card.dataset.registrationId || '');
      if (!id) return;
      const row = byId.get(id);
      if (!row) return;

      const role = normalizeGameRole(row.game_role ?? row.gameRole);
      card.dataset.gameRole = role;

      let badge = card.querySelector('[data-admin-player-role-badge]');
      if (role !== 'player1' && role !== 'player2') {
        if (badge) badge.remove();
        return;
      }

      const number = role === 'player1' ? 1 : 2;
      const sideName = number === 1 ? 'BRANCAS' : 'PRETAS';
      const label = `PLAYER ${number} · ${sideName}`;
      const host = card.querySelector('.registration-main, .registration-info, .registration-name, .registration-card__main') || card;

      if (!badge) {
        badge = document.createElement('span');
        badge.dataset.adminPlayerRoleBadge = '1';
        badge.setAttribute('aria-label', label);
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
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    document.addEventListener('change', event => {
      if (event.target?.closest?.('[data-registration-id], #editRegistrationModal, #registrationEditModal')) {
        setTimeout(schedule, 80);
      }
    }, true);
    window.addEventListener('focus', schedule);

    schedule();
    let attempts = 0;
    const timer = setInterval(() => {
      schedule();
      attempts += 1;
      if (attempts >= 40) clearInterval(timer);
    }, 250);
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
    try { return await urlToDataUrl(row.character_photo_url); } catch (_) { return ''; }
  }

  async function exportPerson(row, options = {}) {
    if (!row) return null;
    const number = options.playerNumber || null;
    const side = number === 1 ? 'B' : number === 2 ? 'P' : '';
    return {
      registrationId: row.id,
      id: row.id,
      name: row.full_name,
      nick: row.nick || '',
      character: row.character_name || '',
      gameRole: normalizeGameRole(row.game_role || 'piece'),
      player: number,
      playerSlot: number,
      navbarSlot: number === 1 ? 'player1' : number === 2 ? 'player2' : null,
      side,
      sideName: number === 1 ? 'Brancas' : number === 2 ? 'Pretas' : '',
      email: row.email || '',
      photoUrl: row.character_photo_url || '',
      photoDataUrl: options.includePhotoData === false ? '' : await photoData(row)
    };
  }

  function eventPieceLimit(event) {
    const raw = Number(event?.max_participants);
    if (!Number.isFinite(raw) || raw <= 0) return 32;
    return Math.min(32, Math.max(1, Math.floor(raw)));
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

  function install() {
    ensureResultsNav();
    refreshRegistrationRoleBadges();

    const btn = document.getElementById('exportRosterBtn');
    if (!btn || btn.dataset.autoResultSync === '1') return false;
    btn.dataset.autoResultSync = '1';

    btn.onclick = async () => {
      const eventId = document.getElementById('registrationEventFilter').value;
      if (!eventId) {
        alert('Selecione um evento antes de exportar o elenco.');
        return;
      }
      const event = currentEvents.find(e => e.id === eventId);
      const rows = registrations.filter(r => r.event_id === eventId && r.status !== 'cancelled');
      if (!rows.length) {
        alert('Esse evento não possui inscrições para exportar.');
        return;
      }

      const pieceRows = rows.filter(r => normalizeGameRole(r.game_role) === 'piece');
      const extraPlayerRows = rows.filter(r => normalizeGameRole(r.game_role) !== 'piece');
      const player1Row = rows.find(r => normalizeGameRole(r.game_role) === 'player1') || null;
      const player2Row = rows.find(r => normalizeGameRole(r.game_role) === 'player2') || null;

      if (!pieceRows.length) {
        alert('O evento ainda não possui nenhuma peça humana confirmada para o tabuleiro.');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Preparando sincronização...';
      try {
        const sync = await createResultSyncAccess(eventId);
        btn.textContent = 'Preparando elenco e Players...';

        const [player1, player2] = await Promise.all([
          exportPerson(player1Row, { playerNumber: 1 }),
          exportPerson(player2Row, { playerNumber: 2 })
        ]);

        const participants = [];
        for (const r of pieceRows) {
          participants.push({
            id: r.id,
            registrationId: r.id,
            gameRole: 'piece',
            nome: r.full_name,
            nick: r.nick,
            cosplay: r.character_name,
            email: r.email,
            whatsapp: r.whatsapp,
            cidade: r.city,
            lado: r.side_preference,
            peca: r.piece_preference || 'Sem preferência',
            segundaPeca: r.second_piece_preference || 'Sem segunda preferência',
            participacao: r.participation_type,
            music: {
              name: r.music_name || '',
              url: r.music_url || r.theme_music_url || '',
              fileUrl: r.theme_music_file_url || ''
            },
            musicName: r.music_name || '',
            musicUrl: r.music_url || r.theme_music_url || '',
            musicFileUrl: r.theme_music_file_url || '',
            photoUrl: r.character_photo_url || '',
            photoDataUrl: await photoData(r)
          });
        }

        const playerCandidates = [];
        for (const r of extraPlayerRows) {
          playerCandidates.push(await exportPerson(r));
        }

        const pieceLimit = eventPieceLimit(event);
        const payload = {
          type: 'cosplaychess-participants',
          version: 8,
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
          gameConfig: {
            pieceLimit,
            playerSlotsExcluded: true
          },
          playerAssignment: {
            mode: player1 && player2 ? 'predefined-or-runtime' : 'runtime-allowed',
            canOverrideInGame: true,
            navbarMapping: {
              player1: 'Brancas',
              player2: 'Pretas'
            }
          },
          gamePlayers: { player1, player2 },
          playerCandidates,
          integration: {
            resultSync: {
              version: 1,
              mode: 'automatic',
              endpoint: sync.endpoint,
              apiKey: cfg.supabaseKey,
              token: sync.token,
              expiresAt: sync.expiresAt
            }
          },
          participants
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `CosplayChess_${slugify(event.title)}_elenco.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);

        const modeMessage = player1 && player2
          ? `Players pré-definidos:\nPlayer 1: ${player1.name}\nPlayer 2: ${player2.name}\n\nEles serão preenchidos no jogo, mas poderão ser trocados na hora.`
          : 'Players ainda não foram pré-definidos. O jogo permitirá escolher Player 1 e Player 2 na hora do evento.';
        alert(`JSON oficial exportado.\n\n${modeMessage}\n\nPeças no JSON: ${participants.length}\nLimite do tabuleiro: ${pieceLimit}\nSincronização automática: ATIVA.`);
      } catch (error) {
        alert(error?.message || 'Não foi possível exportar o elenco com sincronização automática.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Exportar para o app';
      }
    };
    return true;
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