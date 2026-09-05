const { app, ipcMain, dialog, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm', '.opus']);
const MAX_AUDIO_FILES = 1500;
const MAX_SCAN_DEPTH = 6;

function musicConfigPath() {
  return path.join(app.getPath('userData'), 'cosplay-chess-music-folder.json');
}

function normalizeMusicKind(kind) {
  return String(kind || '').toLowerCase() === 'random' ? 'random' : 'general';
}

function readMusicConfig() {
  try {
    const data = JSON.parse(fs.readFileSync(musicConfigPath(), 'utf8'));
    return data && typeof data === 'object' ? data : {};
  } catch (_) {
    return {};
  }
}

function writeMusicConfig(data) {
  try {
    fs.mkdirSync(path.dirname(musicConfigPath()), { recursive: true });
    fs.writeFileSync(musicConfigPath(), JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Falha ao salvar pastas de músicas:', error);
  }
}

function readMusicFolder(kind = 'general') {
  const type = normalizeMusicKind(kind);
  const data = readMusicConfig();
  const folderPath = type === 'random'
    ? data.randomFolderPath
    : (data.generalFolderPath || data.folderPath);
  return typeof folderPath === 'string' && folderPath && fs.existsSync(folderPath) ? folderPath : '';
}

function writeMusicFolder(kind, folderPath) {
  const type = normalizeMusicKind(kind);
  const data = readMusicConfig();
  if (type === 'random') data.randomFolderPath = folderPath;
  else {
    data.generalFolderPath = folderPath;
    data.folderPath = folderPath;
  }
  writeMusicConfig(data);
}

function scanAudioFiles(folderPath) {
  const tracks = [];

  function walk(currentPath, depth) {
    if (tracks.length >= MAX_AUDIO_FILES || depth > MAX_SCAN_DEPTH) return;

    let entries = [];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch (_) {
      return;
    }

    for (const entry of entries) {
      if (tracks.length >= MAX_AUDIO_FILES) break;
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!AUDIO_EXTENSIONS.has(ext)) continue;

      const relativePath = path.relative(folderPath, fullPath);
      tracks.push({
        name: entry.name,
        relativePath,
        folder: path.dirname(relativePath) === '.' ? '' : path.dirname(relativePath),
        url: pathToFileURL(fullPath).href
      });
    }
  }

  walk(folderPath, 0);
  return tracks.sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'pt-BR', { numeric: true }));
}

ipcMain.handle('music:get-folder', (_event, kind = 'general') => {
  const type = normalizeMusicKind(kind);
  const folderPath = readMusicFolder(type);
  return {
    ok: !!folderPath,
    kind: type,
    folderPath,
    folderName: folderPath ? path.basename(folderPath) : ''
  };
});

ipcMain.handle('music:pick-folder', async (_event, kind = 'general') => {
  const type = normalizeMusicKind(kind);
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const options = {
    title: type === 'random'
      ? 'Escolha a pasta de músicas aleatórias do Setup Rápido'
      : 'Escolha a pasta de músicas gerais',
    properties: ['openDirectory', 'createDirectory']
  };

  const result = focusedWindow
    ? await dialog.showOpenDialog(focusedWindow, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, canceled: true, kind: type };
  }

  const folderPath = result.filePaths[0];
  writeMusicFolder(type, folderPath);
  return {
    ok: true,
    kind: type,
    folderPath,
    folderName: path.basename(folderPath)
  };
});

ipcMain.handle('music:list-audio', (_event, kind = 'general') => {
  const type = normalizeMusicKind(kind);
  const folderPath = readMusicFolder(type);
  if (!folderPath) {
    return {
      ok: false,
      kind: type,
      error: type === 'random'
        ? 'Nenhuma pasta de músicas aleatórias foi definida.'
        : 'Nenhuma pasta de músicas gerais foi definida.',
      tracks: []
    };
  }

  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    return { ok: false, kind: type, error: 'A pasta de músicas configurada não está mais disponível.', tracks: [] };
  }

  const tracks = scanAudioFiles(folderPath);
  return {
    ok: true,
    kind: type,
    folderPath,
    folderName: path.basename(folderPath),
    tracks
  };
});

