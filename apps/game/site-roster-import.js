(() => {
  if (window.__cosplaySiteRosterImportLoaded) return;
  window.__cosplaySiteRosterImportLoaded = true;

  const legacyListKeys = [
    'participants', 'roster', 'participantes', 'participante', 'inscritos', 'inscricoes', 'inscrições',
    'registrations', 'cadastros', 'pessoas', 'players', 'entries', 'records', 'rows', 'data'
  ];

  function text(value) {
    if (value === 0) return '0';
    return typeof value === 'string' ? value.trim() : '';
  }

  function bounded(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  function first(source, keys) {
    if (!source || typeof source !== 'object') return '';
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (value && typeof value === 'object') {
        const nested = value.url || value.src || value.href || value.value || value.dataUrl;
        if (typeof nested === 'string' && nested.trim()) return nested.trim();
      }
    }
    return '';
  }

  function isOfficialSiteExport(data) {
    return Boolean(
      data &&
      typeof data === 'object' &&
      data.type === 'cosplaychess-participants' &&
      Array.isArray(data.participants)
    );
  }

  function normalizeParticipant(raw, index) {
    if (!raw || typeof raw !== 'object') return null;

    const name = first(raw, [
      'nome', 'name', 'fullName', 'full_name', 'nomeCompleto', 'nome_completo',
      'participante', 'cosplayer', 'nomeSocial', 'nome_social'
    ]);
    if (!name) return null;

    const id = first(raw, ['id', 'uuid', 'registration_id', 'email']) || `${name.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`;
    const musicObject = raw.music && typeof raw.music === 'object' ? raw.music : {};
    const musicName = text(raw.musicName) || text(musicObject.name) || first(raw, ['music_name', 'theme_music_name']);
    const musicUrl = text(raw.musicUrl) || text(musicObject.url) || first(raw, ['music_url', 'theme_music_url']);
    const musicFileUrl = text(raw.musicFileUrl) || text(musicObject.fileUrl) || first(raw, ['music_file_url', 'theme_music_file_url']);
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
      name,
      nick: first(raw, ['nick', 'apelido']),
      photo: first(raw, [
        'photoDataUrl', 'photo_data_url', 'foto', 'photo', 'imagem', 'image', 'avatar', 'img',
        'fotoUrl', 'foto_url', 'photoUrl', 'photo_url', 'imageUrl', 'image_url',
        'profileImage', 'profile_image'
      ]),
      photoCrop,
      character: first(raw, ['cosplay', 'personagem', 'character', 'fantasia', 'personagemCosplay', 'personagem_cosplay']),
      preferredPiece: first(raw, [
        'peca', 'peça', 'piece', 'pecaDesejada', 'peçaDesejada', 'peca_desejada',
        'preferredPiece', 'preferred_piece', 'papel', 'role'
      ]),
      secondPreferredPiece: first(raw, [
        'segundaPeca', 'segundaPeça', 'secondPiece', 'secondPreferredPiece', 'second_piece_preference',
        'segunda_peca', 'segunda_peça'
      ]),
      team: first(raw, ['lado', 'side', 'time', 'equipe', 'team']),
      email: first(raw, ['email', 'e-mail']),
      phone: first(raw, ['whatsapp', 'telefone', 'phone', 'celular']),
      city: first(raw, ['cidade', 'city']),
      participation: first(raw, ['participacao', 'participação', 'participation', 'participationType', 'participation_type']),
      music: {
        name: musicName,
        url: musicUrl,
        fileUrl: musicFileUrl
      },
      musicName,
      musicUrl,
      musicFileUrl
    };
  }

  function rowsFrom(data) {
    if (isOfficialSiteExport(data)) return data.participants;
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    if (data.g && Array.isArray(data.g.roster)) return data.g.roster;
    const key = legacyListKeys.find(candidate => Array.isArray(data[candidate]));
    return key ? data[key] : [];
  }

  function normalizeRoster(data) {
    const seen = new Set();
    return rowsFrom(data)
      .map(normalizeParticipant)
      .filter(Boolean)
      .map((person, index) => {
        let id = person.id;
        if (seen.has(id)) id = `${id}-${index + 1}`;
        seen.add(id);
        return { ...person, id };
      });
  }

  function normalizeResultSync(data) {
    const raw = data?.integration?.resultSync;
    if (!raw || typeof raw !== 'object') return null;
    const endpoint = text(raw.endpoint);
    const token = text(raw.token);
    if (!endpoint || !token) return null;
    return {
      version: Number(raw.version) || 1,
      mode: text(raw.mode) || 'automatic',
      endpoint,
      apiKey: text(raw.apiKey),
      token,
      expiresAt: text(raw.expiresAt) || null
    };
  }

  function normalizeGamePlayer(raw, number = null) {
    if (!raw || typeof raw !== 'object') return null;
    const name = first(raw, ['name', 'nome', 'fullName', 'full_name']);
    if (!name) return null;
    const photoUrl = first(raw, ['photoUrl', 'photo_url', 'fotoUrl', 'foto_url', 'imageUrl', 'image_url']);
    const photo = first(raw, [
      'photoDataUrl', 'photo_data_url', 'photo', 'foto', 'avatar', 'image', 'img',
      'profileImage', 'profile_image'
    ]) || photoUrl;
    const playerNumber = number === 1 || number === 2 ? number : null;
    return {
      registrationId: first(raw, ['registrationId', 'registration_id', 'id', 'uuid']),
      name,
      nick: first(raw, ['nick', 'apelido']),
      character: first(raw, ['character', 'cosplay', 'personagem', 'character_name']),
      photo,
      photoUrl,
      player: playerNumber,
      playerSlot: playerNumber,
      side: playerNumber === 1 ? 'B' : playerNumber === 2 ? 'P' : '',
      sideName: playerNumber === 1 ? 'Brancas' : playerNumber === 2 ? 'Pretas' : '',
      assignmentSource: 'predefined'
    };
  }

  function gamePlayerCandidates(data) {
    if (!isOfficialSiteExport(data)) return [];
    const source = [
      ...(Array.isArray(data.participants) ? data.participants : []),
      ...(Array.isArray(data.playerCandidates) ? data.playerCandidates : []),
      data.gamePlayers?.player1,
      data.gamePlayers?.player2
    ].filter(Boolean);
    const seen = new Set();
    const people = [];
    source.forEach(raw => {
      const person = normalizeGamePlayer(raw, null);
      if (!person) return;
      const key = person.registrationId || `${person.name.toLowerCase()}|${person.character.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      people.push(person);
    });
    return people.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  function playerFromExport(data, number) {
    if (!isOfficialSiteExport(data)) return null;
    const raw = number === 1
      ? (data.gamePlayers?.player1 || data.gamePlayers?.player_1 || data.gamePlayers?.p1)
      : (data.gamePlayers?.player2 || data.gamePlayers?.player_2 || data.gamePlayers?.p2);
    if (!raw) return null;

    const direct = normalizeGamePlayer(raw, number);
    if (!direct) return null;
    if (direct.photo) return direct;

    const candidates = [
      ...(Array.isArray(data.playerCandidates) ? data.playerCandidates : []),
      ...(Array.isArray(data.participants) ? data.participants : [])
    ];
    const fallback = candidates.find(candidate => {
      const id = first(candidate, ['registrationId', 'registration_id', 'id', 'uuid']);
      return direct.registrationId && id === direct.registrationId;
    });
    if (!fallback) return direct;

    const fallbackPerson = normalizeGamePlayer(fallback, number);
    return fallbackPerson ? { ...fallbackPerson, ...direct, photo: direct.photo || fallbackPerson.photo, photoUrl: direct.photoUrl || fallbackPerson.photoUrl } : direct;
  }

  function applyNavbarPlayer(person, number) {
    const side = number === 1 ? 'B' : 'P';
    const avatarKey = `avatar${side}`;
    const registeredKey = number === 1 ? 'registeredPlayer1' : 'registeredPlayer2';
    const nameKey = number === 1 ? 'player1Name' : 'player2Name';
    const nameInput = document.getElementById(`name-${side}`);
    const image = document.getElementById(`img-${side}`);

    if (!person) {
      delete store.g[registeredKey];
      delete store.g[nameKey];
      store.g[avatarKey] = '';
      if (nameInput) nameInput.value = number === 1 ? 'Jogador 1' : 'Jogador 2';
      if (image) image.style.backgroundImage = '';
      return;
    }

    store.g[registeredKey] = { ...person };
    store.g[nameKey] = person.name;
    store.g[avatarKey] = person.photo || person.photoUrl || '';

    if (nameInput) {
      nameInput.value = person.name;
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (image) {
      const avatar = store.g[avatarKey];
      image.style.backgroundImage = avatar ? `url(${JSON.stringify(avatar)})` : '';
      image.style.backgroundPosition = 'center';
      image.style.backgroundSize = 'cover';
      image.style.backgroundRepeat = 'no-repeat';
    }
  }

  function applyOfficialPlayers(data) {
    if (!isOfficialSiteExport(data)) return null;
    const player1 = playerFromExport(data, 1);
    const player2 = playerFromExport(data, 2);

    store.g.playerCandidates = gamePlayerCandidates(data);
    store.g.predefinedPlayers = { player1, player2 };
    store.g.playerAssignmentMode = player1 || player2 ? 'predefined' : 'runtime';
    store.g.registeredPlayersImportedAt = new Date().toISOString();

    applyNavbarPlayer(player1, 1);
    applyNavbarPlayer(player2, 2);

    try { updateUI(); } catch (_) {}
    try { window.refreshCosplayPlayerAssignment?.(); } catch (_) {}
    return { player1, player2 };
  }

  function notify(message, error = false) {
    const old = document.getElementById('site-roster-import-toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'site-roster-import-toast';
    el.textContent = message;
    el.style.cssText = `position:fixed;right:20px;bottom:20px;z-index:14000;padding:12px 16px;border-radius:8px;color:#fff;font-size:12px;background:${error ? '#3a0d17' : '#082c31'};border:1px solid ${error ? '#ff0055' : '#00e5ff'};box-shadow:0 12px 30px rgba(0,0,0,.55);max-width:460px;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5200);
  }

  function applyRoster(data, fileName = 'CosplayChess_elenco.json') {
    const people = normalizeRoster(data);
    if (!people.length) throw new Error('O JSON não possui participantes válidos.');

    if (typeof store === 'undefined' || !store || typeof store !== 'object') {
      throw new Error('O jogo ainda não terminou de carregar.');
    }
    if (!store.g) store.g = {};

    store.g.roster = people;
    store.g.rosterImportedAt = new Date().toISOString();
    store.g.rosterSourceFile = fileName;
    store.g.rosterFormat = isOfficialSiteExport(data) ? 'cosplaychess-participants' : 'legacy';
    store.g.rosterExportVersion = data?.version || null;
    store.g.rosterEvent = data?.event && typeof data.event === 'object' ? { ...data.event } : null;
    store.g.resultSync = normalizeResultSync(data);
    delete store.g.autoLineupSummary;
    delete store.g.autoLineupLastRun;
    delete store.g.matchRuntime;

    const players = applyOfficialPlayers(data);

    try { save(); } catch (_) {}
    try { renderBoard(); } catch (_) {}
    try { renderConfigLists(); } catch (_) {}
    try { updateUI(); } catch (_) {}
    try { window.refreshCosplayAutoLineup?.(); } catch (_) {}
    try { window.refreshCosplayResultSync?.(); } catch (_) {}
    try { window.refreshCosplayPlayerAssignment?.(); } catch (_) {}

    const eventName = store.g.rosterEvent?.name ? ` do evento ${store.g.rosterEvent.name}` : '';
    const playerMessage = players?.player1 || players?.player2
      ? ` Player 1: ${players?.player1?.name || 'não definido'} · Player 2: ${players?.player2?.name || 'não definido'}. Nome e foto foram aplicados na barra superior.`
      : '';
    const syncMessage = store.g.resultSync
      ? ' A sincronização automática de resultados com o site está ATIVA.'
      : ' Este JSON não possui sincronização automática; a exportação manual do resultado ficará disponível como backup.';
    notify(`${people.length} participante(s)${eventName} carregado(s) do JSON do site.${playerMessage} Agora você pode clicar em “Acionar JSON” para montar o tabuleiro automaticamente.${syncMessage}`, !store.g.resultSync && isOfficialSiteExport(data));
  }

  function importFile(input) {
    const file = input?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        applyRoster(data, file.name || 'CosplayChess_elenco.json');
      } catch (error) {
        console.error('Falha ao importar JSON do site:', error);
        notify(error.message || 'Não foi possível importar o JSON.', true);
      } finally {
        input.value = '';
      }
    };
    reader.onerror = () => {
      notify('Não foi possível ler o arquivo JSON.', true);
      input.value = '';
    };
    reader.readAsText(file);
  }

  window.importSquadData = importFile;
  window.importCosplayChessSiteRoster = importFile;

  window.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== 'import-file' || input.type !== 'file') return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    importFile(input);
  }, true);

  const loadGameUxPolish = () => {
    const existing = document.querySelector('script[data-game-ux-polish]');
    if (existing) return;
    const uxScript = document.createElement('script');
    uxScript.src = 'game-ux-polish.js';
    uxScript.dataset.gameUxPolish = 'true';
    document.body.appendChild(uxScript);
  };

  const loadPlayerPhotoSync = () => {
    const existing = document.querySelector('script[data-player-photo-sync]');
    if (existing) {
      if (window.__cosplayPlayerPhotoSyncLoaded) loadGameUxPolish();
      else existing.addEventListener('load', loadGameUxPolish, { once: true });
      return;
    }
    const photoScript = document.createElement('script');
    photoScript.src = 'game-player-photo-sync.js?v=20260901-player-url-fix1';
    photoScript.dataset.playerPhotoSync = 'true';
    photoScript.onload = loadGameUxPolish;
    document.body.appendChild(photoScript);
  };

  const loadGameResultExport = () => {
    const existing = document.querySelector('script[data-game-result-export]');
    if (existing) {
      if (window.__cosplayGameResultExportLoaded) loadPlayerPhotoSync();
      else existing.addEventListener('load', loadPlayerPhotoSync, { once: true });
      return;
    }
    const resultScript = document.createElement('script');
    resultScript.src = 'game-result-export.js';
    resultScript.dataset.gameResultExport = 'true';
    resultScript.onload = loadPlayerPhotoSync;
    document.body.appendChild(resultScript);
  };

  const loadSettingsLayout = () => {
    const existing = document.querySelector('script[data-settings-layout-fix]');
    if (existing) {
      if (window.__cosplaySettingsLayoutFixLoaded) loadGameResultExport();
      else existing.addEventListener('load', loadGameResultExport, { once: true });
      return;
    }
    const layoutScript = document.createElement('script');
    layoutScript.src = 'settings-layout-fix.js';
    layoutScript.dataset.settingsLayoutFix = 'true';
    layoutScript.onload = loadGameResultExport;
    document.body.appendChild(layoutScript);
  };

  const loadAutomaticLineup = () => {
    const existing = document.querySelector('script[data-auto-lineup-settings]');
    if (existing) {
      if (window.__cosplayAutoLineupSettingsLoaded) loadSettingsLayout();
      else existing.addEventListener('load', loadSettingsLayout, { once: true });
      return;
    }
    const lineupScript = document.createElement('script');
    lineupScript.src = 'auto-lineup-settings.js';
    lineupScript.dataset.autoLineupSettings = 'true';
    lineupScript.onload = loadSettingsLayout;
    document.body.appendChild(lineupScript);
  };

  // escalação/áudio -> automação -> layout amplo -> resultado -> fotos dos Players -> UX de duelo/jogadas.
  const existingExperience = document.querySelector('script[data-participant-experience]');
  if (!existingExperience) {
    const experienceScript = document.createElement('script');
    experienceScript.src = 'participant-experience.js';
    experienceScript.dataset.participantExperience = 'true';
    experienceScript.onload = loadAutomaticLineup;
    document.body.appendChild(experienceScript);
  } else if (window.__cosplayParticipantExperienceLoaded) {
    loadAutomaticLineup();
  } else {
    existingExperience.addEventListener('load', loadAutomaticLineup, { once: true });
  }
})();