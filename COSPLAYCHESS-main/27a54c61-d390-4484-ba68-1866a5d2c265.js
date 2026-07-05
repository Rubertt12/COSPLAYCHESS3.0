const peoes = ['P1','P2','P3','P4','P5','P6','P7','P8'];
const nobres = ['T1','C1','B1','Q1','K1','B2','C2','T2'];
const pieceNames = { 'P': 'INFANTARIA', 'T': 'TORRE', 'C': 'CAVALARIA', 'B': 'BISPO', 'Q': 'RAINHA', 'K': 'REI' };
const pieceIcons = { 'P': 'shield', 'T': 'castle', 'C': 'swords', 'B': 'eye', 'Q': 'crown', 'K': 'target' };

const getInitialBoard = () => [
    ...nobres.map(id => id + '_P'), ...peoes.map(id => id + '_P'),
    ...Array(32).fill(null),
    ...peoes.map(id => id + '_B'), ...nobres.map(id => id + '_B')
];

let historyStack = [];

function pushHistory() {
    historyStack.push(JSON.stringify(store));
    if (historyStack.length > 30) historyStack.shift();
}

const DEFAULT_STORE = {
    p: {}, 
    g: {
        killsB: 0, 
        killsP: 0, 
        avatarB: '', 
        avatarP: '',
        zoomBoard: 1,
        theme: 'default',
        mode: 'LOCAL',
        aiSide: 'P',
        aiDiff: 'normal',
        enPassant: null,
        hasMoved: { B: {K:false, Rk:false, Rq:false}, P: {K:false, Rk:false, Rq:false} },
        wallpaper: null,
        lastMove: { from: null, to: null },
        pinnedMenu: false
    },
    board: getInitialBoard(), 
    graveyard: [],
    log: []
};

let db, store = JSON.parse(JSON.stringify(DEFAULT_STORE));

// Regras de movimento unificadas (Estratégia)
const MOVE_RULES = {
    'P': (src, dst, dr, dc, target, color, from, to, isAttackOnly, board) => {
        const direction = color === 'B' ? -1 : 1;
        if (isAttackOnly) return dr === direction && Math.abs(dc) === 1;
        // Movimento simples e duplo
        if (dc === 0 && dr === direction && !target) return true;
        if (dc === 0 && dr === direction * 2 && ((color === 'B' && src.row === 6) || (color === 'P' && src.row === 1)) && !target && !board[(src.row + direction) * 8 + src.col]) return true;
        // Captura e En Passant
        if (Math.abs(dc) === 1 && dr === direction && (target || (store.g && store.g.enPassant === to))) return true;
        return false;
    },
    'T': (src, dst, dr, dc, target, color, from, to, isAttackOnly, board) => (dr === 0 || dc === 0) && (Math.abs(dr) + Math.abs(dc) > 0) && pathClear(from, to, board),
    'B': (src, dst, dr, dc, target, color, from, to, isAttackOnly, board) => Math.abs(dr) === Math.abs(dc) && Math.abs(dr) > 0 && pathClear(from, to, board),
    'C': (src, dst, dr, dc) => (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2),
    'Q': (src, dst, dr, dc, target, color, from, to, isAttackOnly, board) => (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) && (Math.abs(dr) + Math.abs(dc) > 0) && pathClear(from, to, board),
    'K': (src, dst, dr, dc) => Math.max(Math.abs(dr), Math.abs(dc)) === 1
};

let ambientAudios = { Ambiente: new Audio(), Entrada: new Audio(), Intro1: new Audio(), Intro2: new Audio() };
let fadeIntervals = { Ambiente: null, Entrada: null, Intro1: null, Intro2: null };
const playbackFadeIntervals = new WeakMap();
let pieceSoundAudios = {};
let piecePlayback = {};
let arenaAudios = { left: null, right: null };
let arenaPlayback = { left: null, right: null };
let audioContext = null;
let isLive = false, turn = 'B', sel = null, pending = null, gySel = null;
const themeOptions = ['default','forest','fire','ice'];
let lastCapturePos = null;

// Anime-themed SVG presets (encoded at runtime)
const wallpaperSVGS = {
    naruto: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
            <rect width="100%" height="100%" fill="#2b1a0a" />
            <circle cx="800" cy="450" r="400" fill="#ff9100" opacity="0.05" />
            <g transform="translate(800,450) scale(2)" opacity="0.1">
                <path d="M0,0 C20,-20 40,0 20,20 C0,40 -40,20 -20,0 C0,-20 20,-10 10,0" fill="none" stroke="#ff4d00" stroke-width="5" stroke-linecap="round" />
            </g>
            <path d="M0,700 Q800,600 1600,700 L1600,900 L0,900 Z" fill="#1a0f05" />
            <text x="80%" y="20%" fill="#ff9100" font-family="sans-serif" font-weight="bold" font-size="120" opacity="0.03">NARUTO</text>
        </svg>
    `,
    bleach: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
            <rect width="100%" height="100%" fill="#050a14" />
            <g opacity="0.1">
                <path d="M400,100 L1200,800 M1200,100 L400,800" stroke="#ffffff" stroke-width="1" />
            </g>
            <circle cx="800" cy="450" r="300" fill="none" stroke="#00f2ff" stroke-width="1" opacity="0.1" />
            <path d="M750,450 L800,400 L850,450 L800,500 Z" fill="#ffffff" opacity="0.05" />
            <text x="50%" y="50%" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="200" text-anchor="middle" opacity="0.02">BANKAI</text>
        </svg>
    `,
    onepiece: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
            <rect width="100%" height="100%" fill="#001a33" />
            <path d="M0,450 Q400,400 800,450 T1600,450 L1600,900 L0,900 Z" fill="#000d1a" />
            <g transform="translate(800,300) scale(0.5)" opacity="0.1" fill="#ffffff">
                <circle cx="0" cy="0" r="100" />
                <rect x="-120" y="-10" width="240" height="20" rx="10" transform="rotate(45)" />
                <rect x="-120" y="-10" width="240" height="20" rx="10" transform="rotate(-45)" />
            </g>
            <text x="50%" y="85%" fill="#ffcc00" font-family="sans-serif" font-weight="bold" font-size="24" text-anchor="middle" opacity="0.2" letter-spacing="15">GRAND LINE</text>
        </svg>
    `,
    kuroshitsuji: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
            <rect width="100%" height="100%" fill="#0a0505" />
            <defs>
                <radialGradient id="grad1" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#3d0000;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#050000;stop-opacity:1" />
                </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grad1)" opacity="0.6" />
            <path d="M800,450 m-200,0 a200,200 0 1,0 400,0 a200,200 0 1,0 -400,0" fill="none" stroke="#4a0000" stroke-width="2" opacity="0.3" stroke-dasharray="10,5" />
            <circle cx="800" cy="450" r="150" fill="none" stroke="#2a0000" stroke-width="1" opacity="0.2" />
            <text x="50%" y="90%" fill="#ffffff" font-family="serif" font-size="20" text-anchor="middle" opacity="0.1" letter-spacing="10">SEBASTIAN MICHAELIS</text>
        </svg>
    `,
    // Novos presets de alta qualidade (estilo Google Wallpapers)
    cyberpunk: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1600',
    sakura: 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&q=80&w=1600',
    night_city: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=1600',
    arena_sky: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1600'
};

function presetDataUrl(key) { 
    const val = wallpaperSVGS[key];
    if (!val) return '';
    // Se for um link direto do google/unsplash, retorna o link, senão encoda como SVG
    return val.startsWith('http') ? val : 'data:image/svg+xml,' + encodeURIComponent(val);
}

const req = indexedDB.open("WarEngine_v33_2", 1);
req.onupgradeneeded = e => e.target.result.createObjectStore("assets");
req.onsuccess = e => { db = e.target.result; loadData(); };

