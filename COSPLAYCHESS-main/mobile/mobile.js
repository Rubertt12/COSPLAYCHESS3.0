(() => {
  document.body.classList.add('capacitor-mobile');

  const isAndroid = /Android/i.test(navigator.userAgent);
  if (isAndroid && screen.orientation && screen.orientation.unlock) {
    try { screen.orientation.unlock(); } catch (_) {}
  }

  const makeButton = (label, icon, className, handler) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `mobile-action-btn ${className || ''}`.trim();
    button.innerHTML = `<span class="ico">${icon}</span><span>${label}</span>`;
    button.addEventListener('click', () => {
      try { handler(); } catch (_) {}
    });
    return button;
  };

  const isSidebarOpen = (sidebar) => {
    if (!sidebar) return false;
    const style = getComputedStyle(sidebar);
    const rect = sidebar.getBoundingClientRect();
    return rect.right > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };

  const openSystemSettings = () => {
    try { if (window.showTab) window.showTab('sys'); } catch (_) {}
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (!isSidebarOpen(sidebar) && window.toggleMenu) window.toggleMenu();
    requestAnimationFrame(() => {
      const sys = document.getElementById('list-sys');
      if (sys) sys.scrollTop = 0;
    });
  };

  const addMobileActionBar = () => {
    if (document.querySelector('.mobile-action-bar')) return;
    const bar = document.createElement('nav');
    bar.className = 'mobile-action-bar';
    bar.setAttribute('aria-label', 'Ações rápidas do jogo');
    bar.append(
      makeButton('DESFAZER', '↶', 'primary', () => window.undoMove && window.undoMove()),
      makeButton('PAUSAR', 'Ⅱ', '', () => window.pauseGame && window.pauseGame()),
      makeButton('CONFIG', '⚙', '', openSystemSettings),
      makeButton('MENU', '☰', 'danger', () => window.toggleMenu && window.toggleMenu())
    );
    document.body.appendChild(bar);
  };

  const setupGraveyard = () => {
    const box = document.querySelector('.graveyard-container');
    if (!box) return;
    box.classList.add('mobile-collapsed');
    const title = box.querySelector('h4');
    if (!title) return;
    title.style.cursor = 'pointer';
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    title.setAttribute('aria-label', 'Mostrar ou ocultar peças eliminadas');
    title.addEventListener('click', () => box.classList.toggle('mobile-collapsed'));
    title.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        box.classList.toggle('mobile-collapsed');
      }
    });
  };

  const setupMobileSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    if (!sidebar.querySelector('.mobile-menu-head')) {
      const head = document.createElement('div');
      head.className = 'mobile-menu-head';
      head.innerHTML = '<div><strong>MENU DO JOGO</strong><span>Peças, histórico e configurações</span></div>';
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'mobile-menu-close';
      close.setAttribute('aria-label', 'Fechar menu');
      close.textContent = '×';
      close.addEventListener('click', () => window.toggleMenu && window.toggleMenu());
      head.appendChild(close);
      sidebar.prepend(head);
    }

    const tabs = sidebar.querySelector('.tabs');
    if (tabs) {
      tabs.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', () => {
          requestAnimationFrame(() => {
            const visible = [...sidebar.querySelectorAll('.scroll-area')].find(el => getComputedStyle(el).display !== 'none');
            if (visible) visible.scrollTop = 0;
          });
        });
      });
    }
  };

  const syncCheck = (sourceId, targetId) => {
    const source = document.getElementById(sourceId);
    const target = document.getElementById(targetId);
    if (!source || !target) return;
    target.checked = source.checked;
    target.addEventListener('change', () => {
      source.checked = target.checked;
      source.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };

  const addAdvancedSettings = () => {
    const settings = document.getElementById('start-menu-settings-content');
    if (!settings || settings.querySelector('.mobile-advanced-settings')) return;

    const back = settings.querySelector('.btn-back');
    const block = document.createElement('section');
    block.className = 'mobile-advanced-settings';
    block.innerHTML = `
      <div class="mobile-settings-title">DADOS / JSON</div>
      <div class="mobile-settings-card">
        <p>Importe ou exporte o elenco completo, peças, nomes, imagens e demais dados da partida.</p>
        <div class="mobile-settings-grid two">
          <button type="button" id="mobile-export-json" class="mobile-settings-btn primary">⬇ EXPORTAR JSON</button>
          <button type="button" id="mobile-import-json" class="mobile-settings-btn">⬆ IMPORTAR JSON</button>
        </div>
        <input id="mobile-import-file" type="file" accept=".json,application/json" hidden>
      </div>

      <div class="mobile-settings-title">PARTIDA</div>
      <div class="mobile-settings-card mobile-toggle-list">
        <label><input type="checkbox" id="mobile-edit-mode"> <span><b>Modo edição</b><small>Upload, troca e remoção de peças</small></span></label>
        <label><input type="checkbox" id="mobile-free-move"> <span><b>Movimentação livre</b><small>Ignora restrições de movimento</small></span></label>
        <label><input type="checkbox" id="mobile-pin-menu"> <span><b>Fixar menu lateral</b><small>Mantém o painel aberto durante a partida</small></span></label>
      </div>

      <div class="mobile-settings-title">ÁUDIO E TABULEIRO</div>
      <div class="mobile-settings-card">
        <label class="mobile-range-row"><span>Volume mestre</span><input id="mobile-master-volume" type="range" min="0" max="1" step="0.1" value="1"></label>
        <label class="mobile-range-row"><span>Zoom do tabuleiro</span><input id="mobile-board-zoom" type="range" min="0.6" max="1.6" step="0.05" value="1"></label>
      </div>

      <div class="mobile-settings-title">FERRAMENTAS</div>
      <div class="mobile-settings-card">
        <div class="mobile-settings-grid two">
          <button type="button" id="mobile-roll" class="mobile-settings-btn">🎲 SORTEAR INÍCIO</button>
          <button type="button" id="mobile-undo" class="mobile-settings-btn">↶ DESFAZER JOGADA</button>
          <button type="button" id="mobile-clear-board" class="mobile-settings-btn">🧹 LIMPAR TABULEIRO</button>
          <button type="button" id="mobile-reset" class="mobile-settings-btn danger">⚠ RESET TOTAL</button>
        </div>
        <button type="button" id="mobile-open-system" class="mobile-settings-btn primary" style="width:100%; margin-top:8px;">⚙ ABRIR SISTEMA COMPLETO / ÁUDIO</button>
      </div>`;

    if (back) settings.insertBefore(block, back);
    else settings.appendChild(block);

    document.getElementById('mobile-export-json')?.addEventListener('click', () => {
      if (window.exportSquadData) window.exportSquadData();
    });

    const importButton = document.getElementById('mobile-import-json');
    const importFile = document.getElementById('mobile-import-file');
    importButton?.addEventListener('click', () => importFile?.click());
    importFile?.addEventListener('change', () => {
      if (window.importSquadData && importFile.files?.length) window.importSquadData(importFile);
      importFile.value = '';
    });

    syncCheck('edit-mode', 'mobile-edit-mode');
    syncCheck('free-move', 'mobile-free-move');
    syncCheck('pin-menu', 'mobile-pin-menu');

    const master = document.getElementById('mobile-master-volume');
    const originalMaster = document.getElementById('v-master');
    if (master && originalMaster) master.value = originalMaster.value || '1';
    master?.addEventListener('input', () => {
      if (originalMaster) {
        originalMaster.value = master.value;
        originalMaster.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const dash = document.getElementById('v-master-dash');
      if (dash) dash.value = master.value;
    });

    const zoom = document.getElementById('mobile-board-zoom');
    const originalZoom = document.getElementById('board-zoom');
    if (zoom && originalZoom) zoom.value = originalZoom.value || '1';
    zoom?.addEventListener('input', () => {
      if (originalZoom) {
        originalZoom.value = zoom.value;
        originalZoom.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    document.getElementById('mobile-roll')?.addEventListener('click', () => window.rollInitiative && window.rollInitiative());
    document.getElementById('mobile-undo')?.addEventListener('click', () => window.undoMove && window.undoMove());
    document.getElementById('mobile-open-system')?.addEventListener('click', () => {
      if (window.closeStartMenuSettings) window.closeStartMenuSettings();
      const startMenu = document.getElementById('start-menu');
      if (startMenu) {
        startMenu.classList.remove('show');
        startMenu.style.display = 'none';
      }
      openSystemSettings();
    });
    document.getElementById('mobile-clear-board')?.addEventListener('click', () => window.clearBoardPieces && window.clearBoardPieces());
    document.getElementById('mobile-reset')?.addEventListener('click', () => window.resetGame && window.resetGame());
  };

  const improveStartSettings = () => {
    const settings = document.getElementById('start-menu-settings-content');
    if (!settings) return;
    settings.setAttribute('aria-label', 'Configurações do jogo');
    const back = settings.querySelector('.btn-back');
    if (back) back.classList.add('mobile-settings-back');
    addAdvancedSettings();
  };

  const ensureBattleEntry = () => {
    const startMenu = document.getElementById('start-menu');
    const startButton = startMenu?.querySelector('button[onclick*="startBattle"]');
    if (!startMenu || !startButton) return;

    startButton.addEventListener('click', () => {
      window.setTimeout(() => {
        const stillVisible = startMenu.classList.contains('show') || getComputedStyle(startMenu).display !== 'none';
        if (stillVisible) {
          startMenu.classList.remove('show');
          startMenu.style.display = 'none';
        }
      }, 180);
    });
  };

  const cleanupDesktopHints = () => {
    document.querySelectorAll('.dashboard-controls-left input[type="range"]').forEach((el) => {
      el.setAttribute('tabindex', '-1');
    });
  };

  window.addEventListener('load', () => {
    addMobileActionBar();
    setupGraveyard();
    setupMobileSidebar();
    improveStartSettings();
    ensureBattleEntry();
    cleanupDesktopHints();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, { once: true });

  document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('button, .piece, .sq, img')) event.preventDefault();
  });
})();
