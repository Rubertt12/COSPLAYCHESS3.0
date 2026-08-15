const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let updateTimer = null;
let promptedAvailableVersion = null;
let promptedDownloadedVersion = null;

const UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const BRAND_LOGO_CHUNKS = Array.from({ length: 3 }, (_, i) =>
  path.join(__dirname, 'assets', 'fergorverse-logo', `part-${String(i + 1).padStart(2, '0')}.txt`)
);

function getBrandLogoDataUri() {
  try {
    const base64 = BRAND_LOGO_CHUNKS.map((file) => fs.readFileSync(file, 'utf8').trim()).join('');
    return `data:image/webp;base64,${base64}`;
  } catch (error) {
    console.error('Falha ao carregar a logo Fergorverse:', error);
    return '';
  }
}

let updateState = {
  status: 'idle',
  currentVersion: '',
  availableVersion: null,
  progress: 0,
  message: 'Aguardando verificação',
  supported: false
};

function isPortableBuild() {
  return !!process.env.PORTABLE_EXECUTABLE_FILE;
}

function isAutoUpdateSupported() {
  return app.isPackaged && process.platform === 'win32' && !isPortableBuild();
}

function getPublicUpdateState() {
  return {
    ...updateState,
    currentVersion: app.getVersion(),
    supported: isAutoUpdateSupported()
  };
}

function publishUpdateState(patch = {}) {
  updateState = {
    ...updateState,
    ...patch,
    currentVersion: app.getVersion(),
    supported: isAutoUpdateSupported()
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', getPublicUpdateState());
  }

  return getPublicUpdateState();
}

function friendlyUpdateError(error) {
  const raw = error && error.message ? error.message : String(error || 'Erro desconhecido');
  if (/latest\.yml|404/i.test(raw)) {
    return 'Ainda não existe uma versão publicada para atualização.';
  }
  return raw;
}

function injectBranding() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const brandLogoSrc = getBrandLogoDataUri();
  if (!brandLogoSrc) return;

  const script = `
    (() => {
      const logoSrc = ${JSON.stringify(brandLogoSrc)};

      const ensureLogo = (selector, parentSelector, width) => {
        const parent = document.querySelector(parentSelector);
        if (!parent) return;

        let img = document.querySelector(selector);
        if (!img) {
          img = document.createElement('img');
          img.className = selector.replace('.', '');
          parent.prepend(img);
        }

        img.src = logoSrc;
        img.alt = 'Fergorverse';
        img.decoding = 'async';
        img.loading = 'eager';
        img.style.display = 'block';
        img.style.width = width;
        img.style.maxWidth = width;
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
        img.style.margin = '0 auto 18px';
        img.style.filter = 'drop-shadow(0 8px 18px rgba(0,0,0,0.45))';
        img.style.visibility = 'visible';
        img.style.opacity = '1';
      };

      ensureLogo('.loader-logo', '.loader-content', '140px');
      ensureLogo('.start-logo', '.start-info-col', '180px');
    })();
  `;

  mainWindow.webContents.executeJavaScript(script).catch(() => {});
}

async function downloadAvailableUpdate() {
  if (!isAutoUpdateSupported()) {
    return publishUpdateState({
      status: 'unsupported',
      message: 'Atualização automática disponível apenas na versão instalada do Windows.'
    });
  }

  try {
    publishUpdateState({ status: 'downloading', progress: 0, message: 'Iniciando download da atualização...' });
    await autoUpdater.downloadUpdate();
    return getPublicUpdateState();
  } catch (error) {
    return publishUpdateState({ status: 'error', message: friendlyUpdateError(error) });
  }
}

