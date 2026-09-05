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

  const fullscreenMenuLockCss = `
    html body #start-menu.overlay {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      min-width: 100vw !important;
      min-height: 100vh !important;
      padding: 0 !important;
      margin: 0 !important;
      align-items: stretch !important;
      justify-content: stretch !important;
      overflow: hidden !important;
    }

    html body #start-menu.overlay .start-content {
      position: relative !important;
      width: 100vw !important;
      max-width: none !important;
      height: 100vh !important;
      min-height: 100vh !important;
      max-height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      display: grid !important;
      grid-template-columns: minmax(350px, 41%) minmax(0, 59%) !important;
      overflow: hidden !important;
      transform: none !important;
    }

    html body #start-menu.overlay .start-info-col {
      width: auto !important;
      height: 100vh !important;
      min-height: 100vh !important;
      max-height: 100vh !important;
      min-width: 0 !important;
      padding: clamp(42px, 5.2vh, 72px) clamp(38px, 5vw, 84px) clamp(32px, 4vh, 54px) !important;
    }

    html body #start-menu.overlay .start-config-col {
      width: auto !important;
      height: 100vh !important;
      min-height: 100vh !important;
      max-height: 100vh !important;
      min-width: 0 !important;
      padding: clamp(28px, 3.8vh, 48px) clamp(36px, 4.6vw, 78px) clamp(24px, 3.6vh, 46px) !important;
      overflow: hidden auto !important;
    }

    html body #start-menu.overlay .start-logo {
      width: clamp(220px, 22vw, 390px) !important;
      max-width: 78% !important;
      max-height: 34vh !important;
      height: auto !important;
      margin: 0 auto clamp(14px, 2vh, 26px) !important;
    }

    html body #start-menu.overlay .start-info-col h1 {
      font-size: clamp(44px, 5.1vw, 86px) !important;
      line-height: .95 !important;
      letter-spacing: clamp(6px, .9vw, 16px) !important;
    }

    html body #start-menu.overlay .start-info-col > p {
      font-size: clamp(14px, 1.2vw, 20px) !important;
      line-height: 1.55 !important;
    }

    html body #start-menu.overlay #main-start-options.menu-panel-visible {
      width: 100% !important;
      min-height: calc(100vh - clamp(82px, 11vh, 126px)) !important;
      padding: 0 !important;
    }

    @media (max-width: 900px) {
      html body #start-menu.overlay .start-content {
        grid-template-columns: 1fr !important;
        overflow-y: auto !important;
      }

      html body #start-menu.overlay .start-info-col,
      html body #start-menu.overlay .start-config-col {
        height: auto !important;
        min-height: 100vh !important;
        max-height: none !important;
      }
    }
  `;

  let fullscreenCssInserted = false;

  const forceFullscreenMenuLayout = () => {
    if (!window || window.isDestroyed()) return;

    if (!fullscreenCssInserted) {
      fullscreenCssInserted = true;
      window.webContents.insertCSS(fullscreenMenuLockCss).catch(() => {
        fullscreenCssInserted = false;
      });
    }

    window.webContents.executeJavaScript(`(() => {
      const menu = document.getElementById('start-menu');
      const content = menu?.querySelector('.start-content');
      if (!menu || !content) return;

      menu.style.setProperty('position', 'fixed', 'important');
      menu.style.setProperty('inset', '0', 'important');
      menu.style.setProperty('width', '100vw', 'important');
      menu.style.setProperty('height', '100vh', 'important');
      menu.style.setProperty('padding', '0', 'important');
      menu.style.setProperty('margin', '0', 'important');
      menu.style.setProperty('align-items', 'stretch', 'important');
      menu.style.setProperty('justify-content', 'stretch', 'important');

      content.style.setProperty('width', '100vw', 'important');
      content.style.setProperty('max-width', 'none', 'important');
      content.style.setProperty('height', '100vh', 'important');
      content.style.setProperty('min-height', '100vh', 'important');
      content.style.setProperty('max-height', '100vh', 'important');
      content.style.setProperty('margin', '0', 'important');
      content.style.setProperty('border', '0', 'important');
      content.style.setProperty('border-radius', '0', 'important');
      content.style.setProperty('transform', 'none', 'important');
      content.style.setProperty('grid-template-columns', 'minmax(350px, 41%) minmax(0, 59%)', 'important');
    })();`).catch(() => {});
  };

  const forceHideLegacyLoader = () => {
    if (!window || window.isDestroyed()) return;

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

    forceHideLegacyLoader();
    forceFullscreenMenuLayout();

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

    // O main.js antigo ainda injeta um layout centralizado com !important
    // após o carregamento. Reaplicamos o fullscreen depois dessas injeções.
    setTimeout(forceFullscreenMenuLayout, 50);
    setTimeout(forceFullscreenMenuLayout, 650);
    setTimeout(forceFullscreenMenuLayout, 1700);
    setTimeout(forceFullscreenMenuLayout, 3200);
  };

  window.webContents.on('did-start-loading', () => {
    fullscreenCssInserted = false;
    setTimeout(forceHideLegacyLoader, 0);
    setTimeout(forceHideLegacyLoader, 250);
  });
  window.webContents.on('dom-ready', injectRecovery);
  window.webContents.on('did-finish-load', injectRecovery);

  setTimeout(forceHideLegacyLoader, 1000);
  setTimeout(forceHideLegacyLoader, 3000);
  setTimeout(forceHideLegacyLoader, 6000);
  setTimeout(forceFullscreenMenuLayout, 1000);
  setTimeout(forceFullscreenMenuLayout, 2500);
  setTimeout(forceFullscreenMenuLayout, 5000);
}

app.on('browser-window-created', (_event, window) => {
  installStartupRecovery(window);
});

require('./bootstrap.js');
