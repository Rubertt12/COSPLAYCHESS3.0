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
  getFolder: (kind = 'general') => ipcRenderer.invoke('music:get-folder', kind),
  pickFolder: (kind = 'general') => ipcRenderer.invoke('music:pick-folder', kind),
  listAudio: (kind = 'general') => ipcRenderer.invoke('music:list-audio', kind)
};

contextBridge.exposeInMainWorld('electronAPI', {
  setFullscreen: (value) => ipcRenderer.invoke('set-fullscreen', value),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
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

function injectCinematicStartMenu() {
  if (document.querySelector('script[data-cinematic-start-menu]')) return;
  const script = document.createElement('script');
  script.src = 'start-menu-cinematic.js?v=20260905-fullscreen-menu1';
  script.dataset.cinematicStartMenu = 'true';
  document.body.appendChild(script);
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

  const script = document.createElement('script');
  script.dataset.pieceHoverLegend = 'true';
  script.textContent = `
    (() => {
      if (window.__cosplayPieceHoverLegendInstalled) return;
      window.__cosplayPieceHoverLegendInstalled = true;

      const labels = { P:'PEÃO', T:'TORRE', C:'CAVALO', B:'BISPO', Q:'RAINHA', K:'REI' };
      const sideLabels = { B:'BRANCAS', P:'PRETAS' };

      function meta(id) {
        if (!id || typeof store === 'undefined' || !store || !store.p) return null;
        const data = store.p[id] || {};
        const character = String(data.name || '').trim();
        if (!character) return null;
        const custom = !!(data.registrationId || data.participantName || data.name);
        if (!custom) return null;
        return {
          character: character,
          piece: labels[id.charAt(0)] || 'PEÇA',
          side: sideLabels[id.endsWith('_B') ? 'B' : 'P'],
          cosplayer: String(data.participantName || '').trim()
        };
      }

      function ensureLegend() {
        let el = document.getElementById('piece-hover-legend');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'piece-hover-legend';
        el.setAttribute('role', 'tooltip');
        el.innerHTML = '<div data-role="kicker">LEGENDA DA PEÇA</div><strong data-role="character"></strong><div data-role="piece"></div><small data-role="cosplayer"></small>';
        Object.assign(el.style, {
          position:'fixed', zIndex:'12000', minWidth:'190px', maxWidth:'330px',
          padding:'10px 12px', border:'1px solid rgba(227,189,105,.58)',
          borderRadius:'10px', background:'rgba(11,8,14,.97)',
          boxShadow:'0 14px 36px rgba(0,0,0,.58)', color:'#f4ead7',
          pointerEvents:'none', opacity:'0', visibility:'hidden',
          transform:'translateY(5px) scale(.98)', transition:'opacity .12s ease, transform .12s ease',
          backdropFilter:'blur(8px)'
        });
        const kicker = el.querySelector('[data-role="kicker"]');
        Object.assign(kicker.style, {color:'#d9ab55',fontSize:'8px',fontWeight:'900',letterSpacing:'1.5px',marginBottom:'4px'});
        const character = el.querySelector('[data-role="character"]');
        Object.assign(character.style, {display:'block',color:'#fff4dc',fontFamily:'Georgia,serif',fontSize:'14px',lineHeight:'1.2'});
        const piece = el.querySelector('[data-role="piece"]');
        Object.assign(piece.style, {color:'#d9ab55',fontSize:'10px',fontWeight:'900',letterSpacing:'.8px',marginTop:'5px'});
        const cosplayer = el.querySelector('[data-role="cosplayer"]');
        Object.assign(cosplayer.style, {display:'none',color:'#97909d',fontSize:'9px',marginTop:'5px'});
        document.body.appendChild(el);
        return el;
      }

      function decorate() {
        const board = document.getElementById('board');
        if (!board || typeof store === 'undefined' || !store || !Array.isArray(store.board)) return;
        Array.from(board.children).forEach((sq, index) => {
          const id = store.board[index];
          const pieceEl = sq.querySelector('.piece');
          if (!pieceEl || !id) return;
          pieceEl.dataset.pieceId = id;
          const info = meta(id);
          if (info) {
            pieceEl.dataset.hasCharacter = 'true';
            pieceEl.style.cursor = 'help';
            pieceEl.title = info.character + ' • ' + info.piece + ' • ' + info.side;
          } else {
            delete pieceEl.dataset.hasCharacter;
            pieceEl.style.removeProperty('cursor');
            pieceEl.removeAttribute('title');
          }
        });
      }

      function position(el, x, y) {
        const gap = 15, margin = 10, rect = el.getBoundingClientRect();
        let left = x + gap, top = y + gap;
        if (left + rect.width > innerWidth - margin) left = x - rect.width - gap;
        if (top + rect.height > innerHeight - margin) top = y - rect.height - gap;
        el.style.left = Math.max(margin, left) + 'px';
        el.style.top = Math.max(margin, top) + 'px';
      }

      function show(pieceEl, event) {
        const info = meta(pieceEl && pieceEl.dataset.pieceId);
        if (!info) return;
        const el = ensureLegend();
        el.querySelector('[data-role="character"]').textContent = info.character;
        el.querySelector('[data-role="piece"]').textContent = info.piece + ' • ' + info.side;
        const cosplayer = el.querySelector('[data-role="cosplayer"]');
        if (info.cosplayer && info.cosplayer.toUpperCase() !== info.character.toUpperCase()) {
          cosplayer.textContent = 'Cosplayer: ' + info.cosplayer;
          cosplayer.style.display = 'block';
        } else {
          cosplayer.textContent = '';
          cosplayer.style.display = 'none';
        }
        el.style.visibility = 'visible';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0) scale(1)';
        position(el, event.clientX, event.clientY);
      }

      function hide() {
        const el = document.getElementById('piece-hover-legend');
        if (!el) return;
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
        el.style.transform = 'translateY(5px) scale(.98)';
      }

      function bind() {
        const board = document.getElementById('board');
        if (!board) return false;
        if (board.dataset.hoverLegendBound === 'true') { decorate(); return true; }
        board.dataset.hoverLegendBound = 'true';

        board.addEventListener('mouseover', event => {
          const pieceEl = event.target.closest && event.target.closest('.piece[data-has-character="true"]');
          if (pieceEl && board.contains(pieceEl)) show(pieceEl, event);
        });
        board.addEventListener('mousemove', event => {
          const pieceEl = event.target.closest && event.target.closest('.piece[data-has-character="true"]');
          const el = document.getElementById('piece-hover-legend');
          if (pieceEl && el && el.style.visibility === 'visible') position(el, event.clientX, event.clientY);
        });
        board.addEventListener('mouseout', event => {
          const pieceEl = event.target.closest && event.target.closest('.piece[data-has-character="true"]');
          if (!pieceEl) return;
          if (event.relatedTarget && pieceEl.contains(event.relatedTarget)) return;
          hide();
        });

        new MutationObserver(() => { decorate(); hide(); }).observe(board, {childList:true, subtree:true});
        decorate();
        return true;
      }

      function init() {
        ensureLegend();
        if (!bind()) setTimeout(init, 250);
        else {
          setTimeout(decorate, 500);
          setTimeout(decorate, 1500);
        }
      }

      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
      else init();
    })();
  `;
  document.body.appendChild(script);
}

window.addEventListener('DOMContentLoaded', async () => {
  injectCinematicStartMenu();
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