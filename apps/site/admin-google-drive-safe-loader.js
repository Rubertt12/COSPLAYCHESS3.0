(()=>{
  if (window.__cosplayGoogleDriveSafeLoader) return;
  window.__cosplayGoogleDriveSafeLoader = true;

  const RealMutationObserver = window.MutationObserver;
  if (!RealMutationObserver) return;

  class SafeMutationObserver {
    constructor(callback){
      this._real = new RealMutationObserver(callback);
    }
    observe(target, options){
      const isDangerousGlobalWatch = target === document.body && options?.childList && options?.subtree;
      if (isDangerousGlobalWatch) {
        // O script antigo observava o body inteiro e re-renderizava em resposta
        // às próprias alterações, causando loop infinito. Ignoramos só esse caso.
        return;
      }
      return this._real.observe(target, options);
    }
    disconnect(){ return this._real.disconnect(); }
    takeRecords(){ return this._real.takeRecords(); }
  }

  window.MutationObserver = SafeMutationObserver;

  const script = document.createElement('script');
  script.src = './admin-google-drive.js?v=20260822-gd3-safe';
  script.async = false;
  script.onload = () => {
    window.MutationObserver = RealMutationObserver;
    window.dispatchEvent(new CustomEvent('cosplay:google-drive-ready'));
  };
  script.onerror = () => {
    window.MutationObserver = RealMutationObserver;
    console.error('Falha ao carregar integração segura do Google Drive.');
  };
  document.body.appendChild(script);
})();
