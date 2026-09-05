/* Integração do elenco da Landing Page com o Cosplay Chess */
(() => {
    const ROSTER_TYPES = new Set(['cosplaychess-participants', 'cosplaychess-roster', 'cosplaychess-event-roster']);

    function rosterData() {
        if (!store?.g) return { participants: [] };
        return store.g.importedRoster || { participants: [] };
    }

    function participants() {
        const list = rosterData().participants;
        return Array.isArray(list) ? list : [];
    }

    function escapeHtml(value = '') {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function participantLabel(person) {
        const character = person.cosplay || person.personagem || person.character || person.nick || '';
        const name = person.nome || person.name || '';
        return character && name ? `${character} — ${name}` : (character || name || 'Participante');
    }

    function participantPieceName(person) {
        return String(person.cosplay || person.personagem || person.character || person.nick || person.nome || person.name || 'PARTICIPANTE').trim();
    }

    function participantPhoto(person) {
        const candidate = person.photoDataUrl || person.fotoDataUrl || person.photo || person.foto || person.photoUrl || person.fotoUrl || '';
        return typeof candidate === 'string' ? candidate : '';
    }

    function normalizeRoster(payload) {
        if (!payload || typeof payload !== 'object') throw new Error('Arquivo de elenco inválido.');

        const type = String(payload.type || payload.kind || '').toLowerCase();
        const list = payload.participants || payload.participantes || payload.registrations || payload.inscritos;
        if (!Array.isArray(list)) throw new Error('O arquivo não possui uma lista de participantes.');

        if (type && !ROSTER_TYPES.has(type)) {
            throw new Error('Este JSON não foi reconhecido como um arquivo de elenco do Cosplay Chess.');
        }

        const normalized = list.map((person, index) => ({
            id: person.id || person.registrationId || person.inscricaoId || `import-${index + 1}`,
            nome: person.nome || person.name || '',
            nick: person.nick || '',
            cosplay: person.cosplay || person.personagem || person.character || '',
            email: person.email || '',
            whatsapp: person.whatsapp || person.telefone || '',
            cidade: person.cidade || person.city || '',
            lado: person.lado || person.side || 'Sem preferência',
            participacao: person.tipoParticipacao || person.participacao || person.type || '',
            photoDataUrl: participantPhoto(person),
            source: person.source || 'landing-page'
        }));

        return {
            type: 'cosplaychess-participants',
            version: Number(payload.version || 1),
            exportedAt: payload.exportedAt || payload.geradoEm || new Date().toISOString(),
            event: payload.event || payload.evento || null,
            participants: normalized
        };
    }

    function rosterSummary() {
        const roster = rosterData();
        const count = participants().length;
        const eventName = roster.event?.name || roster.event?.nome || roster.event?.title || roster.event?.titulo || '';
        if (!count) return 'Nenhum elenco importado.';
        return `${count} participante(s)${eventName ? ` • ${eventName}` : ''}`;
    }

    function updateRosterCard() {
        const summary = document.getElementById('landing-roster-summary');
        if (summary) summary.textContent = rosterSummary();
        const clearButton = document.getElementById('landing-roster-clear');
        if (clearButton) clearButton.style.display = participants().length ? '' : 'none';
    }

    function importRosterFile(input) {
        const file = input?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const roster = normalizeRoster(JSON.parse(String(reader.result || '')));
                store.g.importedRoster = roster;
                save();
                updateRosterCard();
                alert(`${roster.participants.length} participante(s) importados.\n\nAgora, no MODO EDIÇÃO, clique em uma peça e escolha um inscrito da lista.`);
            } catch (error) {
                alert(`Não foi possível importar o elenco.\n\n${error.message || error}`);
            } finally {
                input.value = '';
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    function clearImportedRoster() {
        if (!participants().length) return;
        if (!confirm('Remover o elenco importado da Landing Page?\n\nOs nomes e fotos já atribuídos às peças não serão apagados.')) return;
        delete store.g.importedRoster;
        save();
        updateRosterCard();
    }

    window.importRosterFile = importRosterFile;
    window.clearImportedRoster = clearImportedRoster;

    function injectStyles() {
        if (document.getElementById('landing-roster-styles')) return;
        const style = document.createElement('style');
        style.id = 'landing-roster-styles';
        style.textContent = `
            #landing-roster-card {
                border-color: rgba(214,169,77,.32) !important;
                background: linear-gradient(145deg, rgba(45,22,39,.52), rgba(8,9,15,.96)) !important;
            }
            #landing-roster-card .roster-title {
                color:#e4bc68; font-family:Georgia,serif; font-size:11px; letter-spacing:1.2px;
            }
            #landing-roster-summary { color:#b6afba; font-size:9px; line-height:1.45; margin-top:7px; }
            .roster-actions { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:10px; }
            .roster-actions .btn-play-sm { width:100%; min-height:33px; font-size:8px; }
            #piece-name-editor .roster-picker-wrap { margin-bottom:14px; }
            #piece-name-editor .roster-picker-wrap label { display:block; color:#d9ab55; font-size:9px; font-weight:800; letter-spacing:1px; margin-bottom:6px; }
            #piece-name-editor .roster-picker {
                width:100%; background:#09090e; color:#fff; border:1px solid #423547; border-radius:9px;
                padding:11px 12px; font-size:11px; outline:none;
            }
            #piece-name-editor .roster-preview { display:none; align-items:center; gap:10px; margin-top:10px; padding:9px; border:1px solid rgba(217,171,85,.18); border-radius:9px; background:rgba(255,255,255,.025); }
            #piece-name-editor .roster-preview.show { display:flex; }
            #piece-name-editor .roster-preview-photo { width:44px; height:44px; border-radius:8px; background:#050509 center/cover no-repeat; border:1px solid rgba(217,171,85,.28); flex:0 0 auto; }
            #piece-name-editor .roster-preview-text strong { display:block; color:#f4ead7; font-size:11px; }
            #piece-name-editor .roster-preview-text span { display:block; color:#8f8993; font-size:9px; margin-top:3px; }
        `;
        document.head.appendChild(style);
    }

    function injectRosterCard() {
        if (document.getElementById('landing-roster-card')) return;
        const systemList = document.getElementById('list-sys');
        if (!systemList) return;

        const card = document.createElement('div');
        card.id = 'landing-roster-card';
        card.className = 'unit-card';
        card.innerHTML = `
            <div class="roster-title">♛ ELENCO DA LANDING PAGE</div>
            <div id="landing-roster-summary">Nenhum elenco importado.</div>
            <div style="font-size:8px; color:#706b75; line-height:1.45; margin-top:7px;">
                Importe o arquivo exportado pelo painel administrativo. Nomes e fotos ficam disponíveis ao clicar nas peças em modo de edição.
            </div>
            <div class="roster-actions">
                <button class="btn-play-sm" onclick="document.getElementById('landing-roster-file').click()">IMPORTAR ELENCO</button>
                <button id="landing-roster-clear" class="btn-play-sm" onclick="clearImportedRoster()" style="display:none; color:#d9ab55; border-color:rgba(217,171,85,.45);">REMOVER ELENCO</button>
            </div>
            <input id="landing-roster-file" type="file" accept=".json,.cosplaychess,application/json" style="display:none" onchange="importRosterFile(this)">
        `;

        const quickCard = document.getElementById('quick-setup-card');
        if (quickCard?.nextSibling) systemList.insertBefore(card, quickCard.nextSibling);
        else if (quickCard) systemList.appendChild(card);
        else systemList.insertBefore(card, systemList.firstChild);
        updateRosterCard();
    }

    function openRosterPieceEditor(id) {
        document.getElementById('piece-name-editor')?.remove();
        const list = participants();
        const currentName = store.p[id]?.name || pieceNames[id.charAt(0)] || id;
        const currentRegistration = store.p[id]?.registrationId || '';
        const modal = document.createElement('div');
        modal.id = 'piece-name-editor';

        const options = list.map((person, index) => {
            const value = escapeHtml(String(person.id || index));
            const selected = String(person.id || index) === String(currentRegistration) ? ' selected' : '';
            return `<option value="${value}" data-index="${index}"${selected}>${escapeHtml(participantLabel(person))}</option>`;
        }).join('');

        modal.innerHTML = `
            <div class="editor-card">
                <h3>IDENTIFICAR PEÇA</h3>
                <p>${id} • Digite o nome manualmente ou selecione um participante importado da Landing Page.</p>
                ${list.length ? `
                    <div class="roster-picker-wrap">
                        <label>USAR INSCRITO</label>
                        <select id="piece-roster-picker" class="roster-picker">
                            <option value="">Selecionar participante...</option>
                            ${options}
                        </select>
                        <div id="piece-roster-preview" class="roster-preview">
                            <div id="piece-roster-photo" class="roster-preview-photo"></div>
                            <div class="roster-preview-text"><strong id="piece-roster-character"></strong><span id="piece-roster-person"></span></div>
                        </div>
                    </div>
                ` : ''}
                <input id="piece-name-editor-input" type="text" maxlength="60" autocomplete="off" value="${escapeHtml(currentName)}">
                <div class="editor-actions">
                    <button class="btn" id="piece-name-cancel">CANCELAR</button>
                    <button class="btn btn-yes" id="piece-name-save">SALVAR PEÇA</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const input = modal.querySelector('#piece-name-editor-input');
        const picker = modal.querySelector('#piece-roster-picker');
        let chosen = null;

        const showParticipant = person => {
            const preview = modal.querySelector('#piece-roster-preview');
            if (!preview) return;
            if (!person) {
                preview.classList.remove('show');
                return;
            }
            preview.classList.add('show');
            const photoEl = modal.querySelector('#piece-roster-photo');
            const characterEl = modal.querySelector('#piece-roster-character');
            const personEl = modal.querySelector('#piece-roster-person');
            const photo = participantPhoto(person);
            if (photoEl) photoEl.style.backgroundImage = photo ? `url(${JSON.stringify(photo).slice(1,-1)})` : '';
            if (characterEl) characterEl.textContent = participantPieceName(person);
            if (personEl) personEl.textContent = person.nome || person.name || '';
        };

        if (picker) {
            picker.addEventListener('change', () => {
                const option = picker.options[picker.selectedIndex];
                const index = option?.dataset?.index;
                chosen = index !== undefined ? list[Number(index)] : null;
                if (chosen) input.value = participantPieceName(chosen);
                showParticipant(chosen);
            });
            if (picker.selectedIndex > 0) picker.dispatchEvent(new Event('change'));
        }

        const close = () => modal.remove();
        const commit = () => {
            const value = input.value.trim();
            if (!store.p[id]) store.p[id] = {};
            if (value) store.p[id].name = value.toUpperCase();
            else delete store.p[id].name;

            if (chosen) {
                const photo = participantPhoto(chosen);
                if (photo) store.p[id].img = photo;
                store.p[id].registrationId = chosen.id;
                store.p[id].participantName = chosen.nome || chosen.name || '';
                store.p[id].participantEmail = chosen.email || '';
                store.p[id].participantWhatsapp = chosen.whatsapp || '';
                store.p[id].participantSidePreference = chosen.lado || '';
            }

            save();
            renderBoard();
            renderConfigLists();
            close();
        };

        modal.querySelector('#piece-name-cancel').onclick = close;
        modal.querySelector('#piece-name-save').onclick = commit;
        modal.onclick = event => { if (event.target === modal) close(); };
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') close();
        });
        setTimeout(() => { input.focus(); input.select(); }, 30);
    }

    function installEditorOverride() {
        if (typeof triggerQuickUpload !== 'function') return false;
        triggerQuickUpload = function(id) { openRosterPieceEditor(id); };
        return true;
    }

    function init() {
        if (typeof store === 'undefined' || !store?.g) return;
        injectStyles();
        injectRosterCard();
        installEditorOverride();
        updateRosterCard();
    }

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(init, 500);
        setTimeout(init, 1400);
    }, { once:true });

    if (document.readyState !== 'loading') {
        setTimeout(init, 500);
        setTimeout(init, 1400);
    }
})();

/* Peças extras personalizadas - recurso exclusivo da versão Windows/Electron */
(() => {
    if (window.__cosplayCustomPiecesInstalled) return;
    window.__cosplayCustomPiecesInstalled = true;

    const TYPES = {
        P: { label: 'PEÃO / INFANTARIA', icon: '♟' },
        T: { label: 'TORRE', icon: '♜' },
        C: { label: 'CAVALO / CAVALARIA', icon: '♞' },
        B: { label: 'BISPO', icon: '♝' },
        Q: { label: 'RAINHA', icon: '♛' },
        K: { label: 'REI', icon: '♚' }
    };

    let pendingPlacementId = null;

    const esc = value => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    function customIds(side = null) {
        if (typeof store === 'undefined' || !store?.p) return [];
        return Object.keys(store.p).filter(id => store.p[id]?.customPiece && (!side || id.endsWith('_' + side)));
    }

    function fileAsDataUrl(file) {
        if (!file) return Promise.resolve('');
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o arquivo.'));
            reader.readAsDataURL(file);
        });
    }

    function makeId(type, side) {
        let id;
        do {
            id = `${type}X${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2,5).toUpperCase()}_${side}`;
        } while (store.p[id]);
        return id;
    }

    function ensureStyles() {
        if (document.getElementById('custom-piece-styles')) return;
        const style = document.createElement('style');
        style.id = 'custom-piece-styles';
        style.textContent = `
          #custom-piece-card{border-color:rgba(0,229,255,.3)!important;background:linear-gradient(145deg,rgba(0,229,255,.08),rgba(10,11,17,.96))!important}
          #custom-piece-card .custom-piece-title{font-size:11px;font-weight:900;letter-spacing:1px;color:var(--accent)}
          #custom-piece-card p{font-size:8px;line-height:1.45;color:#8e8995;margin:7px 0 10px}
          #custom-piece-card button{width:100%;min-height:36px}
          #custom-piece-modal{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;background:rgba(3,4,8,.88);backdrop-filter:blur(9px)}
          #custom-piece-modal .cp-card{width:min(560px,92vw);max-height:88vh;overflow:auto;padding:24px;border-radius:16px;border:1px solid rgba(0,229,255,.42);background:linear-gradient(155deg,#15111b,#080a0f 72%);box-shadow:0 30px 90px rgba(0,0,0,.75)}
          #custom-piece-modal h2{font-family:Georgia,serif;color:#f4ead7;font-size:20px;margin:0 0 5px}
          #custom-piece-modal .cp-sub{color:#8e8995;font-size:9px;line-height:1.5;margin-bottom:18px}
          #custom-piece-modal .cp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
          #custom-piece-modal label{display:block;color:#d9ab55;font-size:9px;font-weight:900;letter-spacing:.8px}
          #custom-piece-modal input,#custom-piece-modal select{width:100%;margin-top:6px;min-height:42px;padding:9px 11px;border:1px solid #393340;border-radius:9px;background:#090a0f;color:#fff;font-size:12px;outline:none}
          #custom-piece-modal input:focus,#custom-piece-modal select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,229,255,.09)}
          #custom-piece-modal .cp-file{grid-column:1/-1}
          #custom-piece-modal .cp-preview{display:flex;align-items:center;gap:12px;margin-top:8px;padding:9px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:rgba(255,255,255,.025)}
          #custom-piece-modal .cp-photo{width:64px;height:64px;flex:0 0 auto;border-radius:10px;background:#050509 center/cover no-repeat;border:1px solid rgba(255,255,255,.11)}
          #custom-piece-modal .cp-file-info{min-width:0;color:#98929f;font-size:9px;line-height:1.5;word-break:break-word}
          #custom-piece-modal .cp-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}
          #custom-piece-modal .cp-danger{grid-column:1/-1;color:#ff7894;border-color:rgba(255,70,115,.38);background:rgba(255,70,115,.06)}
          .custom-extra-heading{margin:18px 0 9px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);font-size:9px;font-weight:900;letter-spacing:1.4px;color:var(--accent)}
          .custom-extra-piece{display:grid;grid-template-columns:46px minmax(0,1fr);gap:10px;align-items:center;margin-bottom:8px;padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.025)}
          .custom-extra-piece .cp-thumb{width:46px;height:46px;border-radius:8px;background:#050509 center/cover no-repeat;border:1px solid rgba(255,255,255,.1);display:grid;place-items:center;font-size:22px}
          .custom-extra-piece strong{display:block;color:#f2edf4;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          .custom-extra-piece small{display:block;color:#77717e;font-size:8px;margin-top:3px}
          .custom-extra-piece .cp-mini-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:7px}
          .custom-extra-piece .cp-mini-actions button{min-height:27px;padding:4px 5px;font-size:7px}
          #custom-piece-placement{position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:13000;padding:11px 16px;border:1px solid var(--accent);border-radius:10px;background:rgba(7,11,17,.96);color:#fff;font-size:10px;font-weight:900;letter-spacing:.5px;box-shadow:0 12px 40px rgba(0,0,0,.55)}
          #board.custom-piece-placement-active{outline:3px solid var(--accent);outline-offset:5px}
          @media(max-width:640px){#custom-piece-modal .cp-grid{grid-template-columns:1fr}#custom-piece-modal .cp-file{grid-column:auto}}
        `;
        document.head.appendChild(style);
    }

    function placementNotice(text) {
        document.getElementById('custom-piece-placement')?.remove();
        if (!text) return;
        const notice = document.createElement('div');
        notice.id = 'custom-piece-placement';
        notice.textContent = text;
        document.body.appendChild(notice);
    }

    function cancelPlacement() {
        pendingPlacementId = null;
        document.getElementById('board')?.classList.remove('custom-piece-placement-active');
        placementNotice('');
    }

    function beginPlacement(id) {
        if (!store.p[id]) return;
        if (!store.board.some(cell => !cell)) {
            alert('O tabuleiro está cheio. Remova uma peça antes de colocar esta nova peça.');
            return;
        }
        pendingPlacementId = id;
        document.getElementById('board')?.classList.add('custom-piece-placement-active');
        placementNotice(`NOVA PEÇA: clique em uma casa vazia para colocar ${store.p[id].name || TYPES[id.charAt(0)]?.label || 'a peça'}. ESC cancela.`);
    }

    function removeEverywhere(id) {
        store.board = store.board.map(pieceId => pieceId === id ? null : pieceId);
        store.graveyard = (store.graveyard || []).filter(pieceId => pieceId !== id);
        if (pieceSoundAudios?.[id]) {
            try { pieceSoundAudios[id].pause(); } catch (_) {}
            delete pieceSoundAudios[id];
        }
        delete store.p[id];
        if (pendingPlacementId === id) cancelPlacement();
        save();
        renderBoard();
        renderGraveyard();
        renderConfigLists();
    }

    function openCustomPieceModal(id = null) {
        document.getElementById('custom-piece-modal')?.remove();
        const editing = !!id;
        const current = editing ? (store.p[id] || {}) : {};
        const currentType = editing ? id.charAt(0) : 'P';
        const currentSide = editing ? (id.endsWith('_B') ? 'B' : 'P') : 'B';
        const modal = document.createElement('div');
        modal.id = 'custom-piece-modal';
        modal.innerHTML = `
          <div class="cp-card">
            <h2>${editing ? 'EDITAR PEÇA EXTRA' : 'ADICIONAR NOVA PEÇA'}</h2>
            <div class="cp-sub">Escolha o comportamento de xadrez da peça, o lado, o nome, a foto e uma música/som próprio para os duelos.</div>
            <div class="cp-grid">
              <label>TIPO / MOVIMENTO
                <select id="cp-type" ${editing ? 'disabled' : ''}>
                  ${Object.entries(TYPES).map(([key, data]) => `<option value="${key}" ${key === currentType ? 'selected' : ''}>${data.icon} ${data.label}</option>`).join('')}
                </select>
              </label>
              <label>LADO
                <select id="cp-side" ${editing ? 'disabled' : ''}>
                  <option value="B" ${currentSide === 'B' ? 'selected' : ''}>⚪ BRANCAS</option>
                  <option value="P" ${currentSide === 'P' ? 'selected' : ''}>⚫ PRETAS</option>
                </select>
              </label>
              <label style="grid-column:1/-1">NOME / PERSONAGEM
                <input id="cp-name" maxlength="60" autocomplete="off" placeholder="Ex.: GOKU, BATMAN, MIKASA..." value="${esc(current.name || '')}">
              </label>
              <label class="cp-file">FOTO DA PEÇA
                <input id="cp-photo" type="file" accept="image/*">
                <div class="cp-preview"><div id="cp-photo-preview" class="cp-photo" style="${current.img ? `background-image:url('${String(current.img).replace(/'/g, '%27')}')` : ''}"></div><div class="cp-file-info">${current.img ? 'Foto atual carregada. Escolha outra para substituir.' : 'Opcional. A foto aparecerá no tabuleiro e na tela de duelo.'}</div></div>
              </label>
              <label class="cp-file">MÚSICA / SOM DA PEÇA
                <input id="cp-sound" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac">
                <div class="cp-preview"><div style="font-size:26px">🎵</div><div id="cp-sound-info" class="cp-file-info">${current.sound ? 'Áudio atual carregado. Escolha outro arquivo para substituir.' : 'Opcional. Será o som individual desta peça nos duelos.'}</div></div>
              </label>
            </div>
            <div class="cp-actions">
              <button type="button" class="btn" id="cp-cancel">CANCELAR</button>
              <button type="button" class="btn btn-yes" id="cp-save">${editing ? 'SALVAR ALTERAÇÕES' : 'CRIAR E COLOCAR'}</button>
              ${editing ? '<button type="button" class="btn cp-danger" id="cp-delete">EXCLUIR ESTA PEÇA EXTRA</button>' : ''}
            </div>
          </div>`;
        document.body.appendChild(modal);

        const photoInput = modal.querySelector('#cp-photo');
        const soundInput = modal.querySelector('#cp-sound');
        const preview = modal.querySelector('#cp-photo-preview');
        const soundInfo = modal.querySelector('#cp-sound-info');
        const close = () => modal.remove();

        photoInput.addEventListener('change', () => {
            const file = photoInput.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            preview.style.backgroundImage = `url('${url}')`;
        });
        soundInput.addEventListener('change', () => {
            const file = soundInput.files?.[0];
            if (file) soundInfo.textContent = `${file.name} • ${(file.size / 1024 / 1024).toFixed(1)} MB`;
        });

        modal.querySelector('#cp-cancel').onclick = close;
        modal.onclick = event => { if (event.target === modal) close(); };
        modal.querySelector('#cp-save').onclick = async () => {
            const saveButton = modal.querySelector('#cp-save');
            const name = modal.querySelector('#cp-name').value.trim();
            if (!name) {
                alert('Digite um nome para a nova peça.');
                modal.querySelector('#cp-name').focus();
                return;
            }
            saveButton.disabled = true;
            saveButton.textContent = 'SALVANDO...';
            try {
                const type = modal.querySelector('#cp-type').value;
                const side = modal.querySelector('#cp-side').value;
                const targetId = editing ? id : makeId(type, side);
                const data = editing ? store.p[targetId] : {};
                data.customPiece = true;
                data.archetype = type;
                data.name = name.toUpperCase();
                if (data.volume === undefined) data.volume = 0.8;

                const photo = photoInput.files?.[0];
                const sound = soundInput.files?.[0];
                if (photo) data.img = await fileAsDataUrl(photo);
                if (sound) {
                    data.sound = await fileAsDataUrl(sound);
                    if (pieceSoundAudios?.[targetId]) {
                        try { pieceSoundAudios[targetId].pause(); } catch (_) {}
                        delete pieceSoundAudios[targetId];
                    }
                }
                store.p[targetId] = data;
                save();
                renderBoard();
                renderConfigLists();
                close();
                if (!editing) beginPlacement(targetId);
            } catch (error) {
                alert(`Não foi possível salvar a peça.\n\n${error.message || error}`);
                saveButton.disabled = false;
                saveButton.textContent = editing ? 'SALVAR ALTERAÇÕES' : 'CRIAR E COLOCAR';
            }
        };

        const deleteButton = modal.querySelector('#cp-delete');
        if (deleteButton) deleteButton.onclick = () => {
            if (!confirm(`Excluir definitivamente a peça extra "${current.name || id}"?`)) return;
            close();
            removeEverywhere(id);
        };

        setTimeout(() => modal.querySelector('#cp-name')?.focus(), 30);
    }

    function renderCustomPieceCards() {
        [['B', 'list-white'], ['P', 'list-black']].forEach(([side, listId]) => {
            const list = document.getElementById(listId);
            if (!list) return;
            list.querySelectorAll('[data-custom-extra-root]').forEach(node => node.remove());
            const ids = customIds(side);
            if (!ids.length) return;

            const root = document.createElement('div');
            root.dataset.customExtraRoot = '1';
            root.innerHTML = `<div class="custom-extra-heading">➕ PEÇAS EXTRAS (${ids.length})</div>`;
            ids.forEach(id => {
                const data = store.p[id] || {};
                const onBoard = store.board.includes(id);
                const card = document.createElement('div');
                card.className = 'custom-extra-piece';
                card.innerHTML = `
                  <div class="cp-thumb" style="${data.img ? `background-image:url('${String(data.img).replace(/'/g, '%27')}')` : ''}">${data.img ? '' : (TYPES[id.charAt(0)]?.icon || '♟')}</div>
                  <div style="min-width:0">
                    <strong>${esc(data.name || id)}</strong>
                    <small>${esc(TYPES[id.charAt(0)]?.label || 'PEÇA')} • ${onBoard ? 'NO TABULEIRO' : 'FORA DO TABULEIRO'}${data.sound ? ' • 🎵' : ''}</small>
                    <div class="cp-mini-actions">
                      <button class="btn-play-sm" data-place>COLOCAR</button>
                      <button class="btn-play-sm" data-edit>EDITAR</button>
                      <button class="btn-play-sm" data-remove>EXCLUIR</button>
                    </div>
                  </div>`;
                card.querySelector('[data-place]').onclick = () => beginPlacement(id);
                card.querySelector('[data-edit]').onclick = () => openCustomPieceModal(id);
                card.querySelector('[data-remove]').onclick = () => {
                    if (confirm(`Excluir definitivamente a peça extra "${data.name || id}"?`)) removeEverywhere(id);
                };
                root.appendChild(card);
            });
            list.appendChild(root);
        });
    }

    function injectSystemCard() {
        const systemList = document.getElementById('list-sys');
        if (!systemList || document.getElementById('custom-piece-card')) return false;
        const card = document.createElement('div');
        card.id = 'custom-piece-card';
        card.className = 'unit-card';
        card.innerHTML = `
          <div class="custom-piece-title">➕ CRIADOR DE PEÇAS EXTRAS</div>
          <p>Crie uma peça além da formação normal, escolha o tipo de movimento, lado, nome, foto e música própria.</p>
          <button type="button" class="btn btn-yes" id="custom-piece-add">+ ADICIONAR NOVA PEÇA</button>`;
        const dataCard = [...systemList.querySelectorAll('.unit-card')].find(node => (node.textContent || '').includes('GESTÃO DE DADOS'));
        if (dataCard) dataCard.insertAdjacentElement('beforebegin', card);
        else systemList.insertBefore(card, systemList.firstChild);
        card.querySelector('#custom-piece-add').onclick = () => openCustomPieceModal();
        return true;
    }

    function installRendererHook() {
        if (window.__cosplayCustomPieceRenderHook || typeof renderConfigLists !== 'function') return;
        window.__cosplayCustomPieceRenderHook = true;
        const original = renderConfigLists;
        renderConfigLists = function(...args) {
            const result = original.apply(this, args);
            renderCustomPieceCards();
            return result;
        };
    }

    function installBoardPlacement() {
        const board = document.getElementById('board');
        if (!board || board.dataset.customPlacementBound === '1') return false;
        board.dataset.customPlacementBound = '1';
        board.addEventListener('click', event => {
            if (!pendingPlacementId) return;
            const square = event.target.closest('.sq');
            if (!square || !board.contains(square)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const index = Array.from(board.children).indexOf(square);
            if (index < 0) return;
            if (store.board[index]) {
                placementNotice('Essa casa já está ocupada. Escolha uma casa vazia. ESC cancela.');
                return;
            }
            store.board[index] = pendingPlacementId;
            const name = store.p[pendingPlacementId]?.name || pendingPlacementId;
            cancelPlacement();
            save();
            renderBoard();
            renderConfigLists();
            placementNotice(`${name} adicionada ao tabuleiro.`);
            setTimeout(() => placementNotice(''), 1600);
        }, true);
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && pendingPlacementId) cancelPlacement();
        });
        return true;
    }

    function init() {
        if (typeof store === 'undefined' || !store?.p || !Array.isArray(store.board)) return false;
        ensureStyles();
        injectSystemCard();
        installRendererHook();
        installBoardPlacement();
        renderCustomPieceCards();
        return true;
    }

    const boot = () => {
        let tries = 0;
        const timer = setInterval(() => {
            tries += 1;
            if (init() || tries > 40) clearInterval(timer);
        }, 250);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
    else boot();
})();
