(() => {
  if (window.__cosplayAdminResultSyncExportLoaded) return;
  window.__cosplayAdminResultSyncExportLoaded = true;

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
      gameRole: row.game_role || 'piece',
      player: number,
      side,
      sideName: number === 1 ? 'Brancas' : number === 2 ? 'Pretas' : '',
      email: row.email || '',
      photoUrl: row.character_photo_url || '',
      photoDataUrl: options.includePhotoData === false ? '' : await photoData(row)
    };
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

      const pieceRows = rows.filter(r => (r.game_role || 'piece') === 'piece');
      const extraPlayerRows = rows.filter(r => (r.game_role || 'piece') !== 'piece');
      const player1Row = rows.find(r => r.game_role === 'player1') || null;
      const player2Row = rows.find(r => r.game_role === 'player2') || null;

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

        const payload = {
          type: 'cosplaychess-participants',
          version: 6,
          exportedAt: new Date().toISOString(),
          event: {
            id: event.id,
            name: event.title,
            startAt: event.start_at,
            venue: event.venue,
            city: event.city
          },
          playerAssignment: {
            mode: player1 && player2 ? 'predefined-or-runtime' : 'runtime-allowed',
            canOverrideInGame: true
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
        alert(`JSON oficial exportado.\n\n${modeMessage}\n\nPeças: ${participants.length}\nSincronização automática: ATIVA.`);
      } catch (error) {
        alert(error?.message || 'Não foi possível exportar o elenco com sincronização automática.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Exportar para o app';
      }
    };
    return true;
  }

  ensureResultsNav();
  if (!install()) {
    const timer = setInterval(() => {
      ensureResultsNav();
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
