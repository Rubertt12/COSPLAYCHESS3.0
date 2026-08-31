(() => {
  'use strict';
  if (window.__CC_GROUP_POLISH_V11__) return;
  window.__CC_GROUP_POLISH_V11__ = true;

  function loadCss(href, id) {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src, id) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }

  loadCss('./community-group-ux-v14.css?v=20260831-2', 'ccCommunityGroupUxV14Css');
  loadScript('./community-group-ux-v15.js?v=20260831-1', 'ccCommunityGroupUxV15Js');

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

  [160,420,900,1800,3200].forEach(ms => setTimeout(polish, ms));
})();
