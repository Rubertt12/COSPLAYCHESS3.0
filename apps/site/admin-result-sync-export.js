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

  async function exportPlayer(row, number) {
    const side = number === 1 ? 'B' : 'P';
    return {
      registrationId: row.id,
      id: row.id,
      name: row.full_name,
      nick: row.nick || '',
      player: number,
      side,
      sideName: number === 1 ? 'Brancas' : 'Pretas',
      email: row.email || '',
      photoDataUrl: await photoData(row)
    };
  }

  function install() {
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
      const player1Row = rows.find(r => r.game_role === 'player1');
      const player2Row = rows.find(r => r.game_role === 'player2');

      if (!player1Row || !player2Row) {
        const missing = [!player1Row ? 'Player 1 — Brancas' : '', !player2Row ? 'Player 2 — Pretas' : ''].filter(Boolean).join(' e ');
        alert(`Não é possível exportar o JSON oficial ainda. Falta a inscrição de ${missing}.\n\nCadastre os dois Players no site para que nome e foto entrem automaticamente no jogo.`);
        return;
      }
      if (!pieceRows.length) {
        alert('O evento ainda não possui nenhuma peça humana confirmada para o tabuleiro.');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Preparando sincronização...';
      try {
        const sync = await createResultSyncAccess(eventId);
        btn.textContent = 'Preparando Players e elenco...';

        const [player1, player2] = await Promise.all([
          exportPlayer(player1Row, 1),
          exportPlayer(player2Row, 2)
        ]);

        const participants = [];
        for (const r of pieceRows) {
          participants.push({
            id: r.id,
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
            photoDataUrl: await photoData(r)
          });
        }

        const payload = {
          type: 'cosplaychess-participants',
          version: 5,
          exportedAt: new Date().toISOString(),
          event: {
            id: event.id,
            name: event.title,
            startAt: event.start_at,
            venue: event.venue,
            city: event.city
          },
          gamePlayers: { player1, player2 },
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
        alert(`JSON oficial exportado.\n\nPlayer 1: ${player1.name}\nPlayer 2: ${player2.name}\nPeças: ${participants.length}\n\nAo importar no jogo, nomes e fotos dos Players serão aplicados automaticamente.`);
      } catch (error) {
        alert(error?.message || 'Não foi possível exportar o elenco com sincronização automática.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Exportar para o app';
      }
    };
    return true;
  }

  if (!install()) {
    const timer = setInterval(() => { if (install()) clearInterval(timer); }, 250);
    setTimeout(() => clearInterval(timer), 10000);
  }
})();
