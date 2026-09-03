(() => {
  'use strict';
  if (window.__CC_SOCIAL_PHOTO_ACTIONS_V24__) return;
  window.__CC_SOCIAL_PHOTO_ACTIONS_V24__ = true;

  const normalize = (value) => String(value || '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const findAction = (side, label) => [...side.querySelectorAll('button,a,[role="button"]')]
    .find((el) => normalize(el.textContent).includes(label));

  const commonAncestor = (elements, boundary) => {
    if (!elements.length) return null;
    let node = elements[0];
    while (node && node !== boundary) {
      if (elements.every((el) => node.contains(el))) return node;
      node = node.parentElement;
    }
    return null;
  };

  const directCell = (bar, action) => {
    let node = action;
    while (node.parentElement && node.parentElement !== bar) node = node.parentElement;
    return node;
  };

  const mark = () => {
    document.querySelectorAll('.photo-lightbox-side').forEach((side) => {
      const like = findAction(side, 'curtir');
      const comment = findAction(side, 'comentar');
      const share = findAction(side, 'compartilhar');
      if (!like || !comment || !share) return;

      const controls = [like, comment, share];
      const bar = commonAncestor(controls, side);
      if (!bar || bar === side || bar.classList.contains('photo-lightbox-comments')) return;

      const cells = controls.map((control) => directCell(bar, control));
      if (new Set(cells).size !== 3) return;

      bar.classList.add('cc-photo-actionbar');
      cells.forEach((cell) => cell.classList.add('cc-photo-actioncell'));
      controls.forEach((control) => control.classList.add('cc-photo-action'));
    });
  };

  const observer = new MutationObserver(mark);
  observer.observe(document.documentElement, { childList:true, subtree:true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark, { once:true });
  else mark();

  document.addEventListener('click', () => setTimeout(mark, 0), true);
})();