function loadData() {
    db.transaction("assets").objectStore("assets").get("all").onsuccess = e => {
        if(e.target.result) {
            const saved = e.target.result;
            // Garantimos que o objeto 'p' (peças) e 'g' (globais) sejam preservados do banco
            store = { ...DEFAULT_STORE, ...saved };
            store.g = { ...DEFAULT_STORE.g, ...saved.g };
            store.p = saved.p || {}; 
            store.board = saved.board || getInitialBoard();
            store.log = saved.log || [];
        }

        applyTheme(store.g.theme);
        if (!store.g.wallpaper) randomWallpaperPreset(true);
        applyWallpaper(store.g.wallpaper);
        populateWallpaperThumbnails();
        renderBoard(); renderGraveyard(); updateUI(); renderConfigLists(); setupAmbientUI(); updateBoardZoom(store.g.zoomBoard); updateWallpaperSelectionUI(); renderLog();
        if (document.getElementById('pin-menu')) document.getElementById('pin-menu').checked = !!store.g.pinnedMenu;
    };
}

function setMode(m) {
    if (!m) m = 'LOCAL';
    store.g.mode = m;
    const aiOpts = document.getElementById('ai-options');
    if (aiOpts) aiOpts.style.display = (m === 'AI') ? 'flex' : 'none';
    save();
}

function setAISide(s) {
    if (!s) s = 'P';
    store.g.aiSide = s;
    save();
}

function getAllLegalMoves(color) {
    const moves = [];
    store.board.forEach((id, from) => {
        if (!id || !id.endsWith('_' + color)) return;
        for (let to = 0; to < 64; to++) {
            if (from === to) continue;
            if (isLegalMove(from, to)) {
                moves.push({ from, to, capture: !!store.board[to] });
            }
        }
    });
    return moves;
}

function aiChooseMove(color) {
    const moves = getAllLegalMoves(color);
    if (!moves || moves.length === 0) return null;
    const diff = document.getElementById('ai-diff')?.value || store.g.aiDiff || 'normal';
    if (diff === 'easy') {
        return moves[Math.floor(Math.random() * moves.length)];
    }
    // normal: prefer captures, otherwise random
    const captures = moves.filter(m => m.capture);
    if (captures.length) return captures[Math.floor(Math.random() * captures.length)];
    return moves[Math.floor(Math.random() * moves.length)];
}

function aiMakeMove() {
    const aiSide = store.g.aiSide || 'P';
    const move = aiChooseMove(aiSide);
    if (!move) { nextTurn(); return; }
    const { from, to } = move;
    executeMove(from, to);
}

function executeMove(from, to, opts = {}) {
    // opts: {silent:false}
    const mover = store.board[from];
    if (!mover) return;
    pushHistory();
    const clonedHasMoved = store.g.hasMoved || { B:{K:false,Rk:false,Rq:false}, P:{K:false,Rk:false,Rq:false} };
    const res = applyMoveToBoard(store.board, from, to, store.g.enPassant, clonedHasMoved);
    // commit
    store.board = res.board;
    
    const color = mover.endsWith('_B') ? 'B' : 'P';
    const playerName = document.getElementById('name-' + color)?.value || (color === 'B' ? 'Brancas' : 'Pretas');
    const pieceName = store.p[mover]?.name || pieceNames[mover.charAt(0)];
    const coord = String.fromCharCode(65 + (to % 8)) + (8 - Math.floor(to / 8));
    addLogEntry(`<b>${playerName}</b> movimentou <b>${pieceName}</b> para <b>${coord}</b>`);

    store.g.lastMove = { from, to };
    if (res.captured) {
        store.graveyard.push(res.captured);
        lastCapturePos = to;
        store.g['kills' + color]++;
    }
    // update enPassant and hasMoved
    store.g.enPassant = res.enPassant || null;
    store.g.hasMoved = clonedHasMoved;
    save();
    renderBoard(); renderGraveyard();
    setTimeout(() => playDefeatSound(), 120);
    const winner = checkForVictory();
    if (!winner) nextTurn();
}

function triggerQuickUpload(id) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
            const r = new FileReader();
            r.onload = ev => {
                if(!store.p[id]) store.p[id] = {};
                store.p[id].img = ev.target.result;
                save();
                renderBoard(); 
                renderConfigLists();
            };
            r.readAsDataURL(file);
        }
    };
    input.click();
}

function setTheme(theme) {
    if (!themeOptions.includes(theme)) theme = 'default';
    applyTheme(theme);
}

function applyTheme(theme) {
    if (!theme) theme = 'default';
    store.g.theme = theme;
    document.body.classList.remove('theme-default','theme-forest','theme-fire','theme-ice');
    document.body.classList.add('theme-' + theme);
    updateThemeSelectionUI();
    save();
}

