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
        alert('Esse evento não possui participantes para exportar.');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Preparando sincronização...';
      try {
        const sync = await createResultSyncAccess(eventId);
        btn.textContent = 'Preparando elenco...';

        const participants = [];
        for (const r of rows) {
          let photoDataUrl = '';
          try { photoDataUrl = await urlToDataUrl(r.character_photo_url); } catch (_) {}
          participants.push({
            id: r.id,
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
            photoDataUrl
          });
        }

        const payload = {
          type: 'cosplaychess-participants',
          version: 4,
          exportedAt: new Date().toISOString(),
          event: {
            id: event.id,
            name: event.title,
            startAt: event.start_at,
            venue: event.venue,
            city: event.city
          },
          integration: {
            resultSync: {
              version: 1,
              mode: 'automatic',
              endpoint: sync.endpoint,
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
        alert('Elenco exportado com sincronização automática. Ao terminar a partida, o jogo enviará o resultado diretamente para o site.');
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
