(() => {
  if (window.__cosplayGameResultExportLoaded) return;
  window.__cosplayGameResultExportLoaded = true;

  const PIECE_LABELS = { P: 'Peão', T: 'Torre', C: 'Cavalo', B: 'Bispo', Q: 'Rainha', K: 'Rei' };
  const nowIso = () => new Date().toISOString();
  const runtime = () => store?.g?.matchRuntime || null;
  const playerNumber = side => side === 'B' ? 1 : 2;
  const sideLabel = side => side === 'B' ? 'Brancas' : side === 'P' ? 'Pretas' : 'Empate';
  const coord = index => {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i > 63) return '?';
    return String.fromCharCode(65 + (i % 8)) + (8 - Math.floor(i / 8));
  };
  const boardCoord = index => ({ row: Math.floor(Number(index) / 8), col: Number(index) % 8 });

  function playerName(side) {
    return document.getElementById(`name-${side}`)?.value?.trim() || (side === 'B' ? 'Jogador 1' : 'Jogador 2');
  }

  function persist() { try { save(); } catch (_) {} }
  function resultSyncConfig() {
    const sync = store?.g?.resultSync;
    if (!sync || typeof sync !== 'object' || !sync.endpoint || !sync.token) return null;
    return sync;
  }

  function newMatchId() {
    const eventId = String(store?.g?.rosterEvent?.id || 'local').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'local';
    const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `cc-${eventId}-${random}`;
  }

  function managedPieceIds() {
    return Object.keys(store?.p || {}).filter(id => store.p[id]?.participantId && /_[BP]$/.test(id));
  }

  function createPieceStats() {
    return Object.fromEntries(managedPieceIds().map(id => [id, { moves: 0, captures: 0 }]));
  }

  function pieceInfo(id) {
    if (!id) return null;
    const piece = store?.p?.[id] || {};
    const participant = piece.participant || {};
    const side = id.endsWith('_B') ? 'B' : 'P';
    return {
      id,
      registrationId: piece.participantId || participant.id || null,
      character: participant.character || piece.name || PIECE_LABELS[id.charAt(0)] || id,
      cosplayer: participant.name || piece.participantRealName || '',
      piece: PIECE_LABELS[id.charAt(0)] || id.charAt(0),
      pieceType: PIECE_LABELS[id.charAt(0)] || id.charAt(0),
      side,
      sideLabel: sideLabel(side),
      player: playerNumber(side),
      playerNumber: playerNumber(side)
    };
  }

  function describeMove(from, to) {
    const moverId = store?.board?.[from] || null;
    const targetId = store?.board?.[to] || null;
    if (!moverId) return null;
    const info = pieceInfo(moverId);
    const src = boardCoord(from);
    const dst = boardCoord(to);
    const dr = dst.row - src.row;
    const dc = dst.col - src.col;
    const type = moverId.charAt(0);
    const isCapture = !!targetId;
    const isEnPassant = type === 'P' && !targetId && Number(store?.g?.enPassant) === Number(to) && Math.abs(dc) === 1;
    const reachesPromotion = type === 'P' && (dst.row === 0 || dst.row === 7);
    let label = `MOVIMENTO DE ${(PIECE_LABELS[type] || 'PEÇA').toUpperCase()}`;

    if (type === 'K' && Math.abs(dc) === 2) label = dc > 0 ? 'ROQUE PEQUENO' : 'ROQUE GRANDE';
    else if (isEnPassant) label = 'EN PASSANT';
    else if (reachesPromotion) label = isCapture ? 'CAPTURA COM PROMOÇÃO' : 'PROMOÇÃO DE PEÃO';
    else if (type === 'P' && isCapture) label = 'CAPTURA DIAGONAL DE PEÃO';
    else if (type === 'P' && Math.abs(dr) === 2) label = 'AVANÇO DUPLO DE PEÃO';
    else if (type === 'P') label = 'AVANÇO DE PEÃO';
    else if (isCapture) label = `CAPTURA DE ${(PIECE_LABELS[type] || 'PEÇA').toUpperCase()}`;
    else if (type === 'C') label = 'SALTO DE CAVALO';
    else if (type === 'B') label = 'MOVIMENTO DIAGONAL DO BISPO';
    else if (type === 'T') label = 'MOVIMENTO DE TORRE';
    else if (type === 'Q') label = 'MOVIMENTO DA RAINHA';
    else if (type === 'K') label = 'MOVIMENTO DO REI';

    const capture = isCapture || isEnPassant;
    return {
      ...info,
      from,
      to,
      origin: coord(from),
      destination: coord(to),
      label,
      capture,
      notation: `${coord(from)} ${capture ? '×' : '→'} ${coord(to)}`,
      target: pieceInfo(targetId),
      recordedAt: nowIso()
    };
  }

  function startRuntime(force = false) {
    if (!store.g) store.g = {};
    const current = runtime();
    const lineupAt = Date.parse(store.g.autoLineupLastRun || '') || 0;
    const startedAt = Date.parse(current?.startedAt || '') || 0;
    if (!force && current?.status === 'active' && lineupAt <= startedAt) return current;

    store.g.matchRuntime = {
      matchId: newMatchId(),
      eventId: store.g.rosterEvent?.id || null,
      eventName: store.g.rosterEvent?.name || '',
      startedAt: nowIso(),
      finishedAt: null,
      status: 'active',
      winner: null,
      pieceStats: createPieceStats(),
      moveHistory: [],
      sync: { status: 'idle', attempts: 0, syncedAt: null, remoteMatchId: null, error: null }
    };
    persist();
    refreshResultButton();
    return store.g.matchRuntime;
  }

  function pieceStat(pieceId) {
    const rt = runtime();
    if (!rt || !pieceId) return null;
    if (!rt.pieceStats) rt.pieceStats = {};
    if (!rt.pieceStats[pieceId]) rt.pieceStats[pieceId] = { moves: 0, captures: 0 };
    return rt.pieceStats[pieceId];
  }

  function pushMoveHistory(meta) {
    const rt = runtime();
    if (!rt || !meta) return;
    if (!Array.isArray(rt.moveHistory)) rt.moveHistory = [];
    rt.moveHistory.push({ ...meta, moveNumber: rt.moveHistory.length + 1 });
  }

  function recordMove(pieceId, captured = false, moveMeta = null) {
    const stat = pieceStat(pieceId);
    if (!stat) return;
    stat.moves = (Number(stat.moves) || 0) + 1;
    if (captured) stat.captures = (Number(stat.captures) || 0) + 1;
    if (moveMeta) pushMoveHistory({ ...moveMeta, capture: !!(captured || moveMeta.capture) });
    persist();
  }

  function recordDuelDefense(defenderId, attackerId, attackerFrom, defenderAt) {
    const stat = pieceStat(defenderId);
    if (!stat) return;
    stat.captures = (Number(stat.captures) || 0) + 1;
    const defender = pieceInfo(defenderId);
    const attacker = pieceInfo(attackerId);
    pushMoveHistory({
      ...defender,
      from: defenderAt,
      to: attackerFrom,
      origin: coord(defenderAt),
      destination: coord(attackerFrom),
      label: 'DEFESA BEM-SUCEDIDA',
      capture: true,
      notation: `${coord(defenderAt)} defendeu o ataque de ${coord(attackerFrom)}`,
      target: attacker,
      recordedAt: nowIso()
    });
    persist();
  }

  function markWinner(winner) {
    if (!runtime()) startRuntime(false);
    const rt = runtime();
    if (!rt) return;
    rt.winner = winner;
    rt.finishedAt = rt.finishedAt || nowIso();
    rt.status = 'finished';
    persist();
    setTimeout(() => { installVictoryExportButton(); refreshResultButton(); }, 60);
    if (resultSyncConfig()) {
      clearTimeout(markWinner.syncTimer);
      markWinner.syncTimer = setTimeout(() => syncResult(false), 450);
    }
  }

  function buildParticipants(winner) {
    const rt = runtime() || {};
    const graveyard = new Set(Array.isArray(store?.graveyard) ? store.graveyard : []);
    return managedPieceIds().map(pieceId => {
      const piece = store.p[pieceId] || {};
      const person = piece.participant || {};
      const side = pieceId.endsWith('_B') ? 'B' : 'P';
      const stat = rt.pieceStats?.[pieceId] || {};
      return {
        registrationId: piece.participantId || person.id || null,
        name: person.name || piece.participantRealName || '',
        nick: person.nick || '',
        character: person.character || piece.name || person.name || '',
        pieceId,
        pieceType: PIECE_LABELS[pieceId.charAt(0)] || pieceId.charAt(0),
        side,
        sideName: sideLabel(side),
        player: playerNumber(side),
        winner: winner !== 'DRAW' && side === winner,
        died: graveyard.has(pieceId),
        survived: !graveyard.has(pieceId),
        captures: Number(stat.captures) || 0,
        moves: Number(stat.moves) || 0
      };
    });
  }

  function buildResultPayload() {
    const rt = runtime();
    if (!rt?.winner) throw new Error('A partida ainda não possui um vencedor registrado.');
    const winner = rt.winner;
    const finishedAt = rt.finishedAt || nowIso();
    const startedMs = Date.parse(rt.startedAt || '') || Date.now();
    const finishedMs = Date.parse(finishedAt) || Date.now();
    const p1 = playerName('B');
    const p2 = playerName('P');

    return {
      type: 'cosplaychess-result',
      version: 2,
      matchId: rt.matchId || newMatchId(),
      exportedAt: nowIso(),
      event: store.g.rosterEvent ? { ...store.g.rosterEvent } : { id: rt.eventId || null, name: rt.eventName || '' },
      match: {
        startedAt: rt.startedAt || null,
        finishedAt,
        durationSeconds: Math.max(0, Math.round((finishedMs - startedMs) / 1000)),
        label: 'Partida oficial'
      },
      players: {
        player1: { player: 1, side: 'B', sideName: 'Brancas', name: p1 },
        player2: { player: 2, side: 'P', sideName: 'Pretas', name: p2 }
      },
      winner: winner === 'DRAW'
        ? { player: null, side: 'DRAW', sideName: 'Empate', name: 'Empate' }
        : { player: playerNumber(winner), side: winner, sideName: sideLabel(winner), name: winner === 'B' ? p1 : p2 },
      participants: buildParticipants(winner),
      moves: Array.isArray(rt.moveHistory) ? rt.moveHistory.map(move => ({ ...move })) : [],
      totals: {
        player1Captures: Number(store.g.killsB) || 0,
        player2Captures: Number(store.g.killsP) || 0
      }
    };
  }

  function safeFilePart(value) {
    return String(value || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'evento';
  }

  function notify(message, error = false) {
    document.getElementById('match-result-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'match-result-toast';
    toast.textContent = message;
    toast.style.cssText = `position:fixed;right:20px;bottom:20px;z-index:22000;max-width:480px;padding:13px 16px;border-radius:11px;background:${error ? '#351018' : '#071f23'};border:1px solid ${error ? '#ff4f77' : 'var(--accent,#00e5ff)'};color:#fff;font-size:11px;line-height:1.45;box-shadow:0 18px 46px rgba(0,0,0,.62);`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5600);
  }

  function exportResult() {
    try {
      const payload = buildResultPayload();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CosplayChess_Resultado_${safeFilePart(payload.event?.name)}_${safeFilePart(payload.matchId)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('JSON de backup do resultado salvo. A sincronização automática é o fluxo principal.');
    } catch (error) {
      notify(error.message || 'Não foi possível exportar o backup do resultado.', true);
    }
  }

  async function syncResult(manual = true) {
    const rt = runtime();
    const cfg = resultSyncConfig();
    if (!rt?.winner) {
      if (manual) notify('A partida ainda não terminou.', true);
      return null;
    }
    if (!cfg) {
      if (manual) notify('Este elenco não possui sincronização automática. Exporte um JSON de elenco novo pelo painel do site.', true);
      return null;
    }
    if (rt.sync?.status === 'sending') return null;
    if (rt.sync?.status === 'sent' && !manual) return rt.sync;

    if (!rt.sync) rt.sync = { status: 'idle', attempts: 0 };
    rt.sync.status = 'sending';
    rt.sync.attempts = (Number(rt.sync.attempts) || 0) + 1;
    rt.sync.error = null;
    persist();
    refreshResultButton();

    try {
      const payload = buildResultPayload();
      const headers = {
        'Content-Type': 'application/json',
        'x-cosplay-result-token': cfg.token
      };
      if (cfg.apiKey) headers.apikey = cfg.apiKey;
      const response = await fetch(cfg.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || `Falha HTTP ${response.status}`);

      rt.sync.status = 'sent';
      rt.sync.syncedAt = nowIso();
      rt.sync.remoteMatchId = data.matchId || null;
      rt.sync.duplicate = !!data.duplicate;
      rt.sync.error = null;
      persist();
      refreshResultButton();
      notify(data.duplicate
        ? 'Resultado já estava sincronizado no site. Nenhuma duplicação foi criada.'
        : 'Resultado sincronizado automaticamente. Ranking, Hall da Fama e conquistas atualizados.');
      return data;
    } catch (error) {
      rt.sync.status = 'error';
      rt.sync.error = error?.message || String(error);
      rt.sync.failedAt = nowIso();
      persist();
      refreshResultButton();
      notify(`Falha ao enviar resultado automaticamente: ${rt.sync.error}. O resultado ficou salvo no jogo e pode ser reenviado.`, true);
      return null;
    }
  }

  function installVictoryExportButton() {
    const modal = document.getElementById('victory-modal');
    if (!modal) return;
    const content = modal.querySelector('.victory-content') || modal.firstElementChild || modal;

    if (!modal.querySelector('#victory-result-sync-status')) {
      const status = document.createElement('div');
      status.id = 'victory-result-sync-status';
      status.style.cssText = 'width:min(430px,90%);margin:14px auto 0;padding:10px 12px;border:1px solid rgba(0,229,255,.18);border-radius:9px;background:rgba(0,229,255,.05);color:#bbb;font-size:10px;line-height:1.45;';
      content.appendChild(status);
    }

    if (!modal.querySelector('[data-sync-match-result]')) {
      const syncButton = document.createElement('button');
      syncButton.type = 'button';
      syncButton.dataset.syncMatchResult = 'true';
      syncButton.className = 'btn btn-yes';
      syncButton.style.cssText = 'width:min(430px,90%);margin:9px auto 0;display:block;padding:13px 16px;font-size:11px;letter-spacing:1px;';
      syncButton.addEventListener('click', () => syncResult(true));
      content.appendChild(syncButton);
    }

    if (!modal.querySelector('[data-export-match-result]')) {
      const backupButton = document.createElement('button');
      backupButton.type = 'button';
      backupButton.dataset.exportMatchResult = 'true';
      backupButton.className = 'btn';
      backupButton.textContent = '💾 BAIXAR JSON DE BACKUP';
      backupButton.style.cssText = 'width:min(430px,90%);margin:7px auto 0;display:block;padding:10px 13px;font-size:9px;letter-spacing:1px;background:#18181e;color:#aaa;';
      backupButton.addEventListener('click', exportResult);
      content.appendChild(backupButton);
    }
  }

  function installSystemResultCard() {
    const root = document.getElementById('list-sys');
    if (!root || root.querySelector('#match-result-export-card')) return;
    const card = document.createElement('div');
    card.id = 'match-result-export-card';
    card.className = 'unit-card';
    card.style.cssText = 'background:rgba(224,190,119,.06);border-color:rgba(224,190,119,.24);';
    card.innerHTML = `
      <b style="color:#e0be77;font-size:10px;letter-spacing:1px;">☁ RESULTADO & SITE</b>
      <div id="match-result-export-status" style="font-size:9px;color:#aaa;line-height:1.45;margin:7px 0 9px;">Aguardando uma partida oficial.</div>
      <button type="button" class="btn-play-sm" data-sync-match-result style="width:100%;font-size:8px;padding:10px 6px;margin-bottom:6px;">SINCRONIZAR RESULTADO</button>
      <button type="button" class="btn-play-sm" data-export-match-result style="width:100%;font-size:8px;padding:9px 6px;background:#17171d;color:#999;">JSON DE BACKUP</button>`;
    const resetButton = [...root.querySelectorAll('button')].find(btn => /RESET TOTAL/i.test(btn.textContent || ''));
    if (resetButton) root.insertBefore(card, resetButton); else root.appendChild(card);
    card.querySelector('[data-sync-match-result]').addEventListener('click', () => syncResult(true));
    card.querySelector('[data-export-match-result]').addEventListener('click', exportResult);
    refreshResultButton();
  }

  function refreshResultButton() {
    const status = document.getElementById('match-result-export-status');
    const victoryStatus = document.getElementById('victory-result-sync-status');
    const syncButtons = document.querySelectorAll('[data-sync-match-result]');
    const backupButtons = document.querySelectorAll('[data-export-match-result]');
    const rt = runtime();
    const cfg = resultSyncConfig();
    const sync = rt?.sync || {};

    let statusText = 'Aguardando uma partida oficial.';
    if (rt?.status === 'active') statusText = cfg
      ? 'Partida em andamento. Ao terminar, o resultado será enviado automaticamente para o site.'
      : 'Partida em andamento. Sincronização automática indisponível neste elenco.';
    if (rt?.winner) {
      const winnerText = rt.winner === 'DRAW' ? 'Empate' : `${playerName(rt.winner)} · Player ${playerNumber(rt.winner)}`;
      if (!cfg) statusText = `Resultado pronto: ${winnerText}. Exporte um elenco novo pelo site para ativar o envio automático.`;
      else if (sync.status === 'sending') statusText = `Resultado: ${winnerText}. Enviando para o site...`;
      else if (sync.status === 'sent') statusText = `✓ SINCRONIZADO COM O SITE · ${winnerText}${sync.duplicate ? ' · já existia' : ''}`;
      else if (sync.status === 'error') statusText = `⚠ Resultado salvo, mas o envio falhou: ${sync.error || 'erro de conexão'}. Use “Tentar novamente”.`;
      else statusText = `Resultado pronto: ${winnerText}. Sincronização automática preparada.`;
    }

    if (status) status.textContent = statusText;
    if (victoryStatus) victoryStatus.textContent = statusText;

    syncButtons.forEach(btn => {
      const disabled = !rt?.winner || !cfg || sync.status === 'sending' || sync.status === 'sent';
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '.55' : '1';
      btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
      btn.textContent = sync.status === 'sending'
        ? 'ENVIANDO PARA O SITE...'
        : sync.status === 'sent'
          ? '✓ RESULTADO SINCRONIZADO'
          : sync.status === 'error'
            ? '↻ TENTAR NOVAMENTE'
            : '☁ SINCRONIZAR RESULTADO';
    });

    backupButtons.forEach(btn => {
      btn.disabled = !rt?.winner;
      btn.style.opacity = rt?.winner ? '1' : '.45';
      btn.style.cursor = rt?.winner ? 'pointer' : 'not-allowed';
    });
  }

  try {
    if (typeof startBattle === 'function') {
      const originalStartBattle = startBattle;
      startBattle = function(...args) {
        startRuntime(false);
        const result = originalStartBattle.apply(this, args);
        refreshResultButton();
        return result;
      };
    }

    if (typeof executeMove === 'function') {
      const originalExecuteMove = executeMove;
      executeMove = function(from, to, ...rest) {
        const mover = store?.board?.[from] || null;
        const moveMeta = describeMove(from, to);
        const wasActive = runtime()?.status === 'active';
        const graveBefore = Array.isArray(store?.graveyard) ? store.graveyard.length : 0;
        const result = originalExecuteMove.call(this, from, to, ...rest);
        if (wasActive && mover) {
          const graveAfter = Array.isArray(store?.graveyard) ? store.graveyard.length : graveBefore;
          recordMove(mover, graveAfter > graveBefore, moveMeta);
        }
        return result;
      };
    }

    if (typeof finishDuel === 'function') {
      const originalFinishDuel = finishDuel;
      finishDuel = function(v, ...rest) {
        const attackerFrom = pending?.f;
        const defenderAt = pending?.t;
        const attacker = store?.board?.[attackerFrom] || null;
        const defender = store?.board?.[defenderAt] || null;
        const attackerSide = attacker?.endsWith('_B') ? 'B' : 'P';
        const defenderWon = !!(attacker && defender && v !== attackerSide);
        const wasActive = runtime()?.status === 'active';
        const result = originalFinishDuel.call(this, v, ...rest);
        if (wasActive && defenderWon) recordDuelDefense(defender, attacker, attackerFrom, defenderAt);
        return result;
      };
    }

    if (typeof showVictoryModal === 'function') {
      const originalShowVictoryModal = showVictoryModal;
      showVictoryModal = function(winner, ...rest) {
        markWinner(winner);
        const result = originalShowVictoryModal.call(this, winner, ...rest);
        installVictoryExportButton();
        refreshResultButton();
        return result;
      };
    }

    if (typeof resetGame === 'function') {
      const originalResetGame = resetGame;
      resetGame = function(...args) {
        const result = originalResetGame.apply(this, args);
        try { delete store.g.matchRuntime; persist(); } catch (_) {}
        refreshResultButton();
        return result;
      };
    }
  } catch (error) {
    console.warn('[CosplayChess] Não foi possível instalar todos os ganchos de resultado:', error);
  }

  window.exportCosplayChessResult = exportResult;
  window.buildCosplayChessResult = buildResultPayload;
  window.startCosplayMatchRuntime = startRuntime;
  window.syncCosplayChessResult = syncResult;
  window.refreshCosplayResultSync = refreshResultButton;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { installSystemResultCard(); installVictoryExportButton(); refreshResultButton(); }, { once: true });
  } else {
    installSystemResultCard();
    installVictoryExportButton();
    refreshResultButton();
  }
})();