function applyWallpaper(url) {
    if (url) {
        document.body.style.backgroundImage = `url(${url})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center center';
        document.body.style.backgroundRepeat = 'no-repeat';
    } else {
        document.body.style.backgroundImage = '';
    }
}

function upWallpaper(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = e => {
        store.g.wallpaper = e.target.result;
        applyWallpaper(store.g.wallpaper);
        save();
    };
    r.readAsDataURL(file);
}

function clearWallpaper() {
    store.g.wallpaper = null;
    applyWallpaper(null);
    save();
}

function setWallpaperPreset(urlOrKey) {
    if (!urlOrKey) return;
    if (urlOrKey === 'random') return randomWallpaperPreset();
    const url = wallpaperSVGS[urlOrKey] ? presetDataUrl(urlOrKey) : urlOrKey;
    store.g.wallpaper = url;
    applyWallpaper(url);
    updateWallpaperSelectionUI();
    save();
}

function randomWallpaperPreset(setOnLoad = false) {
    const keys = Object.keys(wallpaperSVGS);
    const choice = keys[Math.floor(Math.random() * keys.length)];
    const url = presetDataUrl(choice);
    store.g.wallpaper = url;
    applyWallpaper(url);
    if (!setOnLoad) save();
}

function populateWallpaperThumbnails() {
    const keys = Object.keys(wallpaperSVGS);
    keys.forEach((key, idx) => {
        const btn = document.getElementById('wp' + (idx + 1));
        if (!btn) return;
        btn.classList.add('wp-thumbnail');
        btn.style.backgroundImage = `url("${presetDataUrl(key)}")`;
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.fontSize = '10px';
        btn.style.fontWeight = '900';
        btn.style.color = 'white';
        btn.style.textShadow = '0 2px 10px rgba(0,0,0,0.8)';
        btn.style.border = '1px solid rgba(255,255,255,0.1)';
        btn.innerText = key.toUpperCase();
        // Adiciona o evento de clique caso não esteja no HTML
        btn.onclick = () => setWallpaperPreset(key);
    });
}

function updateWallpaperSelectionUI() {
    const keys = Object.keys(wallpaperSVGS);
    keys.forEach((key, idx) => {
        const btn = document.getElementById('wp' + (idx + 1));
        if (btn) btn.classList.toggle('selected-wp', store.g.wallpaper === presetDataUrl(key));
    });
}

function updateThemeSelectionUI() {
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.theme === store.g.theme);
    });
}

function getCoord(index) { return { row: Math.floor(index / 8), col: index % 8 }; }
function isSameColor(idA, idB) { return idA && idB && idA.slice(-2) === idB.slice(-2); }
function pathClear(from, to, boardState) {
    const board = boardState || store.board;
    const start = getCoord(from);
    const end = getCoord(to);
    const dr = end.row - start.row;
    const dc = end.col - start.col;
    const stepR = Math.sign(dr);
    const stepC = Math.sign(dc);
    if (stepR === 0 && stepC === 0) return false;
    if (stepR !== 0 && stepC !== 0 && Math.abs(dr) !== Math.abs(dc)) return false;
    let row = start.row + stepR;
    let col = start.col + stepC;
    while (row !== end.row || col !== end.col) {
        if (board[row * 8 + col]) return false;
        row += stepR;
        col += stepC;
    }
    return true;
}
function isMoveValid(from, to, boardState) {
    const board = boardState || store.board;
    const id = board[from];
    if (!id || from === to) return false;
    const target = board[to];
    if (target && isSameColor(id, target)) return false;

    const source = getCoord(from);
    const dest = getCoord(to);
    const dr = dest.row - source.row;
    const dc = dest.col - source.col;
    const absdr = Math.abs(dr);
    const absdc = Math.abs(dc);
    const color = id.endsWith('_B') ? 'B' : 'P';
    const direction = color === 'B' ? -1 : 1;
    const type = id.charAt(0);

    if (type === 'K' && Math.abs(dc) === 2) {
        if (store.g.hasMoved[color].K) return false;
        return true; 
    }

    const rule = MOVE_RULES[type];
    return rule ? rule(source, dest, dr, dc, target, color, from, to, false, board) : false;
}

function cloneBoard(b) { return b.slice(); }

function isSquareAttacked(square, byColor, boardState) {
    const board = boardState || store.board;
    for (let i = 0; i < 64; i++) {
        const id = board[i];
        if (!id || !id.endsWith('_' + byColor)) continue;
        const src = getCoord(i), dst = getCoord(square);
        const rule = MOVE_RULES[id.charAt(0)];
        if (rule && rule(src, dst, dst.row - src.row, dst.col - src.col, board[square], byColor, i, square, true, board)) return true;
    }
    return false;
}

function findKingIndex(color, boardState) {
    const board = boardState || store.board;
    for (let i = 0; i < 64; i++) {
        const id = board[i];
        if (id && id.charAt(0) === 'K' && id.endsWith('_' + color)) return i;
    }
    return -1;
}

function isKingInCheck(color, boardState) {
    const kingIdx = findKingIndex(color, boardState);
    if (kingIdx < 0) return true;
    const enemy = color === 'B' ? 'P' : 'B';
    return isSquareAttacked(kingIdx, enemy, boardState);
}

function applyMoveToBoard(board, from, to, enPassantTarget, hasMovedObj) {
    const nb = cloneBoard(board);
    const mover = nb[from];
    const src = getCoord(from);
    const dst = getCoord(to);
    const dr = dst.row - src.row;
    const dc = dst.col - src.col;
    const color = mover?.endsWith('_B') ? 'B' : 'P';
    const direction = color === 'B' ? -1 : 1;
    let captured = null;
    let newEnPassant = null;

    // en-passant capture
    if (mover && mover.charAt(0) === 'P' && Math.abs(dc) === 1 && dr === direction && !nb[to] && enPassantTarget === to) {
        const capIdx = to - direction * 8;
        captured = nb[capIdx];
        nb[capIdx] = null;
    }

    // normal capture
    if (nb[to]) { captured = nb[to]; }

    // move
    nb[to] = nb[from]; nb[from] = null;

    // double pawn move => set en-passant target
    if (mover && mover.charAt(0) === 'P' && Math.abs(dr) === 2) {
        newEnPassant = from + direction * 8;
    }

    // promotion: auto to Queen
    if (mover && mover.charAt(0) === 'P') {
        if ((color === 'P' && dst.row === 0) || (color === 'B' && dst.row === 7)) {
            // replace leading char P with Q
            nb[to] = 'Q' + nb[to].slice(1);
        }
    }

    // castling: king moves two squares
    if (mover && mover.charAt(0) === 'K' && Math.abs(dc) === 2) {
        // king side or queen side
        const row = src.row;
        if (dc === 2) {
            // king-side rook: move from col 7 to col 5
            const rookFrom = row * 8 + 7;
            const rookTo = row * 8 + 5;
            nb[rookTo] = nb[rookFrom]; nb[rookFrom] = null;
        } else if (dc === -2) {
            const rookFrom = row * 8 + 0;
            const rookTo = row * 8 + 3;
            nb[rookTo] = nb[rookFrom]; nb[rookFrom] = null;
        }
    }

    // update hasMovedObj if provided
    if (hasMovedObj && mover) {
        const t = mover.charAt(0);
        if (t === 'K') hasMovedObj[color].K = true;
        if (t === 'T') {
            // determine rook side by column of original 'from'
            const col = src.col;
            if (col === 0) hasMovedObj[color].Rq = true;
            if (col === 7) hasMovedObj[color].Rk = true;
        }
    }

    return { board: nb, captured, enPassant: newEnPassant };
}

function isLegalMove(from, to) {
    if (!isMoveValid(from, to, store.board)) return false;
    const mover = store.board[from];
    const clonedHasMoved = JSON.parse(JSON.stringify(store.g.hasMoved || { B:{K:false,Rk:false,Rq:false}, P:{K:false,Rk:false,Rq:false} }));
    const res = applyMoveToBoard(store.board, from, to, store.g.enPassant, clonedHasMoved);
    return !isKingInCheck(mover?.endsWith('_B') ? 'B' : 'P', res.board);
}

function undoMove() {
    if (historyStack.length === 0) return;
    const previousState = historyStack.pop();
    store = JSON.parse(previousState);
    turn = (store.log.length % 2 === 0) ? 'B' : 'P'; 
    renderBoard(); renderGraveyard(); updateUI(); renderLog();
    save();
}

function showWrongSideModal() {
    const modal = document.createElement('div');
    modal.id = 'wrong-side-modal';
    modal.style = "position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:6000;";
    modal.innerHTML = `
        <div style="background:#0b0b0d; padding:24px; border-radius:8px; border:1px solid #222; text-align:center; width:320px;">
            <h3 style="color:var(--danger); margin-bottom:8px;">Lado errado</h3>
            <p style="color:#ccc; font-size:14px; margin-bottom:16px;">Esta peça só pode se mover na direção oposta. Verifique a orientação e tente novamente.</p>
            <button id="wrong-side-ok" class="btn btn-yes" style="width:100%;">ENTENDI</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('wrong-side-ok').onclick = () => { modal.remove(); };
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function showInvalidMove(id) {
    const name = store.p[id]?.name || id?.split('_')[0] || 'Peça';
    const modal = document.createElement('div');
    modal.id = 'invalid-move-modal';
    modal.style = "position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:6000; backdrop-filter:blur(5px);";
    modal.innerHTML = `
        <div style="background:#0b0b0d; padding:30px; border-radius:12px; border:1px solid var(--accent); text-align:center; width:340px; box-shadow: 0 25px 60px rgba(0,0,0,0.9);">
            <h3 style="color:var(--accent); margin-bottom:15px; letter-spacing:2px; font-weight:900;">SISTEMA BLOQUEADO</h3>
            <p style="color:#eee; font-size:13px; margin-bottom:25px; line-height:1.6;">
                Movimento inválido para <b>${name}</b>.<br><br>
                Escolha um caminho válido pelas regras ou ative a <b>Movimentação Livre</b> no menu lateral.
            </p>
            <button id="invalid-move-ok" class="btn btn-yes" style="width:100%; margin:0; padding:12px;">CALIBRAR MOVIMENTO</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('invalid-move-ok').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function showUnitID(id, callback) {
    const isWhite = id.endsWith('_B');
    const modal = document.createElement('div');
    modal.id = "unit-modal-overlay";
    modal.style = "position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:5000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(10px); cursor:pointer;";
    
    const currentName = store.p[id]?.name || pieceNames[id.charAt(0)];

    modal.innerHTML = `
        <div id="unit-modal-content" style="background:#0a0a0c; border:1px solid ${isWhite?'#fff':'#ff0055'}; padding:40px; border-radius:4px; text-align:center; box-shadow: 0 0 30px rgba(0,0,0,0.5); cursor:default;">
            <div style="width:150px; height:150px; margin:0 auto 20px; background:url(${store.p[id]?.img || ''}) center/cover #111; border:1px solid #333; border-radius:4px;"></div>
            <h2 style="letter-spacing:2px; margin-bottom:5px;">${currentName}</h2>
            <p style="color:#00f2ff; font-size:10px; margin-bottom:25px; opacity:0.7;">UNIT_ID: ${id}</p>
            <button id="confirm-move" class="btn" style="background:#00f2ff; color:#000; width:100%; padding:12px; font-weight:900; cursor:pointer; border:none; margin-bottom:10px;">INICIAR OPERAÇÃO</button>
            <button id="cancel-move" class="btn" style="background:transparent; color:#fff; width:100%; padding:8px; font-size:10px; cursor:pointer; border:1px solid #333; opacity:0.5;">ABORTAR</button>
        </div>
    `;

    document.body.appendChild(modal);

    modal.onclick = (e) => { if(e.target.id === "unit-modal-overlay") { modal.remove(); sel = null; renderBoard(); } };
    document.getElementById('confirm-move').onclick = () => { modal.remove(); callback(); };
    document.getElementById('cancel-move').onclick = () => { modal.remove(); sel = null; renderBoard(); };
}

function renderBoard() {
    const b = document.getElementById('board');
    const fragment = document.createDocumentFragment();
    const edit = document.getElementById('edit-mode').checked;
    
    const bCheck = isKingInCheck('B');
    const pCheck = isKingInCheck('P');

    store.board.forEach((id, i) => {
        const sq = document.createElement('div'); 
        sq.className = `sq ${(Math.floor(i/8) + i%8) % 2 == 0 ? 'l' : 'd'}`;
        sq.onclick = () => handleSq(i);

        // Destaque de Xeque no Rei
        if (id && id.charAt(0) === 'K') {
            if ((id.endsWith('_B') && bCheck) || (id.endsWith('_P') && pCheck)) sq.classList.add('in-check');
        }
        
        // Mostrar movimentos possíveis se houver peça selecionada
        if (sel !== null && !edit && isLegalMove(sel, i)) {
            const dot = document.createElement('div');
            dot.className = 'legal-dot';
            sq.appendChild(dot);
        }

        if (store.g.lastMove && (i === store.g.lastMove.from || i === store.g.lastMove.to)) {
            sq.classList.add('last-move');
        }

        if(id) {
            const c = document.createElement('div'); c.className='piece-container';
            const p = document.createElement('div'); p.className='piece';
            if(store.p[id]?.img) p.style.backgroundImage = `url(${store.p[id].img})`;
            else { 
                p.classList.add('no-img'); 
                if (id.endsWith('_B')) {
                    p.style.backgroundColor = '#fff';
                    p.style.color = '#000'; 
                } else {
                    p.style.backgroundColor = '#000';
                    p.style.color = '#fff';
                }
                p.innerText = store.p[id]?.name || id.split('_')[0]; 
            }

            p.onclick = (e) => { if(edit) { e.stopPropagation(); triggerQuickUpload(id); } };

            c.appendChild(p);
            if(edit) {
                const x = document.createElement('div'); x.className='btn-remove'; x.innerHTML='×';
                x.onclick=(e)=>{ e.stopPropagation(); store.graveyard.push(store.board[i]); store.board[i]=null; renderBoard(); renderGraveyard(); save(); };
                c.appendChild(x);
            }
            sq.appendChild(c);
        }
        fragment.appendChild(sq);
    });
    b.innerHTML = '';
    b.appendChild(fragment);
}

function handleSq(i) {
    if (gySel !== null) {
        if (!store.board[i]) {
            store.board[i] = store.graveyard[gySel];
            store.graveyard.splice(gySel, 1);
            gySel = null;
            renderBoard(); renderGraveyard(); save();
        }
        return;
    }
    if (document.getElementById('edit-mode').checked) return;
    if (!isLive) return;

    // If AI mode and it's AI's turn, block user interactions
    if (store.g.mode === 'AI' && turn === store.g.aiSide) return;

    const free = document.getElementById('free-move').checked;
    if (sel === null) {
        const id = store.board[i];
        // Prevent selecting AI-controlled pieces when playing vs AI
        if (id && (free || id.endsWith('_' + turn)) && !(store.g.mode === 'AI' && id.endsWith('_' + store.g.aiSide))) {
            sel = i;
            showUnitID(id, () => {
                renderBoard();
                const sq = document.getElementById('board').children[i];
                if (sq) sq.style.boxShadow = "inset 0 0 15px #00f2ff";
            });
        }
        return;
    }

    if (sel === i) {
        sel = null;
        renderBoard();
        return;
    }

    const fromId = store.board[sel];
    const toId = store.board[i];

    if (toId && isSameColor(fromId, toId)) {
        sel = i;
        showUnitID(toId, () => { renderBoard(); });
        return;
    }

    if (!free && !isMoveValid(sel, i)) {
        const type = fromId?.charAt(0);
        if (type === 'P') {
            const src = getCoord(sel);
            const dst = getCoord(i);
            const dr = dst.row - src.row;
            const color = fromId.endsWith('_B') ? 'B' : 'P';
            const direction = color === 'B' ? -1 : 1;
            if (dr * direction < 0) {
                showWrongSideModal();
                return;
            }
        }
        showInvalidMove(fromId);
        return;
    }

    if (toId) {
        // If playing vs AI and opponent is AI, resolve capture immediately
        if (store.g.mode === 'AI') {
            const aiSide = store.g.aiSide;
            const targetSide = toId.endsWith('_' + aiSide) ? aiSide : (toId.endsWith('_' + (aiSide==='B'?'P':'B')) ? (aiSide==='B'?'P':'B') : null);
            // If the captured piece belongs to the AI, auto-resolve
            if (targetSide && targetSide === store.g.aiSide) {
                executeMove(sel, i);
                return;
            }
        }
        pending = { f: sel, t: i };
        openArena();
    } else {
        if (!free) {
            executeMove(sel, i);
        } else {
            const color = fromId.endsWith('_B') ? 'B' : 'P';
            const playerName = document.getElementById('name-' + color)?.value || (color === 'B' ? 'Brancas' : 'Pretas');
            const pieceName = store.p[fromId]?.name || pieceNames[fromId.charAt(0)];
            const coord = String.fromCharCode(65 + (i % 8)) + (8 - Math.floor(i / 8));
            addLogEntry(`[LIVRE] <b>${playerName}</b> moveu <b>${pieceName}</b> para <b>${coord}</b>`);

            store.board[i] = fromId;
            store.board[sel] = null;
            sel = null; renderBoard(); save();
        }
    }
}

function openArena() {
    const idA = store.board[pending.f];
    const idD = store.board[pending.t];
    const typeA = idA.charAt(0);
    const typeD = idD.charAt(0);
    const imgA = document.getElementById('a-img');
    const imgD = document.getElementById('d-img');

    const setFighter = (el, id, type) => {
        el.innerHTML = ''; 
        if (store.p[id]?.img) {
            el.style.backgroundImage = `url(${store.p[id].img})`;
        } else {
            el.style.backgroundImage = 'none';
            const isWhite = id.endsWith('_B');
            el.style.backgroundColor = isWhite ? '#fff' : '#000';
            el.style.color = isWhite ? '#000' : '#fff';
            el.innerText = id.split('_')[0];
        }
    };
    setFighter(imgA, idA, typeA);
    setFighter(imgD, idD, typeD);

    arenaAudios.left = getPieceAudio(idA);
    arenaAudios.right = getPieceAudio(idD);

    const btnLeft = document.getElementById('btn-play-L');
    const btnRight = document.getElementById('btn-play-R');
    const statusLeft = document.getElementById('sound-status-L');
    const statusRight = document.getElementById('sound-status-R');
    const hasSoundA = !!store.p[idA]?.sound;
    const hasSoundD = !!store.p[idD]?.sound;

    btnLeft?.classList.add('sound-active');
    btnRight?.classList.add('sound-active');
    if (statusLeft) statusLeft.innerText = hasSoundA ? 'Som personalizado 🎵' : 'Som padrão 🎧';
    if (statusRight) statusRight.innerText = hasSoundD ? 'Som personalizado 🎵' : 'Som padrão 🎧';
    if (btnLeft) btnLeft.title = hasSoundA ? 'Tocar som personalizado da peça atacante' : 'Tocar som padrão da peça atacante';
    if (btnRight) btnRight.title = hasSoundD ? 'Tocar som personalizado da peça defensora' : 'Tocar som padrão da peça defensora';

    document.getElementById('arena').style.display = 'flex';
}

function finishDuel(v) {
    const arenaContent = document.querySelector('.arena-content');
    if (arenaContent) {
        arenaContent.classList.add('shake');
        setTimeout(() => arenaContent.classList.remove('shake'), 500);
    }

    const idA = store.board[pending.f], idD = store.board[pending.t];
    const nameA = store.p[idA]?.name || pieceNames[idA.charAt(0)];
    const nameD = store.p[idD]?.name || pieceNames[idD.charAt(0)];

    const corA = idA.endsWith('_B') ? 'B' : 'P';

    const winnerId = (v === corA) ? idA : idD;
    addLogEntry(`Duelo: <b>${nameA}</b> vs <b>${nameD}</b>. Vitória: <b>${v === corA ? nameA : nameD}</b>`);

    if (v === corA) {
        // attacker venceu: executar movimento normalmente (respeita promo/en-passant/roque)
        executeMove(pending.f, pending.t);
        document.getElementById('arena').style.display='none';
        return;
    } else {
        lastCapturePos = pending.f;
        store.graveyard.push(idA);
        store.board[pending.f] = null;
        store.g['kills' + v]++;
    }
    setTimeout(() => playDefeatSound(), 120);
    document.getElementById('arena').style.display='none';
    renderGraveyard();
    // Verifica vitória após a captura
    const winner = checkForVictory();
    if (!winner) nextTurn();
}

function syncVolumes(type, val) {
    if (type === 'master') {
        const sidebar = document.getElementById('v-master');
        const dash = document.getElementById('v-master-dash');
        if (sidebar) sidebar.value = val;
        if (dash) dash.value = val;
        updateMasterVolume();
    } else if (type === 'ambient') {
        const sidebar = document.getElementById('vol-Ambiente');
        const dash = document.getElementById('v-ambient-dash');
        if (sidebar) sidebar.value = val;
        if (dash) dash.value = val;
        syncTrackVolume('Ambiente');
    }
}

function syncTrackVolume(type) {
    if (fadeIntervals[type]) return; 
    const volSlider = document.getElementById(`vol-${type}`);
    const val = parseFloat(volSlider?.value || 0.7);
    if (type === 'Ambiente' && document.getElementById('v-ambient-dash')) {
        document.getElementById('v-ambient-dash').value = val;
    }
    ambientAudios[type].volume = val * parseFloat(document.getElementById('v-master').value);
}

function updateMasterVolume() {
    const masterVal = parseFloat(document.getElementById('v-master')?.value || 1);
    if (document.getElementById('v-master-dash')) {
        document.getElementById('v-master-dash').value = masterVal;
    }

    // 1. Atualiza áudios de Ambiente
    Object.keys(ambientAudios).forEach(t => syncTrackVolume(t));

    // 2. Atualiza áudios de peças em execução (previews na sidebar)
    Object.keys(piecePlayback).forEach(id => {
        const audio = piecePlayback[id];
        if (audio instanceof Audio) {
            const pVol = parseFloat(store.p[id]?.volume ?? 0.8);
            audio.volume = masterVal * pVol;
        }
    });

    // 3. Atualiza áudios da Arena (Duelo ativo)
    ['left', 'right'].forEach(side => {
        const audio = arenaPlayback[side];
        if (audio instanceof Audio) audio.volume = masterVal;
    });
}

function updateBoardZoom(value) {
    const zoom = parseFloat(value) || 1;
    store.g.zoomBoard = zoom;
    const wrapper = document.querySelector('.board-wrapper');
    if (wrapper) {
        wrapper.style.transform = `scale(${zoom})`;
        // Se o zoom for muito grande, permitimos o scroll no main para não cortar o tabuleiro
        const main = document.querySelector('main');
        if (main) {
            main.style.overflow = zoom > 1 ? 'auto' : 'hidden';
        }
    }
    
    const slider = document.getElementById('board-zoom');
    if (slider) slider.value = zoom;
    save();
}

function playWithFade(type) {
    Object.keys(ambientAudios).forEach((t) => {
        if (t !== type && ambientAudios[t] && !ambientAudios[t].paused) {
            stopWithFade(t);
        }
    });

    // Para os sons de peças e arena com fade ao clicar no ambiente
    Object.keys(piecePlayback).forEach(id => stopPiecePlayback(id, true));
    ['left', 'right'].forEach(side => stopArenaPlayback(side, true));

    const a = ambientAudios[type];
    const target = parseFloat(document.getElementById(`vol-${type}`)?.value || 0.7) * parseFloat(document.getElementById('v-master').value);
    if (fadeIntervals[type]) clearInterval(fadeIntervals[type]);
    a.volume = 0; // Começa sempre do zero para um cross-fade limpo
    a.play().catch(() => {});
    fadeIntervals[type] = setInterval(() => {
        if (a.volume < target - 0.01) a.volume += 0.01;
        else { a.volume = target; clearInterval(fadeIntervals[type]); fadeIntervals[type] = null; }
    }, 20);
}

function stopWithFade(type) {
    const a = ambientAudios[type];
    if (fadeIntervals[type]) clearInterval(fadeIntervals[type]);
    fadeIntervals[type] = setInterval(() => {
        if (a.volume > 0.01) a.volume -= 0.01;
        else { a.pause(); a.volume = 0; clearInterval(fadeIntervals[type]); fadeIntervals[type] = null; }
    }, 20);
}

function ensureAudioContext() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    return audioContext;
}

function getPieceAudio(id) {
    if (!store.p[id]?.sound) return null;
    if (!pieceSoundAudios[id]) pieceSoundAudios[id] = new Audio(store.p[id].sound);
    else if (pieceSoundAudios[id].src !== store.p[id].sound) pieceSoundAudios[id].src = store.p[id].sound;
    pieceSoundAudios[id].loop = false;
    const master = parseFloat(document.getElementById('v-master')?.value || 1);
    const pieceVol = parseFloat(store.p[id]?.volume ?? 0.8);
    pieceSoundAudios[id].volume = master * pieceVol;
    return pieceSoundAudios[id];
}

function playDefaultPieceSound(id) {
    const freqs = { P: 440, T: 330, C: 392, B: 523, Q: 587, K: 261 };
    const ctx = ensureAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freqs[id?.charAt(0)] || 380;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
}

function playDefeatSound() {
    const ctx = ensureAudioContext();
    const gain = ctx.createGain();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.value = 260;
    osc2.frequency.value = 180;
    gain.gain.value = 0.15;
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    osc1.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.3);
    osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.stop(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 0.3);
}

function playTickSound(vol = 0.05) {
    const ctx = ensureAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.02);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.02);
}

function fadeOutAudioElement(audio, duration = 600, callback) {
    if (!audio || typeof audio.volume !== 'number') {
        if (typeof callback === 'function') callback();
        return;
    }
    const currentVolume = audio.volume;
    const stepTime = 20;
    const steps = Math.max(1, Math.round(duration / stepTime));
    const stepAmount = currentVolume / steps;
    if (playbackFadeIntervals.has(audio)) {
        clearInterval(playbackFadeIntervals.get(audio));
        playbackFadeIntervals.delete(audio);
    }

    let count = 0;
    const interval = setInterval(() => {
        count += 1;
        audio.volume = Math.max(0, audio.volume - stepAmount);
        if (count >= steps || audio.volume <= 0.01) {
            clearInterval(interval);
            playbackFadeIntervals.delete(audio);
            try { audio.pause(); } catch (err) {}
            audio.volume = 0;
            if (typeof callback === 'function') callback();
        }
    }, stepTime);
    playbackFadeIntervals.set(audio, interval);
}

function fadeOutPlayback(playback, callback) {
    if (!playback) {
        if (typeof callback === 'function') callback();
        return;
    }
    if (playback.oscillators) {
        try { playback.stop(); } catch (err) {}
        if (typeof callback === 'function') callback();
        return;
    }
    if (playback instanceof Audio || typeof playback.pause === 'function') {
        fadeOutAudioElement(playback, 300, callback);
        return;
    }
    if (typeof callback === 'function') callback();
}

function playPieceSound(id) {
    if (!id) return;
    
    // Para qualquer outra música de peça que esteja tocando para evitar sobreposição
    Object.keys(piecePlayback).forEach(key => stopPiecePlayback(key, true));

    // Para a música ambiente ao disparar som de peça
    Object.keys(ambientAudios).forEach(t => { if (!ambientAudios[t].paused) stopWithFade(t); });

    const audio = getPieceAudio(id);
    if (audio) {
        try {
            audio.currentTime = 0;
            audio.volume = parseFloat(document.getElementById('v-master')?.value || 1) * 0.9;
            audio.play().catch(() => {});
            piecePlayback[id] = audio; // Registra o playback para permitir o controle (pause/stop) via UI
        } catch (err) {}
    } else {
        playDefaultPieceSound(id);
    }
}

function stopArenaPlayback(side, fade = false) {
    const playback = arenaPlayback[side];
    if (!playback) return;
    const clearPlayback = () => { arenaPlayback[side] = null; };
    if (fade) {
        fadeOutPlayback(playback, clearPlayback);
    } else {
        if (typeof playback.pause === 'function') {
            try { playback.pause(); } catch (err) {}
        }
        if (typeof playback.stop === 'function') {
            try { playback.stop(); } catch (err) {}
        }
        if (playback.oscillators) {
            playback.oscillators.forEach(o => { try { o.stop(); } catch (err) {} });
        }
        clearPlayback();
    }
}

function stopPiecePlayback(id, fade = false) {
    const playback = piecePlayback[id];
    if (!playback) return;
    const clearPlayback = () => { piecePlayback[id] = null; };
    if (fade) {
        fadeOutPlayback(playback, clearPlayback);
    } else {
        if (typeof playback.pause === 'function') {
            try { playback.pause(); } catch (err) {}
        }
        if (typeof playback.stop === 'function') {
            try { playback.stop(); } catch (err) {}
        }
        if (playback.oscillators) {
            playback.oscillators.forEach(o => { try { o.stop(); } catch (err) {} });
        }
        clearPlayback();
    }
}

function createDefaultPiecePlayback(id) {
    const ctx = ensureAudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.value = 440;
    osc2.frequency.value = 330;
    gain.gain.value = 0.08;
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    osc1.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(165, ctx.currentTime + 0.2);
    const stop = () => {
        try {
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
            osc1.stop(ctx.currentTime + 0.05);
            osc2.stop(ctx.currentTime + 0.05);
        } catch (err) {}
    };
    return { stop, oscillators: [osc1, osc2] };
}

function playArenaPiece(side) {
    const id = side === 'left' ? store.board[pending?.f] : store.board[pending?.t];
    const otherSide = side === 'left' ? 'right' : 'left';
    stopArenaPlayback(otherSide, true);
    stopArenaPlayback(side, false);

    // Para a música ambiente ao entrar em duelo na arena
    Object.keys(ambientAudios).forEach(t => { if (!ambientAudios[t].paused) stopWithFade(t); });

    const audio = side === 'left' ? arenaAudios.left : arenaAudios.right;
    if (audio) {
        try {
            audio.currentTime = 0;
            audio.volume = parseFloat(document.getElementById('v-master')?.value || 1);
            audio.play().catch(() => {});
        } catch (err) {}
        arenaPlayback[side] = audio;
    } else if (id) {
        arenaPlayback[side] = createDefaultPiecePlayback(id);
    }
}

function pauseArenaPiece(side) {
    stopArenaPlayback(side, true);
}

function playPiecePreview(id) {
    Object.keys(piecePlayback).forEach(key => {
        if (key !== id) stopPiecePlayback(key, true);
    });
    stopPiecePlayback(id);

    // Para a música ambiente ao testar som de peça na sidebar
    Object.keys(ambientAudios).forEach(t => { if (!ambientAudios[t].paused) stopWithFade(t); });

    const audio = getPieceAudio(id);
    if (audio) {
        try {
            audio.currentTime = 0;
            audio.volume = parseFloat(document.getElementById('v-master')?.value || 1) * 0.8;
            audio.play().catch(() => {});
        } catch (err) {}
        piecePlayback[id] = audio;
    } else {
        piecePlayback[id] = createDefaultPiecePlayback(id);
    }
}

function pausePiecePreview(id) {
    stopPiecePlayback(id, true);
}

function setupAmbientUI() {
    const cont = document.getElementById('ambient-controls'); cont.innerHTML = '';
    ['Ambiente', 'Entrada', 'Intro1', 'Intro2'].forEach(t => {
        if(store.g['snd'+t]) ambientAudios[t].src = store.g['snd'+t];
        ambientAudios[t].loop = (t === 'Ambiente');
        const d = document.createElement('div'); d.className = "unit-card";
        d.style = "margin-bottom: 5px; border: 1px solid #222; padding: 8px; background: rgba(255,255,255,0.01);";
        d.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <span style="font-size:10px; font-weight:bold; color:#00f2ff">${t.toUpperCase()}</span>
                <input type="file" id="file-${t}" style="display:none" onchange="upAmb('${t}', this)">
                <button onclick="document.getElementById('file-${t}').click()" style="background:none; border:1px solid #444; color:white; cursor:pointer; font-size:10px;">📁</button>
            </div>
            <input type="range" id="vol-${t}" min="0" max="1" step="0.01" value="0.7" style="width:100%;" oninput="syncTrackVolume('${t}')">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top:8px;">
                <button onclick="playWithFade('${t}')" style="background:#004d4d; color:white; border:none; padding:4px; font-size:9px; cursor:pointer;">PLAY</button>
                <button onclick="stopWithFade('${t}')" style="background:#4d001a; color:white; border:none; padding:4px; font-size:9px; cursor:pointer;">STOP</button>
            </div>
        `;
        cont.appendChild(d);
    });
}