function installJsonSettingsUi(window) {
  if (!window || window.isDestroyed()) return;
  const rosterEditorUrl = pathToFileURL(path.join(__dirname, 'roster-editor.js')).href;
  const rosterGuardUrl = pathToFileURL(path.join(__dirname, 'roster-guard.js')).href;
  const playerJsonAutofillUrl = pathToFileURL(path.join(__dirname, 'game-player-json-autofill.js')).href;
  const siteRosterImportUrl = pathToFileURL(path.join(__dirname, 'site-roster-import.js')).href;
  const autoLineupBalanceUrl = pathToFileURL(path.join(__dirname, 'game-auto-lineup-balance.js')).href;
  const startupUpdateGateUrl = pathToFileURL(path.join(__dirname, 'startup-update-gate.js')).href;

  window.webContents.on('did-finish-load', () => {
    const code = `(() => {
      const loadStartupUpdateGate = () => {
        if (document.querySelector('script[data-startup-update-gate]')) return;
        const updateScript = document.createElement('script');
        updateScript.src = ${JSON.stringify(startupUpdateGateUrl)};
        updateScript.dataset.startupUpdateGate = 'true';
        document.head.appendChild(updateScript);
      };
      loadStartupUpdateGate();

      const settings = document.getElementById('start-menu-settings-content');
      if (!settings) return;

      const cards = Array.from(document.querySelectorAll('.unit-card'));
      const dataCard = cards.find(card => /GESTÃO DE DADOS|DADOS DA PARTIDA|LISTA DE PARTICIPANTES/i.test(card.textContent || ''));
      if (dataCard) {
        dataCard.id = 'json-data-settings';
        dataCard.style.marginTop = '14px';
        dataCard.style.background = 'rgba(0,229,255,0.06)';
        dataCard.style.border = '1px solid rgba(0,229,255,0.28)';
        dataCard.style.borderRadius = '8px';

        const title = dataCard.querySelector('b');
        if (title) title.textContent = '💾 ELENCO DO EVENTO (JSON DO SITE)';

        const buttons = Array.from(dataCard.querySelectorAll('button'));
        const exportBtn = buttons.find(btn => /EXPORTAR/i.test(btn.textContent || ''));
        const importBtn = buttons.find(btn => /IMPORTAR/i.test(btn.textContent || ''));
        if (exportBtn) exportBtn.textContent = 'EXPORTAR JSON';
        if (importBtn) importBtn.textContent = 'IMPORTAR JSON DO SITE';

        let help = dataCard.querySelector('.json-settings-help');
        if (!help) {
          help = document.createElement('div');
          help.className = 'json-settings-help';
          const grid = dataCard.querySelector('div[style*="grid-template-columns"]');
          if (grid) dataCard.insertBefore(help, grid);
          else dataCard.appendChild(help);
        }
        help.textContent = 'Importe o arquivo gerado por “Exportar para o app” no site. Player 1 e Player 2 serão aplicados automaticamente com nome e foto; depois use “Acionar JSON” para distribuir e balancear as peças entre Brancas e Pretas.';
        help.style.cssText = 'font-size:9px;color:#aaa;line-height:1.45;margin:8px 0 10px;';

        const backButton = Array.from(settings.querySelectorAll('button')).find(btn => /VOLTAR/i.test(btn.textContent || ''));
        if (dataCard.parentElement !== settings) {
          if (backButton) settings.insertBefore(dataCard, backButton);
          else settings.appendChild(dataCard);
        }
      }

      const editMode = document.getElementById('edit-mode');
      const editLabel = editMode && editMode.closest('label');
      if (editLabel) {
        const input = editMode.outerHTML;
        editLabel.innerHTML = input + ' MODO EDIÇÃO (REVISAR ESCALAÇÃO)';
      }

      const loadAutoLineupBalance = () => {
        if (document.querySelector('script[data-auto-lineup-balance]')) return;
        const balanceScript = document.createElement('script');
        balanceScript.src = ${JSON.stringify(autoLineupBalanceUrl)};
        balanceScript.dataset.autoLineupBalance = 'true';
        document.body.appendChild(balanceScript);
      };

      const loadSiteRosterOnly = () => {
        const existing = document.querySelector('script[data-site-roster-import]');
        if (existing) {
          loadAutoLineupBalance();
          return;
        }
        const siteScript = document.createElement('script');
        siteScript.src = ${JSON.stringify(siteRosterImportUrl)};
        siteScript.dataset.siteRosterImport = 'true';
        siteScript.onload = loadAutoLineupBalance;
        document.body.appendChild(siteScript);
      };

      const loadPlayerAutofill = () => {
        const existing = document.querySelector('script[data-player-json-autofill]');
        if (existing) {
          if (window.__cosplayGamePlayerJsonAutofillLoaded) loadSiteRosterOnly();
          else existing.addEventListener('load', loadSiteRosterOnly, { once: true });
          return;
        }
        const playerScript = document.createElement('script');
        playerScript.src = ${JSON.stringify(playerJsonAutofillUrl)};
        playerScript.dataset.playerJsonAutofill = 'true';
        playerScript.onload = loadSiteRosterOnly;
        document.body.appendChild(playerScript);
      };

      const loadGuard = () => {
        const existingGuard = document.querySelector('script[data-roster-guard]');
        if (existingGuard) {
          if (window.__cosplayRosterGuardLoaded) loadPlayerAutofill();
          else existingGuard.addEventListener('load', loadPlayerAutofill, { once: true });
          return;
        }
        const guardScript = document.createElement('script');
        guardScript.src = ${JSON.stringify(rosterGuardUrl)};
        guardScript.dataset.rosterGuard = 'true';
        guardScript.onload = loadPlayerAutofill;
        document.body.appendChild(guardScript);
      };

      const existingRoster = document.querySelector('script[data-roster-editor]');
      if (!existingRoster) {
        const rosterScript = document.createElement('script');
        rosterScript.src = ${JSON.stringify(rosterEditorUrl)};
        rosterScript.dataset.rosterEditor = 'true';
        rosterScript.onload = loadGuard;
        document.body.appendChild(rosterScript);
      } else if (window.__cosplayRosterEditorLoaded) {
        loadGuard();
      } else {
        existingRoster.addEventListener('load', loadGuard, { once: true });
      }
    })();`;

    window.webContents.executeJavaScript(code).catch(error => {
      console.error('Falha ao organizar configurações JSON:', error);
    });
  });
}

app.on('browser-window-created', (_event, window) => {
  installJsonSettingsUi(window);
});

require('./main.js');