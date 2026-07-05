const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setFullscreen: (value) => ipcRenderer.invoke('set-fullscreen', value),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen')
});