function upAmb(t, i) {
    const r = new FileReader();
    r.onload = e => { store.g['snd'+t] = e.target.result; ambientAudios[t].src = e.target.result; save(); playWithFade(t); };
    r.readAsDataURL(i.files[0]);
}

function exportSquadData() {
    const data = JSON.stringify({ p: store.p, g: store.g });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cosplay-chess-data-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importSquadData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.p) store.p = data.p;
            if (data.g) store.g = { ...store.g, ...data.g };
            save();
            alert("Dados importados com sucesso! A página será reiniciada.");
            location.reload();
        } catch (err) {
            alert("Erro ao importar o arquivo. Certifique-se de que é um JSON válido do Cosplay Chess.");
        }
    };
    reader.readAsText(file);
}

function addLogEntry(msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry = `[${time}] ${msg}`;
    if (!store.log) store.log = [];
    store.log.unshift(entry);
    if (store.log.length > 50) store.log.pop();
    renderLog();
}

function renderLog() {
    const cont = document.getElementById('list-log');
    if (!cont) return;
    if (!store.log) store.log = [];
    cont.innerHTML = store.log.map(entry => `<div class="log-entry">${entry}</div>`).join('');
    // Auto-scroll para o topo (já que usamos unshift para as mais recentes)
    cont.scrollTop = 0;
}

