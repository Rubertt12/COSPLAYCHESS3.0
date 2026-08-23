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

      #move-name-banner{position:fixed;top:84px;left:50%;z-index:8500;transform:translate(-50%,-10px);width:min(620px,calc(100vw - 32px));padding:10px 15px;border:1px solid rgba(224,190,119,.38);border-radius:12px;background:linear-gradient(135deg,rgba(13,12,18,.96),rgba(31,21,25,.96));box-shadow:0 16px 45px rgba(0,0,0,.5);backdrop-filter:blur(10px);opacity:0;visibility:hidden;pointer-events:none;transition:.22s ease;text-align:center}
      #move-name-banner.show{opacity:1;visibility:visible;transform:translate(-50%,0)}
      #move-name-banner small{display:block;color:#9e929f;font-size:8px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase}
      #move-name-banner strong{display:block;color:#f0c978;font-family:Georgia,serif;font-size:17px;line-height:1.2;margin:3px 0}
      #move-name-banner span{display:block;color:#eee7ef;font-size:10px;line-height:1.35}
      .move-log-tag{display:inline-block;margin-right:5px;padding:2px 5px;border:1px solid rgba(224,190,119,.25);border-radius:5px;color:#e8be69;font-size:8px;font-weight:900;letter-spacing:.5px}

      #arena .arena-content.duel-v2{position:relative;width:min(1060px,95vw)!important;max-height:94vh;overflow:auto;padding:24px!important;border-radius:22px!important;border:1px solid rgba(224,190,119,.26)!important;background:radial-gradient(circle at 50% 5%,rgba(224,190,119,.09),transparent 34%),linear-gradient(160deg,#0e0c12,#08080c)!important;box-shadow:0 34px 110px rgba(0,0,0,.78)!important}
      #arena .duel-arena-header{text-align:center;margin:0 auto 20px;max-width:780px}
      #arena .duel-arena-header small{display:block;color:#c89e52;font-size:9px;font-weight:900;letter-spacing:2.4px;text-transform:uppercase}
      #arena .duel-arena-header h2{margin:5px 0 4px;color:#fff5df;font-family:Georgia,serif;font-size:clamp(24px,3vw,38px);font-weight:500}
      #arena .duel-arena-header p{margin:0;color:#847d89;font-size:10px;line-height:1.5}
      #arena .arena-fighters{display:grid!important;grid-template-columns:minmax(0,1fr) 90px minmax(0,1fr)!important;align-items:stretch!important;gap:16px!important;width:100%}
      #arena .fighter{position:relative;min-width:0;padding:15px;border-radius:18px;border:1px solid rgba(255,255,255,.09);overflow:hidden;display:flex;flex-direction:column;background:#101015}
      #arena .fighter.duel-side-B{background:linear-gradient(155deg,rgba(222,238,247,.12),rgba(13,17,22,.98));border-color:rgba(191,231,255,.42);box-shadow:inset 0 0 36px rgba(153,218,255,.04)}
      #arena .fighter.duel-side-P{background:linear-gradient(155deg,rgba(104,22,39,.22),rgba(10,9,12,.99));border-color:rgba(255,86,116,.37);box-shadow:inset 0 0 36px rgba(255,70,102,.035)}
      #arena .arena-box{position:relative!important;width:100%!important;height:auto!important;aspect-ratio:4/3!important;min-height:190px!important;max-height:340px!important;border-radius:14px!important;background-size:cover!important;background-position:center 18%!important;background-repeat:no-repeat!important;overflow:hidden!important;border-width:2px!important}
      #arena .fighter.duel-side-B .arena-box{border-color:#d9f3ff!important;box-shadow:0 14px 38px rgba(0,0,0,.38),0 0 0 1px rgba(207,240,255,.16)!important}
      #arena .fighter.duel-side-P .arena-box{border-color:#ff607d!important;box-shadow:0 14px 38px rgba(0,0,0,.42),0 0 0 1px rgba(255,96,125,.12)!important}
      #arena .arena-box[data-side-label]::after{content:attr(data-side-label);position:absolute;right:9px;bottom:8px;padding:5px 8px;border-radius:999px;background:rgba(0,0,0,.78);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:8px;font-weight:1000;letter-spacing:1.2px;box-shadow:0 4px 14px rgba(0,0,0,.35)}
      #arena .duel-fighter-meta{padding:12px 2px 5px;min-height:98px;text-align:left}
      #arena .duel-fighter-meta .duel-role{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:5px;color:#8c8490;font-size:8px;font-weight:900;letter-spacing:1px;text-transform:uppercase}
      #arena .duel-fighter-meta .duel-role b{color:#d8ac59}
      #arena .duel-fighter-meta h3{margin:0;color:#fff;font-family:Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.1;overflow-wrap:anywhere}
      #arena .duel-fighter-meta .duel-piece-line{margin-top:5px;color:#bdb4c0;font-size:9px;font-weight:800;letter-spacing:.7px}
      #arena .duel-fighter-meta .duel-cosplayer{margin-top:5px;color:#7d7581;font-size:9px;line-height:1.35}
      #arena .duel-victory-btn{margin-top:auto!important;width:100%!important;min-height:44px!important;font-size:10px!important;font-weight:1000!important;letter-spacing:1px!important;border-radius:10px!important}
      #arena .fighter.duel-side-B .duel-victory-btn{background:linear-gradient(135deg,#dff5ff,#9ed8ed)!important;color:#071117!important;border:1px solid #eefbff!important}
      #arena .fighter.duel-side-P .duel-victory-btn{background:linear-gradient(135deg,#9e253d,#e04864)!important;color:#fff!important;border:1px solid #ff7890!important}
      #arena .duel-versus-core{display:flex!important;flex-direction:column;align-items:center;justify-content:center!important;gap:2px;color:#5f5863!important;text-align:center}
      #arena .duel-versus-core span{font-size:30px;filter:drop-shadow(0 6px 14px rgba(0,0,0,.6))}
      #arena .duel-versus-core b{color:#d6ab5a;font-family:Georgia,serif;font-size:21px;letter-spacing:2px}
      #arena .duel-versus-core small{margin-top:5px;color:#7c7480;font-size:8px;line-height:1.35}
      #arena .arena-audio-btns{margin-top:4px!important}
      #arena .arena-sound-label{min-height:20px;margin-bottom:8px;color:#7f7783!important}
      #arena .duel-shortcut{display:block;margin-top:5px;color:#675f69;font-size:7px;text-align:center;letter-spacing:.6px}

      @media(max-width:760px){
        #move-name-banner{top:72px}
        #arena .arena-content.duel-v2{padding:16px!important}
        #arena .arena-fighters{grid-template-columns:1fr!important}
        #arena .duel-versus-core{min-height:62px!important}
        #arena .arena-box{min-height:220px!important;aspect-ratio:16/10!important}
      }
    `;
    document.head.appendChild(style);
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
      ${info.cosplayer ? `<div class="duel-cosplayer">Cosplayer: <b>${esc(info.cosplayer)}</b></div>` : ''}`;

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
      <p>${esc(attack.player)} · ${esc(attack.sideLabel)} ataca de <b>${coord(from)}</b> para <b>${coord(to)}</b>. Escolha o vencedor real do confronto.</p>`;

    const center = fighters.children[1];
    if (center) {
      center.className = 'duel-versus-core';
      center.removeAttribute('style');
      center.innerHTML = `<span>⚔️</span><b>VS</b><small>${coord(from)} → ${coord(to)}</small>`;
    }

    arena.dataset.leftSide = attack.side;
    arena.dataset.rightSide = defense.side;
    arena.setAttribute('aria-label', `Duelo entre ${attack.character}, ${attack.sideLabel}, e ${defense.character}, ${defense.sideLabel}`);
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
        const result = baseFinishDuel.call(this, side);
        if (defenderWon) {
          const meta = {
            ...defender,
            label: 'DEFESA BEM-SUCEDIDA',
            notation: `${coord(pending?.t)} defendeu ${coord(pending?.f)}`
          };
          persistLastMove(meta);
          showMoveBanner(meta);
        }
        return result;
      };
      wrappedFinishDuel.__cosplayDuelWrapped = true;
      window.finishDuel = wrappedFinishDuel;
    }

    window.addEventListener('keydown', event => {
      const arena = document.getElementById('arena');
      if (!arena || getComputedStyle(arena).display === 'none') return;
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
  installExitButtons();

  setTimeout(() => {
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
