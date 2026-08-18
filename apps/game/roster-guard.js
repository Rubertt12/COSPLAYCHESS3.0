(() => {
  if (window.__cosplayRosterGuardLoaded) return;
  window.__cosplayRosterGuardLoaded = true;

  const listKeys = [
    'roster', 'participantes', 'participante', 'inscritos', 'inscricoes', 'inscrições',
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

  function normalizePerson(raw, index, fallbackId = '') {
    if (!raw || typeof raw !== 'object') return null;
    const name = valueOf(raw, [
      'nome', 'name', 'nomeCompleto', 'nome_completo', 'fullName', 'full_name',
      'participante', 'cosplayer', 'nomeSocial', 'nome_social'
    ]);
    if (!name) return null;

    const photo = valueOf(raw, [
      'foto', 'photo', 'imagem', 'image', 'avatar', 'img', 'fotoUrl', 'foto_url',
      'photoUrl', 'photo_url', 'imageUrl', 'image_url', 'profileImage', 'profile_image'
    ]);
    const character = valueOf(raw, [
      'personagem', 'character', 'cosplay', 'fantasia', 'personagemCosplay', 'personagem_cosplay'
    ]);
    const preferredPiece = valueOf(raw, [
      'peca', 'peça', 'piece', 'pecaDesejada', 'peçaDesejada', 'peca_desejada',
      'preferredPiece', 'preferred_piece', 'papel', 'role'
    ]) || fallbackId;
    const team = valueOf(raw, ['time', 'equipe', 'team', 'lado', 'side']);
    const email = valueOf(raw, ['email', 'e-mail']);
    const instagram = valueOf(raw, ['instagram', 'insta', '@']);
    const phone = valueOf(raw, ['telefone', 'phone', 'whatsapp', 'celular']);
    const sourceId = valueOf(raw, ['id', 'uuid', 'codigo', 'código', 'matricula', 'matrícula', 'registration_id']);
    const id = sourceId || email || fallbackId || `${name.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`;

    return {
      id: String(id), name, photo, character, preferredPiece, team, email, instagram, phone
    };
  }

  function extractRoster(data) {
    let rows = [];

    if (Array.isArray(data)) {
      rows = data.map((item, index) => ({ item, index, fallbackId: '' }));
    } else if (data && typeof data === 'object') {
      if (data.g && Array.isArray(data.g.roster)) {
        rows = data.g.roster.map((item, index) => ({ item, index, fallbackId: '' }));
      } else {
        const listKey = listKeys.find(key => Array.isArray(data[key]));
        if (listKey) {
          rows = data[listKey].map((item, index) => ({ item, index, fallbackId: '' }));
        } else if (data.p && typeof data.p === 'object' && !Array.isArray(data.p)) {
          // JSON antigo do jogo: transforma os dados das peças em ELENCO.
          // Nunca copia data.p para store.p aqui.
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
    el.style.cssText = `position:fixed;right:20px;bottom:20px;z-index:12000;padding:12px 16px;border-radius:8px;color:#fff;font-size:12px;background:${error ? '#3a0d17' : '#082c31'};border:1px solid ${error ? '#ff0055' : '#00e5ff'};box-shadow:0 12px 30px rgba(0,0,0,.55);max-width:420px;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function importAsRoster(input) {
    const file = input?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
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

        // Importante: NÃO altera store.p e NÃO preenche peças automaticamente.
        try { save(); } catch (_) {}
        try { renderBoard(); } catch (_) {}
        try { renderConfigLists(); } catch (_) {}
        notify(`${people.length} participante(s) carregado(s). Ative Edição e clique numa peça para escalar.`);
        input.value = '';
      } catch (error) {
        console.error('Falha ao importar elenco:', error);
        notify('JSON inválido. Nenhuma peça foi alterada.', true);
        input.value = '';
      }
    };
    reader.readAsText(file);
  }

  // Sobrescreve a função antiga por completo. Qualquer chamada direta agora importa SOMENTE o elenco.
  window.importSquadData = importAsRoster;

  // Intercepta o input ANTES de qualquer onchange legado que ainda exista no HTML antigo.
  document.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== 'import-file' || input.type !== 'file') return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    importAsRoster(input);
  }, true);

  // Intercepta o clique da peça ANTES do triggerQuickUpload antigo.
  document.addEventListener('click', event => {
    const editMode = document.getElementById('edit-mode');
    if (!editMode?.checked) return;

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

  // Remove o onchange inline para deixar claro no DOM que o fluxo antigo está desligado.
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
