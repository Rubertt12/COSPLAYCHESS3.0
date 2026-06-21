const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false, // Não mostra a janela até que o conteúdo carregue
    backgroundColor: '#050508', // Cor de fundo que combina com seu CSS
    icon: path.join(__dirname, 'img/favicon-Photoroom.png'), // Caminho do seu ícone
    webPreferences: {
      nodeIntegration: false, // Segurança
      contextIsolation: true,
      spellcheck: false
    }
  });

  // Remove a barra de menu padrão (File, Edit, etc) para parecer um jogo
  Menu.setApplicationMenu(null);

  win.loadFile('index.html');

  // Mostra a janela suavemente quando estiver pronta
  win.once('ready-to-show', () => {
    win.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});