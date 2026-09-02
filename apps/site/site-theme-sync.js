(() => {
  'use strict';
  if (window.__CC_SITE_THEME_SYNC__) return;
  window.__CC_SITE_THEME_SYNC__ = true;

  if (!document.getElementById('ccSameTabNavigationV1Js')) {
    const script=document.createElement('script');
    script.id='ccSameTabNavigationV1Js';
    script.src='./same-tab-navigation-v1.js?v=20260902-1';
    script.defer=true;
    (document.head || document.documentElement).appendChild(script);
  }

  const KEYS=['cosplaychess-social-appearance-v8','cosplaychess-social-appearance-v7','cosplaychess-social-appearance-v6'];
  const read=()=>{for(const key of KEYS){try{const raw=localStorage.getItem(key);if(raw){const v=JSON.parse(raw);if(v&&typeof v==='object')return v;}}catch{}}return null;};
  const apply=(value)=>{
    const s=value||read()||{};
    const theme=String(s.theme||'cosplay-dark');
    const accent=String(s.accent||'gold');
    const bg=String(s.community_background||'classic');
    document.documentElement.dataset.communityTheme=theme;
    if(document.body){document.body.dataset.ccTheme=theme;document.body.dataset.ccAccent=accent;document.body.dataset.ccBg=bg;}
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',theme==='white-mode'?'#f5f7fa':'#080b12');
  };
  const init=()=>apply();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('storage',(e)=>{if(KEYS.includes(e.key))apply();});
  window.addEventListener('cosplay:social-settings-saved',(e)=>apply(e.detail?.settings));
})();
