(() => {
  'use strict';
  if (window.__CC_GROUP_POLISH_V11__) return;
  window.__CC_GROUP_POLISH_V11__ = true;

  function polish() {
    const cover = document.querySelector('.community-group-page .group-cover');
    if (cover) {
      const inlineImage = cover.style.backgroundImage;
      if (inlineImage && inlineImage !== 'none') {
        cover.style.setProperty('background-image', inlineImage, 'important');
        cover.style.setProperty('background-position', 'center', 'important');
        cover.style.setProperty('background-size', 'cover', 'important');
      }
    }

    const nav = document.querySelector('.group-nav');
    if (nav) nav.setAttribute('aria-label', 'Navegação da comunidade');

    const main = document.querySelector('.group-main');
    if (main) main.setAttribute('aria-live', 'polite');

    const groupName = document.getElementById('groupName');
    const groupContent = document.getElementById('groupContent');
    if (groupName?.textContent?.trim() && groupName.textContent.trim() !== 'Comunidade') {
      groupContent?.setAttribute('aria-label', `Comunidade ${groupName.textContent.trim()}`);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', polish, { once:true });
  else polish();

  // Cobre apenas a inicialização assíncrona dos módulos existentes; não mantém observer permanente.
  [160,420,900,1800,3200,5200].forEach(ms => setTimeout(polish, ms));
})();
