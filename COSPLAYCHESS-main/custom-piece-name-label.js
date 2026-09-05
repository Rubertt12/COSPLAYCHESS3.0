/* Ajuste da interface do criador de peças extras: o nome escolhido é o nome oficial exibido da peça. */
(() => {
  if (window.__cosplayCustomPieceNameLabelInstalled) return;
  window.__cosplayCustomPieceNameLabelInstalled = true;

  function patchModal() {
    const modal = document.getElementById('custom-piece-modal');
    if (!modal || modal.dataset.nameLabelPatched === '1') return false;
    const input = modal.querySelector('#cp-name');
    if (!input) return false;

    modal.dataset.nameLabelPatched = '1';
    const label = input.closest('label');
    if (label) {
      const textNode = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = 'NOME DA PEÇA\n                ';
    }

    input.placeholder = 'Ex.: DRAGÃO DE FOGO, GUARDIÃO, SAMURAI...';
    input.title = 'Este é o nome que aparecerá no tabuleiro, no menu, nos duelos e no log.';

    const sub = modal.querySelector('.cp-sub');
    if (sub) sub.textContent = 'Escolha o tipo de movimento, o lado e dê o nome que você quiser à peça. Foto e música são opcionais.';

    const help = document.createElement('div');
    help.className = 'cp-file-info';
    help.style.marginTop = '6px';
    help.style.color = 'var(--accent)';
    help.textContent = 'O nome digitado acima será o nome oficial desta peça dentro do jogo.';
    label?.appendChild(help);
    return true;
  }

  const observer = new MutationObserver(() => patchModal());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  patchModal();
})();
