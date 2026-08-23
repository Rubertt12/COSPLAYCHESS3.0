(() => {
  if (window.__cosplayRosterEditorLoaded) return;
  window.__cosplayRosterEditorLoaded = true;

  const originalQuickUpload = typeof window.triggerQuickUpload === 'function'
    ? window.triggerQuickUpload.bind(window)
    : null;

  const rosterKeys = [
    'roster', 'participantes', 'participante', 'inscritos', 'inscricoes', 'inscrições',
    'registrations', 'cadastros', 'pessoas', 'players', 'entries', 'records', 'rows', 'data'
  ];

  function firstValue(source, keys) {
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

  function getRosterArray(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    if (data.g && Array.isArray(data.g.roster)) return data.g.roster;
    for (const key of rosterKeys) {
      if (Array.isArray(data[key])) return data[key];
    }
    return [];
  }

  function normalizeParticipant(raw, index) {
    if (!raw || typeof raw !== 'object') return null;

    const name = firstValue(raw, [
      'nome', 'name', 'nomeCompleto', 'nome_completo', 'fullName', 'full_name',
      'participante', 'cosplayer', 'nomeSocial', 'nome_social'
    ]);
    if (!name) return null;

    const photo = firstValue(raw, [
      'foto', 'photo', 'imagem', 'image', 'avatar', 'fotoUrl', 'foto_url',
      'photoUrl', 'photo_url', 'imageUrl', 'image_url', 'profileImage', 'profile_image'
    ]);
    const rawPhotoCrop = raw.photoCrop || raw.photo_crop || raw.extra_fields?.photo_crop;
    const photoCrop = rawPhotoCrop && typeof rawPhotoCrop === 'object'
      ? {
          x: bounded(rawPhotoCrop.x, 0, 100, 50),
          y: bounded(rawPhotoCrop.y, 0, 100, 50),
          zoom: bounded(rawPhotoCrop.zoom, 1, 3, 1)
        }
      : null;
    const character = firstValue(raw, [
      'personagem', 'character', 'cosplay', 'fantasia', 'personagemCosplay', 'personagem_cosplay'
    ]);
    const preferredPiece = firstValue(raw, [
      'peca', 'peça', 'piece', 'pecaDesejada', 'peçaDesejada', 'peca_desejada',
      'preferredPiece', 'preferred_piece', 'papel', 'role'
    ]);
    const team = firstValue(raw, ['time', 'equipe', 'team', 'lado', 'side']);
    const email = firstValue(raw, ['email', 'e-mail']);
    const instagram = firstValue(raw, ['instagram', 'insta', '@']);
    const phone = firstValue(raw, ['telefone', 'phone', 'whatsapp', 'celular']);
    const sourceId = firstValue(raw, ['id', 'uuid', 'codigo', 'código', 'matricula', 'matrícula', 'registration_id']);
    const id = sourceId || email || `${name.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`;

    return {
      id: String(id),
      name,
      photo,
      photoCrop,
      character,
      preferredPiece,
      team,
      email,
      instagram,
      phone
    };
  }

  function normalizeRoster(data) {
    const list = getRosterArray(data);
    const seen = new Set();
    return list
      .map(normalizeParticipant)
      .filter(Boolean)
      .map((person, index) => {
        let id = person.id;
        if (seen.has(id)) id = `${id}-${index + 1}`;
        seen.add(id);
        return { ...person, id };
      });
  }

  function roster() {
    try {
      return Array.isArray(store?.g?.roster) ? store.g.roster : [];
    } catch (_) {
      return [];
    }
  }

  function persistAndRefresh() {
    try { save(); } catch (_) {}
    try { renderBoard(); } catch (_) {}
    try { renderConfigLists(); } catch (_) {}
  }

  function clearRosterAssignment(pieceId) {
    if (!store.p[pieceId]) store.p[pieceId] = {};
    const piece = store.p[pieceId];
    if (piece.rosterManagedName) delete piece.name;
    if (piece.rosterManagedImg) delete piece.img;
    if (piece.rosterManagedPhotoCrop) delete piece.photoCrop;
    delete piece.participantId;
    delete piece.participant;
    delete piece.rosterManagedName;
    delete piece.rosterManagedImg;
    delete piece.rosterManagedPhotoCrop;
    persistAndRefresh();
  }

  function assignedPieceFor(participantId, exceptPieceId = '') {
    if (!participantId || !store?.p) return '';
    return Object.keys(store.p).find(pieceId => {
      return pieceId !== exceptPieceId && store.p[pieceId]?.participantId === participantId;
    }) || '';
  }

  function assignParticipant(pieceId, participant) {
    if (!participant || !pieceId) return;
    if (!store.p[pieceId]) store.p[pieceId] = {};

    const previousPiece = assignedPieceFor(participant.id, pieceId);
    if (previousPiece) {
      const old = store.p[previousPiece] || {};
      if (old.rosterManagedName) delete old.name;
      if (old.rosterManagedImg) delete old.img;
      if (old.rosterManagedPhotoCrop) delete old.photoCrop;
      delete old.participantId;
      delete old.participant;
      delete old.rosterManagedName;
      delete old.rosterManagedImg;
      delete old.rosterManagedPhotoCrop;
    }

    const target = store.p[pieceId];
    if (target.rosterManagedImg) delete target.img;
    if (target.rosterManagedPhotoCrop) delete target.photoCrop;
    delete target.rosterManagedPhotoCrop;

    target.name = participant.name;
    target.participantId = participant.id;
    target.participant = { ...participant };
    target.rosterManagedName = true;

    if (participant.photo) {
      target.img = participant.photo;
      target.rosterManagedImg = true;
      target.photoCrop = typeof window.normalizePiecePhotoCrop === 'function'
        ? window.normalizePiecePhotoCrop(participant.photoCrop)
        : (participant.photoCrop ? { ...participant.photoCrop } : { x: 50, y: 50, zoom: 1 });
      target.rosterManagedPhotoCrop = true;
    } else {
      delete target.rosterManagedImg;
      if (target.rosterManagedPhotoCrop) delete target.photoCrop;
      delete target.rosterManagedPhotoCrop;
    }

    persistAndRefresh();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function initials(name) {
    return String(name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('') || '?';
  }

  function showToast(message, isError = false) {
    const old = document.getElementById('roster-toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.id = 'roster-toast';
    toast.textContent = message;
    toast.style.cssText = [
      'position:fixed', 'right:22px', 'bottom:22px', 'z-index:10000',
      `background:${isError ? '#3a0d17' : '#082c31'}`,
      `border:1px solid ${isError ? '#ff0055' : 'var(--accent, #00e5ff)'}`,
      'color:#fff', 'padding:12px 16px', 'border-radius:8px', 'font-size:12px',
      'box-shadow:0 12px 35px rgba(0,0,0,.55)', 'max-width:360px'
    ].join(';');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3600);
  }

  function renderParticipantList(modal, pieceId, query = '') {
    const list = modal.querySelector('#roster-list');
    const count = modal.querySelector('#roster-count');
    if (!list) return;

    const q = query.trim().toLowerCase();
    const all = roster();
    const filtered = all.filter(person => {
      const haystack = [person.name, person.character, person.preferredPiece, person.team, person.instagram, person.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return !q || haystack.includes(q);
    });

    if (count) count.textContent = `${filtered.length} de ${all.length} pessoas`;

    if (!filtered.length) {
      list.innerHTML = `
        <div style="padding:28px;text-align:center;color:#888;border:1px dashed #333;border-radius:10px;">
          ${all.length ? 'Nenhuma pessoa encontrada nessa busca.' : 'Nenhuma lista de participantes foi importada ainda.'}
        </div>`;
      return;
    }

    list.innerHTML = filtered.map(person => {
      const assigned = assignedPieceFor(person.id, pieceId);
      const selectedHere = store.p[pieceId]?.participantId === person.id;
      const photo = person.photo
        ? `<img src="${escapeHtml(person.photo)}" alt="" style="width:54px;height:54px;object-fit:cover;border-radius:9px;border:1px solid #333;flex:0 0 auto;">`
        : `<div style="width:54px;height:54px;border-radius:9px;border:1px solid #333;background:#15151b;display:flex;align-items:center;justify-content:center;font-weight:900;color:var(--accent,#00e5ff);flex:0 0 auto;">${escapeHtml(initials(person.name))}</div>`;
      const meta = [
        person.character ? `Cosplay: ${escapeHtml(person.character)}` : '',
        person.preferredPiece ? `Preferência: ${escapeHtml(person.preferredPiece)}` : '',
        person.team ? `Equipe: ${escapeHtml(person.team)}` : ''
      ].filter(Boolean).join(' • ');
      const status = selectedHere
        ? '<span style="color:#75ffb2;font-size:9px;font-weight:900;">NESTA PEÇA</span>'
        : assigned
          ? `<span style="color:#ffb347;font-size:9px;font-weight:900;">EM ${escapeHtml(assigned)}</span>`
          : '<span style="color:#666;font-size:9px;font-weight:900;">DISPONÍVEL</span>';

      return `
        <button type="button" class="roster-person" data-person-id="${escapeHtml(person.id)}"
          style="width:100%;text-align:left;background:${selectedHere ? 'rgba(0,229,255,.10)' : '#0f0f13'};border:1px solid ${selectedHere ? 'var(--accent,#00e5ff)' : '#26262e'};color:#fff;border-radius:10px;padding:10px;display:flex;gap:12px;align-items:center;cursor:pointer;">
          ${photo}
          <div style="min-width:0;flex:1;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <strong style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(person.name)}</strong>
              ${status}
            </div>
            <div style="font-size:9px;color:#8b8b95;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${meta || 'Participante importado do JSON'}</div>
          </div>
          <span style="color:var(--accent,#00e5ff);font-size:16px;">›</span>
        </button>`;
    }).join('');

    list.querySelectorAll('.roster-person').forEach(button => {
      button.addEventListener('click', () => {
        const person = roster().find(item => String(item.id) === button.dataset.personId);
        if (!person) return;
        assignParticipant(pieceId, person);
        modal.remove();
        showToast(`${person.name} escalado em ${pieceId}.`);
      });
    });
  }

  function showRosterPicker(pieceId) {
    const old = document.getElementById('roster-picker-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'roster-picker-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.86);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);';

    const current = store.p[pieceId]?.participant;
    const pieceType = typeof pieceNames !== 'undefined' ? (pieceNames[pieceId.charAt(0)] || pieceId) : pieceId;
    modal.innerHTML = `
      <div style="width:min(760px,96vw);max-height:88vh;background:#09090c;border:1px solid #2a2a32;border-radius:14px;box-shadow:0 28px 80px rgba(0,0,0,.75);display:flex;flex-direction:column;overflow:hidden;">
        <div style="padding:18px 20px;border-bottom:1px solid #222;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;">
          <div>
            <div style="font-size:9px;letter-spacing:2px;color:var(--accent,#00e5ff);font-weight:900;">ESCALAR PARTICIPANTE</div>
            <h2 style="margin:5px 0 3px;font-size:20px;">${escapeHtml(pieceType)} · ${escapeHtml(pieceId)}</h2>
            <div style="font-size:10px;color:#777;">${current ? `Atual: ${escapeHtml(current.name)}` : 'Clique em uma pessoa da lista para colocar nesta peça.'}</div>
          </div>
          <button id="roster-close" type="button" style="background:#15151a;border:1px solid #333;color:#fff;width:36px;height:36px;border-radius:8px;cursor:pointer;font-size:18px;">×</button>
        </div>

        <div style="padding:14px 20px 10px;">
          <input id="roster-search" type="search" placeholder="Buscar por nome, personagem, peça, equipe..."
            style="width:100%;background:#111116;border:1px solid #2b2b34;color:#fff;border-radius:9px;padding:11px 12px;outline:none;">
          <div id="roster-count" style="font-size:9px;color:#666;margin-top:8px;letter-spacing:1px;"></div>
        </div>

        <div id="roster-list" style="padding:4px 20px 16px;overflow:auto;display:grid;gap:8px;min-height:180px;"></div>

        <div style="padding:12px 20px 16px;border-top:1px solid #222;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <button id="roster-manual-photo" type="button" class="btn" style="margin:0;padding:10px;">🖼️ FOTO MANUAL</button>
          <button id="roster-unlink" type="button" class="btn" style="margin:0;padding:10px;background:#24141a;color:#ff7b9f;">DESVINCULAR</button>
          <button id="roster-cancel" type="button" class="btn" style="margin:0;padding:10px;background:#19191f;">FECHAR</button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    const search = modal.querySelector('#roster-search');
    const close = () => modal.remove();
    modal.querySelector('#roster-close')?.addEventListener('click', close);
    modal.querySelector('#roster-cancel')?.addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    search?.addEventListener('input', () => renderParticipantList(modal, pieceId, search.value));

    modal.querySelector('#roster-manual-photo')?.addEventListener('click', () => {
      close();
      if (originalQuickUpload) originalQuickUpload(pieceId);
    });

    modal.querySelector('#roster-unlink')?.addEventListener('click', () => {
      clearRosterAssignment(pieceId);
      close();
      showToast(`Participante removido de ${pieceId}.`);
    });

    renderParticipantList(modal, pieceId, '');
    setTimeout(() => search?.focus(), 50);
  }

  window.importSquadData = function importSquadDataWithRoster(input) {
    const file = input?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        const importedRoster = normalizeRoster(data);
        let importedLegacy = false;

        if (data && !Array.isArray(data) && typeof data === 'object') {
          if (data.p && typeof data.p === 'object' && !Array.isArray(data.p)) {
            store.p = data.p;
            importedLegacy = true;
          }
          if (data.g && typeof data.g === 'object' && !Array.isArray(data.g)) {
            store.g = { ...store.g, ...data.g };
            importedLegacy = true;
          }
        }

        if (!store.g) store.g = {};
        if (importedRoster.length) store.g.roster = importedRoster;

        if (!importedRoster.length && !importedLegacy) {
          throw new Error('Nenhuma lista de participantes reconhecida no JSON.');
        }

        persistAndRefresh();
        if (input) input.value = '';

        if (importedRoster.length) {
          showToast(`${importedRoster.length} participante(s) carregado(s). Ative Edição e clique em uma peça para escalar.`);
          alert(`${importedRoster.length} participante(s) importado(s)!\n\nAgora ative o MODO EDIÇÃO e clique em uma peça para escolher quem ficará nela.`);
        } else {
          showToast('Configuração antiga do Cosplay Chess importada com sucesso.');
        }
      } catch (error) {
        console.error('Falha ao importar JSON de participantes:', error);
        if (input) input.value = '';
        alert(`Erro ao importar o JSON. ${error.message || 'Confira o formato do arquivo.'}`);
      }
    };
    reader.readAsText(file);
  };

  window.triggerQuickUpload = function triggerRosterPicker(pieceId) {
    showRosterPicker(pieceId);
  };

  function updateUiHints() {
    const editMode = document.getElementById('edit-mode');
    const label = editMode?.closest('label');
    if (label) {
      const textNodes = Array.from(label.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
      textNodes.forEach(node => node.remove());
      label.append(' MODO EDIÇÃO (ESCALAR PARTICIPANTES)');
      label.title = 'Ative e clique em uma peça para escolher uma pessoa importada do JSON.';
    }

    const dataCard = document.getElementById('json-data-settings');
    if (dataCard) {
      const help = dataCard.querySelector('.json-settings-help') || dataCard.querySelector('div[style*="font-size:9px"]');
      if (help) help.textContent = 'Importe o JSON com a lista de participantes. Depois, no jogo, ative Edição e clique em uma peça para escolher a pessoa e aplicar nome/foto.';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateUiHints, { once: true });
  } else {
    updateUiHints();
  }
  setTimeout(updateUiHints, 250);
})();
