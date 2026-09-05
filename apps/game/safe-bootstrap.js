const { app } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

function installStartupRecovery(window) {
  if (!window || window.isDestroyed()) return;

  const updateGateUrl = pathToFileURL(path.join(__dirname, 'startup-update-gate.js')).href;
  const legacyLoaderCss = `
    #loader {
      display: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;

  const forceHideLegacyLoader = () => {
    if (!window || window.isDestroyed()) return;

    // CSS inserido pelo processo principal: não depende de script.js, preload,
    // window.load nem do restante da interface terminar de inicializar.
    window.webContents.insertCSS(legacyLoaderCss).catch(() => {});

    window.webContents.executeJavaScript(`(() => {
      const loader = document.getElementById('loader');
      if (loader) {
        loader.style.setProperty('display', 'none', 'important');
        loader.style.setProperty('opacity', '0', 'important');
        loader.style.setProperty('visibility', 'hidden', 'important');
        loader.style.setProperty('pointer-events', 'none', 'important');
        try { loader.remove(); } catch (_) {}
      }
    })();`).catch(() => {});
  };

  const injectRecovery = () => {
    if (!window || window.isDestroyed()) return;

    // O loader antigo não é mais parte do fluxo de abertura. A tela de
    // atualização é quem controla a inicialização visível do aplicativo.
    forceHideLegacyLoader();

    const code = `(() => {
      if (window.__cosplayStartupRecoveryInstalled) return;
      window.__cosplayStartupRecoveryInstalled = true;

      const releaseLegacyLoader = () => {
        const loader = document.getElementById('loader');
        if (!loader) return;
        loader.style.setProperty('display', 'none', 'important');
        loader.style.setProperty('opacity', '0', 'important');
        loader.style.setProperty('visibility', 'hidden', 'important');
        loader.style.setProperty('pointer-events', 'none', 'important');
        try { loader.remove(); } catch (_) {}
      };

      const ensureUpdateGate = () => {
        if (!window.electronAPI?.updates) {
          releaseLegacyLoader();
          return;
        }
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

      releaseLegacyLoader();
      ensureUpdateGate();

      // Proteções redundantes para nenhuma falha de módulo prender a tela.
      setTimeout(releaseLegacyLoader, 100);
      setTimeout(releaseLegacyLoader, 700);
      setTimeout(releaseLegacyLoader, 2200);

      window.addEventListener('error', () => releaseLegacyLoader());
      window.addEventListener('unhandledrejection', () => releaseLegacyLoader());
    })();`;

    window.webContents.executeJavaScript(code).catch((error) => {
      console.error('Falha ao instalar proteção de inicialização:', error);
      forceHideLegacyLoader();
    });
  };

  // Instala a proteção o mais cedo possível e repete em eventos de navegação.
  window.webContents.on('did-start-loading', () => {
    setTimeout(forceHideLegacyLoader, 0);
    setTimeout(forceHideLegacyLoader, 250);
  });
  window.webContents.on('dom-ready', injectRecovery);
  window.webContents.on('did-finish-load', injectRecovery);

  // Fallback no processo principal, independente do estado do renderer.
  setTimeout(forceHideLegacyLoader, 1000);
  setTimeout(forceHideLegacyLoader, 3000);
  setTimeout(forceHideLegacyLoader, 6000);
}

// Este listener existe antes de bootstrap.js criar a BrowserWindow.
app.on('browser-window-created', (_event, window) => {
  installStartupRecovery(window);
});

require('./bootstrap.js');