function save() { if(db) db.transaction("assets","readwrite").objectStore("assets").put(store,"all"); }

function nextTurn() { 
    turn = turn==='B'?'P':'B'; 
    sel = null; 
    renderBoard(); 
    updateUI();
    save(); 
    // Se modo AI e é vez da IA, executar jogada automática
    if (store.g.mode === 'AI' && turn === store.g.aiSide) {
        setTimeout(() => aiMakeMove(), 600);
    }
}

function updateUI() {
    document.getElementById('score-B').innerText = store.g.killsB; 
    document.getElementById('score-P').innerText = store.g.killsP;
    document.getElementById('img-B').style.backgroundImage = `url(${store.g.avatarB || ''})`; 
    document.getElementById('img-P').style.backgroundImage = `url(${store.g.avatarP || ''})`;
    document.getElementById('card-B').className = `player-card ${turn==='B'?'active-B':''}`;
    document.getElementById('card-P').className = `player-card ${turn==='P'?'active-P':''}`;
}

function renderGraveyard() {
    const gy = document.getElementById('graveyard'); gy.innerHTML = '';
    store.graveyard.forEach((id, idx) => {
        const p = document.createElement('div'); p.className = `gy-piece ${gySel === idx ? 'selected' : ''}`;
        if(store.p[id]?.img) p.style.backgroundImage = `url(${store.p[id].img})`;
        else p.style.backgroundColor = id.endsWith('_B') ? '#fff' : '#000';
        p.onclick = () => { gySel = (gySel === idx) ? null : idx; renderGraveyard(); };
        gy.appendChild(p);
    });
    // Checa vitória sempre que o cemitério é atualizado
    checkForVictory();
}

