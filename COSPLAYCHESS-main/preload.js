const { contextBridge, ipcRenderer } = require('electron');

const updaterAPI = {
  getState: () => ipcRenderer.invoke('updates:get-state'),
  check: () => ipcRenderer.invoke('updates:check'),
  download: () => ipcRenderer.invoke('updates:download'),
  install: () => ipcRenderer.invoke('updates:install'),
  onStatus: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('update-status', listener);
    return () => ipcRenderer.removeListener('update-status', listener);
  }
};

const musicAPI = {
  getFolder: () => ipcRenderer.invoke('music:get-folder'),
  pickFolder: () => ipcRenderer.invoke('music:pick-folder'),
  listAudio: () => ipcRenderer.invoke('music:list-audio')
};

contextBridge.exposeInMainWorld('electronAPI', {
  setFullscreen: (value) => ipcRenderer.invoke('set-fullscreen', value),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),
  updates: updaterAPI,
  music: musicAPI
});

function createUpdateCard() {
  const systemList = document.getElementById('list-sys');
  if (!systemList || document.getElementById('app-update-card')) return;

  const card = document.createElement('div');
  card.id = 'app-update-card';
  card.className = 'unit-card';
  card.style.background = 'rgba(0,229,255,0.05)';
  card.style.borderColor = 'rgba(0,229,255,0.2)';
  card.innerHTML = `
    <b style="color:var(--accent); font-size:10px; letter-spacing:1px;">⬆ ATUALIZAÇÕES DO APP</b>
    <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px; font-size:10px; color:#ccc;">
      <div>Versão instalada: <strong id="app-update-version" style="color:#fff;">-</strong></div>
      <div>Status: <strong id="app-update-status" style="color:var(--accent);">Aguardando...</strong></div>
    </div>
    <div id="app-update-progress-wrap" style="display:none; margin-top:10px; height:6px; background:#15151b; border-radius:20px; overflow:hidden; border:1px solid #262631;">
      <div id="app-update-progress" style="height:100%; width:0%; background:var(--accent); transition:width .25s ease;"></div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:10px;">
      <button id="app-update-check" class="btn-play-sm" style="width:100%; font-size:8px;">VERIFICAR</button>
      <button id="app-update-download" class="btn-play-sm" style="display:none; width:100%; font-size:8px;">BAIXAR</button>
      <button id="app-update-install" class="btn-play-sm" style="display:none; width:100%; font-size:8px; grid-column:1 / -1;">REINICIAR E ATUALIZAR</button>
    </div>
    <div style="font-size:8px; color:#777; line-height:1.4; margin-top:8px;">Verificação automática ao abrir e a cada 10 minutos.</div>
  `;

  systemList.insertBefore(card, systemList.firstChild);

  const checkButton = document.getElementById('app-update-check');
  const downloadButton = document.getElementById('app-update-download');
  const installButton = document.getElementById('app-update-install');

  checkButton?.addEventListener('click', async () => {
    checkButton.disabled = true;
    try {
      renderUpdateState(await updaterAPI.check());
    } finally {
      checkButton.disabled = false;
    }
  });

  downloadButton?.addEventListener('click', async () => {
    downloadButton.disabled = true;
    try {
      renderUpdateState(await updaterAPI.download());
    } finally {
      downloadButton.disabled = false;
    }
  });

  installButton?.addEventListener('click', () => updaterAPI.install());
}

function renderUpdateState(state) {
  if (!state) return;

  const version = document.getElementById('app-update-version');
  const status = document.getElementById('app-update-status');
  const progressWrap = document.getElementById('app-update-progress-wrap');
  const progressBar = document.getElementById('app-update-progress');
  const checkButton = document.getElementById('app-update-check');
  const downloadButton = document.getElementById('app-update-download');
  const installButton = document.getElementById('app-update-install');

  if (version) version.textContent = state.currentVersion || '-';

  const labels = {
    idle: 'Aguardando verificação',
    checking: 'Verificando atualizações...',
    'up-to-date': 'Atualizado ✓',
    available: state.availableVersion ? `Versão ${state.availableVersion} disponível` : 'Atualização disponível',
    downloading: `Baixando... ${Math.round(state.progress || 0)}%`,
    downloaded: state.availableVersion ? `Versão ${state.availableVersion} pronta` : 'Atualização pronta',
    unsupported: state.message || 'Atualização automática indisponível nesta versão',
    error: state.message ? `Erro: ${state.message}` : 'Erro ao verificar atualização'
  };

  if (status) status.textContent = labels[state.status] || state.message || 'Aguardando...';

  const isDownloading = state.status === 'downloading';
  if (progressWrap) progressWrap.style.display = isDownloading ? 'block' : 'none';
  if (progressBar) progressBar.style.width = `${Math.max(0, Math.min(100, state.progress || 0))}%`;

  if (checkButton) {
    checkButton.disabled = state.status === 'checking' || isDownloading;
    checkButton.style.opacity = checkButton.disabled ? '0.5' : '1';
  }

  if (downloadButton) {
    downloadButton.style.display = state.status === 'available' ? 'block' : 'none';
  }

  if (installButton) {
    installButton.style.display = state.status === 'downloaded' ? 'block' : 'none';
  }
}

