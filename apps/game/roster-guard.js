(() => {
  if (window.__cosplayRosterGuardLoaded) return;
  window.__cosplayRosterGuardLoaded = true;

  const OFFICIAL_TYPE = 'cosplaychess-participants';
  const listKeys = [
    'participants', 'roster', 'participantes', 'participante', 'inscritos', 'inscricoes', 'inscrições',
    'registrations', 'cadastros', 'pessoas', 'players', 'entries', 'records', 'rows', 'data'
  ];

  function valueOf(source, keys) {
    if (!source || typeof source !== 'object') return '';
    for (const key of keys) {
      const value = source[key];
      if (value === 0) return '0';
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      if (value && typeof value === 'object') {
        const nested = value.url || value.src || value.href || value.value || value.dataUrl;
        if (typeof nested === 'string' && nested.trim()) return nested.trim();
      }
    }
    return '';
  }

  function bounded(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  function normalizePerson(raw, index, fallbackId = '') {
    if (!raw || typeof raw !== 'object') return null;

    const name = valueOf(raw, [
      'nome', 'name', 'nomeCompleto', 'nome_completo', 'fullName', 'full_name',
      'participante', 'cosplayer', 'nomeSocial', 'nome_social'
    ]);
    if (!name) return null;

    const nick = valueOf(raw, ['nick', 'nickname', 'apelido']);
    const photo = valueOf(raw, [
      'photoDataUrl', 'photo_data_url', 'foto', 'photo', 'imagem', 'image', 'avatar', 'img',
      'fotoUrl', 'foto_url', 'photoUrl', 'photo_url', 'imageUrl', 'image_url',
      'profileImage', 'profile_image'
    ]);
    const character = valueOf(raw, [
      'cosplay', 'personagem', 'character', 'fantasia', 'characterName', 'character_name',
      'personagemCosplay', 'personagem_cosplay'
    ]);
    const preferredPiece = valueOf(raw, [
      'peca', 'peça', 'piece', 'piecePreference', 'piece_preference', 'pecaDesejada',
      'peçaDesejada', 'peca_desejada', 'preferredPiece', 'preferred_piece', 'papel', 'role'
    ]) || fallbackId;
    const secondPreferredPiece = valueOf(raw, [
      'segundaPeca', 'segunda_peca', 'segundaPeça', 'secondPiecePreference',
      'second_piece_preference', 'secondPreferredPiece', 'second_preferred_piece'
    ]);
    const side = valueOf(raw, [
      'lado', 'side', 'sidePreference', 'side_preference', 'time', 'equipe', 'team'
    ]);
    const city = valueOf(raw, ['cidade', 'city']);
    const participation = valueOf(raw, [
      'participacao', 'participação', 'participation', 'participationType', 'participation_type'
    ]);
    const email = valueOf(raw, ['email', 'e-mail']);
    const instagram = valueOf(raw, ['instagram', 'insta', '@']);
    const phone = valueOf(raw, ['whatsapp', 'telefone', 'phone', 'celular']);
    const musicName = valueOf(raw, ['musicName', 'music_name']) || valueOf(raw.music, ['name']);
    const musicUrl = valueOf(raw, ['musicUrl', 'music_url']) || valueOf(raw.music, ['url']);
    const musicFileUrl = valueOf(raw, ['musicFileUrl', 'music_file_url']) || valueOf(raw.music, ['fileUrl', 'file_url']);
    const sourceId = valueOf(raw, [
      'id', 'uuid', 'codigo', 'código', 'matricula', 'matrícula', 'registration_id', 'registrationId'
    ]);
    const id = sourceId || email || fallbackId || `${name.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`;
    const rawPhotoCrop = raw.photoCrop || raw.photo_crop || raw.extra_fields?.photo_crop;
    const photoCrop = rawPhotoCrop && typeof rawPhotoCrop === 'object'
      ? {
          x: bounded(rawPhotoCrop.x, 0, 100, 50),
          y: bounded(rawPhotoCrop.y, 0, 100, 50),
          zoom: bounded(rawPhotoCrop.zoom, 1, 3, 1)
        }
      : null;

    return {
      id: String(id),
      registrationId: String(id),
      name,
      nick,
      photo,
      photoCrop,
      character,
      preferredPiece,
      secondPreferredPiece,
      team: side,
      side,
      email,
      instagram,
      phone,
      city,
      participation,
      musicName,
      musicUrl,
      musicFileUrl
    };
  }

  function extractRoster(data) {
    let rows = [];

    if (data && typeof data === 'object' && data.type === OFFICIAL_TYPE && Array.isArray(data.participants)) {
      rows = data.participants.map((item, index) => ({ item, index, fallbackId: '' }));
    } else if (Array.isArray(data)) {
      rows = data.map((item, index) => ({ item, index, fallbackId: '' }));
    } else if (data && typeof data === 'object') {
      if (data.g && Array.isArray(data.g.roster)) {
        rows = data.g.roster.map((item, index) => ({ item, index, fallbackId: '' }));
      } else {
        const listKey = listKeys.find(key => Array.isArray(data[key]));
        if (listKey) {
          rows = data[listKey].map((item, index) => ({ item, index, fallbackId: '' }));
        } else if (data.p && typeof data.p === 'object' && !Array.isArray(data.p)) {
          rows = Object.entries(data.p).map(([pieceId, item], index) => ({ item, index, fallbackId: pieceId }));
        }
      }
    }

    const seen = new Set();
    return rows
      .map(({ item, index, fallbackId }) => normalizePerson(item, index, fallbackId))
      .filter(Boolean)
      .map((person, index) => {
        let id = person.id;
        if (seen.has(id)) id = `${id}-${index + 1}`;
        seen.add(id);
        return { ...person, id, registrationId: id };
      });
  }

  function isOfficialExport(data) {
    return Boolean(data && typeof data === 'object' && data.type === OFFICIAL_TYPE && Array.isArray(data.participants));
  }

  function normalizeResultSync(data) {
    const raw = data?.integration?.resultSync;
    if (!raw || typeof raw !== 'object') return null;
    const endpoint = valueOf(raw, ['endpoint']);
    const token = valueOf(raw, ['token']);
    if (!endpoint || !token) return null;
    return {
      version: Number(raw.version) || 1,
      mode: valueOf(raw, ['mode']) || 'automatic',
      endpoint,
      apiKey: valueOf(raw, ['apiKey', 'api_key']),
      token,
      expiresAt: valueOf(raw, ['expiresAt', 'expires_at']) || null
    };
  }

  function normalizePlayer(raw, number) {
    if (!raw || typeof raw !== 'object') return null;
    const name = valueOf(raw, ['name', 'nome', 'fullName', 'full_name']);
    if (!name) return null;
    const photoUrl = valueOf(raw, ['photoUrl', 'photo_url', 'fotoUrl', 'foto_url', 'imageUrl', 'image_url']);
    const photo = valueOf(raw, [
      'photoDataUrl', 'photo_data_url', 'photo', 'foto', 'avatar', 'image', 'img',
      'profileImage', 'profile_image'
    ]) || photoUrl;
    const registrationId = valueOf(raw, ['registrationId', 'registration_id', 'id', 'uuid']);
    return {
      registrationId,
      id: registrationId,
      name,
      nick: valueOf(raw, ['nick', 'apelido']),
      character: valueOf(raw, ['character', 'cosplay', 'personagem', 'character_name']),
      photo,
      photoUrl,
      gameRole: number === 1 ? 'player1' : 'player2',
      player: number,
      playerSlot: number,
      navbarSlot: `player${number}`,
      side: number === 1 ? 'B' : 'P',
      sideName: number === 1 ? 'Brancas' : 'Pretas',
      assignmentSource: 'predefined'
    };
  }

  function findPlayerRaw(data, number) {
    const direct = number === 1
      ? (data?.gamePlayers?.player1 || data?.gamePlayers?.player_1 || data?.gamePlayers?.p1)
      : (data?.gamePlayers?.player2 || data?.gamePlayers?.player_2 || data?.gamePlayers?.p2);
    if (direct) return direct;

    const wanted = number === 1 ? 'player1' : 'player2';
    const source = [
      ...(Array.isArray(data?.playerCandidates) ? data.playerCandidates : []),
      ...(Array.isArray(data?.participants) ? data.participants : []),
      ...(Array.isArray(data?.players) ? data.players : []),
      ...(Array.isArray(data?.roster) ? data.roster : [])
    ];

    return source.find(raw => {
      const role = String(raw?.gameRole ?? raw?.game_role ?? raw?.role ?? '').trim().toLowerCase().replace(/[_\s-]+/g, '');
      const slot = Number(raw?.playerSlot ?? raw?.player_slot ?? raw?.player);
      const nav = String(raw?.navbarSlot ?? raw?.navbar_slot ?? '').trim().toLowerCase().replace(/[_\s-]+/g, '');
      if (wanted === 'player1') return role === 'player1' || role === 'p1' || slot === 1 || nav === 'player1' || nav === 'p1';
      return role === 'player2' || role === 'p2' || slot === 2 || nav === 'player2' || nav === 'p2';
    }) || null;
  }

  function officialPlayers(data) {
    if (!isOfficialExport(data)) return { player1: null, player2: null };
    return {
      player1: normalizePlayer(findPlayerRaw(data, 1), 1),
      player2: normalizePlayer(findPlayerRaw(data, 2), 2)
    };
  }

  function playerCandidates(data) {
    if (!isOfficialExport(data)) return [];
    const raw = [
      ...(Array.isArray(data.playerCandidates) ? data.playerCandidates : []),
      data.gamePlayers?.player1,
      data.gamePlayers?.player2
    ].filter(Boolean);
    const seen = new Set();
    const out = [];
    raw.forEach((item, index) => {
      const role = String(item?.gameRole ?? item?.game_role ?? '').toLowerCase();
      const number = role.includes('2') || Number(item?.playerSlot ?? item?.player) === 2 ? 2 : 1;
      const p = normalizePlayer(item, number);
      if (!p) return;
      const key = p.registrationId || `${p.name.toLowerCase()}-${index}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(p);
    });
    return out;
  }

  function syncOneNavbarPlayer(number, player) {
    if (!store.g) store.g = {};
    const side = number === 1 ? 'B' : 'P';
    const regKey = number === 1 ? 'registeredPlayer1' : 'registeredPlayer2';
    const nameKey = number === 1 ? 'player1Name' : 'player2Name';
    const avatarKey = `avatar${side}`;
    const defaultName = number === 1 ? 'Jogador 1' : 'Jogador 2';

    if (player) {
      store.g[regKey] = { ...player };
      store.g[nameKey] = player.name;
      store.g[avatarKey] = player.photo || player.photoUrl || '';
    } else {
      delete store.g[regKey];
      delete store.g[nameKey];
      store.g[avatarKey] = '';
    }

    const nameInput = document.getElementById(`name-${side}`);
    if (nameInput) nameInput.value = player?.name || defaultName;

    const image = document.getElementById(`img-${side}`);
    if (image) {
      const avatar = player ? (player.photo || player.photoUrl || '') : '';
      image.style.backgroundImage = avatar ? `url("${String(avatar).replace(/"/g, '%22')}")` : '';
      image.style.backgroundPosition = 'center';
      image.style.backgroundSize = 'cover';
      image.style.backgroundRepeat = 'no-repeat';
    }
  }

  function syncNavbarPlayers(players) {
    syncOneNavbarPlayer(1, players?.player1 || null);
    syncOneNavbarPlayer(2, players?.player2 || null);
    try { updateUI(); } catch (_) {}

    // updateUI cuida do avatar, mas não do nome. Reaplicamos o nome depois dela.
    const p1Name = document.getElementById('name-B');
    const p2Name = document.getElementById('name-P');
    if (p1Name) p1Name.value = players?.player1?.name || 'Jogador 1';
    if (p2Name) p2Name.value = players?.player2?.name || 'Jogador 2';
  }

  function applyOfficialPlayers(data) {
    if (!isOfficialExport(data)) return { player1: null, player2: null };
    const players = officialPlayers(data);
    store.g.predefinedPlayers = {
      player1: players.player1 ? { ...players.player1 } : null,
      player2: players.player2 ? { ...players.player2 } : null
    };
    store.g.playerCandidates = playerCandidates(data);
    store.g.playerAssignmentMode = players.player1 || players.player2 ? 'predefined' : 'runtime';
    store.g.registeredPlayersImportedAt = new Date().toISOString();

    syncNavbarPlayers(players);
    return players;
  }

  function notify(message, error = false) {
    const old = document.getElementById('roster-guard-toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'roster-guard-toast';
    el.textContent = message;
    el.style.cssText = `position:fixed;right:20px;bottom:20px;z-index:12000;padding:12px 16px;border-radius:8px;color:#fff;font-size:12px;background:${error ? '#3a0d17' : '#082c31'};border:1px solid ${error ? '#ff0055' : '#00e5ff'};box-shadow:0 12px 30px rgba(0,0,0,.55);max-width:520px;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 6200);
  }

  function importAsRoster(input) {
    const file = input?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        const isOfficial = isOfficialExport(data);
        const people = extractRoster(data);

        if (!people.length) {
          notify('O JSON foi lido, mas não encontrei participantes com nome.', true);
          input.value = '';
          return;
        }

        if (!store.g) store.g = {};
        store.g.roster = people;
        store.g.rosterImportedAt = new Date().toISOString();
        store.g.rosterSourceFile = file.name || 'participantes.json';
        store.g.rosterSourceType = data?.type || '';
        store.g.rosterSourceVersion = data?.version ?? null;
        store.g.rosterFormat = isOfficial ? OFFICIAL_TYPE : 'legacy';
        store.g.rosterEvent = data?.event && typeof data.event === 'object' ? { ...data.event } : null;
        store.g.rosterExportedAt = data?.exportedAt || '';
        store.g.resultSync = normalizeResultSync(data);
        delete store.g.autoLineupSummary;
        delete store.g.autoLineupLastRun;
        delete store.g.matchRuntime;

        const players = applyOfficialPlayers(data);

        try { save(); } catch (_) {}
        try { renderBoard(); } catch (_) {}
        try { renderConfigLists(); } catch (_) {}
        try { window.refreshCosplayAutoLineup?.(); } catch (_) {}
        try { window.refreshCosplayResultSync?.(); } catch (_) {}
        try { window.refreshCosplayPlayerAssignment?.(); } catch (_) {}

        // O guard é o importador autoritativo. Reaplica a navbar depois dos renders e
        // depois de qualquer handler assíncrono legado que ainda esteja terminando.
        const reapply = () => {
          syncNavbarPlayers(players);
          try { save(); } catch (_) {}
          try { window.refreshCosplayPlayerAssignment?.(); } catch (_) {}
        };
        reapply();
        setTimeout(reapply, 120);
        setTimeout(reapply, 500);
        setTimeout(reapply, 1200);
        setTimeout(reapply, 2400);

        window.__cosplayLastImportedJson = {
          data,
          fileName: file.name || 'participantes.json',
          importedAt: new Date().toISOString()
        };
        try {
          window.dispatchEvent(new CustomEvent('cosplaychess:json-imported', {
            detail: window.__cosplayLastImportedJson
          }));
        } catch (_) {}

        const eventName = store.g.rosterEvent?.name ? ` de ${store.g.rosterEvent.name}` : '';
        const p1 = players?.player1?.name || 'não definido';
        const p2 = players?.player2?.name || 'não definido';
        const source = isOfficial ? ' do site' : '';
        notify(`${people.length} participante(s)${eventName} carregado(s)${source}. Player 1: ${p1}. Player 2: ${p2}. Os Players foram enviados para a barra superior; use “Acionar JSON” para distribuir somente as peças.`);
        console.info(`[CosplayChess] Importação oficial concluída | P1=${p1} | P2=${p2} | peças=${people.length}`);
        input.value = '';
      } catch (error) {
        console.error('Falha ao importar elenco:', error);
        notify(`JSON inválido ou incompleto: ${error?.message || 'falha desconhecida'}`, true);
        input.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  // Qualquer chamada antiga de importSquadData passa pelo importador autoritativo.
  window.importSquadData = importAsRoster;
  window.importCosplayChessOfficialJson = importAsRoster;

  // Intercepta o input antes de handlers legados e garante uma importação única/autoritativa.
  document.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== 'import-file' || input.type !== 'file') return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    importAsRoster(input);
  }, true);

  // Em modo edição, clicar numa peça abre o seletor de participantes.
  document.addEventListener('click', event => {
    const editMode = document.getElementById('edit-mode');
    if (!editMode?.checked) return;

    if (event.target?.closest?.('.cc-piece-crop-trigger')) return;
    const piece = event.target?.closest?.('#board .piece');
    if (!piece) return;
    const square = piece.closest('.sq');
    const board = document.getElementById('board');
    if (!square || !board) return;

    const index = Array.prototype.indexOf.call(board.children, square);
    const pieceId = index >= 0 ? store?.board?.[index] : null;
    if (!pieceId) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (typeof window.triggerQuickUpload === 'function') {
      window.triggerQuickUpload(pieceId);
    }
  }, true);

  function disarmLegacyInput() {
    const input = document.getElementById('import-file');
    if (input) input.removeAttribute('onchange');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', disarmLegacyInput, { once: true });
  } else {
    disarmLegacyInput();
  }
  setTimeout(disarmLegacyInput, 250);
  setTimeout(disarmLegacyInput, 1000);
})();