(() => {
  'use strict';
  if (window.__CC_COSPLAY_COVER_GUARD_V19__) return;
  window.__CC_COSPLAY_COVER_GUARD_V19__ = true;

  const selector = '.cc-profile-cover, .group-cover';

  function protect(element) {
    if (!element || element.dataset.ccCoverGuardV19 === '1') return;
    element.dataset.ccCoverGuardV19 = '1';

    const sync = () => {
      const image = element.style.getPropertyValue('background-image').trim();
      const priority = element.style.getPropertyPriority('background-image');
      if (image && image !== 'none' && priority !== 'important') {
        element.style.setProperty('background-image', image, 'important');
      }
    };

    sync();
    new MutationObserver(sync).observe(element, {
      attributes: true,
      attributeFilter: ['style']
    });
  }

  function scan(root = document) {
    if (root.matches?.(selector)) protect(root);
    root.querySelectorAll?.(selector).forEach(protect);
  }

  function boot() {
    scan(document);
    if (!document.body) return;
    new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) scan(node);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
