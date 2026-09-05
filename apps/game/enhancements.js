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

    const PIECE_LABELS = { P:'PEÃO', T:'TORRE', C:'CAVALO', B:'BISPO', Q:'RAINHA', K:'REI' };
    let enhancementsReady = false;
    let selectedMusicFolder = null;
    let selectedRandomMusicFolder = null;
    let libraryPreviewAudio = null;

    const esc = value => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

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
                width: 100%; margin: 0 0 22px; padding: 17px;
                border: 1px solid rgba(218, 174, 83, .35); border-radius: 13px;
                background: linear-gradient(145deg, rgba(55, 26, 43, .46), rgba(8, 10, 18, .82));
                box-shadow: inset 0 0 30px rgba(168, 110, 38, .05);
            }
            .layout-heading { display:flex; justify-content:space-between; gap:14px; align-items:flex-start; margin-bottom:12px; }
            .layout-heading span { display:block; color:#e3bd69; font-family:Georgia,serif; font-weight:800; font-size:12px; letter-spacing:1.6px; }
            .layout-heading small { display:block; color:#8f8b98; margin-top:4px; font-size:9px; letter-spacing:.5px; }
            .layout-heading b { color:#f4ead7; font-size:10px; white-space:nowrap; border:1px solid rgba(227,189,105,.3); border-radius:20px; padding:6px 9px; }
            .piece-layout-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:9px; }
            .piece-layout-card { min-height:72px; padding:10px; border-radius:10px; cursor:pointer; border:1px solid rgba(255,255,255,.11); color:#ece8ed; background:rgba(18,18,26,.88); text-align:left; transition:.2s ease; }
            .piece-layout-card:hover { transform:translateY(-1px); border-color:rgba(227,189,105,.55); }
            .piece-layout-card.selected { border-color:#d9ab55; box-shadow:0 0 0 1px rgba(217,171,85,.2), 0 8px 25px rgba(0,0,0,.3); background:linear-gradient(150deg,rgba(83,42,52,.82),rgba(20,17,27,.95)); }
            .piece-layout-card strong { display:block; font-family:Georgia,serif; color:#f4ead7; font-size:13px; letter-spacing:1px; }
            .piece-layout-card span { display:block; color:#9892a2; margin-top:5px; font-size:9px; line-height:1.35; }

            #quick-setup-card { border-color:rgba(218,174,83,.32) !important; background:linear-gradient(145deg,rgba(52,25,42,.45),rgba(10,11,17,.96)) !important; }
            #quick-setup-card .quick-setup-title { color:#e3bd69; font-family:Georgia,serif; font-size:11px; letter-spacing:1.2px; }
            .quick-setup-folder { color:#bbb3c3; font-size:9px; line-height:1.35; word-break:break-word; margin-top:7px; padding:6px 8px; border:1px solid rgba(255,255,255,.07); border-radius:7px; background:rgba(0,0,0,.14); }
            .quick-setup-folder b { color:#e3bd69; font-size:8px; letter-spacing:.7px; }
            .quick-setup-actions { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:10px; }
            .quick-setup-actions button { width:100% !important; min-height:32px; font-size:8px !important; }

            #music-library-modal { position:fixed; inset:0; z-index:11000; display:flex; align-items:center; justify-content:center; padding:18px; background:rgba(3,3,7,.9); backdrop-filter:blur(10px); }
            #music-library-modal .ml-panel { width:min(980px,96vw); max-height:90vh; display:flex; flex-direction:column; overflow:hidden; border:1px solid rgba(218,174,83,.45); border-radius:16px; background:linear-gradient(160deg,#20131b,#090a10 72%); box-shadow:0 28px 90px rgba(0,0,0,.75); }
            #music-library-modal .ml-head { display:flex; justify-content:space-between; gap:14px; padding:18px 20px 14px; border-bottom:1px solid rgba(255,255,255,.08); }
            #music-library-modal .ml-head span { display:block; color:#d9ab55; font-size:8px; font-weight:900; letter-spacing:1.5px; }
            #music-library-modal .ml-head h2 { color:#f4ead7; font-family:Georgia,serif; font-size:20px; margin:4px 0 0; }
            #music-library-modal .ml-close { width:36px; height:36px; border:1px solid #34323a; border-radius:8px; background:#111117; color:#fff; cursor:pointer; }
            #music-library-search { margin:12px 20px 8px; padding:11px 12px; border:1px solid #34313c; border-radius:9px; background:#0c0c12; color:#fff; outline:none; }
            #music-library-list { overflow:auto; padding:8px 20px 20px; display:grid; gap:7px; }
            .ml-track { display:grid; grid-template-columns:minmax(220px,1.6fr) minmax(210px,1fr) 44px 88px; gap:8px; align-items:center; padding:9px; border:1px solid rgba(255,255,255,.08); border-radius:9px; background:rgba(11,11,17,.8); }
            .ml-track-name { min-width:0; }
            .ml-track-name strong { display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#f5f0e9; font-size:10px; }
            .ml-track-name small { display:block; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#77727d; font-size:8px; }
            .ml-badge { display:inline-block; margin-right:5px; padding:2px 5px; border:1px solid rgba(217,171,85,.3); border-radius:10px; color:#d9ab55; font-size:7px; font-weight:900; }
            .ml-track select { width:100%; min-height:34px; border:1px solid #34313c; border-radius:7px; background:#0b0b10; color:#ddd; font-size:9px; padding:5px; }
            .ml-track button { min-height:34px; border:1px solid #3a3741; border-radius:7px; background:#15151c; color:#eee; cursor:pointer; font-size:8px; }
            .ml-track button[data-assign] { border-color:rgba(217,171,85,.45); color:#e3bd69; }
            .ml-assigned { color:#75ffb2 !important; border-color:rgba(117,255,178,.35) !important; }

            #piece-name-editor { position:fixed; inset:0; z-index:9000; display:flex; align-items:center; justify-content:center; background:rgba(4,3,7,.82); backdrop-filter:blur(8px); }
            #piece-name-editor .editor-card { width:min(420px,90vw); padding:26px; border-radius:16px; border:1px solid rgba(218,174,83,.55); background:linear-gradient(155deg,#25131e,#0a0b11 70%); box-shadow:0 25px 80px rgba(0,0,0,.72); }
            #piece-name-editor h3 { color:#f0d79b; font-family:Georgia,serif; font-size:17px; letter-spacing:1px; margin-bottom:5px; }
            #piece-name-editor p { color:#918b98; font-size:10px; line-height:1.5; margin-bottom:15px; }
            #piece-name-editor input { width:100%; background:#09090e; color:#fff; border:1px solid #423547; border-radius:9px; padding:13px 14px; font-size:15px; outline:none; }
            #piece-name-editor input:focus { border-color:#d9ab55; box-shadow:0 0 0 3px rgba(217,171,85,.1); }
            #piece-name-editor .editor-actions { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-top:16px; }
            #piece-name-editor .editor-actions button { min-height:42px; }
            @media(max-width:760px){ .piece-layout-grid{grid-template-columns:1fr;} .ml-track{grid-template-columns:1fr 1fr}.ml-track-name{grid-column:1/-1} }
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
        const generalLabel = document.getElementById('quick-setup-folder-general');
        const randomLabel = document.getElementById('quick-setup-folder-random');
        if (!window.electronAPI?.music?.getFolder) {
            if (generalLabel) generalLabel.innerHTML = '<b>GERAIS</b><br>Disponível somente no aplicativo instalado.';
            if (randomLabel) randomLabel.innerHTML = '<b>ALEATÓRIAS</b><br>Disponível somente no aplicativo instalado.';
            return;
        }
        try {
            const [general, random] = await Promise.all([
                window.electronAPI.music.getFolder('general'),
                window.electronAPI.music.getFolder('random')
            ]);
            selectedMusicFolder = general?.ok ? general : null;
            selectedRandomMusicFolder = random?.ok ? random : null;
            if (generalLabel) generalLabel.innerHTML = `<b>GERAIS</b><br>${selectedMusicFolder ? esc(selectedMusicFolder.folderPath) : 'Nenhuma pasta definida.'}`;
            if (randomLabel) randomLabel.innerHTML = `<b>ALEATÓRIAS</b><br>${selectedRandomMusicFolder ? esc(selectedRandomMusicFolder.folderPath) : 'Nenhuma pasta definida.'}`;
        } catch (_) {
            if (generalLabel) generalLabel.innerHTML = '<b>GERAIS</b><br>Não foi possível ler a pasta.';
            if (randomLabel) randomLabel.innerHTML = '<b>ALEATÓRIAS</b><br>Não foi possível ler a pasta.';
        }
    }

    async function chooseQuickSetupFolder(kind = 'random') {
        if (!window.electronAPI?.music?.pickFolder) {
            alert('A seleção de pasta está disponível no aplicativo desktop.');
            return;
        }
        const type = kind === 'general' ? 'general' : 'random';
        const result = await window.electronAPI.music.pickFolder(type);
        if (result?.ok) {
            if (type === 'general') selectedMusicFolder = result;
            else selectedRandomMusicFolder = result;
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

    function resetPieceAudio(id) {
        try {
            if (typeof stopPiecePlayback === 'function') stopPiecePlayback(id, false);
            if (typeof pieceSoundAudios !== 'undefined' && pieceSoundAudios[id]) {
                try { pieceSoundAudios[id].pause(); } catch (_) {}
                delete pieceSoundAudios[id];
            }
        } catch (_) {}
    }

    function assignTrackToPiece(id, track, source = 'general') {
        if (!id || !track?.url) return false;
        if (!store.p[id]) store.p[id] = {};
        store.p[id].sound = track.url;
        store.p[id].soundName = track.name || track.relativePath || 'Música';
        store.p[id].soundSource = source === 'random' ? 'random-folder' : 'general-folder';
        store.p[id].quickSetupTrack = track.name || track.relativePath || '';
        if (store.p[id].volume === undefined) store.p[id].volume = 0.8;
        resetPieceAudio(id);
        save();
        renderConfigLists();
        return true;
    }

    function pieceTargetLabel(id) {
        const piece = store.p?.[id] || {};
        const type = PIECE_LABELS[id.charAt(0)] || 'PEÇA';
        const side = id.endsWith('_B') ? 'BRANCAS' : 'PRETAS';
        const who = piece.participant?.character || piece.participant?.name || piece.participantRealName || piece.name || '';
        return `${type} · ${side} · ${id}${who ? ` · ${who}` : ''}`;
    }

    async function openMusicLibrary() {
        if (!window.electronAPI?.music?.listAudio) {
            alert('A biblioteca de músicas está disponível no aplicativo desktop.');
            return;
        }

        const [generalResult, randomResult] = await Promise.all([
            window.electronAPI.music.listAudio('general'),
            window.electronAPI.music.listAudio('random')
        ]);
        const tracks = [
            ...(generalResult?.ok ? generalResult.tracks.map(track => ({ ...track, source:'general', sourceLabel:'GERAIS' })) : []),
            ...(randomResult?.ok ? randomResult.tracks.map(track => ({ ...track, source:'random', sourceLabel:'ALEATÓRIAS' })) : [])
        ];
        if (!tracks.length) {
            alert('Nenhuma música foi encontrada. Defina pelo menos uma das duas pastas primeiro.');
            return;
        }

        document.getElementById('music-library-modal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'music-library-modal';
        modal.innerHTML = `
            <div class="ml-panel">
                <div class="ml-head">
                    <div><span>BIBLIOTECA LOCAL</span><h2>Músicas do jogo</h2></div>
                    <button class="ml-close" type="button">×</button>
                </div>
                <input id="music-library-search" type="search" placeholder="Buscar pelo nome da música ou subpasta...">
                <div id="music-library-list"></div>
            </div>
        `;
        document.body.appendChild(modal);

        const targetIds = currentSetupPieceIds();
        const targetOptions = targetIds.map(id => `<option value="${esc(id)}">${esc(pieceTargetLabel(id))}</option>`).join('');
        const list = modal.querySelector('#music-library-list');
        const search = modal.querySelector('#music-library-search');

        const render = () => {
            const q = String(search?.value || '').trim().toLowerCase();
            const filtered = tracks.filter(track => !q || `${track.name} ${track.relativePath || ''} ${track.folder || ''} ${track.sourceLabel}`.toLowerCase().includes(q));
            list.innerHTML = filtered.map(track => {
                const index = tracks.indexOf(track);
                const pathText = track.relativePath && track.relativePath !== track.name ? track.relativePath : (track.folder || 'raiz da pasta');
                return `
                    <div class="ml-track" data-track-index="${index}">
                        <div class="ml-track-name">
                            <strong><span class="ml-badge">${esc(track.sourceLabel)}</span>${esc(track.name)}</strong>
                            <small>${esc(pathText)}</small>
                        </div>
                        <select data-target><option value="">Escolha a peça...</option>${targetOptions}</select>
                        <button type="button" data-preview title="Ouvir prévia">▶</button>
                        <button type="button" data-assign>ATRIBUIR</button>
                    </div>`;
            }).join('') || '<div style="padding:24px;text-align:center;color:#777">Nenhuma música encontrada.</div>';

            list.querySelectorAll('.ml-track').forEach(row => {
                const track = tracks[Number(row.dataset.trackIndex)];
                row.querySelector('[data-preview]')?.addEventListener('click', () => {
                    try {
                        if (libraryPreviewAudio) { libraryPreviewAudio.pause(); libraryPreviewAudio = null; }
                        libraryPreviewAudio = new Audio(track.url);
                        libraryPreviewAudio.volume = 0.75;
                        libraryPreviewAudio.play().catch(() => {});
                    } catch (_) {}
                });
                row.querySelector('[data-assign]')?.addEventListener('click', event => {
                    const target = row.querySelector('[data-target]')?.value;
                    if (!target) {
                        alert('Escolha primeiro para qual peça essa música deve ir.');
                        return;
                    }
                    if (assignTrackToPiece(target, track, track.source)) {
                        event.currentTarget.textContent = 'ATRIBUÍDA ✓';
                        event.currentTarget.classList.add('ml-assigned');
                    }
                });
            });
        };

        search?.addEventListener('input', render);
        modal.querySelector('.ml-close')?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
        modal.addEventListener('remove', () => { try { libraryPreviewAudio?.pause(); } catch (_) {} });
        render();
        setTimeout(() => search?.focus(), 40);
    }

    async function runQuickSetup() {
        if (!window.electronAPI?.music?.listAudio) {
            alert('O Setup Rápido está disponível no aplicativo desktop.');
            return;
        }

        let folder = selectedRandomMusicFolder;
        if (!folder?.ok) {
            const picked = await window.electronAPI.music.pickFolder('random');
            if (!picked?.ok) return;
            folder = picked;
            selectedRandomMusicFolder = picked;
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
            `O sistema vai preencher SOMENTE essas peças usando faixas da PASTA DE MÚSICAS ALEATÓRIAS.\n\n` +
            `Músicas já escolhidas não serão substituídas.\n\nDeseja continuar?`
        );
        if (!confirmed) return;

        const result = await window.electronAPI.music.listAudio('random');
        if (!result?.ok) {
            alert(result?.error || 'Não foi possível acessar a pasta de músicas aleatórias.');
            return;
        }
        if (!result.tracks?.length) {
            alert('Nenhum arquivo de áudio compatível foi encontrado na pasta de músicas aleatórias.');
            return;
        }

        const tracks = shuffledCopy(result.tracks);
        missing.forEach((id, index) => {
            assignTrackToPiece(id, tracks[index % tracks.length], 'random');
        });

        save();
        renderConfigLists();
        alert(`Setup Rápido concluído: ${missing.length} peça(s) receberam música da pasta ALEATÓRIAS. As músicas existentes foram preservadas.`);
    }

    window.chooseQuickSetupFolder = chooseQuickSetupFolder;
    window.chooseGeneralMusicFolder = () => chooseQuickSetupFolder('general');
    window.chooseRandomMusicFolder = () => chooseQuickSetupFolder('random');
    window.openMusicLibrary = openMusicLibrary;
    window.runQuickSetup = runQuickSetup;

    function injectQuickSetupCard() {
        if (document.getElementById('quick-setup-card')) return;
        const systemList = document.getElementById('list-sys');
        if (!systemList) return;

        const card = document.createElement('div');
        card.id = 'quick-setup-card';
        card.className = 'unit-card';
        card.innerHTML = `
            <div class="quick-setup-title">♫ BIBLIOTECA DE MÚSICAS DO ELENCO</div>
            <div id="quick-setup-folder-general" class="quick-setup-folder"><b>GERAIS</b><br>Carregando...</div>
            <div id="quick-setup-folder-random" class="quick-setup-folder"><b>ALEATÓRIAS</b><br>Carregando...</div>
            <div style="font-size:8px; color:#706c77; line-height:1.45; margin-top:7px;">
                GERAIS ficam disponíveis para escolha manual. ALEATÓRIAS são usadas pelo Setup Rápido. A biblioteca mostra o nome de cada arquivo e permite escolher em qual peça ele será aplicado.
            </div>
            <div class="quick-setup-actions">
                <button class="btn-play-sm" onclick="chooseGeneralMusicFolder()">PASTA GERAIS</button>
                <button class="btn-play-sm" onclick="chooseRandomMusicFolder()">PASTA ALEATÓRIAS</button>
                <button class="btn-play-sm" onclick="openMusicLibrary()">ABRIR BIBLIOTECA</button>
                <button class="btn-play-sm" onclick="runQuickSetup()" style="border-color:rgba(218,174,83,.5); color:#e3bd69;">SETUP ALEATÓRIO</button>
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