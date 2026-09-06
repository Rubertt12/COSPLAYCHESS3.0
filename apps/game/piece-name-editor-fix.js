/* Correção robusta do editor de nome da peça no painel lateral (Windows/Electron). */
(() => {
  if (window.__cosplayPieceNameEditorFixLoaded) return;
  window.__cosplayPieceNameEditorFixLoaded = true;

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  function pieceLabel(id) {
    try {
      return store?.p?.[id]?.name || store?.p?.[id]?.participant?.character || pieceNames?.[String(id || '').charAt(0)] || id || 'PEÇA';
    } catch (_) {
      return id || 'PEÇA';
    }
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
    modal.innerHTML = `
      <div style="width:min(430px,94vw);background:#0c0c11;border:1px solid rgba(217,171,85,.45);border-radius:14px;padding:22px;box-shadow:0 28px 90px rgba(0,0,0,.72);">
        <div style="font-size:8px;color:#d9ab55;font-weight:900;letter-spacing:1.5px;">NOME DA PEÇA</div>
        <h2 style="margin:6px 0 5px;color:#f5eee5;font-family:Georgia,serif;font-size:20px;">Editar nome no jogo</h2>
        <div style="color:#827c87;font-size:9px;line-height:1.5;margin-bottom:14px;">${esc(id)} · Esse nome aparecerá no jogo e ao passar o mouse sobre a peça.</div>
        <input id="piece-name-editor-fix-input" type="text" maxlength="60" autocomplete="off" value="${esc(current)}" style="width:100%;box-sizing:border-box;min-height:44px;padding:10px 12px;border:1px solid #393440;border-radius:9px;background:#08090e;color:#fff;font-size:14px;outline:none;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;">
          <button type="button" id="piece-name-editor-fix-cancel" class="btn" style="margin:0;min-height:40px;">CANCELAR</button>
          <button type="button" id="piece-name-editor-fix-save" class="btn btn-yes" style="margin:0;min-height:40px;">SALVAR NOME</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const input = modal.querySelector('#piece-name-editor-fix-input');
    const close = () => modal.remove();
    const saveName = () => {
      const value = input.value.trim();
      if (!value) {
        input.focus();
        return;
      }
      store.p[id].name = value.toUpperCase();
      store.p[id].rosterManagedName = false;
      try { save(); } catch (_) {}
      try { renderBoard(); } catch (_) {}
      try { renderConfigLists(); } catch (_) {}
      try { if (typeof enhancedRenderConfigLists === 'function') enhancedRenderConfigLists(); } catch (_) {}
      close();
      setTimeout(refreshHoverNames, 30);
    };

    modal.querySelector('#piece-name-editor-fix-cancel').addEventListener('click', close);
    modal.querySelector('#piece-name-editor-fix-save').addEventListener('click', saveName);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') saveName();
      if (event.key === 'Escape') close();
    });
    setTimeout(() => { input.focus(); input.select(); }, 20);
  }

  window.editParticipantDisplayName = openNameEditor;
  window.openPieceNameEditor = openNameEditor;

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const text = (button.textContent || '').trim().toUpperCase();
    const onclick = button.getAttribute('onclick') || '';
    if (!text.includes('NOME NO JOGO') && !onclick.includes('editParticipantDisplayName')) return;

    const match = onclick.match(/editParticipantDisplayName\(['"]([^'"]+)['"]\)/);
    if (!match) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openNameEditor(match[1]);
  }, true);

  const observer = new MutationObserver(() => refreshHoverNames());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(refreshHoverNames, 500);
})();
