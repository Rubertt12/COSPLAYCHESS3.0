(() => {
  'use strict';
  if (window.__CC_MOBILE_RESPONSIVE_V2__) return;
  window.__CC_MOBILE_RESPONSIVE_V2__ = true;

  const root = document.documentElement;
  const mqMobile = window.matchMedia('(max-width: 980px)');
  let baseViewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  let observerTimer = 0;

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];

  const syncViewport = () => {
    const visual = window.visualViewport;
    const height = Math.round(visual?.height || window.innerHeight || document.documentElement.clientHeight || 0);
    const width = Math.round(visual?.width || window.innerWidth || document.documentElement.clientWidth || 0);
    if (height) root.style.setProperty('--cc-visual-height', `${height}px`);
    if (width) root.style.setProperty('--cc-visual-width', `${width}px`);

    if (!visual || !mqMobile.matches) baseViewportHeight = Math.max(baseViewportHeight, height);
    const keyboardOpen = mqMobile.matches && !!visual && baseViewportHeight > 0 && height < baseViewportHeight * 0.78;
    document.body?.classList.toggle('cc-keyboard-open', keyboardOpen);
    document.body?.classList.toggle('cc-mobile-viewport', mqMobile.matches);
    document.body?.toggleAttribute('data-cc-mobile', mqMobile.matches);
  };

  const closeMobileChat = () => {
    const chat = q('.cc20');
    if (!chat) return;
    chat.classList.remove('in-conversation');
    chat.querySelector('.cc20-thread.active')?.classList.remove('active');
    q('#cc20Body', chat)?.blur?.();
    window.scrollTo?.({ top: 0, behavior: 'instant' });
  };

  const openMobileChat = (chat) => {
    if (!mqMobile.matches || !chat) return;
    requestAnimationFrame(() => chat.classList.add('in-conversation'));
  };

  const bindChat = () => {
    const chat = q('.cc20');
    if (!chat || chat.dataset.ccMobileResponsiveBound === '2') return;
    chat.dataset.ccMobileResponsiveBound = '2';

    chat.addEventListener('click', (event) => {
      const back = event.target.closest('.cc20-head-back');
      if (back && mqMobile.matches) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeMobileChat();
        return;
      }

      const opener = event.target.closest('.cc20-thread,[data-cc22-peer],.cc20-presence-person,.cc20-new-person');
      if (opener && mqMobile.matches) {
        window.setTimeout(() => openMobileChat(chat), 40);
      }
    }, true);

    const conversation = q('.cc20-conversation', chat);
    if (conversation && mqMobile.matches && !q('.cc20-head', conversation)) chat.classList.remove('in-conversation');
  };

  const normalizeScrollable = () => {
    if (!mqMobile.matches) return;
    qa('table').forEach((table) => {
      if (table.parentElement?.classList.contains('cc-mobile-table-scroll')) return;
      const wrap = document.createElement('div');
      wrap.className = 'cc-mobile-table-scroll';
      wrap.style.cssText = 'width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch';
      table.parentNode?.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  };

  const normalizeMedia = () => {
    if (!mqMobile.matches) return;
    qa('img,video,iframe,canvas').forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      if (!el.style.maxWidth) el.style.maxWidth = '100%';
    });
  };

  const syncMobileStates = () => {
    syncViewport();
    bindChat();
    normalizeScrollable();
    normalizeMedia();
  };

  const scheduleSync = () => {
    clearTimeout(observerTimer);
    observerTimer = window.setTimeout(syncMobileStates, 80);
  };

  window.addEventListener('resize', syncViewport, { passive:true });
  window.addEventListener('orientationchange', () => {
    baseViewportHeight = 0;
    setTimeout(() => {
      baseViewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      syncMobileStates();
    }, 120);
  }, { passive:true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncViewport, { passive:true });
    window.visualViewport.addEventListener('scroll', syncViewport, { passive:true });
  }

  mqMobile.addEventListener?.('change', () => {
    baseViewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!mqMobile.matches) {
      document.body?.classList.remove('cc-keyboard-open','cc-mobile-viewport');
      q('.cc20')?.classList.remove('in-conversation');
    }
    syncMobileStates();
  });

  document.addEventListener('focusin', (event) => {
    if (!mqMobile.matches) return;
    if (event.target.matches?.('input,textarea,select,[contenteditable="true"]')) setTimeout(syncViewport, 80);
  });
  document.addEventListener('focusout', () => {
    if (!mqMobile.matches) return;
    setTimeout(() => {
      document.body?.classList.remove('cc-keyboard-open');
      syncViewport();
    }, 180);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncMobileStates, { once:true });
  else syncMobileStates();

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