function showVictoryModal(winner) {
    if (!winner) return;
    isLive = false;
    const photoEl = document.getElementById('victory-photo');
    const nameEl = document.getElementById('winner-name');
    const crownEl = document.getElementById('victory-crown');
    const winModal = document.getElementById('victory-modal');
    if (winner === 'DRAW') {
        if (photoEl) photoEl.style.backgroundImage = '';
        if (nameEl) nameEl.innerText = `EMPATE!`;
        if (crownEl) crownEl.style.display = 'none';
    } else {
        const avatar = store.g['avatar' + winner] || '';
        const playerName = (document.getElementById('name-' + winner)?.value) || (winner === 'B' ? 'BRANCAS' : 'PRETAS');
        if (photoEl) photoEl.style.backgroundImage = avatar ? `url(${avatar})` : '';
        if (nameEl) nameEl.innerText = playerName;
        if (crownEl) crownEl.style.display = 'block';
    }
    // destaque da casa onde ocorreu a captura (xeque mate)
    try {
        const board = document.getElementById('board');
        if (board && typeof lastCapturePos === 'number' && board.children[lastCapturePos]) {
            board.children[lastCapturePos].classList.add('highlight-mate');
        }
    } catch (err) {}
    if (winModal) winModal.style.display = 'flex';
}

