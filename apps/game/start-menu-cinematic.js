/* Cosplay Chess - menu inicial fullscreen cinematográfico */
(() => {
  if (window.__cosplayCinematicStartMenuLoaded) return;
  window.__cosplayCinematicStartMenuLoaded = true;

  const byId = id => document.getElementById(id);

  function installStyles() {
    if (byId('cosplay-cinematic-start-menu-style')) return;
    const style = document.createElement('style');
    style.id = 'cosplay-cinematic-start-menu-style';
    style.textContent = `
      #start-menu.overlay {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        padding: 0 !important;
        align-items: stretch !important;
        justify-content: stretch !important;
        overflow: hidden !important;
        background:
          radial-gradient(circle at 14% 48%, rgba(132,86,30,.18), transparent 36%),
          radial-gradient(circle at 88% 78%, rgba(111,20,45,.15), transparent 34%),
          linear-gradient(112deg, #0b090b 0%, #0c090c 35%, #09080b 58%, #050508 100%) !important;
      }

      #start-menu.overlay::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(90deg, rgba(255,210,119,.045) 1px, transparent 1px),
          linear-gradient(rgba(255,210,119,.035) 1px, transparent 1px);
        background-size: 72px 72px;
        mask-image: linear-gradient(90deg, rgba(0,0,0,.85), rgba(0,0,0,.18) 55%, transparent 92%);
        opacity: .34;
      }

      #start-menu.overlay::after {
        content: '♜';
        position: absolute;
        left: -3vw;
        bottom: -16vh;
        font: 500 min(54vw, 670px)/1 Georgia, serif;
        color: rgba(225,180,93,.025);
        filter: drop-shadow(0 0 44px rgba(225,180,93,.1));
        pointer-events: none;
        transform: rotate(-6deg);
      }

      #start-menu .start-content {
        position: relative !important;
        z-index: 2 !important;
        width: 100vw !important;
        max-width: none !important;
        height: 100vh !important;
        min-height: 100vh !important;
        max-height: 100vh !important;
        margin: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        overflow: hidden !important;
        display: grid !important;
        grid-template-columns: minmax(350px, 41%) minmax(0, 59%) !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      #start-menu .start-info-col {
        position: relative !important;
        min-width: 0 !important;
        height: 100vh !important;
        padding: clamp(42px, 5.2vh, 72px) clamp(38px, 5vw, 84px) clamp(32px, 4vh, 54px) !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
        text-align: center !important;
        overflow: hidden !important;
        border-right: 1px solid rgba(225,180,93,.22) !important;
        background:
          linear-gradient(180deg, rgba(10,8,10,.25), rgba(9,7,9,.72)),
          radial-gradient(circle at 45% 36%, rgba(225,180,93,.16), transparent 32%),
          linear-gradient(145deg, rgba(93,42,25,.28), rgba(18,11,15,.7) 48%, rgba(5,5,8,.94)) !important;
      }

      #start-menu .start-info-col::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(90deg, transparent 0 12%, rgba(225,180,93,.09) 12.15%, transparent 12.35% 87.5%, rgba(225,180,93,.08) 87.65%, transparent 87.85%),
          radial-gradient(ellipse at 50% 100%, rgba(186,112,42,.17), transparent 45%);
        opacity: .9;
      }

      #start-menu .start-info-col::after {
        content: '♟   ♛   ♜';
        position: absolute;
        left: 50%;
        bottom: -4.8vh;
        transform: translateX(-50%);
        white-space: nowrap;
        font: 500 clamp(105px, 13vw, 240px)/1 Georgia, serif;
        letter-spacing: clamp(18px, 3vw, 55px);
        color: rgba(225,180,93,.05);
        text-shadow: 0 0 50px rgba(225,180,93,.08);
        pointer-events: none;
      }

      #start-menu .cinematic-brand-kicker {
        position: absolute;
        top: clamp(28px, 4.2vh, 52px);
        left: clamp(34px, 5vw, 76px);
        right: clamp(34px, 5vw, 76px);
        display: flex;
        align-items: center;
        gap: 14px;
        color: #e7bd68;
        font-size: clamp(8px, .62vw, 11px);
        font-weight: 900;
        letter-spacing: 3.2px;
        text-align: left;
        z-index: 3;
      }
      #start-menu .cinematic-brand-kicker::before {
        content: '';
        width: 42px;
        height: 1px;
        background: linear-gradient(90deg, transparent, #e7bd68);
      }

      #start-menu .start-logo {
        position: relative !important;
        z-index: 2 !important;
        display: block !important;
        width: clamp(220px, 22vw, 390px) !important;
        max-width: 78% !important;
        max-height: 34vh !important;
        object-fit: contain !important;
        margin: 0 auto clamp(14px, 2vh, 26px) !important;
        filter: drop-shadow(0 16px 38px rgba(0,0,0,.68)) drop-shadow(0 0 18px rgba(225,180,93,.12)) !important;
      }

      #start-menu .start-info-col h1 {
        position: relative;
        z-index: 2;
        margin: 0 !important;
        color: #fff5df !important;
        font-family: Georgia, 'Times New Roman', serif !important;
        font-size: clamp(44px, 5.1vw, 86px) !important;
        font-weight: 500 !important;
        line-height: .95 !important;
        letter-spacing: clamp(6px, .9vw, 16px) !important;
        text-shadow: 0 9px 34px rgba(0,0,0,.68) !important;
      }

      #start-menu .start-info-col > p {
        position: relative;
        z-index: 2;
        width: min(470px, 90%);
        margin: clamp(20px, 2.8vh, 34px) auto 0 !important;
        padding-top: 19px;
        border-top: 1px solid rgba(225,180,93,.24);
        color: rgba(245,237,226,.76) !important;
        font-family: Georgia, serif !important;
        font-size: clamp(14px, 1.2vw, 20px) !important;
        line-height: 1.55 !important;
      }

      #start-menu .cinematic-brand-tags {
        position: relative;
        z-index: 2;
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: clamp(18px, 2.8vh, 30px);
      }
      #start-menu .cinematic-brand-tags span {
        border: 1px solid rgba(225,180,93,.33);
        border-radius: 999px;
        background: rgba(8,7,10,.54);
        color: rgba(255,240,209,.8);
        padding: 8px 13px;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 1.4px;
        box-shadow: inset 0 0 18px rgba(225,180,93,.025);
      }

      #start-menu .cinematic-brand-footer {
        position: absolute;
        z-index: 3;
        left: clamp(34px, 5vw, 76px);
        right: clamp(34px, 5vw, 76px);
        bottom: clamp(24px, 3.8vh, 44px);
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 20px;
        color: rgba(224,200,156,.5);
        font-size: 7px;
        font-weight: 800;
        letter-spacing: 2.4px;
      }
      #start-menu .cinematic-brand-footer strong { color:#d9ad58; font-size:8px; }

      #start-menu .start-config-col {
        position: relative !important;
        min-width: 0 !important;
        height: 100vh !important;
        min-height: 100vh !important;
        max-height: 100vh !important;
        padding: clamp(28px, 3.8vh, 48px) clamp(36px, 4.6vw, 78px) clamp(24px, 3.6vh, 46px) !important;
        overflow: hidden auto !important;
        scrollbar-width: thin;
        scrollbar-color: rgba(225,180,93,.42) transparent;
        background:
          radial-gradient(circle at 82% 18%, rgba(126,31,58,.105), transparent 36%),
          linear-gradient(180deg, rgba(12,10,14,.88), rgba(6,6,9,.94)) !important;
      }
      #start-menu .start-config-col::before {
        content: '“ PERSONAGENS GANHAM VIDA EM UM NOVO TABULEIRO. ”';
        display: block;
        width: 100%;
        margin: 0 0 clamp(16px, 2.2vh, 24px);
        text-align: right;
        color: rgba(222,213,209,.34);
        font-size: 8px;
        letter-spacing: 3px;
      }

      #start-menu #main-start-options.menu-panel-visible {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        min-height: calc(100vh - clamp(82px, 11vh, 126px)) !important;
        gap: 10px !important;
        padding: 0 !important;
        background: transparent !important;
      }

      #start-menu #piece-layout-chooser {
        order: 0;
        margin: 0 0 clamp(14px, 2vh, 22px) !important;
        padding: clamp(16px, 1.6vw, 24px) !important;
        border: 1px solid rgba(225,180,93,.33) !important;
        border-radius: 18px !important;
        background: linear-gradient(145deg, rgba(54,23,37,.36), rgba(12,11,16,.74)) !important;
        box-shadow: inset 0 0 42px rgba(225,180,93,.025), 0 18px 45px rgba(0,0,0,.18) !important;
      }
      #start-menu #piece-layout-chooser .layout-heading { margin-bottom: 14px !important; align-items:center !important; }
      #start-menu #piece-layout-chooser .layout-heading span {
        color:#f1d18d !important;
        font-family:Georgia,serif !important;
        font-size:clamp(14px,1.25vw,20px) !important;
        letter-spacing:2.4px !important;
      }
      #start-menu #piece-layout-chooser .layout-heading span::before { content:'♟  '; color:#e3b45c; }
      #start-menu #piece-layout-chooser .layout-heading small { color:#8f8993 !important; font-size:9px !important; }
      #start-menu #piece-layout-current {
        border-color:rgba(225,180,93,.3) !important;
        background:rgba(4,4,7,.4) !important;
        padding:7px 10px !important;
      }
      #start-menu .piece-layout-grid { grid-template-columns: repeat(3,minmax(0,1fr)) !important; gap:11px !important; }
      #start-menu .piece-layout-card {
        position:relative;
        min-height: 112px !important;
        padding: 18px 16px 15px 76px !important;
        display:flex !important;
        flex-direction:column !important;
        justify-content:center !important;
        border-radius:13px !important;
        overflow:hidden;
        background:linear-gradient(145deg,rgba(20,19,26,.94),rgba(10,10,14,.94)) !important;
        border-color:rgba(255,255,255,.13) !important;
      }
      #start-menu .piece-layout-card::before {
        position:absolute;
        left:18px;
        top:50%;
        transform:translateY(-50%);
        color:rgba(240,215,166,.84);
        font:500 43px/1 Georgia,serif;
        filter:drop-shadow(0 5px 11px rgba(0,0,0,.55));
      }
      #start-menu .piece-layout-card[data-layout='20']::before { content:'♟'; }
      #start-menu .piece-layout-card[data-layout='24']::before { content:'♞'; }
      #start-menu .piece-layout-card[data-layout='32']::before { content:'♜'; }
      #start-menu .piece-layout-card:hover { transform:translateY(-2px) !important; border-color:rgba(225,180,93,.58) !important; }
      #start-menu .piece-layout-card.selected {
        background:linear-gradient(145deg,rgba(91,37,45,.86),rgba(30,18,23,.96)) !important;
        border-color:#e4b758 !important;
        box-shadow:0 0 0 1px rgba(228,183,88,.2),0 14px 34px rgba(0,0,0,.32),inset 0 0 42px rgba(225,180,93,.08) !important;
      }
      #start-menu .piece-layout-card.selected::after {
        content:'✓';
        position:absolute;
        right:10px;
        top:10px;
        width:23px;
        height:23px;
        display:grid;
        place-items:center;
        border-radius:50%;
        background:#efc469;
        color:#1a1010;
        font-size:13px;
        font-weight:1000;
      }
      #start-menu .piece-layout-card strong { font-family:Georgia,serif !important; font-size:clamp(15px,1.15vw,20px) !important; color:#fff1d8 !important; }
      #start-menu .piece-layout-card span { font-size:9px !important; line-height:1.4 !important; color:#aaa2ad !important; }

      #start-menu .cinematic-central-header {
        order: 1;
        margin: clamp(2px,.7vh,8px) 0 4px;
      }
      #start-menu .cinematic-central-header .eyebrow {
        color:#e3b45c;
        font-size:9px;
        font-weight:900;
        letter-spacing:3px;
        margin-bottom:5px;
      }
      #start-menu .cinematic-central-header h2 {
        margin:0;
        font-family:Georgia,serif;
        color:#fff7e7;
        font-size:clamp(34px,3.1vw,56px);
        font-weight:500;
        line-height:1.05;
        letter-spacing:-.5px;
      }
      #start-menu .cinematic-central-header p {
        margin-top:6px;
        color:#8f8993;
        font-size:10px;
        line-height:1.5;
      }

      #start-menu .cinematic-status-grid {
        order: 2;
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:10px;
        margin: 6px 0 8px;
      }
      #start-menu .cinematic-status-card {
        min-width:0;
        padding:12px 14px;
        border:1px solid rgba(255,255,255,.09);
        border-radius:11px;
        background:linear-gradient(145deg,rgba(18,18,24,.9),rgba(8,8,12,.88));
        box-shadow:inset 0 1px rgba(255,255,255,.025);
      }
      #start-menu .cinematic-status-card small { display:block;color:#706a75;font-size:7px;font-weight:900;letter-spacing:1.7px;margin-bottom:4px; }
      #start-menu .cinematic-status-card strong { display:block;color:#e9bc62;font-size:11px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }

      #start-menu #main-start-options > button {
        position: relative !important;
        width: 100% !important;
        margin: 0 !important;
        border-radius: 12px !important;
        transition: transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease !important;
        text-align: left !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 0 clamp(20px,2vw,30px) !important;
      }
      #start-menu #main-start-options > button:hover { transform:translateY(-1px) !important; }
      #start-menu #main-start-options > button .cinematic-button-copy { display:flex;flex-direction:column;gap:3px;min-width:0; }
      #start-menu #main-start-options > button .cinematic-button-title { font-size:inherit;font-weight:950;letter-spacing:1.7px; }
      #start-menu #main-start-options > button .cinematic-button-sub { font-size:7px;font-weight:800;letter-spacing:1.4px;opacity:.62; }
      #start-menu #main-start-options > button .cinematic-button-icon { width:32px;flex:0 0 32px;margin-right:14px;font-size:22px;text-align:center; }
      #start-menu #main-start-options > button .cinematic-button-arrow { margin-left:auto;font-size:23px;font-weight:400; }

      #start-menu #cinematic-start-battle {
        order:3;
        min-height:74px !important;
        border:1px solid #f0c36a !important;
        color:#140d08 !important;
        background:linear-gradient(105deg,#f0c568,#d78b53) !important;
        box-shadow:0 13px 34px rgba(187,111,53,.18),inset 0 1px rgba(255,255,255,.32) !important;
        font-size:16px !important;
        text-shadow:none !important;
      }
      #start-menu #cinematic-start-battle:hover { box-shadow:0 16px 42px rgba(214,146,72,.28),inset 0 1px rgba(255,255,255,.38) !important; }
      #start-menu #cinematic-import-json {
        order:4;
        min-height:51px !important;
        color:#d9d4d5 !important;
        background:rgba(15,14,18,.9) !important;
        border:1px solid rgba(255,255,255,.11) !important;
        font-size:10px !important;
      }
      #start-menu #cinematic-settings-btn {
        order:5;
        min-height:61px !important;
        color:#eee9e7 !important;
        background:linear-gradient(145deg,rgba(19,18,23,.94),rgba(11,10,14,.94)) !important;
        border:1px solid rgba(255,255,255,.12) !important;
        font-size:12px !important;
      }
      #start-menu #cinematic-settings-btn:hover,#start-menu #cinematic-import-json:hover { border-color:rgba(225,180,93,.4) !important;background:rgba(30,25,28,.94) !important; }
      #start-menu #game-exit-btn-start {
        order:6;
        min-height:51px !important;
        margin-top:0 !important;
        color:#e78aa0 !important;
        background:linear-gradient(145deg,rgba(35,12,20,.72),rgba(19,8,13,.9)) !important;
        border:1px solid rgba(170,47,76,.6) !important;
        font-size:10px !important;
      }
      #start-menu #game-exit-btn-start:hover { border-color:#c64663 !important;background:rgba(53,15,27,.82) !important; }

      #start-menu .cinematic-menu-footer {
        order:7;
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:14px;
        margin-top:auto;
        padding-top:10px;
        color:#5d5861;
        font-size:7px;
        letter-spacing:2.2px;
      }
      #start-menu .cinematic-menu-footer span:last-child { color:#8d7b5e; }

      #start-menu #start-menu-settings-content.menu-panel-visible {
        display:block !important;
        width:100% !important;
        height:calc(100vh - clamp(82px,11vh,126px)) !important;
        max-height:none !important;
        overflow:auto !important;
        padding:20px !important;
        border:1px solid rgba(225,180,93,.2) !important;
        border-radius:16px !important;
        background:linear-gradient(145deg,rgba(25,18,23,.88),rgba(9,9,13,.93)) !important;
      }

      @media (max-width: 1180px) {
        #start-menu .start-content { grid-template-columns: 36% 64% !important; }
        #start-menu .start-info-col { padding-left:28px !important;padding-right:28px !important; }
        #start-menu .start-config-col { padding-left:28px !important;padding-right:28px !important; }
        #start-menu .piece-layout-card { padding-left:58px !important; }
        #start-menu .piece-layout-card::before { left:13px;font-size:34px; }
      }

      @media (max-width: 900px) {
        #start-menu.overlay { overflow:auto !important; }
        #start-menu .start-content {
          min-height:100vh !important;
          height:auto !important;
          max-height:none !important;
          grid-template-columns:1fr !important;
          overflow:visible !important;
        }
        #start-menu .start-info-col {
          height:auto !important;
          min-height:44vh !important;
          border-right:0 !important;
          border-bottom:1px solid rgba(225,180,93,.2) !important;
          padding:70px 28px 48px !important;
        }
        #start-menu .start-logo { width:min(250px,54vw) !important;max-height:23vh !important; }
        #start-menu .start-info-col h1 { font-size:clamp(40px,9vw,64px) !important; }
        #start-menu .start-config-col { height:auto !important;min-height:56vh !important;max-height:none !important;overflow:visible !important;padding:28px 22px 44px !important; }
        #start-menu #main-start-options.menu-panel-visible { min-height:0 !important; }
      }

      @media (max-width: 650px) {
        #start-menu .piece-layout-grid { grid-template-columns:1fr !important; }
        #start-menu .piece-layout-card { min-height:82px !important; }
        #start-menu .cinematic-status-grid { grid-template-columns:1fr !important; }
        #start-menu .cinematic-brand-footer { display:none; }
        #start-menu .cinematic-central-header h2 { font-size:34px; }
      }

      @media (max-height: 760px) and (min-width: 901px) {
        #start-menu .start-config-col { padding-top:18px !important;padding-bottom:16px !important; }
        #start-menu .start-config-col::before { margin-bottom:8px; }
        #start-menu #piece-layout-chooser { padding:12px !important;margin-bottom:8px !important; }
        #start-menu .piece-layout-card { min-height:82px !important;padding-top:10px !important;padding-bottom:10px !important; }
        #start-menu .cinematic-central-header h2 { font-size:32px; }
        #start-menu .cinematic-central-header p { display:none; }
        #start-menu .cinematic-status-card { padding:8px 11px; }
        #start-menu #cinematic-start-battle { min-height:58px !important; }
        #start-menu #cinematic-settings-btn { min-height:48px !important; }
        #start-menu #cinematic-import-json,#start-menu #game-exit-btn-start { min-height:42px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureBrandDecor() {
    const col = document.querySelector('#start-menu .start-info-col');
    if (!col) return false;
    if (!col.querySelector('.cinematic-brand-kicker')) {
      const kicker = document.createElement('div');
      kicker.className = 'cinematic-brand-kicker';
      kicker.textContent = 'RUBRA STUDIOS · EXPERIÊNCIA INTERATIVA';
      col.prepend(kicker);
    }
    if (!col.querySelector('.cinematic-brand-tags')) {
      const tags = document.createElement('div');
      tags.className = 'cinematic-brand-tags';
      tags.innerHTML = '<span>✦ XADREZ HUMANO</span><span>✦ ELENCO COSPLAY</span><span>✦ DUELO AO VIVO</span>';
      col.appendChild(tags);
    }
    if (!col.querySelector('.cinematic-brand-footer')) {
      const footer = document.createElement('div');
      footer.className = 'cinematic-brand-footer';
      footer.innerHTML = '<span><strong>RUBRA STUDIOS</strong><br>ARTE · ESTRATÉGIA · COMUNIDADE</span><span>♛ COSPLAY CHESS</span>';
      col.appendChild(footer);
    }
    return true;
  }

  function modeLabel() {
    try {
      const select = byId('opponent-select');
      const value = String(select?.value || store?.g?.mode || '').toUpperCase();
      return value === 'AI' ? 'VS MÁQUINA' : '2 JOGADORES';
    } catch (_) {
      return '2 JOGADORES';
    }
  }

  function currentFormation() {
    try {
      const value = Number(store?.g?.layoutPieceCount || store?.g?.configuredPieceLimit || 32);
      return [20,24,32].includes(value) ? value : 32;
    } catch (_) {
      return 32;
    }
  }

  function rosterLabel() {
    try {
      const count = Array.isArray(store?.g?.roster) ? store.g.roster.length : 0;
      return count ? `${count} IMPORTADOS` : 'PADRÃO';
    } catch (_) {
      return 'PADRÃO';
    }
  }

  function updateStatus() {
    const formation = byId('cinematic-status-formation');
    const roster = byId('cinematic-status-roster');
    const mode = byId('cinematic-status-mode');
    if (formation) formation.textContent = `${currentFormation()}/32`;
    if (roster) roster.textContent = rosterLabel();
    if (mode) mode.textContent = modeLabel();
  }

  function openJsonPicker() {
    const input = byId('import-file');
    if (input) {
      input.click();
      return;
    }
    try { window.openStartMenuSettings?.(); } catch (_) {}
    setTimeout(() => {
      const fallback = byId('import-file');
      if (fallback) fallback.click();
      else alert('Abra CONFIGURAÇÕES e use “IMPORTAR JSON DO SITE”.');
    }, 160);
  }

  function decorateMainPanel() {
    const panel = byId('main-start-options');
    if (!panel) return false;

    const chooser = byId('piece-layout-chooser');
    if (!chooser) return false;

    if (!byId('cinematic-central-header')) {
      const header = document.createElement('div');
      header.id = 'cinematic-central-header';
      header.className = 'cinematic-central-header';
      header.innerHTML = `
        <div class="eyebrow">⚔ &nbsp; CENTRAL DA PARTIDA</div>
        <h2>Preparar o tabuleiro</h2>
        <p>Confira a formação, ajuste o elenco e entre na arena quando tudo estiver pronto.</p>
      `;
      chooser.insertAdjacentElement('afterend', header);
    }

    if (!byId('cinematic-status-grid')) {
      const grid = document.createElement('div');
      grid.id = 'cinematic-status-grid';
      grid.className = 'cinematic-status-grid';
      grid.innerHTML = `
        <div class="cinematic-status-card"><small>FORMAÇÃO</small><strong id="cinematic-status-formation">20/32</strong></div>
        <div class="cinematic-status-card"><small>ELENCO</small><strong id="cinematic-status-roster">PADRÃO</strong></div>
        <div class="cinematic-status-card"><small>MODO</small><strong id="cinematic-status-mode">2 JOGADORES</strong></div>
      `;
      byId('cinematic-central-header').insertAdjacentElement('afterend', grid);
    }

    const buttons = Array.from(panel.querySelectorAll(':scope > button'));
    const startBtn = buttons.find(btn => /startBattle/.test(btn.getAttribute('onclick') || '') || /INICIAR BATALHA/i.test(btn.textContent || ''));
    const settingsBtn = buttons.find(btn => /openStartMenuSettings/.test(btn.getAttribute('onclick') || '') || /^CONFIGURAÇÕES$/i.test((btn.textContent || '').trim()));
    const exitBtn = byId('game-exit-btn-start') || buttons.find(btn => /exitCosplayChess/.test(btn.getAttribute('onclick') || ''));

    if (startBtn && startBtn.id !== 'cinematic-start-battle') {
      startBtn.id = 'cinematic-start-battle';
      startBtn.innerHTML = '<span class="cinematic-button-icon">⚔</span><span class="cinematic-button-copy"><span class="cinematic-button-title">INICIAR BATALHA</span><span class="cinematic-button-sub">ENTRAR NA ARENA COM A FORMAÇÃO ATUAL</span></span><span class="cinematic-button-arrow">→</span>';
    }

    if (!byId('cinematic-import-json')) {
      const importBtn = document.createElement('button');
      importBtn.id = 'cinematic-import-json';
      importBtn.className = 'btn';
      importBtn.type = 'button';
      importBtn.innerHTML = '<span class="cinematic-button-icon">▣</span><span class="cinematic-button-copy"><span class="cinematic-button-title">IMPORTAR JSON PARA MONTAR O ELENCO</span><span class="cinematic-button-sub">CARREGAR INSCRITOS, PLAYERS E CONFIGURAÇÃO DO EVENTO</span></span><span class="cinematic-button-arrow">›</span>';
      importBtn.addEventListener('mouseenter', () => { try { window.playUISound?.('hover'); } catch (_) {} });
      importBtn.addEventListener('click', openJsonPicker);
      if (settingsBtn) panel.insertBefore(importBtn, settingsBtn);
      else panel.appendChild(importBtn);
    }

    if (settingsBtn && settingsBtn.id !== 'cinematic-settings-btn') {
      settingsBtn.id = 'cinematic-settings-btn';
      settingsBtn.innerHTML = '<span class="cinematic-button-icon">⚙</span><span class="cinematic-button-copy"><span class="cinematic-button-title">CONFIGURAÇÕES DA PARTIDA</span><span class="cinematic-button-sub">AJUSTE FOTOS, PEÇAS, ÁUDIO, TEMPOS E SISTEMA</span></span><span class="cinematic-button-arrow">›</span>';
    }

    if (exitBtn && !exitBtn.dataset.cinematicDecorated) {
      exitBtn.dataset.cinematicDecorated = 'true';
      exitBtn.innerHTML = '<span class="cinematic-button-icon">↪</span><span class="cinematic-button-copy"><span class="cinematic-button-title">SAIR DO JOGO</span><span class="cinematic-button-sub">ENCERRAR O COSPLAY CHESS</span></span><span class="cinematic-button-arrow">›</span>';
    }

    if (!panel.querySelector('.cinematic-menu-footer')) {
      const footer = document.createElement('div');
      footer.className = 'cinematic-menu-footer';
      footer.innerHTML = '<span>— “ ESTRATÉGIA TAMBÉM É UMA FORMA DE ARTE. ” —</span><span>RUBRA STUDIOS · COSPLAY CHESS</span>';
      panel.appendChild(footer);
    }

    updateStatus();
    return true;
  }

  function bindStatusUpdates() {
    if (window.__cosplayCinematicStatusBound) return;
    window.__cosplayCinematicStatusBound = true;
    document.addEventListener('click', event => {
      if (event.target.closest?.('.piece-layout-card')) setTimeout(updateStatus, 35);
    });
    document.addEventListener('change', event => {
      if (event.target?.id === 'opponent-select' || event.target?.id === 'import-file') setTimeout(updateStatus, 80);
    });
    window.addEventListener('cosplaychess:json-imported', () => setTimeout(updateStatus, 80));
    setInterval(updateStatus, 1800);
  }

  function init() {
    installStyles();
    ensureBrandDecor();
    bindStatusUpdates();

    if (decorateMainPanel()) return;
    const observer = new MutationObserver(() => {
      ensureBrandDecor();
      if (decorateMainPanel()) {
        updateStatus();
      }
    });
    const target = byId('start-menu') || document.body;
    observer.observe(target, { childList: true, subtree: true });
    setTimeout(() => { ensureBrandDecor(); decorateMainPanel(); }, 400);
    setTimeout(() => { ensureBrandDecor(); decorateMainPanel(); }, 1200);
    setTimeout(() => { ensureBrandDecor(); decorateMainPanel(); }, 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();