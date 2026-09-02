(()=>{
  if(window.__COSPLAYCHESS_FOOTER_SOCIAL_CLEANUP__)return;
  window.__COSPLAYCHESS_FOOTER_SOCIAL_CLEANUP__=true;

  /* Camada mobile/PWA comum às páginas públicas carregadas via config.js. */
  if(!document.querySelector('link[data-cc-mobile-responsive]')){
    const mobile=document.createElement('link');
    mobile.rel='stylesheet';
    mobile.href='./mobile-responsive-v1.css?v=20260902-3';
    mobile.dataset.ccMobileResponsive='1';
    document.head.appendChild(mobile);
  }
  if(!document.querySelector('link[data-cc-mobile-polish]')){
    const polish=document.createElement('link');
    polish.rel='stylesheet';
    polish.href='./mobile-polish-v3.css?v=20260902-1';
    polish.dataset.ccMobilePolish='3';
    document.head.appendChild(polish);
  }
  if(!document.querySelector('script[data-cc-mobile-responsive]')){
    const mobileJs=document.createElement('script');
    mobileJs.src='./mobile-responsive-v1.js?v=20260902-3';
    mobileJs.defer=true;
    mobileJs.dataset.ccMobileResponsive='1';
    document.head.appendChild(mobileJs);
  }
  if(!document.querySelector('script[data-cc-mobile-polish]')){
    const polishJs=document.createElement('script');
    polishJs.src='./mobile-runtime-v3.js?v=20260902-1';
    polishJs.defer=true;
    polishJs.dataset.ccMobilePolish='3';
    document.head.appendChild(polishJs);
  }
  if(!document.querySelector('link[rel="manifest"]')){
    const manifest=document.createElement('link');
    manifest.rel='manifest';
    manifest.href='./manifest.webmanifest?v=20260902-3';
    document.head.appendChild(manifest);
  }
  if(!document.querySelector('link[rel="apple-touch-icon"]')){
    const apple=document.createElement('link');
    apple.rel='apple-touch-icon';
    apple.sizes='192x192';
    apple.href='./img/cosplaychess-icon-192.png';
    document.head.appendChild(apple);
  }
  if(!document.querySelector('meta[name="apple-mobile-web-app-capable"]')){
    const capable=document.createElement('meta');
    capable.name='apple-mobile-web-app-capable';
    capable.content='yes';
    document.head.appendChild(capable);
  }
  if(!document.querySelector('meta[name="apple-mobile-web-app-title"]')){
    const title=document.createElement('meta');
    title.name='apple-mobile-web-app-title';
    title.content='CosplayChess';
    document.head.appendChild(title);
  }
  if(!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')){
    const status=document.createElement('meta');
    status.name='apple-mobile-web-app-status-bar-style';
    status.content='black-translucent';
    document.head.appendChild(status);
  }
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=20260902-3',{scope:'./'}).catch(()=>{}),{once:true});
  }

  const ICON=`<span class="cc-footer-instagram-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.7" r="1.15" fill="currentColor"/></svg></span><span class="cc-footer-instagram-handle">@fergorverse</span>`;
  let applying=false;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)));

  function clean(){
    if(applying)return;
    const footer=document.querySelector('.site-footer');
    if(!footer)return;
    applying=true;
    try{
      footer.querySelectorAll('.cc-social-links').forEach(node=>node.remove());
      const canonical=footer.querySelector('a.footer-social')||footer.querySelector('a[href*="instagram.com"]');
      if(!canonical)return;
      footer.querySelectorAll('a[href*="instagram.com"],a[data-fergorverse-instagram]').forEach(link=>{
        if(link!==canonical&&link.closest('.site-footer'))link.remove();
      });
      canonical.classList.add('footer-social-clean');
      canonical.removeAttribute('data-fergorverse-instagram');
      canonical.removeAttribute('data-cms-global-role');
      canonical.href='https://www.instagram.com/fergorverse/';
      canonical.target='_blank';
      canonical.rel='noopener noreferrer';
      canonical.setAttribute('aria-label','Instagram @fergorverse');
      canonical.setAttribute('title','Instagram @fergorverse');
      const icon=canonical.querySelector(':scope > .cc-footer-instagram-icon');
      const handle=canonical.querySelector(':scope > .cc-footer-instagram-handle');
      const ready=canonical.children.length===2&&icon?.querySelector('svg')&&handle?.textContent==='@fergorverse';
      if(!ready)canonical.innerHTML=ICON;
    }finally{applying=false}
  }

  async function applyFooterChibi(){
    const footer=document.querySelector('.site-footer');
    if(!footer)return;
    let chibi=footer.querySelector('.footer-chibi');
    if(!chibi){
      chibi=document.createElement('img');
      chibi.className='footer-chibi';
      chibi.alt='';
      chibi.setAttribute('aria-hidden','true');
      chibi.decoding='async';
      chibi.loading='eager';
      footer.appendChild(chibi);
    }
    try{
      const db=typeof window.getCosplayChessDb==='function'?window.getCosplayChessDb():window.COSPLAYCHESS_DB;
      if(!db)return;
      const {data,error}=await db.from('cosplay_site_content').select('content').eq('key','landing').eq('published',true).maybeSingle();
      if(error)throw error;
      const c=data?.content||{};
      const enabled=c.footerChibiEnabled!==false;
      const url=String(c.footerChibiImageUrl||chibi.getAttribute('src')||'').trim();
      const size=clamp(Number(c.footerChibiSize)||240,120,420);
      const x=clamp(Number.isFinite(Number(c.footerChibiX))?Number(c.footerChibiX):50,0,100);
      const y=clamp(Number.isFinite(Number(c.footerChibiY))?Number(c.footerChibiY):-28,-260,700);
      if(url)chibi.src=url;
      chibi.style.setProperty('width',`${size}px`,'important');
      chibi.style.setProperty('left',`${x}%`,'important');
      chibi.style.setProperty('top',`${y}px`,'important');
      chibi.style.setProperty('bottom','auto','important');
      chibi.style.setProperty('transform','translate(-50%,-50%)','important');
      chibi.style.setProperty('display',enabled&&url?'block':'none','important');
      chibi.dataset.cmsFooterChibi='1';
    }catch(err){
      console.warn('[CosplayChess] Não foi possível carregar a chibi da footer:',err);
    }
  }

  function start(){
    clean();
    applyFooterChibi();
    const footer=document.querySelector('.site-footer');
    if(!footer)return;
    const observer=new MutationObserver(clean);
    observer.observe(footer,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-fergorverse-instagram','data-cms-global-role']});
    [250,700,1400,2800].forEach(delay=>setTimeout(clean,delay));
    [350,1000,2500].forEach(delay=>setTimeout(applyFooterChibi,delay));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();