function clearMateHighlight() {
    try {
        const board = document.getElementById('board');
        if (!board) return;
        Array.from(board.children).forEach(ch => ch.classList.remove('highlight-mate'));
        lastCapturePos = null;
    } catch (err) {}
}

function newGame() {
    // Reinicia o estado do jogo sem recarregar
    store.board = getInitialBoard();
    store.graveyard = [];
    store.g.killsB = 0;
    store.g.killsP = 0;
    store.g.lastMove = { from: null, to: null };
    isLive = false;
    sel = null; pending = null; gySel = null;
    clearMateHighlight();
    save();
    renderBoard(); renderGraveyard(); updateUI();
    // fechar modal de vitória
    const winModal = document.getElementById('victory-modal');
    if (winModal) winModal.style.display = 'none';
    // abrir menu inicial
    const startMenu = document.getElementById('start-menu');
    if (startMenu) { startMenu.classList.add('show'); startMenu.style.display = 'flex'; }
}

function checkForVictory() {
    // SE ESTIVER NO MODO EDIÇÃO, NÃO VALIDA VITÓRIA
    const editModeCheckbox = document.getElementById('edit-mode');
    if (editModeCheckbox && editModeCheckbox.checked) return null;

    // Retorna 'B' ou 'P' se houver vencedor, 'DRAW' para empate, ou null
    const bPieces = store.board.filter(id => id && id.endsWith('_B')).length;
    const pPieces = store.board.filter(id => id && id.endsWith('_P')).length;
    const bKing = store.board.some(id => id && id.charAt(0) === 'K' && id.endsWith('_B'));
    const pKing = store.board.some(id => id && id.charAt(0) === 'K' && id.endsWith('_P'));

    if (!bKing || bPieces === 0) { showVictoryModal('P'); return 'P'; }
    if (!pKing || pPieces === 0) { showVictoryModal('B'); return 'B'; }

    // checkmate / stalemate detection: after a move, check opponent
    const opponent = turn === 'B' ? 'P' : 'B';
    const legal = getAllLegalMoves(opponent);
    if (legal.length === 0) {
        if (isKingInCheck(opponent)) {
            // opponent is checkmated -> current player (turn) wins
            const winner = turn;
            showVictoryModal(winner);
            return winner;
        } else {
            // stalemate
            showVictoryModal('DRAW');
            return 'DRAW';
        }
    }
    return null;
}

