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

contextBridge.exposeInMainWorld('electronAPI', {
  setFullscreen: (value) => ipcRenderer.invoke('set-fullscreen', value),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),
  updates: updaterAPI
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

window.addEventListener('DOMContentLoaded', async () => {
  createUpdateCard();

  ipcRenderer.on('update-status', (_event, state) => {
    renderUpdateState(state);
  });

  try {
    renderUpdateState(await updaterAPI.getState());
  } catch (error) {
    renderUpdateState({ status: 'error', message: error?.message || String(error), currentVersion: '-' });
  }
});
