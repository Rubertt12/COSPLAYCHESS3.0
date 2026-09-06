/* Editor robusto de nome da peça no painel lateral (Windows/Electron). */
(() => {
  if (window.__cosplayPieceNameEditorFixLoaded) return;
  window.__cosplayPieceNameEditorFixLoaded = true;

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;').replace(/'/g, '&#039;');

  function pieceLabel(id) {
    try {
      return store?.p?.[id]?.name || store?.p?.[id]?.participant?.character || pieceNames?.[String(id || '').charAt(0)] || id || 'PEÇA';
    } catch (_) { return id || 'PEÇA'; }
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

  function refreshHoverNames() {
    document.querySelectorAll('.piece[data-piece-id]').forEach(piece => {
      const id = piece.dataset.pieceId;
      if (!id) return;
      const name = pieceLabel(id);
      piece.title = name;
      const container = piece.closest('.piece-container');
      if (container) container.title = name;
    });
  }

  function openNameEditor(id) {
    if (!id || typeof store === 'undefined') return;
    if (!store.p[id]) store.p[id] = {};
    document.getElementById('piece-name-editor-fix-modal')?.remove();

    const current = pieceLabel(id);
    const modal = document.createElement('div');
    modal.id = 'piece-name-editor-fix-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:20000;background:rgba(0,0,0,.88);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:18px;';
    modal.innerHTML = `<div style="width:min(430px,94vw);background:#0c0c11;border:1px solid rgba(217,171,85,.45);border-radius:14px;padding:22px;box-shadow:0 28px 90px rgba(0,0,0,.72);">
      <div style="font-size:8px;color:#d9ab55;font-weight:900;letter-spacing:1.5px;">NOME DA PEÇA</div>
      <h2 style="margin:6px 0 5px;color:#f5eee5;font-family:Georgia,serif;font-size:20px;">Editar nome no jogo</h2>
      <div style="color:#827c87;font-size:9px;line-height:1.5;margin-bottom:14px;">${esc(id)} · Esse nome aparecerá no jogo e ao passar o mouse sobre a peça.</div>
      <input id="piece-name-editor-fix-input" type="text" maxlength="60" autocomplete="off" value="${esc(current)}" style="width:100%;box-sizing:border-box;min-height:44px;padding:10px 12px;border:1px solid #393440;border-radius:9px;background:#08090e;color:#fff;font-size:14px;outline:none;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;">
        <button type="button" id="piece-name-editor-fix-cancel" class="btn" style="margin:0;min-height:40px;">CANCELAR</button>
        <button type="button" id="piece-name-editor-fix-save" class="btn btn-yes" style="margin:0;min-height:40px;">SALVAR NOME</button>
      </div></div>`;
    document.body.appendChild(modal);

    const input = modal.querySelector('#piece-name-editor-fix-input');
    const close = () => modal.remove();
    const saveName = () => {
      const value = input.value.trim();
      if (!value) return input.focus();
      store.p[id].name = value.toUpperCase();
      store.p[id].rosterManagedName = false;
      try { save(); } catch (_) {}
      try { renderBoard(); } catch (_) {}
      try { renderConfigLists(); } catch (_) {}
      close();
      setTimeout(() => { decorateCards(); refreshHoverNames(); }, 30);
    };

    modal.querySelector('#piece-name-editor-fix-cancel').onclick = close;
    modal.querySelector('#piece-name-editor-fix-save').onclick = saveName;
    modal.onclick = event => { if (event.target === modal) close(); };
    input.onkeydown = event => {
      if (event.key === 'Enter') saveName();
      if (event.key === 'Escape') close();
    };
    setTimeout(() => { input.focus(); input.select(); }, 20);
  }

  window.editParticipantDisplayName = openNameEditor;
  window.openPieceNameEditor = openNameEditor;

  function decorateCards() {
    ['list-white','list-black'].forEach(listId => {
      const list = document.getElementById(listId);
      if (!list) return;
      list.querySelectorAll('.unit-card').forEach(card => {
        const id = extractIdFromCard(card);
        if (!id) return;
        let button = card.querySelector('.piece-name-editor-visible-btn');
        const existing = card.querySelector('button[onclick*="editParticipantDisplayName"]');
        if (existing) {
          existing.classList.add('piece-name-editor-visible-btn');
          existing.onclick = event => { event?.preventDefault?.(); openNameEditor(id); };
          return;
        }
        if (button) return;
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'piece-name-editor-visible-btn';
        button.textContent = '✎ EDITAR NOME DA PEÇA';
        button.style.cssText = 'width:100%;margin-top:8px;border:1px solid rgba(217,171,85,.38);background:rgba(217,171,85,.07);color:#f0ca7d;border-radius:7px;padding:8px;font-size:8px;font-weight:900;cursor:pointer;';
        button.onclick = event => { event.preventDefault(); event.stopPropagation(); openNameEditor(id); };
        card.appendChild(button);
      });
    });
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    if (!button) return;
    const text = (button.textContent || '').trim().toUpperCase();
    if (!text.includes('NOME NO JOGO') && !text.includes('EDITAR NOME')) return;
    const card = button.closest('.unit-card');
    const id = extractIdFromCard(card) || (button.getAttribute('onclick') || '').match(/editParticipantDisplayName\(['\"]([^'\"]+)['\"]\)/)?.[1];
    if (!id) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openNameEditor(id);
  }, true);

  const boot = () => {
    decorateCards();
    refreshHoverNames();
    ['list-white','list-black'].forEach(listId => {
      const list = document.getElementById(listId);
      if (!list || list.dataset.nameEditorObserved === '1') return;
      list.dataset.nameEditorObserved = '1';
      new MutationObserver(() => { decorateCards(); refreshHoverNames(); }).observe(list, {childList:true,subtree:true});
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
  setInterval(boot, 1200);
})();
