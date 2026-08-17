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
