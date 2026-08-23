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

  const uiCss = `
    #start-menu .start-content {
      width: min(1280px, 94vw) !important;
      max-width: 1280px !important;
      height: min(700px, 84vh) !important;
      min-height: min(620px, 84vh) !important;
      max-height: 84vh !important;
      display: grid !important;
      grid-template-columns: minmax(410px, 40%) minmax(0, 60%) !important;
    }

    #start-menu .start-info-col {
      padding: 38px 42px !important;
      min-width: 0 !important;
    }

    #start-menu .start-config-col {
      padding: 32px 38px !important;
      min-width: 0 !important;
      overflow-y: auto !important;
      scrollbar-width: thin;
    }

    #start-menu .start-logo {
      width: clamp(285px, 24vw, 350px) !important;
      max-width: min(350px, 88%) !important;
      height: auto !important;
      margin: 0 auto 26px !important;
    }

    #start-menu .start-info-col h1 {
      font-size: clamp(2rem, 3.2vw, 3rem) !important;
      line-height: 1.15 !important;
    }

    #start-menu .start-info-col p {
      font-size: clamp(11px, 1vw, 14px) !important;
      line-height: 1.5 !important;
    }

    #start-menu .menu-section-title {
      font-size: 12px !important;
      margin-bottom: 12px !important;
    }

    #start-menu .theme-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 12px !important;
      margin-bottom: 20px !important;
    }

    #start-menu .theme-card {
      min-height: 90px !important;
      padding: 14px 10px !important;
      border-radius: 12px !important;
    }

    #start-menu .theme-card strong {
      font-size: 14px !important;
      line-height: 1.2 !important;
    }

    #start-menu .theme-card span {
      font-size: 11px !important;
      line-height: 1.25 !important;
      margin-top: 6px !important;
    }

    #start-menu .start-config-row {
      gap: 12px !important;
      margin-bottom: 14px !important;
      flex-wrap: wrap !important;
    }

    #start-menu .start-config-row > label {
      font-size: 11px !important;
      min-width: 72px !important;
    }

    #start-menu select,
    #start-menu input[type='file'] {
      min-height: 40px !important;
      padding: 8px 10px !important;
      font-size: 12px !important;
      border-radius: 7px !important;
    }

    #start-menu input[type='file']::file-selector-button {
      min-height: 30px !important;
      padding: 6px 10px !important;
      margin-right: 10px !important;
      border-radius: 5px !important;
      cursor: pointer;
    }

    #start-menu #start-menu-settings-content .btn {
      min-height: 40px !important;
      padding: 10px 16px !important;
      font-size: 11px !important;
    }

    #start-menu .wall-preset-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 9px !important;
      margin-top: 4px !important;
    }

    #start-menu .wall-thumb {
      min-height: 70px !important;
      font-size: 10px !important;
      border-radius: 8px !important;
    }

    #start-menu #main-start-options .btn {
      min-height: 72px !important;
      font-size: 17px !important;
    }

    #start-menu #main-start-options .btn.game-exit-btn {
      min-height: 48px !important;
      padding: 12px 16px !important;
      font-size: 12px !important;
    }

    @media (max-width: 1100px), (max-height: 760px) {
      #start-menu .start-content {
        width: min(1080px, 96vw) !important;
        height: min(650px, 90vh) !important;
        min-height: 0 !important;
        max-height: 90vh !important;
        grid-template-columns: minmax(330px, 40%) minmax(0, 60%) !important;
      }

      #start-menu .start-info-col,
      #start-menu .start-config-col {
        padding: 24px 26px !important;
      }

      #start-menu .start-logo {
        width: clamp(230px, 25vw, 300px) !important;
        margin-bottom: 18px !important;
      }

      #start-menu .theme-card {
        min-height: 76px !important;
      }

      #start-menu .wall-thumb {
        min-height: 58px !important;
      }
    }

    @media (max-width: 820px) {
      #start-menu .start-content {
        width: 96vw !important;
        height: 92vh !important;
        max-height: 92vh !important;
        grid-template-columns: 1fr !important;
        overflow-y: auto !important;
      }

      #start-menu .start-logo {
        width: min(300px, 72vw) !important;
      }

      #start-menu .theme-grid,
      #start-menu .wall-preset-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }
  `;

  const script = `
    (() => {
      const logoSrc = ${JSON.stringify(brandLogoSrc)};
      const uiCss = ${JSON.stringify(uiCss)};

      let style = document.getElementById('fergorverse-ui-overrides');
      if (!style) {
        style = document.createElement('style');
        style.id = 'fergorverse-ui-overrides';
        document.head.appendChild(style);
      }
      style.textContent = uiCss;

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
        img.style.maxWidth = '88%';
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
        img.style.margin = '0 auto 22px';
        img.style.filter = 'drop-shadow(0 10px 24px rgba(0,0,0,0.5))';
        img.style.visibility = 'visible';
        img.style.opacity = '1';
      };

      ensureLogo('.loader-logo', '.loader-content', '210px');
      ensureLogo('.start-logo', '.start-info-col', 'clamp(285px, 24vw, 350px)');
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

ipcMain.handle('app:quit', () => {
  setImmediate(() => app.quit());
  return true;
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