async function checkForUpdates(manual = false) {
  if (!isAutoUpdateSupported()) {
    return publishUpdateState({
      status: 'unsupported',
      message: app.isPackaged && isPortableBuild()
        ? 'A versão portátil não recebe atualização automática. Use o instalador do Cosplay Chess.'
        : 'Atualizações automáticas funcionam na versão instalada do Windows.'
    });
  }

  if (updateState.status === 'checking' || updateState.status === 'downloading') {
    return getPublicUpdateState();
  }

  try {
    publishUpdateState({
      status: 'checking',
      message: manual ? 'Verificando atualizações...' : 'Verificação automática em andamento...'
    });
    await autoUpdater.checkForUpdates();
    return getPublicUpdateState();
  } catch (error) {
    return publishUpdateState({ status: 'error', message: friendlyUpdateError(error) });
  }
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => {
    publishUpdateState({ status: 'checking', message: 'Verificando atualizações...' });
  });

  autoUpdater.on('update-not-available', () => {
    publishUpdateState({
      status: 'up-to-date',
      availableVersion: null,
      progress: 0,
      message: 'Você está usando a versão mais recente.'
    });
  });

  autoUpdater.on('update-available', async (info) => {
    const version = info && info.version ? info.version : 'nova';
    publishUpdateState({
      status: 'available',
      availableVersion: version,
      progress: 0,
      message: `Nova versão ${version} disponível.`
    });

    if (!mainWindow || mainWindow.isDestroyed() || promptedAvailableVersion === version) return;
    promptedAvailableVersion = version;

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Atualização disponível',
      message: `Cosplay Chess ${version} está disponível`,
      detail: 'Deseja baixar a atualização agora? Você pode continuar usando o aplicativo durante o download.',
      buttons: ['Atualizar agora', 'Depois'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    });

    if (result.response === 0) {
      await downloadAvailableUpdate();
    } else {
      publishUpdateState({
        status: 'available',
        availableVersion: version,
        message: `Versão ${version} disponível. Você pode atualizar pela aba SISTEMA.`
      });
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Number.isFinite(progress.percent) ? Math.max(0, Math.min(100, progress.percent)) : 0;
    publishUpdateState({
      status: 'downloading',
      progress: percent,
      message: `Baixando atualização... ${percent.toFixed(0)}%`
    });
  });

  autoUpdater.on('update-downloaded', async (info) => {
    const version = info && info.version ? info.version : updateState.availableVersion;
    publishUpdateState({
      status: 'downloaded',
      availableVersion: version,
      progress: 100,
      message: `Atualização ${version || ''} pronta para instalar.`.trim()
    });

    if (!mainWindow || mainWindow.isDestroyed() || promptedDownloadedVersion === version) return;
    promptedDownloadedVersion = version;

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Atualização pronta',
      message: 'A atualização foi baixada com sucesso.',
      detail: 'Reinicie agora para instalar. Se escolher depois, ela será instalada quando o aplicativo for fechado.',
      buttons: ['Reiniciar e atualizar', 'Depois'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    });

    if (result.response === 0) {
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
    }
  });

  autoUpdater.on('error', (error) => {
    publishUpdateState({ status: 'error', message: friendlyUpdateError(error) });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#050508',
    icon: path.join(__dirname, 'img/favicon-Photoroom.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    injectBranding();
    setTimeout(injectBranding, 500);
    setTimeout(injectBranding, 1500);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    publishUpdateState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('set-fullscreen', (event, value) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setFullScreen(!!value);
    return win.isFullScreen();
  }
  return false;
});

ipcMain.handle('is-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isFullScreen() : false;
});

ipcMain.handle('updates:get-state', () => getPublicUpdateState());
ipcMain.handle('updates:check', () => checkForUpdates(true));
ipcMain.handle('updates:download', () => downloadAvailableUpdate());
ipcMain.handle('updates:install', () => {
  if (updateState.status !== 'downloaded') return getPublicUpdateState();
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return getPublicUpdateState();
});

app.whenReady().then(() => {
  updateState.currentVersion = app.getVersion();
  updateState.supported = isAutoUpdateSupported();
  configureAutoUpdater();
  createWindow();

  setTimeout(() => checkForUpdates(false), 5000);
  updateTimer = setInterval(() => checkForUpdates(false), UPDATE_CHECK_INTERVAL_MS);
});

app.on('window-all-closed', () => {
  if (updateTimer) clearInterval(updateTimer);
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
