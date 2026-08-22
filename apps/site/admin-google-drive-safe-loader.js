(()=>{
  if (window.__cosplayGoogleDriveSafeLoader) return;
  window.__cosplayGoogleDriveSafeLoader = true;

  const css=[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>(l.getAttribute('href')||'').includes('admin-google-drive.css'));
  if(css)css.href='./admin-google-drive.css?v=20260822-gd-screen2';

  const RealMutationObserver = window.MutationObserver;
  if (!RealMutationObserver) return;

  class SafeMutationObserver {
    constructor(callback){ this._real = new RealMutationObserver(callback); }
    observe(target, options){
      const isDangerousGlobalWatch = target === document.body && options?.childList && options?.subtree;
      if (isDangerousGlobalWatch) return;
      return this._real.observe(target, options);
    }
    disconnect(){ return this._real.disconnect(); }
    takeRecords(){ return this._real.takeRecords(); }
  }

  const loadScreen=()=>{
    if(document.querySelector('script[data-gd-screen]'))return;
    const s=document.createElement('script');
    s.src='./admin-google-drive-screen.js?v=20260822-gd-screen2';
    s.async=false;
    s.dataset.gdScreen='1';
    document.body.appendChild(s);
  };

  const loadGalleryLive=()=>{
    if(document.querySelector('script[data-gd-gallery-live]'))return;
    const s=document.createElement('script');
    s.src='./admin-gallery-drive-live-sync.js?v=20260822-live1';
    s.async=false;
    s.dataset.gdGalleryLive='1';
    document.body.appendChild(s);
  };

  window.MutationObserver = SafeMutationObserver;
  const script = document.createElement('script');
  script.src = './admin-google-drive.js?v=20260822-gd4-safe';
  script.async = false;
  script.onload = () => {
    window.MutationObserver = RealMutationObserver;
    loadScreen();
    loadGalleryLive();
    window.dispatchEvent(new CustomEvent('cosplay:google-drive-ready'));
  };
  script.onerror = () => {
    window.MutationObserver = RealMutationObserver;
    loadScreen();
    loadGalleryLive();
    console.error('Falha ao carregar integração segura do Google Drive.');
  };
  document.body.appendChild(script);
})();