function injectEnhancementsScripts() {
  if (document.querySelector('script[data-cosplay-enhancements]')) return;

  const enhancements = document.createElement('script');
  enhancements.src = 'enhancements.js';
  enhancements.dataset.cosplayEnhancements = 'true';
  enhancements.onload = () => {
    if (document.querySelector('script[data-roster-integration]')) return;
    const roster = document.createElement('script');
    roster.src = 'roster-integration.js';
    roster.dataset.rosterIntegration = 'true';
    document.body.appendChild(roster);
  };
  document.body.appendChild(enhancements);
}

function injectPieceHoverLegend() {
  if (document.querySelector('script[data-piece-hover-legend]')) return;

  const legendScript = document.createElement('script');
  legendScript.dataset.pieceHoverLegend = 'true';
  legendScript.textContent = `
    (() => {
      if (window.__cosplayPieceHoverLegendInstalled) return;
      window.__cosplayPieceHoverLegendInstalled = true;

      const PIECE_LABELS = {
        P: 'PEÃO',
        T: 'TORRE',
        C: 'CAVALO',
        B: 'BISPO',
        Q: 'RAINHA',
        K: 'REI'
      };

      const SIDE_LABELS = {
        B: 'BRANCAS',
        P: 'PRETAS'
      };

      const escapeText = value => String(value || '').trim();

      function getPieceMeta(id) {
        if (!id || typeof store === 'undefined' || !store?.p) return null;
        const data = store.p[id] || {};
        const character = escapeText(data.name);
        const assigned = !!(data.registrationId || data.participantName || character);
        if (!assigned || !character) return null;

        const type = PIECE_LABELS[id.charAt(0)] || 'PEÇA';
        const sideCode = id.endsWith('_B') ? 'B' : 'P';
        const side = SIDE_LABELS[sideCode];
        const cosplayer = escapeText(data.participantName);

        return { character, type, side, cosplayer };
      }

      function ensureLegend() {
        let legend = document.getElementById('piece-hover-legend');
        if (legend) return legend;

        const style = document.createElement('style');
        style.id = 'piece-hover-legend-style';
        style.textContent = `
          #piece-hover-legend {
            position: fixed;
            z-index: 12000;
            min-width: 190px;
            max-width: min(330px, 72vw);
            padding: 10px 12px;
            border: 1px solid rgba(227,189,105,.58);
            border-radius: 10px;
            background: linear-gradient(145deg, rgba(31,15,25,.98), rgba(7,8,13,.98));
            box-shadow: 0 14px 36px rgba(0,0,0,.58), inset 0 0 18px rgba(227,189,105,.04);
            color: #f4ead7;
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            transform: translateY(5px) scale(.98);
            transition: opacity .12s ease, transform .12s ease, visibility .12s ease;
            backdrop-filter: blur(8px);
          }
          #piece-hover-legend.show {
            opacity: 1;
            visibility: visible;
            transform: translateY(0) scale(1);
          }
          #piece-hover-legend .phl-kicker {
            color: #d9ab55;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 1.5px;
            margin-bottom: 4px;
          }
          #piece-hover-legend .phl-character {
            color: #fff4dc;
            font-family: Georgia, serif;
            font-size: 14px;
            font-weight: 800;
            line-height: 1.2;
            overflow-wrap: anywhere;
          }
          #piece-hover-legend .phl-piece {
            color: #d9ab55;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: .8px;
            margin-top: 5px;
          }
          #piece-hover-legend .phl-person {
            color: #97909d;
            font-size: 9px;
            margin-top: 5px;
            line-height: 1.35;
            overflow-wrap: anywhere;
          }
          #board .piece[data-has-character='true'] { cursor: help; }
        `;
        document.head.appendChild(style);

        legend = document.createElement('div');
        legend.id = 'piece-hover-legend';
        legend.setAttribute('role', 'tooltip');
        legend.innerHTML = '<div class="phl-kicker">LEGENDA DA PEÇA</div><div class="phl-character"></div><div class="phl-piece"></div><div class="phl-person"></div>';
        document.body.appendChild(legend);
        return legend;
      }

      function decorateBoard() {
        const board = document.getElementById('board');
        if (!board || typeof store === 'undefined' || !Array.isArray(store?.board)) return;

        Array.from(board.children).forEach((square, index) => {
          const id = store.board[index];
          const piece = square.querySelector('.piece');
          if (!piece || !id) return;

          piece.dataset.pieceId = id;
          const meta = getPieceMeta(id);
          if (meta) {
            piece.dataset.hasCharacter = 'true';
            piece.setAttribute('aria-label', meta.character + ', ' + meta.type + ', ' + meta.side.toLowerCase());
            piece.title = meta.character + ' • ' + meta.type + ' • ' + meta.side;
          } else {
            delete piece.dataset.hasCharacter;
            piece.removeAttribute('aria-label');
            piece.removeAttribute('title');
          }
        });
      }

      function positionLegend(legend, clientX, clientY) {
        const gap = 15;
        const margin = 10;
        const rect = legend.getBoundingClientRect();
        let left = clientX + gap;
        let top = clientY + gap;

        if (left + rect.width > window.innerWidth - margin) left = clientX - rect.width - gap;
        if (top + rect.height > window.innerHeight - margin) top = clientY - rect.height - gap;

        legend.style.left = Math.max(margin, left) + 'px';
        legend.style.top = Math.max(margin, top) + 'px';
      }

      function showLegend(piece, event) {
        const id = piece?.dataset?.pieceId;
        const meta = getPieceMeta(id);
        if (!meta) return;

        const legend = ensureLegend();
        legend.querySelector('.phl-character').textContent = meta.character;
        legend.querySelector('.phl-piece').textContent = meta.type + ' • ' + meta.side;
        const person = legend.querySelector('.phl-person');
        if (meta.cosplayer && meta.cosplayer.toUpperCase() !== meta.character.toUpperCase()) {
          person.textContent = 'Cosplayer: ' + meta.cosplayer;
          person.style.display = 'block';
        } else {
          person.textContent = '';
          person.style.display = 'none';
        }
        legend.classList.add('show');
        positionLegend(legend, event.clientX, event.clientY);
      }

      function hideLegend() {
        document.getElementById('piece-hover-legend')?.classList.remove('show');
      }

      function bindBoard() {
        const board = document.getElementById('board');
        if (!board || board.dataset.hoverLegendBound === 'true') return false;
        board.dataset.hoverLegendBound = 'true';

        board.addEventListener('mouseover', event => {
          const piece = event.target.closest?.('.piece[data-has-character="true"]');
          if (!piece || !board.contains(piece)) return;
          showLegend(piece, event);
        });

        board.addEventListener('mousemove', event => {
          const piece = event.target.closest?.('.piece[data-has-character="true"]');
          const legend = document.getElementById('piece-hover-legend');
          if (!piece || !legend?.classList.contains('show')) return;
          positionLegend(legend, event.clientX, event.clientY);
        });

        board.addEventListener('mouseout', event => {
          const piece = event.target.closest?.('.piece[data-has-character="true"]');
          if (!piece) return;
          if (piece.contains(event.relatedTarget)) return;
          hideLegend();
        });

        const observer = new MutationObserver(() => {
          decorateBoard();
          hideLegend();
        });
        observer.observe(board, { childList: true, subtree: true });
        decorateBoard();
        return true;
      }

      function initLegend() {
        ensureLegend();
        if (!bindBoard()) setTimeout(initLegend, 250);
        else {
          decorateBoard();
          setTimeout(decorateBoard, 500);
          setTimeout(decorateBoard, 1500);
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLegend, { once: true });
      } else {
        initLegend();
      }
    })();
  `;
  document.body.appendChild(legendScript);
}

window.addEventListener('DOMContentLoaded', async () => {
  createUpdateCard();
  injectEnhancementsScripts();
  injectPieceHoverLegend();

  ipcRenderer.on('update-status', (_event, state) => {
    renderUpdateState(state);
  });

  try {
    renderUpdateState(await updaterAPI.getState());
  } catch (error) {
    renderUpdateState({ status: 'error', message: error?.message || String(error), currentVersion: '-' });
  }
});