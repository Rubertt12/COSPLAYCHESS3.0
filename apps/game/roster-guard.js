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
        const nested = value.url || value.src || value.href || value.value;
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
      'id', 'uuid', 'codigo', 'código', 'matricula', 'matrícula', 'registration_id'
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
        return { ...person, id };
      });
  }

  function notify(message, error = false) {
    const old = document.getElementById('roster-guard-toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'roster-guard-toast';
    el.textContent = message;
    el.style.cssText = `position:fixed;right:20px;bottom:20px;z-index:12000;padding:12px 16px;border-radius:8px;color:#fff;font-size:12px;background:${error ? '#3a0d17' : '#082c31'};border:1px solid ${error ? '#ff0055' : '#00e5ff'};box-shadow:0 12px 30px rgba(0,0,0,.55);max-width:440px;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4600);
  }

  function importAsRoster(input) {
    const file = input?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        const isOfficial = data?.type === OFFICIAL_TYPE && Array.isArray(data?.participants);
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
        store.g.rosterEvent = data?.event && typeof data.event === 'object' ? { ...data.event } : null;
        store.g.rosterExportedAt = data?.exportedAt || '';

        // A importação carrega SOMENTE o elenco. Nenhuma peça é preenchida automaticamente.
        try { save(); } catch (_) {}
        try { renderBoard(); } catch (_) {}
        try { renderConfigLists(); } catch (_) {}

        const eventName = store.g.rosterEvent?.name ? ` de ${store.g.rosterEvent.name}` : '';
        const source = isOfficial ? ' do site' : '';
        notify(`${people.length} participante(s)${eventName} carregado(s)${source}. Ative Edição e clique numa peça para escalar.`);
        input.value = '';
      } catch (error) {
        console.error('Falha ao importar elenco:', error);
        notify('JSON inválido. Nenhuma peça foi alterada.', true);
        input.value = '';
      }
    };
    reader.readAsText(file);
  }

  // Qualquer chamada antiga de importSquadData passa pelo leitor de elenco do site.
  window.importSquadData = importAsRoster;

  // Intercepta o input antes de handlers legados.
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
