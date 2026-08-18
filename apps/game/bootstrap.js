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

function readMusicFolder() {
  try {
    const data = JSON.parse(fs.readFileSync(musicConfigPath(), 'utf8'));
    if (data && typeof data.folderPath === 'string' && fs.existsSync(data.folderPath)) {
      return data.folderPath;
    }
  } catch (_) {}
  return '';
}

function writeMusicFolder(folderPath) {
  try {
    fs.mkdirSync(path.dirname(musicConfigPath()), { recursive: true });
    fs.writeFileSync(musicConfigPath(), JSON.stringify({ folderPath }, null, 2), 'utf8');
  } catch (error) {
    console.error('Falha ao salvar pasta de músicas:', error);
  }
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

      tracks.push({
        name: entry.name,
        url: pathToFileURL(fullPath).href
      });
    }
  }

  walk(folderPath, 0);
  return tracks;
}

ipcMain.handle('music:get-folder', () => {
  const folderPath = readMusicFolder();
  return {
    ok: !!folderPath,
    folderPath,
    folderName: folderPath ? path.basename(folderPath) : ''
  };
});

ipcMain.handle('music:pick-folder', async () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const options = {
    title: 'Escolha a pasta de músicas do Setup Rápido',
    properties: ['openDirectory', 'createDirectory']
  };

  const result = focusedWindow
    ? await dialog.showOpenDialog(focusedWindow, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, canceled: true };
  }

  const folderPath = result.filePaths[0];
  writeMusicFolder(folderPath);
  return {
    ok: true,
    folderPath,
    folderName: path.basename(folderPath)
  };
});

ipcMain.handle('music:list-audio', () => {
  const folderPath = readMusicFolder();
  if (!folderPath) {
    return { ok: false, error: 'Nenhuma pasta de músicas foi definida.', tracks: [] };
  }

  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    return { ok: false, error: 'A pasta de músicas configurada não está mais disponível.', tracks: [] };
  }

  const tracks = scanAudioFiles(folderPath);
  return {
    ok: true,
    folderPath,
    folderName: path.basename(folderPath),
    tracks
  };
});

function installJsonSettingsUi(window) {
  if (!window || window.isDestroyed()) return;
  const rosterEditorUrl = pathToFileURL(path.join(__dirname, 'roster-editor.js')).href;
  const rosterGuardUrl = pathToFileURL(path.join(__dirname, 'roster-guard.js')).href;
  const siteRosterImportUrl = pathToFileURL(path.join(__dirname, 'site-roster-import.js')).href;

  window.webContents.on('did-finish-load', () => {
    const code = `(() => {
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
        if (title) title.textContent = '💾 LISTA DE PARTICIPANTES (JSON DO SITE)';

        const buttons = Array.from(dataCard.querySelectorAll('button'));
        const exportBtn = buttons.find(btn => /EXPORTAR/i.test(btn.textContent || ''));
        const importBtn = buttons.find(btn => /IMPORTAR/i.test(btn.textContent || ''));
        if (exportBtn) exportBtn.textContent = 'EXPORTAR JSON';
        if (importBtn) importBtn.textContent = 'IMPORTAR JSON DO SITE';

        if (!dataCard.querySelector('.json-settings-help')) {
          const help = document.createElement('div');
          help.className = 'json-settings-help';
          help.textContent = 'Importe aqui o arquivo gerado pelo botão “Exportar para o app” no painel do site. O elenco, fotos, preferências e dados do evento serão carregados; depois, ative Edição e clique em uma peça para escalar.';
          help.style.cssText = 'font-size:9px;color:#aaa;line-height:1.45;margin:8px 0 10px;';
          const grid = dataCard.querySelector('div[style*="grid-template-columns"]');
          if (grid) dataCard.insertBefore(help, grid);
          else dataCard.appendChild(help);
        }

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
        editLabel.innerHTML = input + ' MODO EDIÇÃO (ESCALAR PARTICIPANTES)';
      }

      const loadSiteRosterImport = () => {
        if (document.querySelector('script[data-site-roster-import]')) return;
        const siteScript = document.createElement('script');
        siteScript.src = ${JSON.stringify(siteRosterImportUrl)};
        siteScript.dataset.siteRosterImport = 'true';
        document.body.appendChild(siteScript);
      };

      const loadGuard = () => {
        const existingGuard = document.querySelector('script[data-roster-guard]');
        if (existingGuard) {
          if (window.__cosplayRosterGuardLoaded) loadSiteRosterImport();
          else existingGuard.addEventListener('load', loadSiteRosterImport, { once: true });
          return;
        }
        const guardScript = document.createElement('script');
        guardScript.src = ${JSON.stringify(rosterGuardUrl)};
        guardScript.dataset.rosterGuard = 'true';
        guardScript.onload = loadSiteRosterImport;
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