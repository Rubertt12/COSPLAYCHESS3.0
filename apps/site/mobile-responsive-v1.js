(() => {
  'use strict';
  if (window.__CC_MOBILE_RESPONSIVE_V1__) return;
  window.__CC_MOBILE_RESPONSIVE_V1__ = true;

  const root = document.documentElement;
  const mq = window.matchMedia('(max-width: 980px)');

  const syncViewport = () => {
    const h = Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
    if (h) root.style.setProperty('--cc-visual-height', `${h}px`);
    document.body?.classList.toggle('cc-mobile-viewport', mq.matches);
  };

  const closeMobileChat = () => {
    const chat = document.querySelector('.cc20');
    if (!chat) return;
    chat.classList.remove('in-conversation');
    const active = chat.querySelector('.cc20-thread.active');
    active?.classList.remove('active');
    const list = chat.querySelector('.cc20-list');
    list?.scrollTo?.({ top: 0, behavior: 'instant' });
  };

  const bindChat = () => {
    const chat = document.querySelector('.cc20');
    if (!chat || chat.dataset.ccMobileResponsiveBound === '1') return;
    chat.dataset.ccMobileResponsiveBound = '1';

    chat.addEventListener('click', (event) => {
      const back = event.target.closest('.cc20-head-back');
      if (back && mq.matches) {
        event.preventDefault();
        event.stopPropagation();
        closeMobileChat();
        return;
      }

      const opener = event.target.closest('.cc20-thread,[data-cc22-peer],.cc20-presence-person,.cc20-new-person');
      if (opener && mq.matches) {
        window.setTimeout(() => chat.classList.add('in-conversation'), 30);
      }
    });
  };

  const fixWideElements = () => {
    if (!mq.matches) return;
    document.querySelectorAll('img,video,iframe,canvas').forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.maxWidth ||= '100%';
    });
  };

  const boot = () => {
    syncViewport();
    bindChat();
    fixWideElements();
  };

  window.addEventListener('resize', syncViewport, { passive:true });
  window.addEventListener('orientationchange', () => setTimeout(syncViewport, 80), { passive:true });
  window.visualViewport?.addEventListener('resize', syncViewport, { passive:true });
  mq.addEventListener?.('change', () => {
    syncViewport();
    if (!mq.matches) document.querySelector('.cc20')?.classList.remove('in-conversation');
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();

  const observer = new MutationObserver(() => {
    bindChat();
    if (mq.matches) fixWideElements();
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
