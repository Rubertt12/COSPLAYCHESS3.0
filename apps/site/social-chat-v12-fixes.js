(() => {
  'use strict';
  if (window.__CC_CHAT_V12_FIXES__) return;
  window.__CC_CHAT_V12_FIXES__ = true;
  let pendingImage = null;

  document.addEventListener('change', e => {
    const input = e.target.closest?.('#cc12Image');
    if (!input) return;
    pendingImage = input.files?.[0] || null;
  }, true);

  document.addEventListener('click', e => {
    if (e.target.closest?.('#cc12Record')) pendingImage = null;
    if (e.target.closest?.('#cc12Pending button')) pendingImage = null;
  }, true);

  document.addEventListener('submit', e => {
    if (!e.target.matches?.('#cc12Compose') || !pendingImage) return;
    const input = document.getElementById('cc12Image');
    if (!input || input.files?.length) return;
    try {
      const dt = new DataTransfer();
      dt.items.add(pendingImage);
      input.files = dt.files;
      setTimeout(() => { pendingImage = null; }, 0);
    } catch {}
  }, true);
})();