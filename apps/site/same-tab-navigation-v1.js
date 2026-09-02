(() => {
  'use strict';
  if (window.__CC_SAME_TAB_NAV_V1__) return;
  window.__CC_SAME_TAB_NAV_V1__ = true;

  const isInternalUrl = (value) => {
    try {
      const url = new URL(String(value || ''), location.href);
      return url.origin === location.origin && ['http:', 'https:'].includes(url.protocol);
    } catch (_) {
      return false;
    }
  };

  const normalizeAnchor = (anchor) => {
    if (!anchor || anchor.tagName !== 'A') return;
    const raw = anchor.getAttribute('href');
    if (!raw || raw.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(raw)) return;
    if (!isInternalUrl(raw)) return;
    if (anchor.getAttribute('target') && anchor.getAttribute('target') !== '_self') {
      anchor.setAttribute('target', '_self');
    }
    if (anchor.hasAttribute('rel') && /noopener|noreferrer/i.test(anchor.getAttribute('rel') || '')) {
      const rel = String(anchor.getAttribute('rel') || '')
        .split(/\s+/)
        .filter(Boolean)
        .filter(token => !/^(noopener|noreferrer)$/i.test(token));
      if (rel.length) anchor.setAttribute('rel', rel.join(' '));
      else anchor.removeAttribute('rel');
    }
  };

  const normalizeForm = (form) => {
    if (!form || form.tagName !== 'FORM') return;
    const action = form.getAttribute('action') || location.href;
    if (!isInternalUrl(action)) return;
    if (form.getAttribute('target') && form.getAttribute('target') !== '_self') {
      form.setAttribute('target', '_self');
    }
  };

  const normalizeTree = (root = document) => {
    if (root.nodeType === 1) {
      if (root.matches?.('a[href]')) normalizeAnchor(root);
      if (root.matches?.('form')) normalizeForm(root);
    }
    root.querySelectorAll?.('a[href]').forEach(normalizeAnchor);
    root.querySelectorAll?.('form').forEach(normalizeForm);
  };

  const originalOpen = window.open.bind(window);
  window.open = function(url, target, features) {
    if (url && isInternalUrl(url)) {
      try {
        const resolved = new URL(String(url), location.href).href;
        location.assign(resolved);
        return window;
      } catch (_) {}
    }
    return originalOpen(url, target, features);
  };

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    normalizeAnchor(anchor);
  }, true);

  const start = () => {
    normalizeTree(document);
    const observer = new MutationObserver((records) => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === 1) normalizeTree(node);
      }));
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
