/* Posicionamento manual de peças no tabuleiro (Windows/Electron). */
(() => {
  if (window.__cosplayPieceBoardPlacementInstalled) return;
  window.__cosplayPieceBoardPlacementInstalled = true;

  let activePieceId = null;

  function pieceName(id) {
    try { return String(store?.p?.[id]?.name || pieceNames?.[String(id || '').charAt(0)] || id || 'PEÇA'); }
    catch (_) { return String(id || 'PEÇA'); }
  }

  function ensureStyles() {
    if (document.getElementById('piece-board-placement-styles')) return;
    const style = document.createElement('style');
    style.id = 'piece-board-placement-styles';
    style.textContent = `
      #piece-board-placement-banner{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:17000;max-width:min(620px,92vw);padding:12px 16px;border:1px solid var(--accent,#00e5ff);border-radius:11px;background:rgba(6,9,14,.97);color:#fff;font-size:10px;font-weight:900;letter-spacing:.5px;text-align:center;box-shadow:0 16px 45px rgba(0,0,0,.62);pointer-events:none}
      #board.piece-board-placement-active{outline:3px solid var(--accent,#00e5ff);outline-offset:6px}
      #board.piece-board-placement-active .sq{cursor:crosshair}
      #board.piece-board-placement-active .sq:hover{box-shadow:inset 0 0 0 3px var(--accent,#00e5ff),inset 0 0 28px rgba(0,229,255,.22)}
      .piece-board-position-btn{width:100%;margin-top:6px!important;border:1px solid rgba(0,229,255,.32)!important;background:rgba(0,229,255,.07)!important;color:#aefaff!important;border-radius:7px!important;padding:8px!important;font-size:8px!important;font-weight:900!important;cursor:pointer!important}
    `;
    document.head.appendChild(style);
  }

  function showBanner(text) {
    document.getElementById('piece-board-placement-banner')?.remove();
    if (!text) return;
    const el = document.createElement('div');
    el.id = 'piece-board-placement-banner';
    el.textContent = text;
    document.body.appendChild(el);
  }

  function cancelPlacement() {
    activePieceId = null;
    document.getElementById('board')?.classList.remove('piece-board-placement-active');
    showBanner('');
  }

  function startPlacement(id) {
    if (!id) return;
    try {
      if (!store?.p) return;
      if (!store.p[id]) store.p[id] = {};
    } catch (_) { return; }
    activePieceId = id;
    document.getElementById('board')?.classList.add('piece-board-placement-active');
    showBanner(`POSICIONAR ${pieceName(id)}: clique na casa desejada. Se estiver ocupada, as peças trocam de lugar. ESC cancela.`);
  }

  window.positionPieceOnBoard = startPlacement;
  window.cancelPieceBoardPlacement = cancelPlacement;

  function commitPlacement(targetIndex) {
    if (!activePieceId) return false;
    const id = activePieceId;
    if (!Array.isArray(store?.board) || targetIndex < 0 || targetIndex > 63) return false;
    const sourceIndex = store.board.indexOf(id);
    if (sourceIndex === targetIndex) { cancelPlacement(); return true; }
    const targetPiece = store.board[targetIndex] || null;

    if (sourceIndex >= 0) {
      store.board[sourceIndex] = targetPiece;
      store.board[targetIndex] = id;
    } else {
      if (targetPiece) {
        showBanner(`A casa está ocupada por ${pieceName(targetPiece)}. Escolha uma casa vazia. ESC cancela.`);
        return true;
      }
      store.board[targetIndex] = id;
    }

    if (Array.isArray(store.graveyard)) store.graveyard = store.graveyard.filter(piece => piece !== id);
    const name = pieceName(id);
    cancelPlacement();
    try { save(); } catch (_) {}
    try { renderBoard(); } catch (_) {}
    try { renderGraveyard(); } catch (_) {}
    try { renderConfigLists(); } catch (_) {}
    showBanner(`${name} posicionada no tabuleiro.`);
    setTimeout(() => showBanner(''), 1500);
    return true;
  }

  function bindBoard() {
    const board = document.getElementById('board');
    if (!board || board.dataset.pieceBoardPlacementBound === '1') return !!board;
    board.dataset.pieceBoardPlacementBound = '1';
    board.addEventListener('click', event => {
      if (!activePieceId) return;
      const sq = event.target.closest?.('.sq');
      if (!sq || !board.contains(sq)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      commitPlacement(Array.prototype.indexOf.call(board.children, sq));
    }, true);
    return true;
  }

  function extractIdFromCard(card) {
    if (!card) return '';
    const explicit = card.querySelector('[data-piece-id]')?.dataset?.pieceId;
    if (explicit) return explicit;
    const candidates = [
      card.querySelector('button[onclick*="editParticipantDisplayName"]')?.getAttribute('onclick') || '',
      card.querySelector('.edit-piece-name-input')?.getAttribute('onchange') || '',
      card.querySelector('input[onchange*="updatePieceName"]')?.getAttribute('onchange') || '',
      card.innerHTML || ''
    ];
    for (const code of candidates) {
      let m = code.match(/editParticipantDisplayName\(['\"]([^'\"]+)['\"]\)/);
      if (m) return m[1];
      m = code.match(/updatePieceName\(['\"]([^'\"]+)['\"]/);
      if (m) return m[1];
      m = code.match(/(?:ID:\s*|·\s*)([PTCBQK][A-Z0-9_-]+_[BP])\b/i);
      if (m) return m[1];
    }
    return '';
  }

  function decorateCards() {
    ['list-white','list-black'].forEach(listId => {
      const list = document.getElementById(listId);
      if (!list) return;
      list.querySelectorAll('.unit-card').forEach(card => {
        const id = extractIdFromCard(card);
        if (!id || card.querySelector('.piece-board-position-btn')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'piece-board-position-btn';
        button.textContent = '♟ POSICIONAR PEÇA NO TABULEIRO';
        button.title = `Escolher onde ${pieceName(id)} ficará no tabuleiro`;
        button.onclick = event => {
          event.preventDefault();
          event.stopPropagation();
          startPlacement(id);
        };
        card.appendChild(button);
      });
    });
  }

  function observeCards() {
    ['list-white','list-black'].forEach(listId => {
      const list = document.getElementById(listId);
      if (!list || list.dataset.pieceBoardPlacementObserved === '1') return;
      list.dataset.pieceBoardPlacementObserved = '1';
      new MutationObserver(decorateCards).observe(list, {childList:true,subtree:true});
    });
  }

  function init() {
    ensureStyles();
    bindBoard();
    observeCards();
    decorateCards();
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activePieceId) cancelPlacement();
  });

  const boot = () => {
    init();
    setInterval(init, 1200);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