function renderConfigLists() {
    ['white','black'].forEach(s => {
        const team = s==='white'?'B':'P', cont = document.getElementById('list-'+s);
            cont.innerHTML = `<h3 style="font-size:10px; color:var(--accent); margin:15px 0 10px; letter-spacing:3px; font-weight:900; opacity:0.6; padding-left:5px;">SQUAD_${s.toUpperCase()}</h3>`;
        [...nobres, ...peoes].forEach(p => {
            const id = `${p}_${team}`; 
            const currentName = store.p[id]?.name || id;
            const hasSound = !!store.p[id]?.sound;
            const volValue = store.p[id]?.volume ?? 0.8;
            const d = document.createElement('div'); 
            d.className = 'unit-card';
                d.style.padding = "12px";
            d.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:34px; height:34px; background:url(${store.p[id]?.img || ''}) center/cover #000; border-radius:6px; border:1px solid rgba(255,255,255,0.1);"></div>
                        <div style="flex:1; min-width:0;">
                            <input type="text" class="edit-piece-name-input" value="${currentName}" onchange="updatePieceName('${id}', this.value)" style="width:100%;">
                            <div style="font-size:8px; color:#555; margin-top:3px; letter-spacing:1px;">ID: ${id}</div>
                        </div>
                    </div>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:12px;">
                        <label class="btn-upload">
                            🖼️ FOTO
                            <input type="file" accept="image/*" onchange="upPiece('${id}',this)" style="display:none">
                        </label>
                        <label class="btn-upload">
                            🎵 ÁUDIO
                            <input type="file" accept="audio/*" onchange="upPieceSound('${id}',this)" style="display:none">
                        </label>
                    </div>

                    <div style="margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05);">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <input type="range" min="0" max="1" step="0.05" value="${volValue}" style="flex:1;" oninput="updatePieceVolume('${id}', this.value)">
                            <div style="display:flex; gap:6px;">
                                <button class="btn-play-sm" onclick="playPiecePreview('${id}')" title="Testar Som">▶</button>
                                <button class="btn-play-sm" onclick="pausePiecePreview('${id}')" title="Pausar">⏸</button>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-top:6px;">
                             <span id="vol-label-${id}" style="font-size:8px; color:#444; font-weight:800;">GAIN: ${Math.round(volValue*100)}%</span>
                             <span style="font-size:8px; color:${hasSound ? 'var(--accent)' : '#444'}; font-weight:900; letter-spacing:0.5px;">
                                ${hasSound ? 'SYSTEM_AUDIO_READY' : 'NO_AUDIO_DATA'}
                             </span>
                        </div>
                    </div>
                `;
            cont.appendChild(d);
        });
    });
}

function updatePieceName(id, newName) {
    if (!store.p[id]) store.p[id] = {};
    store.p[id].name = newName.toUpperCase().trim();
    save();
    renderBoard(); 
}

function upPiece(id, i) { const r = new FileReader(); r.onload = e => { if(!store.p[id]) store.p[id]={}; store.p[id].img = e.target.result; save(); renderBoard(); renderConfigLists(); }; r.readAsDataURL(i.files[0]); }
function upPieceSound(id, i) { const r = new FileReader(); r.onload = e => { if(!store.p[id]) store.p[id]={}; store.p[id].sound = e.target.result; if (pieceSoundAudios[id]) pieceSoundAudios[id].src = e.target.result; if (store.p[id].volume === undefined) store.p[id].volume = 0.8; save(); renderConfigLists(); }; r.readAsDataURL(i.files[0]); }

function updatePieceVolume(id, value) {
    const vol = parseFloat(value);
    if (!store.p[id]) store.p[id] = {};
    store.p[id].volume = vol;

    // 1. Atualiza o áudio se ele estiver tocando (Preview na Sidebar)
    const masterVal = parseFloat(document.getElementById('v-master')?.value || 1);
    if (piecePlayback[id] instanceof Audio) {
        piecePlayback[id].volume = masterVal * vol;
    }

    // 2. Atualiza o label de texto sem redesenhar a lista toda
    const label = document.getElementById(`vol-label-${id}`);
    if (label) label.innerText = `GAIN: ${Math.round(vol * 100)}%`;

    // 3. Salva no banco (debounced por natureza do IndexedDB seria melhor, mas aqui funciona)
    save();
}

function upAvatar(s, i) { const r = new FileReader(); r.onload = e => { store.g['avatar'+s] = e.target.result; save(); updateUI(); }; r.readAsDataURL(i.files[0]); }
function showTab(t) {
    // Adicionamos 'log' à lista de abas para que o sistema reconheça o clique
    const tabs = ['white', 'black', 'sys', 'log'];
    tabs.forEach(id => {
        const listEl = document.getElementById('list-' + id);
        const tabBtn = document.getElementById('t-' + id);
        
        if (listEl) listEl.style.display = (id === t ? 'block' : 'none');
        if (tabBtn) tabBtn.className = (id === t ? 'active' : '');
    });
}

function pauseGame() {
    const startMenu = document.getElementById('start-menu');
    if (startMenu) {
        startMenu.classList.add('show');
        startMenu.style.display = 'flex';
    }
}

function togglePinMenu(val) {
    store.g.pinnedMenu = val;
    save();
}

function startBattle() {
    if (!store.g.theme) store.g.theme = 'default';
    applyTheme(store.g.theme);
    // read UI selections
    const opp = document.getElementById('opponent-select')?.value || store.g.mode || 'LOCAL';
    const aiSide = document.getElementById('ai-side')?.value || store.g.aiSide || 'P';
    const aiDiff = document.getElementById('ai-diff')?.value || store.g.aiDiff || 'normal';
    store.g.mode = opp; store.g.aiSide = aiSide; store.g.aiDiff = aiDiff;
    isLive = true;
    document.getElementById('sidebar').classList.remove('open');
    const startMenu = document.getElementById('start-menu');
    if (startMenu) {
        startMenu.classList.remove('show');
        startMenu.style.display = 'none';
    }
    updateUI();
    save();
    // If AI should start, schedule AI move
    if (store.g.mode === 'AI' && turn === store.g.aiSide) {
        setTimeout(() => aiMakeMove(), 600);
    }
}
function resetGame() { if(confirm("Deseja fazer o Reset total da aplicação?")) { indexedDB.deleteDatabase("WarEngine_v33_2"); location.reload(); } }
function toggleMenu() { document.getElementById('sidebar').classList.toggle('open'); }
function closeArena() { 
    stopArenaPlayback('left');
    stopArenaPlayback('right');
    document.getElementById('arena').style.display='none'; 
    sel=null; 
    document.getElementById('btn-play-L')?.classList.remove('sound-active');
    document.getElementById('btn-play-R')?.classList.remove('sound-active');
    renderBoard(); 
}

function rollInitiative() {
    const modal = document.getElementById('initiative-modal');
    const wheel = document.getElementById('initiative-wheel');
    const pointer = document.querySelector('.wheel-pointer');
    const resultTxt = document.getElementById('initiative-result');
    
    if (!modal || !wheel || !resultTxt) return;

    // Sorteio
    const winnerSide = Math.random() < 0.5 ? 'B' : 'P';
    
    // Lógica para 8 segmentos (45 graus cada)
    // B (Cyan) está nos segmentos 0, 2, 4, 6 (0°, 90°, 180°, 270°)
    // P (Red) está nos segmentos 1, 3, 5, 7 (45°, 135°, 225°, 315°)
    const bSegments = [0, 90, 180, 270];
    const pSegments = [45, 135, 225, 315];
    const baseAngle = winnerSide === 'B' ? bSegments[Math.floor(Math.random()*4)] : pSegments[Math.floor(Math.random()*4)];
    
    const baseSpins = 360 * 6; // 6 voltas completas
    const randomOffset = 5 + Math.random() * 35; // Evita cair na linha divisória
    const finalRotation = baseSpins + (360 - (baseAngle + randomOffset));

    modal.style.display = 'flex';
    resultTxt.innerText = '';
    resultTxt.className = '';
    wheel.style.transition = 'none';
    wheel.style.transform = `rotate(0deg)`;

    setTimeout(() => {
        wheel.style.transition = 'transform 5s cubic-bezier(0.1, 0, 0.1, 1)';
        wheel.style.transform = `rotate(${finalRotation}deg)`;
        
        // Sincronização do som de "Tique"
        let lastTickAngle = 0;
        const startTime = performance.now();
        const duration = 5000;

        function checkTick(now) {
            const elapsed = now - startTime;
            const progress = elapsed / duration;
            if (progress >= 1) return;

            // Curva cubic-bezier aproximada para o som acompanhar o movimento
            const easeOut = 1 - Math.pow(1 - progress, 4);
            const currentRotation = finalRotation * easeOut;
            
            if (currentRotation - lastTickAngle >= 45) {
                lastTickAngle += 45;
                playTickSound(0.05 * (1 - progress)); // Som diminui com a velocidade
                pointer.classList.add('pointer-hit');
                setTimeout(() => pointer.classList.remove('pointer-hit'), 50);
            }
            requestAnimationFrame(checkTick);
        }
        requestAnimationFrame(checkTick);
    }, 100);

    setTimeout(() => {
        turn = winnerSide;
        const winName = winnerSide === 'B' ? 'BRANCAS' : 'PRETAS';
        resultTxt.innerText = `VAI COMEÇAR: ${winName}`;
        resultTxt.style.color = winnerSide === 'B' ? 'var(--accent)' : 'var(--danger)';
        resultTxt.classList.add('winner-flash');
        playPieceSound(winnerSide === 'B' ? 'K1_B' : 'K1_P'); // Som de vitória do Rei sorteado
        
        updateUI(); save();
        setTimeout(() => {
            modal.style.display = 'none';
            if (isLive && store.g.mode === 'AI' && turn === store.g.aiSide) aiMakeMove();
        }, 2500);
    }, 5200);
}
function clearBoardPieces() {
    if(confirm("Limpar todas as peças do tabuleiro?")) {
        store.board = Array(64).fill(null);
        renderBoard();
        save();
    }
}

window.addEventListener("load", () => setTimeout(() => document.getElementById("loader").style.display='none', 1000));


// Fecha o menu lateral automaticamente ao clicar fora dele
window.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const isPinned = store.g ? store.g.pinnedMenu : false;
    
    // Se o menu estiver aberto e o clique NÃO for dentro do menu e NÃO for no botão de abrir
    if (!isPinned && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.remove('open');
    }
});

// Atalho de teclado: ESC para fechar a arena ou alternar o menu lateral
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const arena = document.getElementById('arena');
        if (arena && arena.style.display === 'flex') closeArena();
        else toggleMenu();
    }

    // Atalhos de Arena (Apenas se a arena estiver visível)
    const arena = document.getElementById('arena');
    if (arena && arena.style.display === 'flex') {
        if (e.key === '1' || e.code === 'Digit1') finishDuel('B');
        if (e.key === '2' || e.code === 'Digit2') finishDuel('P');
    }
});