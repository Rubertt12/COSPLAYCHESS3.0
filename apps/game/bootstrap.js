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

require('./main.js');
