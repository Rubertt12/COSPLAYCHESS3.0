const { app } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

function installStartupRecovery(window) {
  if (!window || window.isDestroyed()) return;

  const updateGateUrl = pathToFileURL(path.join(__dirname, 'startup-update-gate.js')).href;

  const injectRecovery = () => {
    if (!window || window.isDestroyed()) return;

    const code = `(() => {
      if (window.__cosplayStartupRecoveryInstalled) return;
      window.__cosplayStartupRecoveryInstalled = true;

      const releaseLegacyLoader = () => {
        const loader = document.getElementById('loader');
        if (!loader) return;
        loader.style.transition = 'opacity .22s ease, visibility .22s ease';
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        loader.style.pointerEvents = 'none';
        setTimeout(() => {
          try { loader.remove(); } catch (_) {}
        }, 260);
      };

      const ensureUpdateGate = () => {
        if (!window.electronAPI?.updates) return;
        if (window.__cosplayStartupUpdateGateLoaded) return;
        if (document.querySelector('script[data-startup-update-gate]')) return;

        const script = document.createElement('script');
        script.src = ${JSON.stringify(updateGateUrl)};
        script.dataset.startupUpdateGate = 'true';
        script.onerror = () => {
          console.error('Falha ao carregar a tela de atualização inicial.');
          releaseLegacyLoader();
        };
        (document.head || document.documentElement).appendChild(script);
      };

      // A tela de atualização fica acima do loader antigo. O loader nunca mais
      // pode bloquear indefinidamente a inicialização, mesmo se o evento load
      // já tiver ocorrido ou algum módulo opcional falhar.
      ensureUpdateGate();

      if (document.readyState === 'complete') {
        setTimeout(releaseLegacyLoader, 300);
      } else {
        window.addEventListener('load', () => setTimeout(releaseLegacyLoader, 300), { once: true });
      }

      // Fail-safe: em qualquer circunstância, libera a interface.
      setTimeout(releaseLegacyLoader, 2200);
      setTimeout(releaseLegacyLoader, 6000);

      window.addEventListener('error', (event) => {
        if (!document.getElementById('loader')) return;
        console.error('Erro durante a inicialização do Cosplay Chess:', event?.error || event?.message || event);
        setTimeout(releaseLegacyLoader, 200);
      }, { once: true });

      window.addEventListener('unhandledrejection', (event) => {
        if (!document.getElementById('loader')) return;
        console.error('Falha assíncrona durante a inicialização do Cosplay Chess:', event?.reason || event);
        setTimeout(releaseLegacyLoader, 200);
      }, { once: true });
    })();`;

    window.webContents.executeJavaScript(code).catch((error) => {
      console.error('Falha ao instalar proteção de inicialização:', error);
    });
  };

  window.webContents.on('dom-ready', injectRecovery);
  window.webContents.on('did-finish-load', injectRecovery);
}

// Este listener precisa existir antes de bootstrap.js criar a BrowserWindow.
app.on('browser-window-created', (_event, window) => {
  installStartupRecovery(window);
});

require('./bootstrap.js');
