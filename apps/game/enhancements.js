/* Cosplay Chess - formações de elenco, Setup Rápido e edição eficiente */
(() => {
    const LAYOUTS = {
        20: {
            label: '20 PEÇAS',
            description: '10 por lado • 6 peões, 2 cavalos, rainha e rei',
            backRank: [null, null, 'C1', 'Q1', 'K1', 'C2', null, null],
            pawns: [null, 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', null]
        },
        24: {
            label: '24 PEÇAS',
            description: '12 por lado • torres ao lado dos cavalos',
            backRank: [null, 'T1', 'C1', 'Q1', 'K1', 'C2', 'T2', null],
            pawns: [null, 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', null]
        },
        32: {
            label: '32 PEÇAS',
            description: '16 por lado • formação clássica completa',
            backRank: ['T1', 'C1', 'B1', 'Q1', 'K1', 'B2', 'C2', 'T2'],
            pawns: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']
        }
    };

    let enhancementsReady = false;
    let selectedMusicFolder = null;

    function normalizeLayout(value) {
        const n = Number(value);
        return LAYOUTS[n] ? n : 32;
    }

    function selectedLayout() {
        return normalizeLayout(store?.g?.layoutPieceCount || 32);
    }

    function appliedLayout() {
        return normalizeLayout(store?.g?.appliedLayout || 32);
    }

    function buildLayoutBoard(count) {
        const spec = LAYOUTS[normalizeLayout(count)];
        const rowFor = (ids, team) => ids.map(id => id ? `${id}_${team}` : null);
        return [
            ...rowFor(spec.backRank, 'P'),
            ...rowFor(spec.pawns, 'P'),
            ...Array(32).fill(null),
            ...rowFor(spec.pawns, 'B'),
            ...rowFor(spec.backRank, 'B')
        ];
    }

    function layoutPieceIds(count) {
        return buildLayoutBoard(count).filter(Boolean);
    }

    function resetGameStateForLayout(count) {
        const layout = normalizeLayout(count);
        store.board = buildLayoutBoard(layout);
        store.graveyard = [];
        store.g.killsB = 0;
        store.g.killsP = 0;
        store.g.lastMove = { from: null, to: null };
        store.g.enPassant = null;
        store.g.hasMoved = { B: { K:false, Rk:false, Rq:false }, P: { K:false, Rk:false, Rq:false } };
        store.g.layoutPieceCount = layout;
        store.g.appliedLayout = layout;
        historyStack = [];
        turn = 'B';
        sel = null;
        pending = null;
        gySel = null;
        isLive = false;
        if (typeof clearMateHighlight === 'function') clearMateHighlight();
        save();
        renderBoard();
        renderGraveyard();
        updateUI();
        renderConfigLists();
    }

    function setPieceLayout(count) {
        const layout = normalizeLayout(count);
        store.g.layoutPieceCount = layout;
        save();
        updateLayoutSelectionUI();
        renderConfigLists();
    }

    window.setPieceLayout = setPieceLayout;

    function updateLayoutSelectionUI() {
        const layout = selectedLayout();
        document.querySelectorAll('.piece-layout-card').forEach(card => {
            card.classList.toggle('selected', Number(card.dataset.layout) === layout);
        });
        const label = document.getElementById('piece-layout-current');
        if (label) label.textContent = LAYOUTS[layout].label;
    }

    function injectLayoutChooser() {
        if (document.getElementById('piece-layout-chooser')) return;
        const mainOptions = document.getElementById('main-start-options');
        if (!mainOptions) return;

        const chooser = document.createElement('div');
        chooser.id = 'piece-layout-chooser';
        chooser.innerHTML = `
            <div class="layout-heading">
                <div>
                    <span>FORMAÇÃO DO ELENCO</span>
                    <small>Escolha quantas peças participarão desta partida.</small>
                </div>
                <b id="piece-layout-current">32 PEÇAS</b>
            </div>
            <div class="piece-layout-grid">
                ${Object.entries(LAYOUTS).map(([count, spec]) => `
                    <button type="button" class="piece-layout-card" data-layout="${count}" onclick="setPieceLayout(${count})">
                        <strong>${spec.label}</strong>
                        <span>${spec.description}</span>
                    </button>
                `).join('')}
            </div>
        `;
        mainOptions.insertBefore(chooser, mainOptions.firstChild);
        updateLayoutSelectionUI();
    }

    function injectStyles() {
        if (document.getElementById('cosplay-enhancement-styles')) return;
        const style = document.createElement('style');
        style.id = 'cosplay-enhancement-styles';
        style.textContent = `
            #piece-layout-chooser {
                width: 100%;
                margin: 0 0 22px;
                padding: 17px;
                border: 1px solid rgba(218, 174, 83, .35);
                border-radius: 13px;
                background: linear-gradient(145deg, rgba(55, 26, 43, .46), rgba(8, 10, 18, .82));
                box-shadow: inset 0 0 30px rgba(168, 110, 38, .05);
            }
            .layout-heading { display:flex; justify-content:space-between; gap:14px; align-items:flex-start; margin-bottom:12px; }
            .layout-heading span { display:block; color:#e3bd69; font-family:Georgia,serif; font-weight:800; font-size:12px; letter-spacing:1.6px; }
            .layout-heading small { display:block; color:#8f8b98; margin-top:4px; font-size:9px; letter-spacing:.5px; }
            .layout-heading b { color:#f4ead7; font-size:10px; white-space:nowrap; border:1px solid rgba(227,189,105,.3); border-radius:20px; padding:6px 9px; }
            .piece-layout-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:9px; }
            .piece-layout-card {
                min-height:72px; padding:10px; border-radius:10px; cursor:pointer;
                border:1px solid rgba(255,255,255,.11); color:#ece8ed;
                background:rgba(18,18,26,.88); text-align:left; transition:.2s ease;
            }
            .piece-layout-card:hover { transform:translateY(-1px); border-color:rgba(227,189,105,.55); }
            .piece-layout-card.selected { border-color:#d9ab55; box-shadow:0 0 0 1px rgba(217,171,85,.2), 0 8px 25px rgba(0,0,0,.3); background:linear-gradient(150deg,rgba(83,42,52,.82),rgba(20,17,27,.95)); }
            .piece-layout-card strong { display:block; font-family:Georgia,serif; color:#f4ead7; font-size:13px; letter-spacing:1px; }
            .piece-layout-card span { display:block; color:#9892a2; margin-top:5px; font-size:9px; line-height:1.35; }

            #quick-setup-card { border-color:rgba(218,174,83,.32) !important; background:linear-gradient(145deg,rgba(52,25,42,.45),rgba(10,11,17,.96)) !important; }
            #quick-setup-card .quick-setup-title { color:#e3bd69; font-family:Georgia,serif; font-size:11px; letter-spacing:1.2px; }
            #quick-setup-folder { color:#bbb3c3; font-size:9px; line-height:1.35; word-break:break-word; margin-top:7px; }
            .quick-setup-actions { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:10px; }
            .quick-setup-actions button { width:100% !important; min-height:32px; font-size:8px !important; }

            #piece-name-editor {
                position:fixed; inset:0; z-index:9000; display:flex; align-items:center; justify-content:center;
                background:rgba(4,3,7,.82); backdrop-filter:blur(8px);
            }
            #piece-name-editor .editor-card {
                width:min(420px,90vw); padding:26px; border-radius:16px;
                border:1px solid rgba(218,174,83,.55); background:linear-gradient(155deg,#25131e,#0a0b11 70%);
                box-shadow:0 25px 80px rgba(0,0,0,.72);
            }
            #piece-name-editor h3 { color:#f0d79b; font-family:Georgia,serif; font-size:17px; letter-spacing:1px; margin-bottom:5px; }
            #piece-name-editor p { color:#918b98; font-size:10px; line-height:1.5; margin-bottom:15px; }
            #piece-name-editor input {
                width:100%; background:#09090e; color:#fff; border:1px solid #423547; border-radius:9px;
                padding:13px 14px; font-size:15px; outline:none;
            }
            #piece-name-editor input:focus { border-color:#d9ab55; box-shadow:0 0 0 3px rgba(217,171,85,.1); }
            #piece-name-editor .editor-actions { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-top:16px; }
            #piece-name-editor .editor-actions button { min-height:42px; }
            @media(max-width:760px){ .piece-layout-grid{grid-template-columns:1fr;} }
        `;
        document.head.appendChild(style);
    }

    function openPieceNameEditor(id) {
        document.getElementById('piece-name-editor')?.remove();
        const modal = document.createElement('div');
        modal.id = 'piece-name-editor';
        const currentName = store.p[id]?.name || pieceNames[id.charAt(0)] || id;
        modal.innerHTML = `
            <div class="editor-card">
                <h3>IDENTIFICAR PEÇA</h3>
                <p>${id} • Digite o nome do personagem/cosplayer. A foto continua disponível na ficha da peça no menu lateral.</p>
                <input id="piece-name-editor-input" type="text" maxlength="60" autocomplete="off" value="${String(currentName).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}">
                <div class="editor-actions">
                    <button class="btn" id="piece-name-cancel">CANCELAR</button>
                    <button class="btn btn-yes" id="piece-name-save">SALVAR NOME</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const input = modal.querySelector('#piece-name-editor-input');
        const close = () => modal.remove();
        const commit = () => {
            const value = input.value.trim();
            if (!store.p[id]) store.p[id] = {};
            if (value) store.p[id].name = value.toUpperCase();
            else delete store.p[id].name;
            save();
            renderBoard();
            renderConfigLists();
            close();
        };
        modal.querySelector('#piece-name-cancel').onclick = close;
        modal.querySelector('#piece-name-save').onclick = commit;
        modal.onclick = e => { if (e.target === modal) close(); };
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') close();
        });
        setTimeout(() => { input.focus(); input.select(); }, 30);
    }

    async function refreshMusicFolderLabel() {
        const label = document.getElementById('quick-setup-folder');
        if (!window.electronAPI?.music?.getFolder) {
            if (label) label.textContent = 'Disponível somente no aplicativo instalado.';
            return;
        }
        try {
            const result = await window.electronAPI.music.getFolder();
            selectedMusicFolder = result?.ok ? result : null;
            if (label) label.textContent = selectedMusicFolder
                ? `Pasta definida: ${selectedMusicFolder.folderPath}`
                : 'Nenhuma pasta de músicas definida.';
        } catch (error) {
            if (label) label.textContent = 'Não foi possível ler a pasta configurada.';
        }
    }

    async function chooseQuickSetupFolder() {
        if (!window.electronAPI?.music?.pickFolder) {
            alert('A seleção de pasta está disponível no aplicativo desktop.');
            return;
        }
        const result = await window.electronAPI.music.pickFolder();
        if (result?.ok) {
            selectedMusicFolder = result;
            await refreshMusicFolderLabel();
        }
    }

    function currentSetupPieceIds() {
        const layout = selectedLayout();
        const ids = layoutPieceIds(layout);
        if (appliedLayout() !== layout) return ids;
        const onBoard = new Set(store.board.filter(Boolean));
        return ids.filter(id => onBoard.has(id));
    }

    function shuffledCopy(items) {
        const copy = items.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    async function runQuickSetup() {
        if (!window.electronAPI?.music?.listAudio) {
            alert('O Setup Rápido está disponível no aplicativo desktop.');
            return;
        }

        let folder = selectedMusicFolder;
        if (!folder?.ok) {
            const picked = await window.electronAPI.music.pickFolder();
            if (!picked?.ok) return;
            folder = picked;
            selectedMusicFolder = picked;
            await refreshMusicFolderLabel();
        }

        const activeIds = currentSetupPieceIds();
        const missing = activeIds.filter(id => !store.p[id]?.sound);
        if (!missing.length) {
            alert('Todas as peças desta formação já possuem música definida. Nada foi alterado.');
            return;
        }

        const confirmed = confirm(
            `SETUP RÁPIDO\n\n${missing.length} peça(s) estão sem música.\n` +
            `O sistema vai preencher SOMENTE essas peças com faixas aleatórias da pasta configurada.\n\n` +
            `Músicas já escolhidas não serão substituídas.\n\nDeseja continuar?`
        );
        if (!confirmed) return;

        const result = await window.electronAPI.music.listAudio();
        if (!result?.ok) {
            alert(result?.error || 'Não foi possível acessar a pasta de músicas.');
            return;
        }
        if (!result.tracks?.length) {
            alert('Nenhum arquivo de áudio compatível foi encontrado nessa pasta.');
            return;
        }

        const tracks = shuffledCopy(result.tracks);
        missing.forEach((id, index) => {
            if (!store.p[id]) store.p[id] = {};
            store.p[id].sound = tracks[index % tracks.length].url;
            store.p[id].quickSetupTrack = tracks[index % tracks.length].name;
            if (store.p[id].volume === undefined) store.p[id].volume = 0.8;
            if (typeof pieceSoundAudios !== 'undefined' && pieceSoundAudios[id]) {
                try { pieceSoundAudios[id].pause(); } catch (_) {}
                delete pieceSoundAudios[id];
            }
        });

        save();
        renderConfigLists();
        alert(`Setup Rápido concluído: ${missing.length} peça(s) receberam música aleatória. As músicas existentes foram preservadas.`);
    }

    window.chooseQuickSetupFolder = chooseQuickSetupFolder;
    window.runQuickSetup = runQuickSetup;

    function injectQuickSetupCard() {
        if (document.getElementById('quick-setup-card')) return;
        const systemList = document.getElementById('list-sys');
        if (!systemList) return;

        const card = document.createElement('div');
        card.id = 'quick-setup-card';
        card.className = 'unit-card';
        card.innerHTML = `
            <div class="quick-setup-title">♟ SETUP RÁPIDO DO ELENCO</div>
            <div id="quick-setup-folder">Carregando pasta configurada...</div>
            <div style="font-size:8px; color:#706c77; line-height:1.45; margin-top:7px;">
                Preenche músicas aleatórias apenas nas peças desta formação que ainda estiverem sem áudio.
            </div>
            <div class="quick-setup-actions">
                <button class="btn-play-sm" onclick="chooseQuickSetupFolder()">PASTA DE MÚSICAS</button>
                <button class="btn-play-sm" onclick="runQuickSetup()" style="border-color:rgba(218,174,83,.5); color:#e3bd69;">EXECUTAR SETUP</button>
            </div>
        `;

        const updateCard = document.getElementById('app-update-card');
        if (updateCard?.nextSibling) systemList.insertBefore(card, updateCard.nextSibling);
        else if (updateCard) systemList.appendChild(card);
        else systemList.insertBefore(card, systemList.firstChild);

        refreshMusicFolderLabel();
    }

    if (typeof triggerQuickUpload === 'function') {
        triggerQuickUpload = function(id) { openPieceNameEditor(id); };
    }

    if (typeof isMoveValid === 'function') {
        const originalIsMoveValid = isMoveValid;
        isMoveValid = function(from, to, boardState) {
            const board = boardState || store.board;
            const id = board?.[from];
            if (id?.charAt(0) === 'K') {
                const dc = (to % 8) - (from % 8);
                if (Math.abs(dc) === 2 && appliedLayout() !== 32) return false;
            }
            return originalIsMoveValid(from, to, boardState);
        };
    }

    if (typeof renderConfigLists === 'function') {
        const originalRenderConfigLists = renderConfigLists;
        renderConfigLists = function() {
            originalRenderConfigLists();
            const activeBaseIds = new Set(layoutPieceIds(selectedLayout()).map(id => id.slice(0, -2)));
            ['white', 'black'].forEach(side => {
                const container = document.getElementById(`list-${side}`);
                if (!container) return;
                const cards = Array.from(container.querySelectorAll(':scope > .unit-card'));
                const orderedBaseIds = [...nobres, ...peoes];
                cards.forEach((card, index) => {
                    card.style.display = activeBaseIds.has(orderedBaseIds[index]) ? '' : 'none';
                });
                const heading = container.querySelector('h3');
                if (heading) heading.innerHTML = `${heading.textContent.split(' • ')[0]} • ${LAYOUTS[selectedLayout()].label}`;
            });
        };
    }

    if (typeof startBattle === 'function') {
        const originalStartBattle = startBattle;
        startBattle = function() {
            const desired = selectedLayout();
            if (appliedLayout() !== desired) {
                if (isLive) {
                    const ok = confirm(`Alterar a formação para ${LAYOUTS[desired].label} reiniciará a partida atual. Deseja continuar?`);
                    if (!ok) {
                        store.g.layoutPieceCount = appliedLayout();
                        updateLayoutSelectionUI();
                        return;
                    }
                }
                resetGameStateForLayout(desired);
            }
            store.g.layoutPieceCount = desired;
            store.g.appliedLayout = desired;
            save();
            originalStartBattle();
        };
    }

    if (typeof newGame === 'function') {
        const originalNewGame = newGame;
        newGame = function() {
            originalNewGame();
            resetGameStateForLayout(selectedLayout());
            const winModal = document.getElementById('victory-modal');
            if (winModal) winModal.style.display = 'none';
            const startMenu = document.getElementById('start-menu');
            if (startMenu) { startMenu.classList.add('show'); startMenu.style.display = 'flex'; }
        };
    }

    function initializeEnhancements() {
        if (typeof store === 'undefined' || !store?.g) return;
        if (!store.g.layoutPieceCount) store.g.layoutPieceCount = store.g.appliedLayout || 32;
        if (!store.g.appliedLayout) store.g.appliedLayout = 32;
        injectStyles();
        injectLayoutChooser();
        injectQuickSetupCard();
        updateLayoutSelectionUI();
        renderConfigLists();
        enhancementsReady = true;
    }

    function scheduleEnhancementInit() {
        setTimeout(initializeEnhancements, 350);
        setTimeout(() => {
            if (!enhancementsReady) initializeEnhancements();
            else {
                updateLayoutSelectionUI();
                renderConfigLists();
                refreshMusicFolderLabel();
            }
        }, 1200);
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', scheduleEnhancementInit, { once:true });
    } else {
        scheduleEnhancementInit();
    }
})();
