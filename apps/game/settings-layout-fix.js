(() => {
  if (window.__cosplaySettingsLayoutFixLoaded) return;
  window.__cosplaySettingsLayoutFixLoaded = true;

  const STYLE_ID = 'cosplay-settings-layout-fix';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start-menu .start-content.settings-expanded{
        width:min(1380px,97vw)!important;
        height:min(900px,94vh)!important;
        max-height:94vh!important;
        overflow:hidden!important;
        border-radius:24px!important;
      }
      #start-menu .start-content.settings-expanded .start-info-col{
        flex:.58!important;
        min-width:245px!important;
        padding:30px 26px!important;
      }
      #start-menu .start-content.settings-expanded .start-info-col .start-logo{
        width:clamp(150px,18vw,255px)!important;
        margin-bottom:14px!important;
      }
      #start-menu .start-content.settings-expanded .start-info-col h1{
        font-size:clamp(1.35rem,3vw,2rem)!important;
        letter-spacing:5px!important;
      }
      #start-menu .start-content.settings-expanded .start-info-col p{
        margin:6px auto 0!important;
        font-size:.62rem!important;
        line-height:1.55!important;
        letter-spacing:2px!important;
      }
      #start-menu .start-content.settings-expanded .start-config-col{
        flex:1.85!important;
        min-width:0!important;
        min-height:0!important;
        height:100%!important;
        padding:0!important;
        overflow:hidden!important;
      }
      #start-menu .start-content.settings-expanded #start-menu-settings-content{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        max-height:none!important;
        min-height:0!important;
        padding:24px 26px 92px!important;
        overflow-x:hidden!important;
        overflow-y:auto!important;
        justify-content:flex-start!important;
        align-content:flex-start!important;
        scrollbar-gutter:stable;
        overscroll-behavior:contain;
      }
      #start-menu .start-content.settings-expanded #start-menu-settings-content.cosplay-settings-v3{
        max-height:none!important;
        border:0!important;
        border-radius:0!important;
        box-shadow:none!important;
        background:linear-gradient(180deg,rgba(13,14,19,.985),rgba(7,8,11,.99))!important;
      }
      #start-menu .start-content.settings-expanded #start-menu-settings-content .settings-v3-header{
        position:sticky;
        top:-24px;
        z-index:8;
        padding:20px 2px 14px!important;
        background:linear-gradient(180deg,rgba(10,11,15,.99) 75%,rgba(10,11,15,.82),transparent);
        backdrop-filter:blur(10px);
      }
      #start-menu .start-content.settings-expanded #start-menu-settings-content .theme-grid{
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:9px!important;
      }
      #start-menu .start-content.settings-expanded #start-menu-settings-content .theme-card{
        min-height:82px!important;
        padding:12px!important;
      }
      #start-menu .start-content.settings-expanded #start-menu-settings-content .wall-preset-grid{
        grid-template-columns:repeat(4,minmax(0,1fr))!important;
        gap:8px!important;
      }
      #start-menu .start-content.settings-expanded #start-menu-settings-content .start-config-row{
        align-items:center!important;
        gap:10px!important;
      }
      #start-menu .start-content.settings-expanded #start-menu-settings-content #json-data-settings{
        flex:0 0 auto!important;
      }
      #start-menu .start-content.settings-expanded #start-menu-settings-content .btn-back{
        position:sticky!important;
        bottom:-70px!important;
        z-index:10!important;
        margin-top:18px!important;
        padding:13px!important;
        border:1px solid rgba(255,255,255,.1)!important;
        background:rgba(16,17,22,.96)!important;
        box-shadow:0 -14px 30px rgba(7,8,11,.94)!important;
        backdrop-filter:blur(12px);
      }
      #start-menu .start-content.settings-expanded #start-menu-settings-content input,
      #start-menu .start-content.settings-expanded #start-menu-settings-content select,
      #start-menu .start-content.settings-expanded #start-menu-settings-content button{
        max-width:100%;
      }
      @media(max-width:1050px){
        #start-menu .start-content.settings-expanded{width:98vw!important;height:95vh!important;max-height:95vh!important}
        #start-menu .start-content.settings-expanded .start-info-col{flex:.42!important;min-width:205px!important;padding:24px 18px!important}
        #start-menu .start-content.settings-expanded #start-menu-settings-content{padding:20px 20px 86px!important}
        #start-menu .start-content.settings-expanded #start-menu-settings-content .theme-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      }
      @media(max-width:760px){
        #start-menu{padding:8px!important}
        #start-menu .start-content.settings-expanded{width:100%!important;height:97vh!important;max-height:97vh!important;border-radius:16px!important}
        #start-menu .start-content.settings-expanded .start-info-col{display:none!important}
        #start-menu .start-content.settings-expanded .start-config-col{flex:1!important;width:100%!important}
        #start-menu .start-content.settings-expanded #start-menu-settings-content{padding:16px 14px 82px!important}
        #start-menu .start-content.settings-expanded #start-menu-settings-content .settings-v3-header{top:-16px;padding-top:14px!important}
        #start-menu .start-content.settings-expanded #start-menu-settings-content .wall-preset-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      }
      @media(max-width:430px){
        #start-menu .start-content.settings-expanded #start-menu-settings-content .theme-grid{grid-template-columns:1fr!important}
        #start-menu .start-content.settings-expanded #start-menu-settings-content .start-config-row{align-items:stretch!important;flex-direction:column!important}
        #start-menu .start-content.settings-expanded #start-menu-settings-content .start-config-row>*{width:100%!important;margin-left:0!important}
      }
    `;
    document.head.appendChild(style);
  }

  function settingsVisible() {
    const panel = document.getElementById('start-menu-settings-content');
    return !!panel && panel.classList.contains('menu-panel-visible') && !panel.classList.contains('menu-panel-hidden');
  }

  function syncExpandedState() {
    const shell = document.querySelector('#start-menu .start-content');
    if (!shell) return;
    shell.classList.toggle('settings-expanded', settingsVisible());
    if (settingsVisible()) {
      const panel = document.getElementById('start-menu-settings-content');
      if (panel && panel.dataset.expandedOnce !== '1') {
        panel.scrollTop = 0;
        panel.dataset.expandedOnce = '1';
      }
    }
  }

  function hookFunctions() {
    try {
      if (typeof openStartMenuSettings === 'function' && !openStartMenuSettings.__layoutHooked) {
        const original = openStartMenuSettings;
        const wrapped = function(...args) {
          const result = original.apply(this, args);
          requestAnimationFrame(syncExpandedState);
          return result;
        };
        wrapped.__layoutHooked = true;
        openStartMenuSettings = wrapped;
      }
      if (typeof closeStartMenuSettings === 'function' && !closeStartMenuSettings.__layoutHooked) {
        const original = closeStartMenuSettings;
        const wrapped = function(...args) {
          const result = original.apply(this, args);
          requestAnimationFrame(syncExpandedState);
          return result;
        };
        wrapped.__layoutHooked = true;
        closeStartMenuSettings = wrapped;
      }
    } catch (_) {}
  }

  installStyles();
  hookFunctions();

  const panel = document.getElementById('start-menu-settings-content');
  if (panel) new MutationObserver(syncExpandedState).observe(panel, { attributes:true, attributeFilter:['class'] });
  window.addEventListener('resize', syncExpandedState);
  requestAnimationFrame(syncExpandedState);
})();