(() => {
  if (window.__cosplayParticipantExperienceLoaded) return;
  window.__cosplayParticipantExperienceLoaded = true;

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const pieceTypeLabel = id => {
    const type = String(id || '').charAt(0);
    try { return pieceNames?.[type] || id || 'PEÇA'; } catch (_) { return id || 'PEÇA'; }
  };

  const sideLabel = id => String(id || '').endsWith('_B') ? 'BRANCAS' : 'PRETAS';

  function roster() {
    try { return Array.isArray(store?.g?.roster) ? store.g.roster : []; }
    catch (_) { return []; }
  }

  function participantMusic(person) {
    if (!person || typeof person !== 'object') return { url: '', name: '' };
    const music = person.music && typeof person.music === 'object' ? person.music : {};
    const url = person.musicFileUrl || music.fileUrl || person.musicUrl || music.url || '';
    const name = person.musicName || music.name || filenameFromUrl(url) || '';
    return { url, name };
  }

  function filenameFromUrl(value) {
    const raw = String(value || '');
    if (!raw) return '';
    if (raw.startsWith('data:')) return 'Áudio incorporado';
    try {
      const url = new URL(raw, location.href);
      const part = decodeURIComponent(url.pathname.split('/').pop() || '');
      return part || 'Música do personagem';
    } catch (_) {
      return raw.split(/[\\/]/).pop().split(/[?#]/)[0] || 'Música do personagem';
    }
  }

  function notify(message, error = false) {
    document.getElementById('participant-experience-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'participant-experience-toast';
    toast.textContent = message;
    toast.style.cssText = `position:fixed;right:20px;bottom:20px;z-index:16000;max-width:430px;padding:12px 15px;border-radius:10px;background:${error ? '#351019' : '#071f23'};border:1px solid ${error ? '#ff426f' : 'var(--accent,#00e5ff)'};color:#fff;font-size:11px;line-height:1.45;box-shadow:0 14px 40px rgba(0,0,0,.55);`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4200);
  }

  function persist(refreshBoard = true) {
    try { save(); } catch (_) {}
    if (refreshBoard) {
      try { renderBoard(); } catch (_) {}
    }
  }

  function resetPieceAudioCache(id) {
    try {
      if (typeof stopPiecePlayback === 'function') stopPiecePlayback(id, false);
      if (typeof pieceSoundAudios !== 'undefined' && pieceSoundAudios[id]) {
        try { pieceSoundAudios[id].pause(); } catch (_) {}
        delete pieceSoundAudios[id];
      }
    } catch (_) {}
  }

  function assignedPieceFor(participantId, exceptId = '') {
    if (!participantId) return '';
    try {
      return Object.keys(store.p || {}).find(id => id !== exceptId && store.p[id]?.participantId === participantId) || '';
    } catch (_) {
      return '';
    }
  }

  function removeRosterDataFromPiece(id, options = {}) {
    if (!store.p[id]) store.p[id] = {};
    const piece = store.p[id];
    if (piece.rosterManagedName) delete piece.name;
    if (piece.rosterManagedImg) delete piece.img;
    if (piece.rosterManagedSound && !options.keepSound) {
      delete piece.sound;
      delete piece.soundName;
      delete piece.soundSource;
      resetPieceAudioCache(id);
    }
    delete piece.participantId;
    delete piece.participant;
    delete piece.participantRealName;
    delete piece.rosterManagedName;
    delete piece.rosterManagedImg;
    delete piece.rosterManagedSound;
  }

  function assignParticipant(pieceId, person) {
    if (!pieceId || !person) return;
    if (!store.p[pieceId]) store.p[pieceId] = {};

    const previousPieceId = assignedPieceFor(person.id, pieceId);
    let movedManualAudio = null;
    if (previousPieceId) {
      const old = store.p[previousPieceId] || {};
      if (old.sound && old.soundSource === 'manual') {
        movedManualAudio = {
          sound: old.sound,
          soundName: old.soundName || 'Áudio personalizado',
          soundSource: 'manual'
        };
      }
      removeRosterDataFromPiece(previousPieceId, { keepSound: false });
    }

    const target = store.p[pieceId];
    const previousParticipantId = target.participantId;
    if (previousParticipantId && previousParticipantId !== person.id) {
      if (target.rosterManagedImg) delete target.img;
      if (target.rosterManagedSound || target.soundSource === 'manual') {
        delete target.sound;
        delete target.soundName;
        delete target.soundSource;
        resetPieceAudioCache(pieceId);
      }
    }

    const characterName = String(person.character || person.name || pieceTypeLabel(pieceId)).trim();
    target.name = characterName;
    target.participantRealName = person.name || '';
    target.participantId = person.id;
    target.participant = { ...person };
    target.rosterManagedName = true;

    if (person.photo) {
      target.img = person.photo;
      target.rosterManagedImg = true;
    } else if (target.rosterManagedImg) {
      delete target.img;
      delete target.rosterManagedImg;
    }

    const registered = participantMusic(person);
    if (movedManualAudio) {
      target.sound = movedManualAudio.sound;
      target.soundName = movedManualAudio.soundName;
      target.soundSource = movedManualAudio.soundSource;
      target.rosterManagedSound = true;
      resetPieceAudioCache(pieceId);
    } else if (registered.url) {
      target.sound = registered.url;
      target.soundName = registered.name || 'Música do personagem';
      target.soundSource = 'registration';
      target.rosterManagedSound = true;
      resetPieceAudioCache(pieceId);
    } else if (target.rosterManagedSound) {
      delete target.sound;
      delete target.soundName;
      delete target.soundSource;
      delete target.rosterManagedSound;
      resetPieceAudioCache(pieceId);
    }

    if (target.volume === undefined) target.volume = 0.8;
    persist(true);
    try { enhancedRenderConfigLists(); } catch (_) {}

    const audioInfo = target.sound
      ? ` Música: ${target.soundName || 'configurada'}.`
      : ' Sem música cadastrada; você pode escolher uma na lateral.';
    notify(`${characterName} escalado em ${pieceId}.${audioInfo}`);
  }

  function clearParticipant(pieceId) {
    removeRosterDataFromPiece(pieceId, { keepSound: true });
    persist(true);
    enhancedRenderConfigLists();
    notify(`Participante desvinculado de ${pieceId}.`);
  }

  function preferenceScore(person, pieceId) {
    const type = pieceTypeLabel(pieceId).toLowerCase();
    const idType = String(pieceId).charAt(0).toLowerCase();
    const values = [person.preferredPiece, person.secondPreferredPiece]
      .filter(Boolean)
      .map(v => String(v).toLowerCase());
    let score = 0;
    if (values[0] && (values[0].includes(type) || values[0].startsWith(idType))) score += 4;
    if (values[1] && (values[1].includes(type) || values[1].startsWith(idType))) score += 2;
    const desiredSide = String(person.team || '').toLowerCase();
    const side = sideLabel(pieceId).toLowerCase();
    if (desiredSide && desiredSide !== 'sem preferência' && desiredSide !== 'sem preferencia' && side.includes(desiredSide.replace('branco','branca').replace('preto','preta'))) score += 1;
    return score;
  }

  function openParticipantPicker(pieceId) {
    document.getElementById('participant-picker-v2')?.remove();
    const people = roster();
    if (!people.length) {
      notify('Importe primeiro o JSON do site para carregar os personagens.', true);
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'participant-picker-v2';
    modal.style.cssText = 'position:fixed;inset:0;z-index:15000;background:rgba(0,0,0,.9);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:18px;';
    modal.innerHTML = `
      <div style="width:min(860px,97vw);max-height:91vh;background:#09090d;border:1px solid rgba(0,229,255,.28);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 100px rgba(0,0,0,.75);">
        <div style="padding:18px 20px;border-bottom:1px solid #222;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">
          <div>
            <div style="font-size:9px;letter-spacing:2px;color:var(--accent,#00e5ff);font-weight:900;">ESCALAÇÃO DO TABULEIRO</div>
            <h2 style="margin:5px 0 3px;font-size:21px;">${esc(pieceTypeLabel(pieceId))} <span style="opacity:.45">· ${esc(pieceId)}</span></h2>
            <div style="font-size:10px;color:#777;">Escolha pelo personagem. O nome real fica apenas como referência da organização.</div>
          </div>
          <button data-close type="button" style="width:38px;height:38px;border-radius:9px;background:#15151b;border:1px solid #333;color:#fff;font-size:18px;cursor:pointer;">×</button>
        </div>
        <div style="padding:14px 20px 8px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
          <input id="participant-v2-search" type="search" placeholder="Buscar personagem, participante, peça ou lado..." style="width:100%;background:#111116;border:1px solid #2a2a33;border-radius:10px;color:#fff;padding:11px 12px;outline:none;">
          <div id="participant-v2-count" style="font-size:9px;color:#777;white-space:nowrap;"></div>
        </div>
        <div id="participant-v2-list" style="padding:8px 20px 18px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:9px;min-height:220px;"></div>
        <div style="padding:12px 20px 16px;border-top:1px solid #222;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
          <button id="participant-v2-photo" type="button" class="btn" style="margin:0;padding:10px 13px;">🖼 FOTO MANUAL</button>
          <button id="participant-v2-unlink" type="button" class="btn" style="margin:0;padding:10px 13px;background:#25151b;color:#ff8cab;">DESVINCULAR</button>
          <button data-close type="button" class="btn" style="margin:0;padding:10px 13px;background:#18181e;">FECHAR</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const list = modal.querySelector('#participant-v2-list');
    const count = modal.querySelector('#participant-v2-count');
    const search = modal.querySelector('#participant-v2-search');
    const close = () => modal.remove();

    function render(query = '') {
      const q = String(query || '').trim().toLowerCase();
      const currentId = store.p[pieceId]?.participantId || '';
      const filtered = people
        .filter(person => {
          const haystack = [person.character, person.name, person.nick, person.preferredPiece, person.secondPreferredPiece, person.team]
            .filter(Boolean).join(' ').toLowerCase();
          return !q || haystack.includes(q);
        })
        .sort((a, b) => {
          if (a.id === currentId) return -1;
          if (b.id === currentId) return 1;
          return preferenceScore(b, pieceId) - preferenceScore(a, pieceId) || String(a.character || a.name).localeCompare(String(b.character || b.name));
        });

      count.textContent = `${filtered.length} de ${people.length}`;
      list.innerHTML = filtered.map(person => {
        const character = person.character || person.name || 'Personagem';
        const realName = person.name && person.name !== character ? person.name : '';
        const assigned = assignedPieceFor(person.id, pieceId);
        const selected = currentId === person.id;
        const music = participantMusic(person);
        const score = preferenceScore(person, pieceId);
        const image = person.photo
          ? `<img src="${esc(person.photo)}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid #333;flex:0 0 auto;">`
          : `<div style="width:64px;height:64px;border-radius:10px;border:1px solid #333;background:#141419;display:flex;align-items:center;justify-content:center;font-size:25px;flex:0 0 auto;">♟</div>`;
        const badges = [
          person.preferredPiece ? `<span style="padding:3px 6px;border-radius:999px;background:rgba(0,229,255,.08);color:#9ef8ff;font-size:8px;">1ª ${esc(person.preferredPiece)}</span>` : '',
          person.secondPreferredPiece ? `<span style="padding:3px 6px;border-radius:999px;background:#17171d;color:#aaa;font-size:8px;">2ª ${esc(person.secondPreferredPiece)}</span>` : '',
          person.team ? `<span style="padding:3px 6px;border-radius:999px;background:#17171d;color:#aaa;font-size:8px;">${esc(person.team)}</span>` : '',
          music.url ? `<span style="padding:3px 6px;border-radius:999px;background:rgba(124,255,178,.08);color:#8fffc0;font-size:8px;">♫ COM MÚSICA</span>` : ''
        ].filter(Boolean).join(' ');
        const status = selected ? 'NESTA PEÇA' : assigned ? `EM ${assigned}` : score > 0 ? 'RECOMENDADO' : 'DISPONÍVEL';
        const statusColor = selected ? '#78ffb3' : assigned ? '#ffbd66' : score > 0 ? '#8fdcff' : '#777';
        return `
          <button type="button" data-person-id="${esc(person.id)}" style="text-align:left;background:${selected ? 'rgba(0,229,255,.09)' : '#0f0f14'};border:1px solid ${selected ? 'var(--accent,#00e5ff)' : '#272730'};border-radius:12px;padding:10px;color:#fff;display:flex;gap:11px;align-items:center;cursor:pointer;min-width:0;">
            ${image}
            <div style="min-width:0;flex:1;">
              <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
                <div style="min-width:0;">
                  <strong style="display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(character)}</strong>
                  ${realName ? `<span style="display:block;font-size:9px;color:#777;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Cosplayer: ${esc(realName)}</span>` : ''}
                </div>
                <span style="font-size:8px;font-weight:900;color:${statusColor};white-space:nowrap;">${esc(status)}</span>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:7px;">${badges}</div>
              ${music.name ? `<div style="font-size:8px;color:#666;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">♫ ${esc(music.name)}</div>` : ''}
            </div>
          </button>`;
      }).join('') || '<div style="grid-column:1/-1;padding:28px;text-align:center;color:#777;border:1px dashed #333;border-radius:10px;">Nenhum personagem encontrado.</div>';

      list.querySelectorAll('[data-person-id]').forEach(button => {
        button.addEventListener('click', () => {
          const person = people.find(item => String(item.id) === button.dataset.personId);
          if (!person) return;
          assignParticipant(pieceId, person);
          close();
        });
      });
    }

    modal.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', close));
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    search.addEventListener('input', () => render(search.value));
    modal.querySelector('#participant-v2-unlink')?.addEventListener('click', () => { clearParticipant(pieceId); close(); });
    modal.querySelector('#participant-v2-photo')?.addEventListener('click', () => {
      close();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => {
          if (!store.p[pieceId]) store.p[pieceId] = {};
          store.p[pieceId].img = event.target.result;
          store.p[pieceId].rosterManagedImg = false;
          persist(true);
          enhancedRenderConfigLists();
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });
    render();
    setTimeout(() => search.focus(), 50);
  }

  function soundStatus(piece, participant) {
    const registered = participantMusic(participant);
    const hasSound = !!piece?.sound;
    const source = piece?.soundSource || (hasSound && registered.url === piece.sound ? 'registration' : hasSound ? 'manual' : 'none');
    const label = source === 'registration' ? 'MÚSICA DO CADASTRO' : source === 'manual' ? 'ÁUDIO PERSONALIZADO' : 'SEM MÚSICA';
    const track = piece?.soundName || (source === 'registration' ? registered.name : '') || (hasSound ? filenameFromUrl(piece.sound) : '');
    return { registered, hasSound, source, label, track };
  }

  function enhancedRenderConfigLists() {
    ['white', 'black'].forEach(side => {
      const team = side === 'white' ? 'B' : 'P';
      const cont = document.getElementById(`list-${side}`);
      if (!cont) return;
      const eventName = store?.g?.rosterEvent?.name || '';
      cont.innerHTML = `
        <div style="padding:14px 10px 6px;">
          <div style="font-size:9px;color:var(--accent,#00e5ff);letter-spacing:2px;font-weight:900;">ELENCO · ${side === 'white' ? 'BRANCAS' : 'PRETAS'}</div>
          <div style="font-size:9px;color:#666;margin-top:4px;">${eventName ? esc(eventName) : 'Configure personagem, foto e trilha de entrada.'}</div>
        </div>`;

      [...nobres, ...peoes].forEach(base => {
        const id = `${base}_${team}`;
        const piece = store.p[id] || {};
        const participant = piece.participant || null;
        const character = piece.name || participant?.character || pieceTypeLabel(id);
        const realName = piece.participantRealName || participant?.name || '';
        const info = soundStatus(piece, participant);
        const volume = Number.isFinite(Number(piece.volume)) ? Number(piece.volume) : 0.8;
        const image = piece.img
          ? `background-image:url('${String(piece.img).replace(/'/g, '%27')}');background-size:cover;background-position:center;`
          : '';
        const sourceColor = info.source === 'registration' ? '#8fffc0' : info.source === 'manual' ? '#ffd27d' : '#666';
        const card = document.createElement('div');
        card.className = 'unit-card participant-audio-card';
        card.style.cssText = 'padding:12px;margin-bottom:9px;border:1px solid #24242d;background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.008));border-radius:11px;';
        card.innerHTML = `
          <div style="display:flex;align-items:center;gap:11px;">
            <div style="width:46px;height:46px;${image}background-color:#09090d;border-radius:9px;border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;flex:0 0 auto;">${piece.img ? '' : '♟'}</div>
            <div style="min-width:0;flex:1;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <strong style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${esc(character)}</strong>
                <span style="font-size:8px;padding:2px 5px;border-radius:999px;background:#17171d;color:#777;">${esc(pieceTypeLabel(id))} · ${esc(id)}</span>
              </div>
              <div style="font-size:9px;color:#777;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${realName ? `Cosplayer: ${esc(realName)}` : 'Nenhum participante escalado'}</div>
            </div>
            <button type="button" onclick="triggerQuickUpload('${id}')" title="Trocar participante" style="background:#15151b;border:1px solid #333;color:var(--accent,#00e5ff);border-radius:8px;padding:7px 8px;cursor:pointer;font-size:9px;">TROCAR</button>
          </div>

          <div style="margin-top:11px;padding:10px;border-radius:9px;background:#0b0b10;border:1px solid #222;">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
              <div style="min-width:0;">
                <div style="font-size:8px;letter-spacing:1.2px;font-weight:900;color:${sourceColor};">${info.label}</div>
                <div style="font-size:10px;color:#ddd;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${info.track ? `♫ ${esc(info.track)}` : 'Escolha uma trilha para este personagem'}</div>
              </div>
              <div style="display:flex;gap:5px;flex:0 0 auto;">
                <button type="button" onclick="playPiecePreview('${id}')" title="Ouvir" style="width:32px;height:30px;border-radius:7px;border:1px solid #2f555a;background:#0d292d;color:#a9fbff;cursor:pointer;">▶</button>
                <button type="button" onclick="pausePiecePreview('${id}')" title="Parar" style="width:32px;height:30px;border-radius:7px;border:1px solid #49313a;background:#241118;color:#ff9db7;cursor:pointer;">■</button>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px;">
              <button type="button" onclick="pickParticipantAudio('${id}')" style="border:1px solid #333;background:#17171d;color:#fff;border-radius:7px;padding:8px;font-size:8px;cursor:pointer;">🎵 ESCOLHER ARQUIVO</button>
              ${info.registered.url
                ? `<button type="button" onclick="useRegisteredParticipantAudio('${id}')" style="border:1px solid rgba(0,229,255,.28);background:rgba(0,229,255,.06);color:#aafaff;border-radius:7px;padding:8px;font-size:8px;cursor:pointer;">↩ USAR MÚSICA DO SITE</button>`
                : `<button type="button" onclick="clearParticipantAudio('${id}')" ${info.hasSound ? '' : 'disabled'} style="border:1px solid #33242a;background:#1c1115;color:#ff91ac;border-radius:7px;padding:8px;font-size:8px;cursor:${info.hasSound ? 'pointer' : 'not-allowed'};opacity:${info.hasSound ? '1' : '.4'};">✕ REMOVER ÁUDIO</button>`}
            </div>
            ${info.registered.url && info.hasSound ? `<button type="button" onclick="clearParticipantAudio('${id}')" style="width:100%;margin-top:6px;border:0;background:transparent;color:#76515d;padding:4px;font-size:8px;cursor:pointer;">remover áudio</button>` : ''}

            <div style="display:flex;align-items:center;gap:9px;margin-top:9px;">
              <span style="font-size:8px;color:#666;">VOL</span>
              <input type="range" min="0" max="1" step="0.05" value="${volume}" style="flex:1;" oninput="updatePieceVolume('${id}',this.value);document.getElementById('participant-vol-${id}').textContent=Math.round(this.value*100)+'%'">
              <span id="participant-vol-${id}" style="width:30px;text-align:right;font-size:8px;color:#888;">${Math.round(volume * 100)}%</span>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;">
            <button type="button" onclick="pickParticipantPhoto('${id}')" style="border:1px solid #2b2b34;background:#141419;color:#bbb;border-radius:7px;padding:7px;font-size:8px;cursor:pointer;">🖼 TROCAR FOTO</button>
            <button type="button" onclick="editParticipantDisplayName('${id}')" style="border:1px solid #2b2b34;background:#141419;color:#bbb;border-radius:7px;padding:7px;font-size:8px;cursor:pointer;">✎ NOME NO JOGO</button>
          </div>`;
        cont.appendChild(card);
      });
    });
  }

  window.pickParticipantAudio = function(id) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm,.opus';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = event => {
        if (!store.p[id]) store.p[id] = {};
        store.p[id].sound = event.target.result;
        store.p[id].soundName = file.name;
        store.p[id].soundSource = 'manual';
        store.p[id].rosterManagedSound = true;
        if (store.p[id].volume === undefined) store.p[id].volume = 0.8;
        resetPieceAudioCache(id);
        persist(false);
        enhancedRenderConfigLists();
        notify(`Áudio “${file.name}” definido para ${store.p[id].name || id}.`);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  window.useRegisteredParticipantAudio = function(id) {
    const piece = store.p[id] || {};
    const info = participantMusic(piece.participant);
    if (!info.url) {
      notify('Esse participante não possui música cadastrada no site.', true);
      return;
    }
    if (!store.p[id]) store.p[id] = {};
    store.p[id].sound = info.url;
    store.p[id].soundName = info.name || 'Música do personagem';
    store.p[id].soundSource = 'registration';
    store.p[id].rosterManagedSound = true;
    if (store.p[id].volume === undefined) store.p[id].volume = 0.8;
    resetPieceAudioCache(id);
    persist(false);
    enhancedRenderConfigLists();
    notify(`Música cadastrada no site aplicada a ${store.p[id].name || id}.`);
  };

  window.clearParticipantAudio = function(id) {
    if (!store.p[id]) return;
    resetPieceAudioCache(id);
    delete store.p[id].sound;
    delete store.p[id].soundName;
    delete store.p[id].soundSource;
    delete store.p[id].rosterManagedSound;
    persist(false);
    enhancedRenderConfigLists();
    notify(`Áudio removido de ${store.p[id].name || id}.`);
  };

  window.pickParticipantPhoto = function(id) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = event => {
        if (!store.p[id]) store.p[id] = {};
        store.p[id].img = event.target.result;
        store.p[id].rosterManagedImg = false;
        persist(true);
        enhancedRenderConfigLists();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  window.editParticipantDisplayName = function(id) {
    if (!store.p[id]) store.p[id] = {};
    const current = store.p[id].name || store.p[id].participant?.character || pieceTypeLabel(id);
    const next = prompt('Nome que aparecerá no jogo:', current);
    if (next === null) return;
    const value = next.trim();
    if (!value) return;
    store.p[id].name = value;
    store.p[id].rosterManagedName = false;
    persist(true);
    enhancedRenderConfigLists();
  };

  const originalUpPieceSound = typeof window.upPieceSound === 'function' ? window.upPieceSound : null;
  window.upPieceSound = function(id, input) {
    const file = input?.files?.[0];
    if (!file) {
      if (originalUpPieceSound) return originalUpPieceSound(id, input);
      return;
    }
    const reader = new FileReader();
    reader.onload = event => {
      if (!store.p[id]) store.p[id] = {};
      store.p[id].sound = event.target.result;
      store.p[id].soundName = file.name;
      store.p[id].soundSource = 'manual';
      store.p[id].rosterManagedSound = true;
      if (store.p[id].volume === undefined) store.p[id].volume = 0.8;
      resetPieceAudioCache(id);
      persist(false);
      enhancedRenderConfigLists();
    };
    reader.readAsDataURL(file);
  };

  try { renderConfigLists = enhancedRenderConfigLists; } catch (_) { window.renderConfigLists = enhancedRenderConfigLists; }
  window.renderConfigLists = enhancedRenderConfigLists;
  try { triggerQuickUpload = openParticipantPicker; } catch (_) { window.triggerQuickUpload = openParticipantPicker; }
  window.triggerQuickUpload = openParticipantPicker;
  window.openParticipantPicker = openParticipantPicker;

  // Corrige peças já escaladas por versões anteriores: o nome mostrado passa a ser o personagem/cosplay.
  try {
    Object.keys(store?.p || {}).forEach(id => {
      const piece = store.p[id];
      if (!piece?.participant) return;
      const character = piece.participant.character;
      if (character && (piece.rosterManagedName || piece.name === piece.participant.name)) {
        piece.participantRealName = piece.participant.name || piece.participantRealName || '';
        piece.name = character;
        piece.rosterManagedName = true;
      }
      const registered = participantMusic(piece.participant);
      if (!piece.sound && registered.url) {
        piece.sound = registered.url;
        piece.soundName = registered.name || 'Música do personagem';
        piece.soundSource = 'registration';
        piece.rosterManagedSound = true;
        if (piece.volume === undefined) piece.volume = 0.8;
      }
    });
    persist(true);
  } catch (_) {}

  try { enhancedRenderConfigLists(); } catch (_) {}
})();