(() => {
  if (window.__cosplayGameResultExportLoaded) return;
  window.__cosplayGameResultExportLoaded = true;

  const PIECE_LABELS = { P: 'Peão', T: 'Torre', C: 'Cavalo', B: 'Bispo', Q: 'Rainha', K: 'Rei' };

  function nowIso() { return new Date().toISOString(); }
  function runtime() { return store?.g?.matchRuntime || null; }
  function playerName(side) {
    return document.getElementById(`name-${side}`)?.value?.trim() || (side === 'B' ? 'Jogador 1' : 'Jogador 2');
  }
  function playerNumber(side) { return side === 'B' ? 1 : 2; }
  function sideLabel(side) { return side === 'B' ? 'Brancas' : side === 'P' ? 'Pretas' : 'Empate'; }
  function newMatchId() {
    const eventId = String(store?.g?.rosterEvent?.id || 'local').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'local';
    const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `cc-${eventId}-${random}`;
  }
  function managedPieceIds() {
    return Object.keys(store?.p || {}).filter(id => store.p[id]?.participantId && /_[BP]$/.test(id));
  }
  function createPieceStats() {
    const stats = {};
    managedPieceIds().forEach(id => { stats[id] = { moves: 0, captures: 0 }; });
    return stats;
  }
  function persist() { try { save(); } catch (_) {} }

  function startRuntime(force = false) {
    if (!store.g) store.g = {};
    const current = runtime();
    const lineupAt = Date.parse(store.g.autoLineupLastRun || '') || 0;
    const startedAt = Date.parse(current?.startedAt || '') || 0;
    const lineupIsNewer = lineupAt > startedAt;
    if (!force && current?.status === 'active' && !lineupIsNewer) return current;

    store.g.matchRuntime = {
      matchId: newMatchId(),
      eventId: store.g.rosterEvent?.id || null,
      eventName: store.g.rosterEvent?.name || '',
      startedAt: nowIso(),
      finishedAt: null,
      status: 'active',
      winner: null,
      pieceStats: createPieceStats()
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

  function recordMove(pieceId, captured = false) {
    const stat = pieceStat(pieceId);
    if (!stat) return;
    stat.moves = (Number(stat.moves) || 0) + 1;
    if (captured) stat.captures = (Number(stat.captures) || 0) + 1;
    persist();
  }

  function recordCapture(pieceId) {
    const stat = pieceStat(pieceId);
    if (!stat) return;
    stat.captures = (Number(stat.captures) || 0) + 1;
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
    setTimeout(() => {
      installVictoryExportButton();
      refreshResultButton();
    }, 60);
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
      version: 1,
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
      totals: {
        player1Captures: Number(store.g.killsB) || 0,
        player2Captures: Number(store.g.killsP) || 0
      }
    };
  }

  function safeFilePart(value) {
    return String(value || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'evento';
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
      notify('Resultado oficial exportado. Importe este JSON em História & Rankings no site.');
    } catch (error) {
      notify(error.message || 'Não foi possível exportar o resultado.', true);
    }
  }

  function notify(message, error = false) {
    document.getElementById('match-result-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'match-result-toast';
    toast.textContent = message;
    toast.style.cssText = `position:fixed;right:20px;bottom:20px;z-index:22000;max-width:450px;padding:13px 16px;border-radius:11px;background:${error ? '#351018' : '#071f23'};border:1px solid ${error ? '#ff4f77' : 'var(--accent,#00e5ff)'};color:#fff;font-size:11px;line-height:1.45;box-shadow:0 18px 46px rgba(0,0,0,.62);`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4800);
  }

  function installVictoryExportButton() {
    const modal = document.getElementById('victory-modal');
    if (!modal || modal.querySelector('[data-export-match-result]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.exportMatchResult = 'true';
    button.className = 'btn btn-yes';
    button.textContent = '🏆 EXPORTAR RESULTADO PARA O SITE';
    button.style.cssText = 'width:min(430px,90%);margin:14px auto 0;display:block;padding:13px 16px;font-size:11px;letter-spacing:1px;';
    button.addEventListener('click', exportResult);
    const content = modal.querySelector('.victory-content') || modal.firstElementChild || modal;
    content.appendChild(button);
  }

  function installSystemResultCard() {
    const root = document.getElementById('list-sys');
    if (!root || root.querySelector('#match-result-export-card')) return;
    const card = document.createElement('div');
    card.id = 'match-result-export-card';
    card.className = 'unit-card';
    card.style.cssText = 'background:rgba(224,190,119,.06);border-color:rgba(224,190,119,.24);';
    card.innerHTML = `
      <b style="color:#e0be77;font-size:10px;letter-spacing:1px;">🏆 RESULTADO DO EVENTO</b>
      <div id="match-result-export-status" style="font-size:9px;color:#aaa;line-height:1.45;margin:7px 0 9px;">Aguardando uma partida oficial.</div>
      <button type="button" class="btn-play-sm" data-export-match-result style="width:100%;font-size:8px;padding:10px 6px;">EXPORTAR RESULTADO</button>`;
    const resetButton = [...root.querySelectorAll('button')].find(btn => /RESET TOTAL/i.test(btn.textContent || ''));
    if (resetButton) root.insertBefore(card, resetButton);
    else root.appendChild(card);
    card.querySelector('[data-export-match-result]').addEventListener('click', exportResult);
    refreshResultButton();
  }

  function refreshResultButton() {
    const status = document.getElementById('match-result-export-status');
    const buttons = document.querySelectorAll('[data-export-match-result]');
    const rt = runtime();
    if (status) {
      status.textContent = rt?.winner
        ? `Resultado pronto: ${rt.winner === 'DRAW' ? 'empate' : `${playerName(rt.winner)} · Player ${playerNumber(rt.winner)}`}.`
        : rt?.status === 'active'
          ? 'Partida em andamento. O resultado será liberado ao definir o vencedor.'
          : 'Aguardando uma partida oficial.';
    }
    buttons.forEach(btn => {
      btn.disabled = !rt?.winner;
      btn.style.opacity = rt?.winner ? '1' : '.5';
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
        const graveBefore = Array.isArray(store?.graveyard) ? store.graveyard.length : 0;
        const result = originalExecuteMove.call(this, from, to, ...rest);
        if (runtime()?.status === 'active' && mover) {
          const graveAfter = Array.isArray(store?.graveyard) ? store.graveyard.length : graveBefore;
          recordMove(mover, graveAfter > graveBefore);
        }
        return result;
      };
    }

    if (typeof finishDuel === 'function') {
      const originalFinishDuel = finishDuel;
      finishDuel = function(v, ...rest) {
        const attacker = store?.board?.[pending?.f] || null;
        const defender = store?.board?.[pending?.t] || null;
        const attackerSide = attacker?.endsWith('_B') ? 'B' : 'P';
        const defenderWon = attacker && defender && v !== attackerSide;
        const result = originalFinishDuel.call(this, v, ...rest);
        if (runtime()?.status === 'active' && defenderWon) recordCapture(defender);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { installSystemResultCard(); installVictoryExportButton(); refreshResultButton(); }, { once: true });
  } else {
    installSystemResultCard();
    installVictoryExportButton();
    refreshResultButton();
  }
})();