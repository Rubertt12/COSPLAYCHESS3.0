(() => {
  if (window.__cosplayGameUxPolishLoaded) return;
  window.__cosplayGameUxPolishLoaded = true;

  const PIECES = {
    P: 'PEÃO',
    T: 'TORRE',
    C: 'CAVALO',
    B: 'BISPO',
    Q: 'RAINHA',
    K: 'REI'
  };
  const SIDES = {
    B: { label: 'BRANCAS', player: 'PLAYER 1', playerNumber: 1 },
    P: { label: 'PRETAS', player: 'PLAYER 2', playerNumber: 2 }
  };

  let activeMoveMeta = null;

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const sideOf = id => String(id || '').endsWith('_B') ? 'B' : 'P';
  const coord = index => {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i > 63) return '?';
    return String.fromCharCode(65 + (i % 8)) + (8 - Math.floor(i / 8));
  };
  const boardCoord = index => ({ row: Math.floor(index / 8), col: index % 8 });

  function pieceInfo(id) {
    if (!id) return null;
    const type = String(id).charAt(0);
    const side = sideOf(id);
    let data = {};
    try { data = store?.p?.[id] || {}; } catch (_) {}
    const character = String(data.name || PIECES[type] || id).trim();
    const cosplayer = String(data.participantRealName || data.participant?.name || data.participantName || '').trim();
    return {
      id,
      type,
      piece: PIECES[type] || 'PEÇA',
      side,
      sideLabel: SIDES[side].label,
      player: SIDES[side].player,
      playerNumber: SIDES[side].playerNumber,
      character,
      cosplayer,
      image: data.img || ''
    };
  }

  function describeMove(from, to) {
    let mover = null;
    let target = null;
    let enPassant = null;
    try {
      mover = store?.board?.[from] || null;
      target = store?.board?.[to] || null;
      enPassant = store?.g?.enPassant ?? null;
    } catch (_) {}
    if (!mover) return null;

    const info = pieceInfo(mover);
    const src = boardCoord(from);
    const dst = boardCoord(to);
    const dr = dst.row - src.row;
    const dc = dst.col - src.col;
    const isCapture = !!target;
    const isEnPassant = info.type === 'P' && !target && Number(enPassant) === Number(to) && Math.abs(dc) === 1;
    const reachesPromotion = info.type === 'P' && (dst.row === 0 || dst.row === 7);
    let label = `MOVIMENTO DE ${info.piece}`;

    if (info.type === 'K' && Math.abs(dc) === 2) {
      label = dc > 0 ? 'ROQUE PEQUENO' : 'ROQUE GRANDE';
    } else if (isEnPassant) {
      label = 'EN PASSANT';
    } else if (reachesPromotion) {
      label = isCapture ? 'CAPTURA COM PROMOÇÃO' : 'PROMOÇÃO DE PEÃO';
    } else if (info.type === 'P' && isCapture) {
      label = 'CAPTURA DIAGONAL DE PEÃO';
    } else if (info.type === 'P' && Math.abs(dr) === 2) {
      label = 'AVANÇO DUPLO DE PEÃO';
    } else if (info.type === 'P') {
      label = 'AVANÇO DE PEÃO';
    } else if (isCapture) {
      label = `CAPTURA DE ${info.piece}`;
    } else if (info.type === 'C') {
      label = 'SALTO DE CAVALO';
    } else if (info.type === 'B') {
      label = 'MOVIMENTO DIAGONAL DO BISPO';
    } else if (info.type === 'T') {
      label = 'MOVIMENTO DE TORRE';
    } else if (info.type === 'Q') {
      label = 'MOVIMENTO DA RAINHA';
    } else if (info.type === 'K') {
      label = 'MOVIMENTO DO REI';
    }

    const capture = isCapture || isEnPassant;
    const origin = coord(from);
    const destination = coord(to);
    return {
      ...info,
      from,
      to,
      origin,
      destination,
      label,
      capture,
      notation: `${origin} ${capture ? '×' : '→'} ${destination}`,
      target: pieceInfo(target)
    };
  }

  function installStyles() {
    if (document.getElementById('cosplay-game-ux-polish-styles')) return;
    const style = document.createElement('style');
    style.id = 'cosplay-game-ux-polish-styles';
    style.textContent = `
      #game-exit-btn-start{margin-top:12px!important;width:100%;padding:16px!important;background:linear-gradient(135deg,#24151b,#35131d)!important;border:1px solid rgba(255,87,120,.42)!important;color:#ff9aae!important;font-weight:900!important;letter-spacing:1.4px!important}
      #game-exit-btn-start:hover{border-color:#ff5d80!important;background:linear-gradient(135deg,#311820,#4a1422)!important}
      #game-exit-btn-system{width:100%;margin-top:8px!important;background:#2c141b!important;color:#ff9aae!important;border:1px solid rgba(255,87,120,.35)!important}

      #sidebar.cc-settings-drawer{left:0!important;width:min(600px,96vw)!important;height:100vh;height:100dvh!important;transform:translateX(-102%);transition:transform .34s cubic-bezier(.16,1,.3,1)!important;border-right:1px solid rgba(224,190,119,.34)!important;background:linear-gradient(165deg,rgba(15,14,19,.985),rgba(6,7,10,.995))!important;box-shadow:34px 0 100px rgba(0,0,0,.72);overflow:hidden}
      #sidebar.cc-settings-drawer.open{left:0!important;transform:translateX(0)}
      #sidebar .cc-control-header{position:relative;padding:22px 24px 18px!important;border-bottom:1px solid rgba(255,255,255,.075)!important;background:radial-gradient(circle at 8% 0,rgba(224,190,119,.12),transparent 38%)}
      #sidebar .cc-control-kicker{color:#d4aa59;font-size:8px;font-weight:1000;letter-spacing:2.4px;text-transform:uppercase}
      #sidebar .cc-control-header h2{margin:5px 42px 3px 0!important;color:#fff5df!important;font-family:Georgia,serif;font-size:25px!important;font-weight:500;letter-spacing:.2px!important}
      #sidebar .cc-control-subtitle{margin:0 48px 14px 0;color:#79727d;font-size:9px;line-height:1.45}
      #sidebar .cc-drawer-close{position:absolute;right:18px;top:18px;width:34px;height:34px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#131319;color:#aaa;font-size:18px;cursor:pointer}
      #sidebar .cc-drawer-close:hover{border-color:#d3aa5c;color:#ffe1a1}
      #sidebar .cc-mode-toggles{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px!important;margin-top:0!important}
      #sidebar .cc-mode-toggle{min-width:0;padding:9px 8px!important;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:rgba(255,255,255,.025);color:#8c8690!important;font-size:7px!important;font-weight:900!important;line-height:1.25;letter-spacing:.4px;display:flex!important;align-items:center!important;gap:7px!important;cursor:pointer}
      #sidebar .cc-mode-toggle:has(input:checked){border-color:rgba(224,190,119,.38);background:rgba(224,190,119,.08);color:#f0ca7d!important}
      #sidebar .cc-mode-toggle input{width:15px;height:15px;accent-color:#d3a955;flex:0 0 auto}
      #sidebar .tabs{padding:8px 10px;gap:5px;background:#08080b!important;border-bottom:1px solid rgba(255,255,255,.07)}
      #sidebar .tabs button{min-width:0;padding:9px 5px!important;border:1px solid transparent!important;border-radius:9px;color:#68626d!important;font-size:7px!important;letter-spacing:.5px!important;display:flex;flex-direction:column;align-items:center;gap:3px;transition:.18s ease}
      #sidebar .tabs button span{font-size:15px;line-height:1}
      #sidebar .tabs button b{font-size:7px;letter-spacing:.75px}
      #sidebar .tabs button.active{color:#ffe1a0!important;border-color:rgba(224,190,119,.26)!important;background:rgba(224,190,119,.075)!important;box-shadow:inset 0 0 18px rgba(224,190,119,.035)}
      #sidebar .scroll-area{padding:16px 18px 24px!important;scrollbar-gutter:stable;overscroll-behavior:contain}
      #sidebar .cc-piece-origin-header{display:none!important}
      .cc-piece-workspace-head{position:sticky;top:-16px;z-index:12;margin:-16px -18px 12px;padding:17px 18px 13px;background:linear-gradient(180deg,rgba(8,8,12,.99) 84%,rgba(8,8,12,.88),transparent);backdrop-filter:blur(12px)}
      .cc-piece-title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
      .cc-piece-title-row small{display:block;color:#b58c47;font-size:7px;font-weight:1000;letter-spacing:2px}
      .cc-piece-title-row h3{margin:4px 0 0;color:#f5efe6;font-family:Georgia,serif;font-size:21px;font-weight:500}
      .cc-piece-count{color:#746d78;font-size:8px;white-space:nowrap}.cc-piece-count b{color:#e5bd6b;font-size:16px}
      .cc-piece-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:11px}
      .cc-piece-stats div{padding:7px 8px;border:1px solid rgba(255,255,255,.055);border-radius:8px;background:rgba(255,255,255,.022)}
      .cc-piece-stats b{display:block;color:#eee;font-size:12px}.cc-piece-stats span{display:block;margin-top:2px;color:#625d67;font-size:6px;font-weight:900;letter-spacing:.7px}
      .cc-piece-search{position:relative;margin-top:9px}.cc-piece-search span{position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:12px;pointer-events:none}
      .cc-piece-search input{width:100%;height:38px;padding:0 36px!important;border:1px solid #25252d!important;border-radius:10px!important;background:#101015!important;color:#eee!important;font-size:10px!important;outline:none}
      .cc-piece-search input:focus{border-color:rgba(224,190,119,.5)!important;box-shadow:0 0 0 3px rgba(224,190,119,.06)}
      .cc-piece-filter-row{display:flex;gap:5px;margin-top:7px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.cc-piece-filter-row::-webkit-scrollbar{display:none}
      .cc-piece-filter{flex:0 0 auto;padding:6px 8px;border:1px solid #25252d;border-radius:999px;background:#101015;color:#706a74;font-size:6.5px;font-weight:900;letter-spacing:.45px;cursor:pointer}
      .cc-piece-filter.active{border-color:rgba(224,190,119,.4);background:rgba(224,190,119,.09);color:#f0c979}
      .cc-piece-settings-grid{display:grid;grid-template-columns:1fr;gap:8px}
      #sidebar .cc-piece-card{margin:0!important;padding:12px!important;border:1px solid rgba(255,255,255,.075)!important;border-radius:13px!important;background:linear-gradient(150deg,rgba(255,255,255,.035),rgba(255,255,255,.012))!important;box-shadow:0 10px 28px rgba(0,0,0,.16);transition:border-color .18s ease,background .18s ease}
      #sidebar .cc-piece-card:hover,#sidebar .cc-piece-card.expanded{border-color:rgba(224,190,119,.26)!important;background:linear-gradient(150deg,rgba(224,190,119,.055),rgba(255,255,255,.012))!important}
      .cc-piece-card-head{min-width:0;flex-wrap:nowrap!important}
      .cc-piece-photo{flex:0 0 auto!important}
      .cc-piece-main{min-width:0;flex:1}.cc-piece-main strong{font-size:13px!important}
      .cc-piece-state{display:flex;gap:4px;align-items:center;margin-left:auto}
      .cc-piece-state span{width:24px;height:24px;display:grid;place-items:center;border:1px solid #292932;border-radius:7px;background:#111116;color:#514d55;font-size:10px}
      .cc-piece-state span.ok{border-color:rgba(90,226,159,.2);background:rgba(90,226,159,.06);color:#83efb7}
      .cc-piece-card-head>button:not(.cc-piece-expand){padding:7px 8px!important;font-size:7px!important;white-space:nowrap}
      .cc-piece-expand{width:31px;height:31px;display:grid;place-items:center;border:1px solid #303039;border-radius:8px;background:#15151b;color:#8c858f;cursor:pointer;font-size:13px;transition:.18s ease}
      .cc-piece-card.expanded .cc-piece-expand{transform:rotate(180deg);border-color:rgba(224,190,119,.4);color:#f0c979}
      .cc-piece-details{display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows .28s ease,opacity .2s ease}
      .cc-piece-details-inner{min-height:0;overflow:hidden}
      .cc-piece-card.expanded .cc-piece-details{grid-template-rows:1fr;opacity:1}
      .cc-piece-card.expanded .cc-piece-details-inner{padding-top:2px}
      .cc-piece-no-results{display:none;padding:30px 20px;text-align:center;border:1px dashed #27272f;border-radius:12px;color:#69636e;font-size:9px}.cc-piece-no-results.show{display:block}
      #list-log .cc-log-head,#list-sys .cc-system-head{margin-bottom:12px;padding:14px;border:1px solid rgba(224,190,119,.14);border-radius:12px;background:rgba(224,190,119,.04)}
      #list-log .cc-log-head small,#list-sys .cc-system-head small{color:#b28a47;font-size:7px;font-weight:1000;letter-spacing:2px}
      #list-log .cc-log-head h3,#list-sys .cc-system-head h3{margin:4px 0 2px;color:#f5eee2;font-family:Georgia,serif;font-size:19px;font-weight:500}
      #list-log .cc-log-head p,#list-sys .cc-system-head p{margin:0;color:#6f6973;font-size:8px;line-height:1.4}
      #list-log .log-entry{margin-bottom:5px;padding:9px 10px!important;border:1px solid rgba(255,255,255,.055)!important;border-radius:8px;background:rgba(255,255,255,.018)}
      #list-sys .unit-card{margin-bottom:8px!important;padding:13px!important;border-radius:11px!important;border-color:rgba(255,255,255,.075)!important;background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012))!important}
      #list-sys>.btn{width:100%!important;min-height:40px!important;margin:0 0 7px!important;border-radius:10px!important;font-size:8px!important;letter-spacing:.65px}
      #list-sys .cc-danger-zone{margin-top:13px;padding:11px;border:1px solid rgba(255,75,112,.18);border-radius:12px;background:rgba(255,75,112,.035)}
      #list-sys .cc-danger-zone>small{display:block;margin:0 2px 8px;color:#b96778;font-size:7px;font-weight:1000;letter-spacing:1.7px}
      #sidebar .cc-sidebar-footer{padding:12px 16px!important;background:linear-gradient(180deg,#09090d,#050506)!important;border-top:1px solid rgba(255,255,255,.075)!important}
      #sidebar .cc-sidebar-footer .btn{min-height:45px;border-radius:10px!important;box-shadow:0 9px 28px rgba(0,0,0,.3)}
      #start-menu-settings-content .cc-settings-overview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 12px}
      #start-menu-settings-content .cc-overview-stat{padding:11px;border:1px solid rgba(255,255,255,.065);border-radius:10px;background:rgba(255,255,255,.025)}
      #start-menu-settings-content .cc-overview-stat span{display:block;color:#77717c;font-size:7px;font-weight:900;letter-spacing:1px}.cc-overview-stat b{display:block;margin-top:4px;color:#f2e9dc;font-size:13px}
      #start-menu-settings-content .cc-settings-jumps{display:flex;gap:6px;margin:0 0 14px;overflow-x:auto;scrollbar-width:none}.cc-settings-jumps::-webkit-scrollbar{display:none}
      #start-menu-settings-content .cc-settings-jumps button{flex:0 0 auto;padding:8px 10px;border:1px solid #292932;border-radius:999px;background:#111116;color:#8b8490;font-size:7px;font-weight:900;letter-spacing:.6px;cursor:pointer}
      #start-menu-settings-content .cc-settings-jumps button:hover{border-color:rgba(224,190,119,.4);color:#f0c979}
      @media(max-width:760px){
        #sidebar.cc-settings-drawer{width:100vw!important}
        #sidebar .cc-control-header{padding:17px 16px 13px!important}
        #sidebar .cc-control-header h2{font-size:21px!important}
        #sidebar .cc-control-subtitle{display:none}
        #sidebar .cc-mode-toggles{margin-top:10px!important}
        #sidebar .scroll-area{padding:13px 12px 20px!important}
        .cc-piece-workspace-head{top:-13px;margin:-13px -12px 10px;padding:14px 12px 11px}
        .cc-piece-card-head{flex-wrap:wrap!important}.cc-piece-main{min-width:150px}
        .cc-piece-state{order:3;margin-left:58px}.cc-piece-expand{margin-left:auto}
        #start-menu-settings-content .cc-settings-overview{grid-template-columns:1fr}
      }

      .duel-timing-card{margin:12px 0;padding:14px;border:1px solid rgba(224,190,119,.2);border-radius:13px;background:linear-gradient(145deg,rgba(224,190,119,.075),rgba(13,13,18,.94));box-shadow:inset 0 0 0 1px rgba(255,255,255,.02)}
      .duel-timing-card .duel-timing-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:11px}
      .duel-timing-card .duel-timing-heading small{display:block;color:#cda858;font-size:8px;font-weight:1000;letter-spacing:1.6px}
      .duel-timing-card .duel-timing-heading strong{display:block;margin-top:3px;color:#f7f0e5;font-size:13px}
      .duel-timing-card .duel-timing-heading span{color:#756f79;font-size:18px}
      .duel-timing-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .duel-timing-control{display:block;padding:10px;border:1px solid rgba(255,255,255,.065);border-radius:10px;background:rgba(255,255,255,.025)}
      .duel-timing-control>span{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;color:#aaa3ae;font-size:8px;font-weight:900;letter-spacing:.7px}
      .duel-timing-control b{color:#f2ca77;font-size:10px;white-space:nowrap}
      .duel-timing-control input{width:100%;accent-color:#d6ab5a;cursor:pointer}
      .duel-timing-help{margin:9px 2px 0;color:#716b75;font-size:8px;line-height:1.45}
      #duel-timing-system{margin-top:0}
      #duel-timing-system .duel-timing-grid{grid-template-columns:1fr}
      #duel-timing-system .duel-timing-heading strong{font-size:11px}
      @media(max-width:520px){.duel-timing-grid{grid-template-columns:1fr}}

      #move-name-banner{position:fixed;top:84px;left:50%;z-index:8500;transform:translate(-50%,-10px);width:min(620px,calc(100vw - 32px));padding:10px 15px;border:1px solid rgba(224,190,119,.38);border-radius:12px;background:linear-gradient(135deg,rgba(13,12,18,.96),rgba(31,21,25,.96));box-shadow:0 16px 45px rgba(0,0,0,.5);backdrop-filter:blur(10px);opacity:0;visibility:hidden;pointer-events:none;transition:.22s ease;text-align:center}
      #move-name-banner.show{opacity:1;visibility:visible;transform:translate(-50%,0)}
      #move-name-banner small{display:block;color:#9e929f;font-size:8px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase}
      #move-name-banner strong{display:block;color:#f0c978;font-family:Georgia,serif;font-size:17px;line-height:1.2;margin:3px 0}
      #move-name-banner span{display:block;color:#eee7ef;font-size:10px;line-height:1.35}
      .move-log-tag{display:inline-block;margin-right:5px;padding:2px 5px;border:1px solid rgba(224,190,119,.25);border-radius:5px;color:#e8be69;font-size:8px;font-weight:900;letter-spacing:.5px}

      #arena .arena-content.duel-v2{position:relative;width:min(1060px,100%)!important;height:min(700px,calc(100vh - 24px));height:min(700px,calc(100dvh - 24px));max-height:none!important;min-height:0;overflow:hidden!important;padding:clamp(12px,2.2dvh,24px) clamp(12px,2vw,24px)!important;border-radius:22px!important;border:1px solid rgba(224,190,119,.26)!important;background:radial-gradient(circle at 50% 5%,rgba(224,190,119,.09),transparent 34%),linear-gradient(160deg,#0e0c12,#08080c)!important;box-shadow:0 34px 110px rgba(0,0,0,.78)!important;box-sizing:border-box;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:clamp(8px,1.5dvh,14px)}
      #arena .arena-content.duel-v2 *{box-sizing:border-box}
      #arena .duel-arena-header{text-align:center;margin:0 auto;max-width:780px;min-width:0}
      #arena .duel-arena-header small{display:block;color:#c89e52;font-size:9px;font-weight:900;letter-spacing:2.4px;text-transform:uppercase}
      #arena .duel-arena-header h2{margin:5px 0 4px;color:#fff5df;font-family:Georgia,serif;font-size:clamp(24px,3vw,38px);font-weight:500;line-height:1.05;overflow-wrap:anywhere}
      #arena .duel-arena-header p{margin:0;color:#847d89;font-size:10px;line-height:1.5}
      #arena .arena-fighters{display:grid!important;grid-template-columns:minmax(0,1fr) clamp(54px,8vw,90px) minmax(0,1fr)!important;align-items:stretch!important;gap:clamp(8px,1.5vw,16px)!important;width:100%;height:100%;min-width:0;min-height:0;overflow:visible}
      #arena .fighter{position:relative;width:100%;height:100%;min-width:0;min-height:0;padding:clamp(9px,1.4vw,15px);border-radius:18px;border:1px solid rgba(255,255,255,.09);overflow:hidden;display:flex;flex-direction:column;background:#101015}
      #arena .fighter.duel-side-B{background:linear-gradient(155deg,rgba(222,238,247,.12),rgba(13,17,22,.98));border-color:rgba(191,231,255,.42);box-shadow:inset 0 0 36px rgba(153,218,255,.04)}
      #arena .fighter.duel-side-P{background:linear-gradient(155deg,rgba(104,22,39,.22),rgba(10,9,12,.99));border-color:rgba(255,86,116,.37);box-shadow:inset 0 0 36px rgba(255,70,102,.035)}
      #arena .arena-box{position:relative!important;width:100%!important;height:clamp(110px,32dvh,340px)!important;flex:1 1 auto;aspect-ratio:auto!important;min-height:0!important;max-height:340px!important;margin-bottom:0!important;border-radius:14px!important;background-size:cover!important;background-position:center 18%!important;background-repeat:no-repeat!important;overflow:hidden!important;border-width:2px!important}
      #arena .fighter.duel-side-B .arena-box{border-color:#d9f3ff!important;box-shadow:0 14px 38px rgba(0,0,0,.38),0 0 0 1px rgba(207,240,255,.16)!important}
      #arena .fighter.duel-side-P .arena-box{border-color:#ff607d!important;box-shadow:0 14px 38px rgba(0,0,0,.42),0 0 0 1px rgba(255,96,125,.12)!important}
      #arena .arena-box[data-side-label]::after{content:attr(data-side-label);position:absolute;right:9px;bottom:8px;padding:5px 8px;border-radius:999px;background:rgba(0,0,0,.78);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:8px;font-weight:1000;letter-spacing:1.2px;box-shadow:0 4px 14px rgba(0,0,0,.35)}
      #arena .duel-fighter-meta{padding:clamp(7px,1.4dvh,12px) 2px 3px;min-height:0;text-align:left;flex:0 0 auto}
      #arena .duel-fighter-meta .duel-role{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:5px;color:#8c8490;font-size:8px;font-weight:900;letter-spacing:1px;text-transform:uppercase}
      #arena .duel-fighter-meta .duel-role b{color:#d8ac59}
      #arena .duel-fighter-meta h3{margin:0;color:#fff;font-family:Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.1;overflow-wrap:anywhere}
      #arena .duel-fighter-meta .duel-piece-line{margin-top:5px;color:#bdb4c0;font-size:9px;font-weight:800;letter-spacing:.7px}
      #arena .duel-fighter-meta .duel-cosplayer{margin-top:5px;color:#7d7581;font-size:9px;line-height:1.35}
      #arena .duel-victory-btn{margin-top:auto!important;width:100%!important;min-height:40px!important;padding:8px 5px!important;font-size:10px!important;font-weight:1000!important;letter-spacing:1px!important;border-radius:10px!important}
      #arena .fighter.duel-side-B .duel-victory-btn{background:linear-gradient(135deg,#dff5ff,#9ed8ed)!important;color:#071117!important;border:1px solid #eefbff!important}
      #arena .fighter.duel-side-P .duel-victory-btn{background:linear-gradient(135deg,#9e253d,#e04864)!important;color:#fff!important;border:1px solid #ff7890!important}
      #arena .duel-versus-core{display:flex!important;flex-direction:column;align-items:center;justify-content:center!important;gap:2px;color:#5f5863!important;text-align:center}
      #arena .duel-versus-core span{font-size:30px;filter:drop-shadow(0 6px 14px rgba(0,0,0,.6))}
      #arena .duel-versus-core b{color:#d6ab5a;font-family:Georgia,serif;font-size:21px;letter-spacing:2px}
      #arena .duel-versus-core small{margin-top:5px;color:#7c7480;font-size:8px;line-height:1.35}
      #arena .arena-audio-btns{margin-top:3px!important;flex:0 0 auto}
      #arena .arena-audio-btns .btn{min-height:30px!important;padding:6px!important}
      #arena .arena-sound-label{min-height:18px;margin:5px 0 6px!important;color:#7f7783!important;flex:0 0 auto}
      #arena .duel-shortcut{display:block;margin-top:5px;color:#675f69;font-size:7px;text-align:center;letter-spacing:.6px}
      #arena{padding:12px;overflow:hidden;box-sizing:border-box;background:radial-gradient(circle at 50% 42%,rgba(208,156,65,.12),rgba(2,2,5,.93) 52%,rgba(0,0,0,.98))!important;perspective:1200px}
      #arena .arena-content.duel-v2::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.2;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:32px 32px;mask-image:linear-gradient(to bottom,black,transparent 82%)}
      #arena .arena-content.duel-v2::after{content:'';position:absolute;inset:-35% 24%;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(226,177,87,.055),transparent);transform:rotate(14deg);animation:duelAmbientSweep 5s linear infinite}
      #arena .duel-arena-header,#arena .arena-fighters,#arena .duel-cancel-row{position:relative;z-index:2}
      #arena .duel-cancel-row{min-height:34px;margin-top:0!important;text-align:center!important}
      #arena .duel-cancel-row .btn{width:min(160px,100%)!important;min-height:34px;padding:7px 12px!important}
      #arena .duel-live-status{display:inline-flex;align-items:center;gap:7px;margin-top:10px;padding:6px 10px;border-radius:999px;border:1px solid rgba(224,190,119,.2);background:rgba(224,190,119,.055);color:#b8a27d;font-size:8px;font-weight:900;letter-spacing:1.2px}
      #arena .duel-live-status i{width:6px;height:6px;border-radius:50%;background:#f2c76e;box-shadow:0 0 12px #e7b751;animation:duelStatusPulse 1.1s ease-in-out infinite alternate}
      #arena .fighter::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.7;background:radial-gradient(circle at 50% 0,rgba(255,255,255,.09),transparent 34%)}
      #arena .fighter::after{content:'';position:absolute;left:15%;right:15%;bottom:-26px;height:34px;border-radius:50%;background:rgba(0,0,0,.72);filter:blur(13px);pointer-events:none}
      #arena .fighter>*{position:relative;z-index:1}
      #arena .duel-energy{height:3px;margin:2px 2px 11px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden}
      #arena .duel-energy i{display:block;width:100%;height:100%;border-radius:inherit;transform-origin:left;animation:duelEnergyReady 1.8s ease-in-out infinite alternate}
      #arena .fighter.duel-side-B .duel-energy i{background:linear-gradient(90deg,#8dcce5,#f1fbff);box-shadow:0 0 12px #a8e4fb}
      #arena .fighter.duel-side-P .duel-energy i{background:linear-gradient(90deg,#9e253d,#ff6a84);box-shadow:0 0 12px #ff526f}
      #arena .duel-versus-core span{animation:duelWeaponFloat 1.4s ease-in-out infinite alternate}
      #arena .duel-impact-layer{position:absolute;inset:0;z-index:20;display:grid;place-items:center;pointer-events:none;opacity:0;overflow:hidden}
      #arena .duel-impact-layer.active{opacity:1;animation:duelImpactFlash .78s ease-out both}
      #arena .duel-impact-ring{position:absolute;width:130px;height:130px;border:3px solid rgba(255,224,149,.9);border-radius:50%;box-shadow:0 0 25px rgba(255,188,75,.9),inset 0 0 25px rgba(255,188,75,.48);opacity:0}
      #arena .duel-impact-layer.active .duel-impact-ring{animation:duelImpactRing .7s cubic-bezier(.12,.72,.22,1) both}
      #arena .duel-impact-slash{width:12px;height:210px;border-radius:99px;background:linear-gradient(to bottom,transparent,#fff8d9 20%,#f7b93d 52%,#fff 76%,transparent);box-shadow:0 0 18px #fff,0 0 44px #f0a82e;transform:rotate(42deg) scaleY(0);opacity:0}
      #arena .duel-impact-layer.active .duel-impact-slash{animation:duelSlash .55s cubic-bezier(.15,.8,.2,1) .12s both}
      #arena .duel-spark{position:absolute;width:5px;height:42px;border-radius:99px;background:linear-gradient(#fff7d5,#f4a92e,transparent);box-shadow:0 0 10px #ffcc6b;transform-origin:50% 100%;opacity:0}
      #arena .duel-impact-layer.active .duel-spark{animation:duelSpark .64s ease-out var(--delay,0s) both;transform:rotate(var(--angle)) translateY(-24px)}
      #arena .fighter.duel-enter-left{animation:duelEnterLeft .62s cubic-bezier(.16,.8,.25,1) both}
      #arena .fighter.duel-enter-right{animation:duelEnterRight .62s cubic-bezier(.16,.8,.25,1) both}
      #arena.duel-resolving .duel-victory-btn,#arena.duel-resolving .arena-audio-btns,#arena.duel-resolving .duel-cancel-row{pointer-events:none;filter:saturate(.35);opacity:.55}
      #arena .fighter.duel-attack-left{z-index:8;animation:duelAttackLeft .82s cubic-bezier(.18,.78,.2,1) both}
      #arena .fighter.duel-attack-right{z-index:8;animation:duelAttackRight .82s cubic-bezier(.18,.78,.2,1) both}
      #arena .fighter.duel-hit-left{animation:duelHitLeft .82s ease-out both}
      #arena .fighter.duel-hit-right{animation:duelHitRight .82s ease-out both}
      #arena.duel-resolving .duel-live-status{border-color:rgba(255,205,104,.5);background:rgba(255,188,64,.12);color:#ffe4aa}
      #arena.duel-resolving .duel-live-status i{background:#fff;box-shadow:0 0 18px #ffbd3b}

      @keyframes duelAmbientSweep{from{transform:translateX(-30%) rotate(14deg)}to{transform:translateX(30%) rotate(14deg)}}
      @keyframes duelStatusPulse{from{opacity:.45;transform:scale(.8)}to{opacity:1;transform:scale(1.25)}}
      @keyframes duelEnergyReady{from{opacity:.58;transform:scaleX(.72)}to{opacity:1;transform:scaleX(1)}}
      @keyframes duelWeaponFloat{from{transform:translateY(-3px) rotate(-4deg)}to{transform:translateY(3px) rotate(4deg)}}
      @keyframes duelEnterLeft{from{opacity:0;transform:translate3d(-70px,18px,-90px) rotateY(12deg)}to{opacity:1;transform:none}}
      @keyframes duelEnterRight{from{opacity:0;transform:translate3d(70px,18px,-90px) rotateY(-12deg)}to{opacity:1;transform:none}}
      @keyframes duelAttackLeft{0%,22%{transform:translateX(0) scale(1)}38%{transform:translateX(-16px) scale(.99)}58%{transform:translateX(62px) scale(1.045)}72%{transform:translateX(42px) scale(1.025)}100%{transform:translateX(0) scale(1)}}
      @keyframes duelAttackRight{0%,22%{transform:translateX(0) scale(1)}38%{transform:translateX(16px) scale(.99)}58%{transform:translateX(-62px) scale(1.045)}72%{transform:translateX(-42px) scale(1.025)}100%{transform:translateX(0) scale(1)}}
      @keyframes duelHitLeft{0%,48%{transform:translateX(0);filter:none}57%{transform:translateX(-18px) rotate(-1.8deg);filter:brightness(2.2) saturate(.2)}68%{transform:translateX(10px) rotate(1deg);filter:brightness(.75) saturate(.65)}82%{transform:translateX(-4px)}100%{transform:none;filter:none}}
      @keyframes duelHitRight{0%,48%{transform:translateX(0);filter:none}57%{transform:translateX(18px) rotate(1.8deg);filter:brightness(2.2) saturate(.2)}68%{transform:translateX(-10px) rotate(-1deg);filter:brightness(.75) saturate(.65)}82%{transform:translateX(4px)}100%{transform:none;filter:none}}
      @keyframes duelImpactFlash{0%,43%{background:rgba(255,255,255,0);opacity:0}52%{background:rgba(255,240,194,.22);opacity:1}100%{background:transparent;opacity:0}}
      @keyframes duelImpactRing{0%,43%{opacity:0;transform:scale(.18)}52%{opacity:1}100%{opacity:0;transform:scale(3.3)}}
      @keyframes duelSlash{0%,35%{opacity:0;transform:rotate(42deg) scaleY(0)}55%{opacity:1;transform:rotate(42deg) scaleY(1.2)}100%{opacity:0;transform:rotate(42deg) scaleY(.3) translateY(-80px)}}
      @keyframes duelSpark{0%,46%{opacity:0}53%{opacity:1}100%{opacity:0;transform:rotate(var(--angle)) translateY(-180px) scaleY(.3)}}

      #arena.duel-cinematic .arena-content.duel-v2{transform-origin:center;will-change:transform,filter}
      #arena.duel-cinematic .duel-impact-layer.active{opacity:1;animation:none}
      #arena .duel-impact-flash{position:absolute;inset:0;opacity:0;background:radial-gradient(circle at center,rgba(255,251,229,.82),rgba(255,186,55,.28) 22%,transparent 58%)}
      #arena .duel-speed-lines{position:absolute;left:8%;right:8%;top:22%;height:46%;opacity:0;filter:blur(.2px);background:repeating-linear-gradient(0deg,transparent 0 17px,rgba(255,235,189,.78) 18px,transparent 20px);mask-image:linear-gradient(90deg,transparent,black 20%,black 80%,transparent)}
      #arena.duel-left-wins .duel-speed-lines{transform:skewX(-18deg) translateX(-34%)}
      #arena.duel-right-wins .duel-speed-lines{transform:skewX(18deg) translateX(34%)}
      #arena.duel-cinematic .duel-impact-layer.active .duel-speed-lines{animation:duelCinematicTrail var(--duel-trail-duration,600ms) cubic-bezier(.1,.8,.2,1) var(--duel-trail-delay,310ms) both}
      #arena.duel-cinematic .duel-impact-layer.active .duel-impact-flash{animation:duelCinematicFlash var(--duel-animation-duration,1400ms) ease-out both}
      #arena.duel-cinematic .duel-impact-layer.active .duel-impact-ring{animation:duelCinematicRing var(--duel-ring-duration,760ms) cubic-bezier(.1,.76,.18,1) var(--duel-impact-delay,500ms) both}
      #arena.duel-cinematic .duel-impact-layer.active .duel-impact-slash{animation:duelCinematicSlash var(--duel-slash-duration,640ms) cubic-bezier(.12,.85,.18,1) var(--duel-slash-delay,430ms) both}
      #arena.duel-left-wins{--duel-slash-angle:55deg}
      #arena.duel-right-wins{--duel-slash-angle:-55deg}
      #arena .duel-impact-slash{transform:rotate(var(--duel-slash-angle,48deg)) scaleY(0)}
      #arena.duel-cinematic .duel-impact-layer.active .duel-spark{animation:duelCinematicSpark var(--duel-spark-duration,730ms) ease-out calc(var(--duel-impact-delay,500ms) + var(--delay,0s)) both}
      #arena .duel-result-banner{position:absolute;left:50%;top:50%;width:min(390px,75%);transform:translate(-50%,-35%) scale(.82);padding:15px 20px;border-radius:14px;text-align:center;background:linear-gradient(135deg,rgba(8,8,12,.96),rgba(27,20,19,.94));border:1px solid rgba(255,214,132,.48);box-shadow:0 20px 65px rgba(0,0,0,.74),0 0 34px rgba(255,181,56,.17);opacity:0}
      #arena .duel-result-banner small{display:block;color:#e6b95e;font-size:9px;font-weight:1000;letter-spacing:3px}
      #arena .duel-result-banner strong{display:block;margin-top:5px;color:#fff7e4;font-family:Georgia,serif;font-size:clamp(21px,3.2vw,34px);line-height:1.08;text-shadow:0 4px 18px rgba(0,0,0,.7)}
      #arena .duel-result-banner span{display:block;margin-top:6px;color:#9d939d;font-size:8px;font-weight:900;letter-spacing:1px}
      #arena.duel-cinematic .duel-impact-layer.active .duel-result-banner{animation:duelResultReveal var(--duel-result-reveal-duration,420ms) cubic-bezier(.16,.82,.18,1) var(--duel-result-delay,1400ms) both}
      #arena.duel-left-wins .duel-result-banner{border-color:rgba(190,235,255,.64);box-shadow:0 20px 65px rgba(0,0,0,.74),0 0 38px rgba(135,216,255,.2)}
      #arena.duel-right-wins .duel-result-banner{border-color:rgba(255,100,129,.62);box-shadow:0 20px 65px rgba(0,0,0,.74),0 0 38px rgba(255,61,98,.2)}
      #arena.duel-charging .fighter:not(.duel-winner){opacity:.58;filter:saturate(.55) brightness(.72);transition:opacity .24s ease,filter .24s ease}
      #arena.duel-charging .fighter.duel-winner{overflow:visible;filter:brightness(1.08);box-shadow:0 0 0 1px rgba(255,226,165,.32),0 18px 60px rgba(0,0,0,.55),0 0 44px rgba(255,187,65,.15)}
      #arena.duel-charging .fighter.duel-winner .duel-energy i{animation:duelChargeBar .34s ease-out both}
      #arena .fighter.duel-attack-left{z-index:8;animation:duelCinematicCardLeft var(--duel-animation-duration,1400ms) cubic-bezier(.16,.8,.2,1) both}
      #arena .fighter.duel-attack-right{z-index:8;animation:duelCinematicCardRight var(--duel-animation-duration,1400ms) cubic-bezier(.16,.8,.2,1) both}
      #arena .fighter.duel-attack-left .arena-box{animation:duelPortraitStrikeLeft var(--duel-animation-duration,1400ms) cubic-bezier(.16,.8,.2,1) both}
      #arena .fighter.duel-attack-right .arena-box{animation:duelPortraitStrikeRight var(--duel-animation-duration,1400ms) cubic-bezier(.16,.8,.2,1) both}
      #arena .fighter.duel-hit-left{animation:duelCinematicHitLeft var(--duel-animation-duration,1400ms) ease-out both}
      #arena .fighter.duel-hit-right{animation:duelCinematicHitRight var(--duel-animation-duration,1400ms) ease-out both}
      #arena.duel-impact-now .arena-content.duel-v2{animation:duelCameraImpact var(--duel-camera-duration,360ms) linear both}
      #arena.duel-impact-now .duel-versus-core{animation:duelVsBurst var(--duel-camera-duration,360ms) ease-out both}

      @keyframes duelChargeBar{from{transform:scaleX(.12);filter:brightness(1)}to{transform:scaleX(1);filter:brightness(2.2)}}
      @keyframes duelCinematicCardLeft{0%,16%{transform:none}28%{transform:translateX(-10px) scale(.995)}49%{transform:translateX(26px) scale(1.018)}57%{transform:translateX(34px) scale(1.025)}70%{transform:translateX(17px)}100%{transform:none}}
      @keyframes duelCinematicCardRight{0%,16%{transform:none}28%{transform:translateX(10px) scale(.995)}49%{transform:translateX(-26px) scale(1.018)}57%{transform:translateX(-34px) scale(1.025)}70%{transform:translateX(-17px)}100%{transform:none}}
      @keyframes duelPortraitStrikeLeft{0%,18%{transform:none;filter:brightness(1)}30%{transform:translateX(-8px) scale(.98);filter:brightness(1.25)}48%{transform:translateX(56px) scale(1.08);filter:brightness(1.6) contrast(1.08)}58%{transform:translateX(42px) scale(1.055)}100%{transform:none;filter:none}}
      @keyframes duelPortraitStrikeRight{0%,18%{transform:none;filter:brightness(1)}30%{transform:translateX(8px) scale(.98);filter:brightness(1.25)}48%{transform:translateX(-56px) scale(1.08);filter:brightness(1.6) contrast(1.08)}58%{transform:translateX(-42px) scale(1.055)}100%{transform:none;filter:none}}
      @keyframes duelCinematicHitLeft{0%,44%{transform:none;filter:none;opacity:.58}49%{transform:translateX(-24px) rotate(-2.5deg);filter:brightness(2.6) saturate(.15);opacity:1}54%{transform:translateX(14px) rotate(1.4deg);filter:brightness(.54) saturate(.5);opacity:.76}60%{transform:translateX(-9px)}66%{transform:translateX(5px);filter:brightness(.7)}82%{transform:none;opacity:.48}100%{transform:none;filter:grayscale(.4) brightness(.65);opacity:.42}}
      @keyframes duelCinematicHitRight{0%,44%{transform:none;filter:none;opacity:.58}49%{transform:translateX(24px) rotate(2.5deg);filter:brightness(2.6) saturate(.15);opacity:1}54%{transform:translateX(-14px) rotate(-1.4deg);filter:brightness(.54) saturate(.5);opacity:.76}60%{transform:translateX(9px)}66%{transform:translateX(-5px);filter:brightness(.7)}82%{transform:none;opacity:.48}100%{transform:none;filter:grayscale(.4) brightness(.65);opacity:.42}}
      @keyframes duelCinematicTrail{0%{opacity:0}28%{opacity:.95}100%{opacity:0;transform:skewX(0) translateX(0) scaleX(1.5)}}
      @keyframes duelCinematicFlash{0%,39%{opacity:0}47%{opacity:.18}49%{opacity:1}52%{opacity:.08}56%{opacity:.7}63%,100%{opacity:0}}
      @keyframes duelCinematicRing{0%{opacity:0;transform:scale(.12)}18%{opacity:1}100%{opacity:0;transform:scale(4.2)}}
      @keyframes duelCinematicSlash{0%{opacity:0;transform:rotate(var(--duel-slash-angle,48deg)) scaleY(0)}20%{opacity:1;transform:rotate(var(--duel-slash-angle,48deg)) scaleY(1.35)}100%{opacity:0;transform:rotate(var(--duel-slash-angle,48deg)) scaleY(.25) translateY(-120px)}}
      @keyframes duelCinematicSpark{0%{opacity:0}12%{opacity:1}100%{opacity:0;transform:rotate(var(--angle)) translateY(-230px) scaleY(.22)}}
      @keyframes duelCameraImpact{0%,100%{transform:none}18%{transform:translate(-7px,3px) rotate(-.35deg)}35%{transform:translate(6px,-3px) rotate(.25deg)}52%{transform:translate(-4px,-1px)}70%{transform:translate(3px,2px)}}
      @keyframes duelVsBurst{0%{transform:scale(1);filter:brightness(1)}45%{transform:scale(1.34) rotate(5deg);filter:brightness(3) drop-shadow(0 0 22px #ffc75c)}100%{transform:scale(.92);filter:brightness(.72)}}
      @keyframes duelResultReveal{from{opacity:0;transform:translate(-50%,-35%) scale(.72);filter:blur(8px)}to{opacity:1;transform:translate(-50%,-50%) scale(1);filter:none}}

      @media(max-width:760px){
        #move-name-banner{top:72px}
        #arena{padding:6px}
        #arena .arena-content.duel-v2{width:100%!important;height:min(680px,calc(100vh - 12px));height:min(680px,calc(100dvh - 12px));padding:10px!important;border-radius:16px!important;gap:8px}
        #arena .duel-arena-header small{font-size:7px;letter-spacing:1.7px}
        #arena .duel-arena-header h2{margin:3px 0;font-size:clamp(15px,4.8vw,22px);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
        #arena .duel-arena-header p{font-size:8px;line-height:1.25;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
        #arena .duel-live-status{margin-top:5px;padding:4px 7px;font-size:6.5px;letter-spacing:.8px}
        #arena .arena-fighters{grid-template-columns:minmax(0,1fr) 32px minmax(0,1fr)!important;gap:6px!important}
        #arena .fighter{padding:8px;border-radius:12px}
        #arena .arena-box{height:clamp(100px,27dvh,210px)!important;max-height:210px!important;border-radius:10px!important}
        #arena .arena-box[data-side-label]::after{right:5px;bottom:5px;max-width:calc(100% - 10px);padding:3px 5px;font-size:6px;letter-spacing:.45px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #arena .duel-fighter-meta{padding:7px 0 2px}
        #arena .duel-fighter-meta .duel-role{display:block;margin-bottom:3px;font-size:6.5px;letter-spacing:.45px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #arena .duel-fighter-meta .duel-role b{display:block;margin-top:2px;overflow:hidden;text-overflow:ellipsis}
        #arena .duel-fighter-meta h3{font-size:clamp(13px,4vw,17px);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
        #arena .duel-fighter-meta .duel-piece-line{margin-top:3px;font-size:7px;letter-spacing:.25px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #arena .duel-fighter-meta .duel-cosplayer{margin-top:3px;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #arena .duel-energy{margin:3px 0 5px}
        #arena .arena-audio-btns{gap:3px!important}
        #arena .arena-audio-btns .btn{min-height:28px!important;padding:5px 2px!important;font-size:9px!important}
        #arena .arena-sound-label{display:none}
        #arena .duel-victory-btn{min-height:36px!important;padding:6px 2px!important;font-size:7.5px!important;letter-spacing:.35px!important;border-radius:7px!important}
        #arena .duel-shortcut{display:none}
        #arena .duel-versus-core{min-width:0!important;min-height:0!important}
        #arena .duel-versus-core span{font-size:21px}
        #arena .duel-versus-core b{font-size:13px;letter-spacing:.5px}
        #arena .duel-versus-core small{display:none}
        #arena .duel-cancel-row{min-height:32px}
        #arena .duel-cancel-row .btn{min-height:32px;padding:5px 10px!important;font-size:8px!important}
        #arena .duel-result-banner{top:50%;width:min(330px,90%);padding:12px}
      }
      @media(max-width:360px){
        #arena .arena-content.duel-v2{padding:8px!important;gap:6px}
        #arena .arena-fighters{grid-template-columns:minmax(0,1fr) 26px minmax(0,1fr)!important;gap:4px!important}
        #arena .fighter{padding:6px}
        #arena .arena-box{height:clamp(90px,25dvh,180px)!important;max-height:180px!important}
        #arena .duel-arena-header p,#arena .duel-fighter-meta .duel-cosplayer{display:none}
        #arena .duel-fighter-meta .duel-role span{display:none}
        #arena .duel-versus-core span{font-size:18px}
        #arena .duel-versus-core b{font-size:11px}
      }
      @media(max-height:620px){
        #arena{padding:6px}
        #arena .arena-content.duel-v2{height:calc(100vh - 12px);height:calc(100dvh - 12px);padding:8px 10px!important;gap:5px;border-radius:14px!important}
        #arena .duel-arena-header h2{margin:2px 0;font-size:17px}
        #arena .duel-arena-header p{display:none}
        #arena .duel-live-status{margin-top:3px;padding:3px 7px;font-size:6px}
        #arena .arena-fighters{gap:7px!important}
        #arena .fighter{padding:6px 8px;border-radius:11px}
        #arena .arena-box{height:clamp(74px,22dvh,145px)!important;max-height:145px!important;border-radius:9px!important}
        #arena .duel-fighter-meta{padding:4px 0 1px}
        #arena .duel-fighter-meta .duel-role{margin-bottom:2px;font-size:6px}
        #arena .duel-fighter-meta h3{font-size:14px;line-height:1}
        #arena .duel-fighter-meta .duel-piece-line{margin-top:2px;font-size:6.5px}
        #arena .duel-fighter-meta .duel-cosplayer{display:none}
        #arena .duel-energy{margin:2px 0 3px}
        #arena .arena-audio-btns .btn{min-height:25px!important;padding:3px!important}
        #arena .arena-sound-label{display:none}
        #arena .duel-victory-btn{min-height:30px!important;padding:4px 3px!important;font-size:7px!important}
        #arena .duel-shortcut{display:none}
        #arena .duel-cancel-row{min-height:27px}
        #arena .duel-cancel-row .btn{min-height:27px;padding:3px 10px!important}
      }
      @media(max-height:480px){
        #arena .duel-arena-header small{display:none}
        #arena .duel-arena-header h2{font-size:15px}
        #arena .duel-live-status{margin-top:2px}
        #arena .arena-box{height:clamp(62px,19dvh,100px)!important;max-height:100px!important}
        #arena .duel-fighter-meta .duel-role{display:none}
        #arena .duel-fighter-meta h3{font-size:12px}
        #arena .duel-fighter-meta .duel-piece-line{font-size:6px}
        #arena .arena-audio-btns .btn{min-height:22px!important}
        #arena .duel-victory-btn{min-height:27px!important}
      }
      @keyframes duelAttackDown{0%,25%{transform:translateY(0)}42%{transform:translateY(-10px)}62%{transform:translateY(34px) scale(1.025)}100%{transform:none}}
      @keyframes duelAttackUp{0%,25%{transform:translateY(0)}42%{transform:translateY(10px)}62%{transform:translateY(-34px) scale(1.025)}100%{transform:none}}
      @keyframes duelHitMobile{0%,48%{transform:translateX(0);filter:none}58%{transform:translateX(14px);filter:brightness(2.2) saturate(.2)}69%{transform:translateX(-9px);filter:brightness(.75)}100%{transform:none;filter:none}}
      @keyframes duelCinematicCardDown{0%,18%{transform:none}30%{transform:translateY(-8px)}50%{transform:translateY(26px) scale(1.018)}100%{transform:none}}
      @keyframes duelCinematicCardUp{0%,18%{transform:none}30%{transform:translateY(8px)}50%{transform:translateY(-26px) scale(1.018)}100%{transform:none}}
      @keyframes duelPortraitStrikeDown{0%,18%{transform:none}30%{transform:translateY(-7px) scale(.98)}49%{transform:translateY(38px) scale(1.06)}100%{transform:none}}
      @keyframes duelPortraitStrikeUp{0%,18%{transform:none}30%{transform:translateY(7px) scale(.98)}49%{transform:translateY(-38px) scale(1.06)}100%{transform:none}}
      @keyframes duelCinematicHitMobile{0%,44%{transform:none;filter:none;opacity:.58}50%{transform:translateX(17px);filter:brightness(2.5) saturate(.15);opacity:1}57%{transform:translateX(-11px);filter:brightness(.55);opacity:.7}65%{transform:translateX(6px)}100%{transform:none;filter:grayscale(.4) brightness(.65);opacity:.42}}
      @media(prefers-reduced-motion:reduce){#arena .fighter,#arena .arena-box,#arena .arena-content,#arena .duel-impact-layer,#arena .duel-impact-flash,#arena .duel-speed-lines,#arena .duel-result-banner,#arena .duel-impact-ring,#arena .duel-impact-slash,#arena .duel-spark,#arena .duel-versus-core,#arena .duel-versus-core span,#arena .duel-live-status i,#arena .duel-energy i{animation-duration:.01ms!important;animation-delay:0ms!important;animation-iteration-count:1!important}}
    `;
    document.head.appendChild(style);
  }

  const DUEL_TIMING_DEFAULTS = { animationMs: 1400, winnerMs: 1000 };
  const DUEL_TIMING_LIMITS = {
    animationMs: { min: 600, max: 4000, step: 100 },
    winnerMs: { min: 500, max: 5000, step: 250 }
  };
  const DUEL_TIMING_STORAGE_KEY = 'cosplayChessDuelTiming';

  function boundedTiming(value, key) {
    const limit = DUEL_TIMING_LIMITS[key];
    const number = Number(value);
    if (!limit || !Number.isFinite(number)) return DUEL_TIMING_DEFAULTS[key];
    return Math.min(limit.max, Math.max(limit.min, Math.round(number / limit.step) * limit.step));
  }

  function storedDuelTiming() {
    let local = {};
    try { local = JSON.parse(localStorage.getItem(DUEL_TIMING_STORAGE_KEY) || '{}') || {}; } catch (_) {}
    let game = {};
    try { game = store?.g || {}; } catch (_) {}
    return {
      animationMs: boundedTiming(game.duelAnimationMs ?? local.animationMs, 'animationMs'),
      winnerMs: boundedTiming(game.duelWinnerMs ?? local.winnerMs, 'winnerMs')
    };
  }

  function timingLabel(milliseconds) {
    return `${(milliseconds / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} s`;
  }

  function applyDuelTimingVariables(arena, timing = storedDuelTiming()) {
    if (!arena) return timing;
    const animation = timing.animationMs;
    const winner = timing.winnerMs;
    const values = {
      '--duel-animation-duration': animation,
      '--duel-trail-duration': Math.round(animation * .43),
      '--duel-trail-delay': Math.round(animation * .22),
      '--duel-ring-duration': Math.round(animation * .54),
      '--duel-impact-delay': Math.round(animation * .36),
      '--duel-slash-duration': Math.round(animation * .46),
      '--duel-slash-delay': Math.round(animation * .31),
      '--duel-spark-duration': Math.round(animation * .52),
      '--duel-camera-duration': Math.min(520, Math.max(240, Math.round(animation * .26))),
      '--duel-result-delay': animation,
      '--duel-result-reveal-duration': Math.min(420, Math.max(180, Math.round(winner * .35)))
    };
    Object.entries(values).forEach(([name, value]) => arena.style.setProperty(name, `${value}ms`));
    return timing;
  }

  function syncDuelTimingControls(timing = storedDuelTiming()) {
    document.querySelectorAll('[data-duel-timing]').forEach(input => {
      const key = input.dataset.duelTiming === 'winner' ? 'winnerMs' : 'animationMs';
      input.value = String(timing[key]);
      const value = input.closest('.duel-timing-control')?.querySelector('[data-duel-timing-value]');
      if (value) value.textContent = timingLabel(timing[key]);
    });
    applyDuelTimingVariables(document.getElementById('arena'), timing);
  }

  function persistDuelTiming(key, value) {
    const timing = storedDuelTiming();
    timing[key] = boundedTiming(value, key);
    try {
      if (!store.g) store.g = {};
      store.g.duelAnimationMs = timing.animationMs;
      store.g.duelWinnerMs = timing.winnerMs;
    } catch (_) {}
    try { localStorage.setItem(DUEL_TIMING_STORAGE_KEY, JSON.stringify(timing)); } catch (_) {}
    syncDuelTimingControls(timing);
    clearTimeout(persistDuelTiming.timer);
    persistDuelTiming.timer = setTimeout(() => { try { save(); } catch (_) {} }, 120);
  }

  function duelTimingCard(id, compact = false) {
    const card = document.createElement('div');
    card.id = id;
    card.className = `${compact ? 'unit-card ' : ''}duel-timing-card`;
    card.innerHTML = `
      <div class="duel-timing-heading">
        <div><small>TEMPO DO DUELO</small><strong>Animação e resultado</strong></div><span aria-hidden="true">⏱</span>
      </div>
      <div class="duel-timing-grid">
        <label class="duel-timing-control"><span>ATAQUE <b data-duel-timing-value></b></span><input data-duel-timing="animation" type="range" min="600" max="4000" step="100" aria-label="Duração da animação de ataque"></label>
        <label class="duel-timing-control"><span>VENCEDOR <b data-duel-timing-value></b></span><input data-duel-timing="winner" type="range" min="500" max="5000" step="250" aria-label="Tempo de exibição do vencedor"></label>
      </div>
      <p class="duel-timing-help">Ataque controla o golpe completo. Vencedor define quanto tempo o resultado fica na tela.</p>`;
    card.querySelectorAll('[data-duel-timing]').forEach(input => {
      input.addEventListener('input', () => {
        const key = input.dataset.duelTiming === 'winner' ? 'winnerMs' : 'animationMs';
        persistDuelTiming(key, input.value);
      });
    });
    return card;
  }

  function installDuelTimingSettings() {
    const settings = document.getElementById('start-menu-settings-content');
    if (settings && !document.getElementById('duel-timing-settings')) {
      const card = duelTimingCard('duel-timing-settings');
      const back = settings.querySelector('.btn-back');
      if (back) settings.insertBefore(card, back);
      else settings.appendChild(card);
    }

    const system = document.getElementById('list-sys');
    if (system && !document.getElementById('duel-timing-system')) {
      const card = duelTimingCard('duel-timing-system', true);
      const zoomCard = document.getElementById('board-zoom')?.closest('.unit-card');
      if (zoomCard) zoomCard.insertAdjacentElement('afterend', card);
      else system.prepend(card);
    }
    syncDuelTimingControls();
  }

  const PIECE_SETTINGS_ORDER = ['T1', 'C1', 'B1', 'Q1', 'K1', 'B2', 'C2', 'T2', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
  const pieceSettingsState = {
    white: { query: '', filter: 'all' },
    black: { query: '', filter: 'all' }
  };
  const expandedPieceSettings = new Set();
  const observedSettingsLists = new WeakSet();

  function pieceSettingsInfo(id) {
    let piece = {};
    try { piece = store?.p?.[id] || {}; } catch (_) {}
    const assigned = Boolean(piece.participantId || piece.participantRealName || piece.participant?.name);
    const photo = Boolean(piece.img);
    const audio = Boolean(piece.sound);
    return {
      id,
      assigned,
      photo,
      audio,
      searchable: [id, piece.name, piece.participantRealName, piece.participant?.name, piece.participant?.character]
        .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR')
    };
  }

  function applyPieceSettingsFilter(side) {
    const container = document.getElementById(`list-${side}`);
    if (!container) return;
    const state = pieceSettingsState[side];
    const query = state.query.trim().toLocaleLowerCase('pt-BR');
    let visible = 0;
    container.querySelectorAll('.cc-piece-card').forEach(card => {
      const matchesQuery = !query || String(card.dataset.search || '').includes(query);
      const matchesFilter = state.filter === 'all'
        || (state.filter === 'assigned' && card.dataset.assigned === 'true')
        || (state.filter === 'photo' && card.dataset.photo === 'false')
        || (state.filter === 'audio' && card.dataset.audio === 'false');
      card.hidden = !(matchesQuery && matchesFilter) || card.dataset.layoutHidden === 'true';
      if (!card.hidden) visible += 1;
    });
    container.querySelector('.cc-piece-no-results')?.classList.toggle('show', visible === 0);
    const visibleLabel = container.querySelector('[data-cc-visible-count]');
    if (visibleLabel) visibleLabel.textContent = String(visible);
  }

  function decoratePieceSettingsList(side) {
    const container = document.getElementById(`list-${side}`);
    if (!container || container.dataset.ccDecorating === '1') return;
    if (container.querySelector('.cc-piece-workspace-head')) {
      applyPieceSettingsFilter(side);
      return;
    }
    container.dataset.ccDecorating = '1';
    try {
      const team = side === 'white' ? 'B' : 'P';
      const cards = Array.from(container.children).filter(child => child.classList.contains('unit-card'));
      const info = cards.map((card, index) => ({ card, data: pieceSettingsInfo(`${PIECE_SETTINGS_ORDER[index] || `P${index + 1}`}_${team}`) }));
      const activeInfo = info.filter(item => item.card.style.display !== 'none');
      const stats = {
        assigned: activeInfo.filter(item => item.data.assigned).length,
        photo: activeInfo.filter(item => item.data.photo).length,
        audio: activeInfo.filter(item => item.data.audio).length
      };
      const origin = Array.from(container.children).find(child => !child.classList.contains('unit-card'));
      origin?.classList.add('cc-piece-origin-header');

      const head = document.createElement('div');
      head.className = 'cc-piece-workspace-head';
      head.innerHTML = `
        <div class="cc-piece-title-row">
          <div><small>CONFIGURAÇÃO DAS PEÇAS</small><h3>${side === 'white' ? 'Brancas' : 'Pretas'}</h3></div>
          <div class="cc-piece-count"><b data-cc-visible-count>${activeInfo.length}</b> de ${activeInfo.length}</div>
        </div>
        <div class="cc-piece-stats">
          <div><b>${stats.assigned}</b><span>ESCALADAS</span></div>
          <div><b>${stats.photo}</b><span>COM FOTO</span></div>
          <div><b>${stats.audio}</b><span>COM ÁUDIO</span></div>
        </div>
        <label class="cc-piece-search"><span>⌕</span><input type="search" placeholder="Buscar personagem, cosplayer ou peça..." value="${esc(pieceSettingsState[side].query)}" aria-label="Buscar peças ${side === 'white' ? 'brancas' : 'pretas'}"></label>
        <div class="cc-piece-filter-row" role="group" aria-label="Filtrar peças">
          <button class="cc-piece-filter" data-filter="all">TODAS</button>
          <button class="cc-piece-filter" data-filter="assigned">ESCALADAS</button>
          <button class="cc-piece-filter" data-filter="photo">SEM FOTO</button>
          <button class="cc-piece-filter" data-filter="audio">SEM ÁUDIO</button>
        </div>`;
      head.querySelector('.cc-piece-search input')?.addEventListener('input', event => {
        pieceSettingsState[side].query = event.target.value;
        applyPieceSettingsFilter(side);
      });
      head.querySelectorAll('.cc-piece-filter').forEach(button => {
        button.classList.toggle('active', button.dataset.filter === pieceSettingsState[side].filter);
        button.addEventListener('click', () => {
          pieceSettingsState[side].filter = button.dataset.filter || 'all';
          head.querySelectorAll('.cc-piece-filter').forEach(item => item.classList.toggle('active', item === button));
          applyPieceSettingsFilter(side);
        });
      });

      const grid = document.createElement('div');
      grid.className = 'cc-piece-settings-grid';
      info.forEach(({ card, data }) => {
        card.classList.add('cc-piece-card');
        card.dataset.pieceId = data.id;
        card.dataset.assigned = String(data.assigned);
        card.dataset.photo = String(data.photo);
        card.dataset.audio = String(data.audio);
        card.dataset.search = data.searchable;
        card.dataset.layoutHidden = String(card.style.display === 'none');
        const children = Array.from(card.children);
        const cardHead = children.shift();
        if (cardHead) {
          cardHead.classList.add('cc-piece-card-head');
          cardHead.children[0]?.classList.add('cc-piece-photo');
          cardHead.children[1]?.classList.add('cc-piece-main');
          const state = document.createElement('div');
          state.className = 'cc-piece-state';
          state.innerHTML = `<span class="${data.assigned ? 'ok' : ''}" title="${data.assigned ? 'Participante escalado' : 'Sem participante'}">♟</span><span class="${data.photo ? 'ok' : ''}" title="${data.photo ? 'Foto configurada' : 'Sem foto'}">▣</span><span class="${data.audio ? 'ok' : ''}" title="${data.audio ? 'Áudio configurado' : 'Sem áudio'}">♪</span>`;
          const expand = document.createElement('button');
          expand.type = 'button';
          expand.className = 'cc-piece-expand';
          expand.textContent = '⌄';
          expand.title = 'Abrir ajustes da peça';
          expand.setAttribute('aria-label', `Abrir ajustes de ${data.id}`);
          expand.addEventListener('click', () => {
            const open = card.classList.toggle('expanded');
            if (open) expandedPieceSettings.add(data.id); else expandedPieceSettings.delete(data.id);
            expand.setAttribute('aria-expanded', String(open));
          });
          cardHead.append(state, expand);
        }
        const details = document.createElement('div');
        details.className = 'cc-piece-details';
        const detailsInner = document.createElement('div');
        detailsInner.className = 'cc-piece-details-inner';
        children.forEach(child => detailsInner.appendChild(child));
        details.appendChild(detailsInner);
        card.appendChild(details);
        if (expandedPieceSettings.has(data.id)) card.classList.add('expanded');
        card.querySelector('.cc-piece-expand')?.setAttribute('aria-expanded', String(card.classList.contains('expanded')));
        grid.appendChild(card);
      });
      const empty = document.createElement('div');
      empty.className = 'cc-piece-no-results';
      empty.textContent = 'Nenhuma peça encontrada com esse filtro.';
      container.prepend(head);
      container.append(grid, empty);
      applyPieceSettingsFilter(side);
    } finally {
      delete container.dataset.ccDecorating;
    }
  }

  function observeSettingsList(id, callback) {
    const target = document.getElementById(id);
    if (!target || observedSettingsLists.has(target)) return;
    observedSettingsLists.add(target);
    let scheduled = false;
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => { scheduled = false; callback(); }, 0);
    }).observe(target, { childList: true });
  }

  function decorateSidebarShell() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.add('cc-settings-drawer');
    const header = sidebar.firstElementChild;
    if (header && !header.classList.contains('cc-control-header')) {
      header.classList.add('cc-control-header');
      const title = header.querySelector('h2');
      if (title) title.textContent = 'Central da partida';
      const kicker = document.createElement('div');
      kicker.className = 'cc-control-kicker';
      kicker.textContent = 'COSPLAY CHESS · CONTROLE';
      header.prepend(kicker);
      const subtitle = document.createElement('p');
      subtitle.className = 'cc-control-subtitle';
      subtitle.textContent = 'Organize o elenco, ajuste as peças e controle a operação do jogo.';
      title?.insertAdjacentElement('afterend', subtitle);
      const toggles = header.querySelector('div:not(.cc-control-kicker)');
      toggles?.classList.add('cc-mode-toggles');
      toggles?.querySelectorAll('label').forEach(label => label.classList.add('cc-mode-toggle'));
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'cc-drawer-close';
      close.textContent = '×';
      close.title = 'Fechar configurações';
      close.addEventListener('click', () => { if (sidebar.classList.contains('open')) window.toggleMenu?.(); });
      header.appendChild(close);
    }
    const tabContent = {
      white: ['♙', 'BRANCAS'],
      black: ['♟', 'PRETAS'],
      log: ['≡', 'HISTÓRICO'],
      sys: ['⚙', 'SISTEMA']
    };
    Object.entries(tabContent).forEach(([id, value]) => {
      const button = document.getElementById(`t-${id}`);
      if (button && !button.querySelector('b')) button.innerHTML = `<span>${value[0]}</span><b>${value[1]}</b>`;
    });
    sidebar.lastElementChild?.classList.add('cc-sidebar-footer');

    if (!sidebar.__ccOpenObserver) {
      sidebar.__ccOpenObserver = new MutationObserver(() => document.body.classList.toggle('cc-settings-open', sidebar.classList.contains('open')));
      sidebar.__ccOpenObserver.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function decorateSystemSettings() {
    const system = document.getElementById('list-sys');
    if (!system) return;
    if (!system.querySelector('.cc-system-head')) {
      const head = document.createElement('div');
      head.className = 'cc-system-head';
      head.innerHTML = '<small>OPERAÇÃO DO JOGO</small><h3>Sistema e partida</h3><p>Áudio, tabuleiro, dados e comandos gerais organizados em um só lugar.</p>';
      system.prepend(head);
    }
    system.querySelectorAll('.unit-card').forEach(card => card.classList.add('cc-system-card'));
    let danger = system.querySelector('.cc-danger-zone');
    if (!danger) {
      const dangerous = Array.from(system.querySelectorAll(':scope > button')).filter(button => /clearBoardPieces|resetGame|exitCosplayChess/.test(button.getAttribute('onclick') || '') || button.id === 'game-exit-btn-system');
      if (dangerous.length) {
        danger = document.createElement('div');
        danger.className = 'cc-danger-zone';
        danger.innerHTML = '<small>ÁREA DE CONTROLE CRÍTICO</small>';
        dangerous.forEach(button => danger.appendChild(button));
        system.appendChild(danger);
      }
    }
  }

  function decorateLogSettings() {
    const log = document.getElementById('list-log');
    if (!log || log.querySelector('.cc-log-head')) return;
    const head = document.createElement('div');
    head.className = 'cc-log-head';
    head.innerHTML = '<small>REGISTRO DA PARTIDA</small><h3>Histórico de jogadas</h3><p>As ações mais recentes aparecem primeiro.</p>';
    log.prepend(head);
  }

  function decorateStartSettings() {
    const settings = document.getElementById('start-menu-settings-content');
    if (!settings) return;
    const header = settings.querySelector('.settings-v3-header');
    if (header) {
      const title = header.querySelector('h2');
      const description = header.querySelector('p');
      if (title) title.textContent = 'Central da partida';
      if (description) description.textContent = 'Defina visual, regras, duelo e elenco antes de abrir o tabuleiro.';
    }
    const timing = storedDuelTiming();
    const rosterCount = (() => { try { return Array.isArray(store?.g?.roster) ? store.g.roster.length : 0; } catch (_) { return 0; } })();
    const formation = (() => { try { return store?.g?.layoutPieceCount || store?.g?.appliedLayout || 32; } catch (_) { return 32; } })();
    let overview = settings.querySelector('.cc-settings-overview');
    if (!overview) {
      overview = document.createElement('div');
      overview.className = 'cc-settings-overview';
      (header || settings.firstElementChild)?.insertAdjacentElement('afterend', overview);
    }
    overview.innerHTML = `<div class="cc-overview-stat"><span>FORMAÇÃO</span><b>${formation} peças</b></div><div class="cc-overview-stat"><span>ELENCO IMPORTADO</span><b>${rosterCount} inscritos</b></div><div class="cc-overview-stat"><span>TEMPO DO DUELO</span><b>${timingLabel(timing.animationMs + timing.winnerMs)}</b></div>`;

    const visual = settings.querySelector('.menu-section-title');
    const match = document.getElementById('opponent-select')?.closest('.start-config-row');
    const duel = document.getElementById('duel-timing-settings');
    const rosterCard = document.getElementById('json-data-settings') || document.getElementById('auto-lineup-card');
    const targets = [
      ['VISUAL', visual],
      ['PARTIDA', match],
      ['DUELO', duel],
      ['ELENCO', rosterCard]
    ].filter(item => item[1]);
    targets.forEach(([label, target], index) => {
      target.id ||= `cc-settings-section-${index}`;
      target.style.scrollMarginTop = '105px';
    });
    if (!settings.querySelector('.cc-settings-jumps') && targets.length) {
      const jumps = document.createElement('div');
      jumps.className = 'cc-settings-jumps';
      targets.forEach(([label, target]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', () => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        jumps.appendChild(button);
      });
      overview.insertAdjacentElement('afterend', jumps);
    }
  }

  function installSettingsWorkspace() {
    decorateSidebarShell();
    decorateStartSettings();
    decoratePieceSettingsList('white');
    decoratePieceSettingsList('black');
    decorateSystemSettings();
    decorateLogSettings();
    observeSettingsList('list-white', () => decoratePieceSettingsList('white'));
    observeSettingsList('list-black', () => decoratePieceSettingsList('black'));
    observeSettingsList('list-sys', decorateSystemSettings);
    observeSettingsList('list-log', decorateLogSettings);
  }

  function ensureMoveBanner() {
    let banner = document.getElementById('move-name-banner');
    if (banner) return banner;
    banner = document.createElement('div');
    banner.id = 'move-name-banner';
    banner.setAttribute('aria-live', 'polite');
    document.body.appendChild(banner);
    return banner;
  }

  function showMoveBanner(meta) {
    if (!meta) return;
    const banner = ensureMoveBanner();
    const actor = meta.character || meta.piece;
    const cosplayer = meta.cosplayer ? ` · Cosplayer: ${esc(meta.cosplayer)}` : '';
    banner.innerHTML = `
      <small>ÚLTIMA JOGADA · ${esc(meta.player)} · ${esc(meta.sideLabel)}</small>
      <strong>${esc(meta.label)}</strong>
      <span>${esc(actor)} · ${esc(meta.piece)} · ${esc(meta.notation)}${cosplayer}</span>`;
    banner.classList.remove('show');
    void banner.offsetWidth;
    banner.classList.add('show');
    clearTimeout(showMoveBanner.timer);
    showMoveBanner.timer = setTimeout(() => banner.classList.remove('show'), 5200);
  }

  function persistLastMove(meta) {
    if (!meta) return;
    try {
      if (!store.g) store.g = {};
      store.g.lastMoveDisplay = {
        label: meta.label,
        notation: meta.notation,
        piece: meta.piece,
        character: meta.character,
        cosplayer: meta.cosplayer,
        side: meta.side,
        sideLabel: meta.sideLabel,
        player: meta.player,
        at: new Date().toISOString()
      };
    } catch (_) {}
  }

  function installMoveNaming() {
    const baseAddLogEntry = window.addLogEntry;
    if (typeof baseAddLogEntry === 'function' && !baseAddLogEntry.__cosplayMoveNamingWrapped) {
      const wrappedAddLog = function(message) {
        let finalMessage = message;
        const plain = String(message || '').replace(/<[^>]*>/g, '');
        if (activeMoveMeta && /movimentou|moveu/i.test(plain)) {
          const m = activeMoveMeta;
          const actor = m.character || m.piece;
          const cosplayer = m.cosplayer ? ` · ${esc(m.cosplayer)}` : '';
          finalMessage = `<span class="move-log-tag">${esc(m.label)}</span><b>${esc(m.player)} · ${esc(m.sideLabel)}</b> — <b>${esc(actor)}</b> <span>(${esc(m.piece)}${cosplayer})</span> <b>${esc(m.notation)}</b>`;
        } else if (/^\[LIVRE\]/i.test(plain)) {
          finalMessage = `<span class="move-log-tag">MOVIMENTO LIVRE</span>${String(message).replace(/^\[LIVRE\]\s*/i, '')}`;
        }
        return baseAddLogEntry.call(this, finalMessage);
      };
      wrappedAddLog.__cosplayMoveNamingWrapped = true;
      window.addLogEntry = wrappedAddLog;
    }

    const baseExecuteMove = window.executeMove;
    if (typeof baseExecuteMove === 'function' && !baseExecuteMove.__cosplayMoveNamingWrapped) {
      const wrappedExecuteMove = function(from, to, opts) {
        const meta = describeMove(from, to);
        activeMoveMeta = meta;
        persistLastMove(meta);
        try {
          return baseExecuteMove.call(this, from, to, opts);
        } finally {
          activeMoveMeta = null;
          if (meta) showMoveBanner(meta);
        }
      };
      wrappedExecuteMove.__cosplayMoveNamingWrapped = true;
      window.executeMove = wrappedExecuteMove;
    }
  }

  function fighterInfo(id, role, shortcut) {
    const info = pieceInfo(id);
    return info ? { ...info, role, shortcut } : null;
  }

  function renderFighter(fighter, image, info) {
    if (!fighter || !image || !info) return;
    fighter.classList.remove('duel-side-B', 'duel-side-P');
    fighter.classList.add(`duel-side-${info.side}`);
    fighter.dataset.duelSide = info.side;
    fighter.dataset.duelCharacter = info.character;
    fighter.dataset.duelPiece = info.piece;
    image.dataset.sideLabel = `${info.player} · ${info.sideLabel}`;
    image.setAttribute('aria-label', `${info.character}, ${info.piece}, ${info.sideLabel}`);

    if (info.image) {
      image.style.display = 'block';
      image.style.backgroundColor = '#0d0c11';
      image.style.color = '#fff';
      image.style.fontSize = '';
      image.style.alignItems = '';
      image.style.justifyContent = '';
    }

    let meta = fighter.querySelector('.duel-fighter-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'duel-fighter-meta';
      image.insertAdjacentElement('afterend', meta);
    }
    meta.innerHTML = `
      <div class="duel-role"><span>${esc(info.role)}</span><b>${esc(info.player)} · ${esc(info.sideLabel)}</b></div>
      <h3>${esc(info.character)}</h3>
      <div class="duel-piece-line">${esc(info.piece)} · ${esc(info.id)}</div>
      ${info.cosplayer ? `<div class="duel-cosplayer">Cosplayer: <b>${esc(info.cosplayer)}</b></div>` : ''}
      <div class="duel-energy" aria-hidden="true"><i></i></div>`;

    const victoryButton = Array.from(fighter.querySelectorAll('button')).find(button => /VITÓRIA/i.test(button.textContent || ''));
    if (victoryButton) {
      victoryButton.removeAttribute('onclick');
      victoryButton.onclick = () => window.finishDuel(info.side);
      victoryButton.classList.add('duel-victory-btn');
      victoryButton.textContent = `VITÓRIA · ${info.sideLabel}`;
      victoryButton.title = `${info.character} (${info.piece} · ${info.sideLabel}) vence o duelo`;
      let shortcut = fighter.querySelector('.duel-shortcut');
      if (!shortcut) {
        shortcut = document.createElement('small');
        shortcut.className = 'duel-shortcut';
        victoryButton.insertAdjacentElement('afterend', shortcut);
      }
      shortcut.textContent = `ATALHO: TECLA ${info.shortcut}`;
    }
  }

  function ensureDuelEffects(content) {
    let layer = content.querySelector('.duel-impact-layer');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.className = 'duel-impact-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `
      <i class="duel-impact-flash"></i>
      <i class="duel-speed-lines"></i>
      <i class="duel-impact-ring"></i>
      <i class="duel-impact-slash"></i>
      ${[-72, -38, -8, 24, 58, 92, 126, 160].map((angle, index) => `<i class="duel-spark" style="--angle:${angle}deg;--delay:${(index % 3) * .025}s"></i>`).join('')}
      <div class="duel-result-banner"><small>VITÓRIA</small><strong class="duel-result-name"></strong><span class="duel-result-detail"></span></div>`;
    content.appendChild(layer);
    return layer;
  }

  function prepareDuelAnimation(arena, content, fighterA, fighterD) {
    arena.classList.remove('duel-resolving', 'duel-cinematic', 'duel-charging', 'duel-striking', 'duel-impact-now', 'duel-left-wins', 'duel-right-wins');
    [fighterA, fighterD].forEach(fighter => {
      fighter.classList.remove('duel-enter-left', 'duel-enter-right', 'duel-attack-left', 'duel-attack-right', 'duel-hit-left', 'duel-hit-right', 'duel-winner', 'duel-loser');
      fighter.querySelectorAll('button').forEach(button => { button.disabled = false; });
    });
    const layer = ensureDuelEffects(content);
    layer.classList.remove('active');
    const status = content.querySelector('.duel-live-status span');
    if (status) status.textContent = 'AGUARDANDO RESULTADO';
    void content.offsetWidth;
    fighterA.classList.add('duel-enter-left');
    fighterD.classList.add('duel-enter-right');
    setTimeout(() => {
      fighterA.classList.remove('duel-enter-left');
      fighterD.classList.remove('duel-enter-right');
    }, 700);
  }

  function animateDuelOutcome(side, done) {
    const arena = document.getElementById('arena');
    const content = arena?.querySelector('.arena-content');
    const imageA = document.getElementById('a-img');
    const imageD = document.getElementById('d-img');
    const fighterA = imageA?.closest('.fighter');
    const fighterD = imageD?.closest('.fighter');
    if (!arena || !content || !fighterA || !fighterD) return false;
    if (arena.classList.contains('duel-resolving')) return true;

    const leftWon = side === arena.dataset.leftSide;
    const winner = leftWon ? fighterA : fighterD;
    const loser = leftWon ? fighterD : fighterA;
    const winnerName = winner.dataset.duelCharacter || (leftWon ? 'ATACANTE' : 'DEFENSOR');
    const winnerDetail = `${winner.dataset.duelPiece || 'PEÇA'} · ${winner.dataset.duelSide === 'B' ? 'BRANCAS' : 'PRETAS'}`;
    const timing = applyDuelTimingVariables(arena);
    arena.classList.add('duel-resolving', 'duel-cinematic', 'duel-charging', leftWon ? 'duel-left-wins' : 'duel-right-wins');
    winner.classList.add('duel-winner');
    loser.classList.add('duel-loser');
    content.querySelectorAll('button').forEach(button => { button.disabled = true; });
    const status = content.querySelector('.duel-live-status span');
    if (status) status.textContent = 'CARREGANDO GOLPE';

    winner.classList.add(leftWon ? 'duel-attack-left' : 'duel-attack-right');
    loser.classList.add(leftWon ? 'duel-hit-right' : 'duel-hit-left');
    const layer = ensureDuelEffects(content);
    const resultName = layer.querySelector('.duel-result-name');
    const resultDetail = layer.querySelector('.duel-result-detail');
    if (resultName) resultName.textContent = winnerName;
    if (resultDetail) resultDetail.textContent = winnerDetail;
    layer.classList.remove('active');
    void layer.offsetWidth;
    layer.classList.add('active');
    try { playUISound('click'); } catch (_) {}
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) {
      setTimeout(() => {
        arena.classList.add('duel-striking');
        if (status) status.textContent = leftWon ? 'ATAQUE DECISIVO' : 'CONTRA-ATAQUE DECISIVO';
      }, Math.round(timing.animationMs * .22));
      setTimeout(() => {
        arena.classList.add('duel-impact-now');
        try { playUISound('click'); } catch (_) {}
      }, Math.round(timing.animationMs * .46));
      setTimeout(() => {
        if (status) status.textContent = `VITÓRIA · ${winnerName}`;
      }, timing.animationMs);
    } else if (status) {
      status.textContent = `VITÓRIA · ${winnerName}`;
    }
    const duration = reducedMotion ? timing.winnerMs : timing.animationMs + timing.winnerMs;
    setTimeout(done, duration);
    return true;
  }

  function decorateArena() {
    let idA = null;
    let idD = null;
    let from = null;
    let to = null;
    try {
      if (!pending) return;
      from = pending.f;
      to = pending.t;
      idA = store?.board?.[from] || null;
      idD = store?.board?.[to] || null;
    } catch (_) { return; }
    if (!idA || !idD) return;

    const arena = document.getElementById('arena');
    const content = arena?.querySelector('.arena-content');
    const fighters = content?.querySelector('.arena-fighters');
    const imageA = document.getElementById('a-img');
    const imageD = document.getElementById('d-img');
    const fighterA = imageA?.closest('.fighter');
    const fighterD = imageD?.closest('.fighter');
    if (!arena || !content || !fighters || !fighterA || !fighterD) return;

    content.classList.add('duel-v2');
    const cancelRow = Array.from(content.children).find(child => child !== fighters && child.matches?.('div') && child.querySelector?.('button[onclick*="closeArena"]'));
    cancelRow?.classList.add('duel-cancel-row');
    const attack = fighterInfo(idA, 'ATACANTE', '1');
    const defense = fighterInfo(idD, 'DEFENSOR', '2');
    renderFighter(fighterA, imageA, attack);
    renderFighter(fighterD, imageD, defense);

    let header = content.querySelector('.duel-arena-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'duel-arena-header';
      content.prepend(header);
    }
    header.innerHTML = `
      <small>DUELO DE CAPTURA</small>
      <h2>${esc(attack.character)} <span style="color:#6e6671">vs</span> ${esc(defense.character)}</h2>
      <p>${esc(attack.player)} · ${esc(attack.sideLabel)} ataca de <b>${coord(from)}</b> para <b>${coord(to)}</b>. Escolha o vencedor real do confronto.</p>
      <div class="duel-live-status"><i></i><span>AGUARDANDO RESULTADO</span></div>`;

    const center = fighters.children[1];
    if (center) {
      center.className = 'duel-versus-core';
      center.removeAttribute('style');
      center.innerHTML = `<span>⚔️</span><b>VS</b><small>${coord(from)} → ${coord(to)}</small>`;
    }

    arena.dataset.leftSide = attack.side;
    arena.dataset.rightSide = defense.side;
    arena.setAttribute('aria-label', `Duelo entre ${attack.character}, ${attack.sideLabel}, e ${defense.character}, ${defense.sideLabel}`);
    prepareDuelAnimation(arena, content, fighterA, fighterD);
  }

  function installArenaUpgrade() {
    const baseOpenArena = window.openArena;
    if (typeof baseOpenArena === 'function' && !baseOpenArena.__cosplayDuelWrapped) {
      const wrappedOpenArena = function(...args) {
        const result = baseOpenArena.apply(this, args);
        requestAnimationFrame(decorateArena);
        return result;
      };
      wrappedOpenArena.__cosplayDuelWrapped = true;
      window.openArena = wrappedOpenArena;
    }

    const baseFinishDuel = window.finishDuel;
    if (typeof baseFinishDuel === 'function' && !baseFinishDuel.__cosplayDuelWrapped) {
      const wrappedFinishDuel = function(side) {
        let attacker = null;
        let defender = null;
        try {
          attacker = pieceInfo(store?.board?.[pending?.f]);
          defender = pieceInfo(store?.board?.[pending?.t]);
        } catch (_) {}
        const defenderWon = attacker && defender && side === defender.side;
        const from = pending?.f;
        const to = pending?.t;
        const finish = () => {
          const result = baseFinishDuel.call(this, side);
          if (defenderWon) {
            const meta = {
              ...defender,
              label: 'DEFESA BEM-SUCEDIDA',
              notation: `${coord(to)} defendeu ${coord(from)}`
            };
            persistLastMove(meta);
            showMoveBanner(meta);
          }
          return result;
        };
        if (!animateDuelOutcome(side, finish)) return finish();
        return undefined;
      };
      wrappedFinishDuel.__cosplayDuelWrapped = true;
      window.finishDuel = wrappedFinishDuel;
    }

    window.addEventListener('keydown', event => {
      const arena = document.getElementById('arena');
      if (!arena || getComputedStyle(arena).display === 'none') return;
      if (arena.classList.contains('duel-resolving')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      if (!['1', '2'].includes(event.key)) return;
      const side = event.key === '1' ? arena.dataset.leftSide : arena.dataset.rightSide;
      if (!side) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.finishDuel(side);
    }, true);
  }

  async function exitGame() {
    let live = false;
    try { live = typeof isLive !== 'undefined' && !!isLive; } catch (_) {}
    const question = live
      ? 'Há uma partida em andamento. Deseja sair do Cosplay Chess mesmo assim?'
      : 'Deseja sair do Cosplay Chess?';
    if (!window.confirm(question)) return;

    try {
      if (window.electronAPI?.quitApp) {
        await window.electronAPI.quitApp();
        return;
      }
    } catch (_) {}

    if (location.protocol === 'file:') {
      window.close();
      return;
    }

    if (/\/jogo(?:\/|$)/i.test(location.pathname)) {
      location.href = '../admin.html';
      return;
    }
    if (history.length > 1) history.back();
    else location.href = '../admin.html';
  }

  function installExitButtons() {
    window.exitCosplayChess = exitGame;
    const start = document.getElementById('main-start-options');
    if (start && !document.getElementById('game-exit-btn-start')) {
      const button = document.createElement('button');
      button.id = 'game-exit-btn-start';
      button.type = 'button';
      button.className = 'btn';
      button.textContent = 'SAIR DO JOGO';
      button.onclick = exitGame;
      start.appendChild(button);
    }

    const system = document.getElementById('list-sys');
    if (system && !document.getElementById('game-exit-btn-system')) {
      const button = document.createElement('button');
      button.id = 'game-exit-btn-system';
      button.type = 'button';
      button.className = 'btn';
      button.textContent = '⏻ SAIR DO JOGO';
      button.onclick = exitGame;
      system.appendChild(button);
    }
  }

  installStyles();
  installMoveNaming();
  installArenaUpgrade();
  installDuelTimingSettings();
  installSettingsWorkspace();
  installExitButtons();

  setTimeout(() => {
    installDuelTimingSettings();
    installSettingsWorkspace();
    installExitButtons();
    try {
      const last = store?.g?.lastMoveDisplay;
      if (last?.label && last?.notation) {
        const side = last.side === 'P' ? 'P' : 'B';
        showMoveBanner({
          ...last,
          side,
          sideLabel: last.sideLabel || SIDES[side].label,
          player: last.player || SIDES[side].player,
          piece: last.piece || 'PEÇA',
          character: last.character || last.piece || 'Peça',
          cosplayer: last.cosplayer || ''
        });
      }
    } catch (_) {}
  }, 900);
})();
