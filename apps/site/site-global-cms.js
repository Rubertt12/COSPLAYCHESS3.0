(()=>{
  if(window.__COSPLAYCHESS_GLOBAL_CMS_BOOTED__) return;
  window.__COSPLAYCHESS_GLOBAL_CMS_BOOTED__=true;
  const cfg=window.COSPLAYCHESS_CONFIG;
  if(!cfg) return;
  const previewMode=new URLSearchParams(location.search).get('cmsPreview')==='1';
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const db=()=>window.COSPLAYCHESS_DB||window.getCosplayChessDb?.()||window.supabase?.createClient?.(cfg.supabaseUrl,cfg.supabaseKey);
  const setText=(els,v)=>{if(v===undefined||v===null)return;els.forEach(el=>{if(el)el.textContent=String(v)});};
  const setHref=(els,v)=>{if(!v)return;els.forEach(el=>{if(el)el.href=String(v)});};
  const setVisible=(els,v)=>{if(typeof v!=='boolean')return;els.forEach(el=>{if(el)el.hidden=!v});};
  const byHref=(root,parts)=>{if(!root)return[];return[...root.querySelectorAll('a')].filter(a=>parts.some(p=>(a.getAttribute('href')||'').includes(p)));};
  const navPairs=[
    ['navEventsText','navEventsUrl','showNavEvents',['#eventos','index.html#eventos']],
    ['navExperienceText','navExperienceUrl','showNavExperience',['#experiencia','index.html#experiencia']],
    ['navGalleryText','navGalleryUrl','showNavGallery',['galeria-eventos.html']],
    ['navUniverseText','navUniverseUrl','showNavUniverse',['universo.html']],
    ['navRankingText','navRankingUrl','showNavRanking',['ranking.html']],
    ['navAboutText','navAboutUrl','showNavAbout',['sobre.html']],
    ['navInstagramText','instagramUrl','showNavInstagram',['instagram.com']]
  ];
  function brand(c){
    if(c.brandImageUrl)qa('.brand img').forEach(img=>img.src=c.brandImageUrl);
    if(c.faviconUrl){const icon=q('link[rel="icon"]');if(icon)icon.href=c.faviconUrl;}
    setText(qa('.brand span b'),c.brandPrimaryText);setText(qa('.brand span em'),c.brandSecondaryText);
  }
  function nav(c){
    const desktop=q('header.topbar nav'),mobile=q('#mobileMenu');
    navPairs.forEach(([tk,uk,sk,parts])=>{const els=[...byHref(desktop,parts),...byHref(mobile,parts)];setText(els,c[tk]);setHref(els,c[uk]);setVisible(els,c[sk]);});
    const admin=[...byHref(q('.top-actions'),['admin.html']),...byHref(mobile,['admin.html'])];setText(admin,c.adminText);setHref(admin,c.adminUrl);setVisible(admin,c.showAdminButton);
    const join=[...byHref(q('.top-actions'),['cadastro.html']),...byHref(mobile,['cadastro.html'])];setText(join,c.joinText);setHref(join,c.joinUrl);setVisible(join,c.showJoinButton);
  }
  function footer(c){
    qa('footer.footer').forEach(f=>{
      const p=f.querySelector(':scope > p');if(p&&c.footerText!==undefined)p.textContent=c.footerText;
      const insta=[...f.querySelectorAll('[data-fergorverse-instagram],a[href*="instagram.com"]')];setText(insta.map(a=>a.querySelector('span')||a),c.footerInstagramText);setHref(insta,c.footerInstagramUrl||c.instagramUrl);setVisible(insta,c.showFooterInstagram);
      const top=[...f.querySelectorAll('a')].filter(a=>(a.getAttribute('href')||'').startsWith('#top'));setText(top,c.footerTopText);setHref(top,c.footerTopUrl);setVisible(top,c.showFooterTop);
    });
  }
  function seo(c){
    if(c.metaDescription){let meta=q('meta[name="description"]');if(!meta){meta=document.createElement('meta');meta.name='description';document.head.appendChild(meta);}meta.content=c.metaDescription;}
    if(c.themeColor){const meta=q('meta[name="theme-color"]');if(meta)meta.content=c.themeColor;}
  }
  function apply(c){if(!c)return;brand(c);nav(c);footer(c);seo(c);document.documentElement.dataset.globalCms='true';}
  window.COSPLAYCHESS_APPLY_GLOBAL_CMS=apply;
  const map={brandImageUrl:'.brand img',brandPrimaryText:'.brand span b',brandSecondaryText:'.brand span em',navEventsText:'header.topbar nav a[href*="#eventos"]',navExperienceText:'header.topbar nav a[href*="#experiencia"]',navGalleryText:'header.topbar nav a[href*="galeria-eventos"]',navUniverseText:'header.topbar nav a[href*="universo.html"]',navRankingText:'header.topbar nav a[href*="ranking.html"]',navAboutText:'header.topbar nav a[href*="sobre.html"]',navInstagramText:'header.topbar nav a[href*="instagram.com"]',adminText:'.top-actions a[href*="admin.html"]',joinText:'.top-actions a[href*="cadastro.html"]',footerText:'footer.footer > p',footerInstagramText:'footer.footer [data-fergorverse-instagram],footer.footer a[href*="instagram.com"]',footerTopText:'footer.footer a[href^="#top"]'};
  function bindPreview(){
    if(!previewMode)return;
    Object.entries(map).forEach(([field,selector])=>qa(selector).forEach(el=>{el.dataset.cmsGlobalField=field;el.style.cursor='pointer';}));
    if(!window.__COSPLAYCHESS_GLOBAL_PREVIEW_BOUND__){window.__COSPLAYCHESS_GLOBAL_PREVIEW_BOUND__=true;document.addEventListener('click',e=>{const el=e.target.closest('[data-cms-global-field]');if(!el)return;e.preventDefault();e.stopPropagation();parent.postMessage({type:'cosplaychess-cms-select',page:'global',field:el.dataset.cmsGlobalField},location.origin);},true);window.addEventListener('message',e=>{if(e.origin!==location.origin)return;const d=e.data||{};if(d.type==='cosplaychess-cms-preview'&&d.page==='global'){apply(d.content||{});bindPreview();}});}
    parent.postMessage({type:'cosplaychess-cms-preview-ready',page:'global'},location.origin);
  }
  async function init(){
    try{const client=db();if(client){const{data,error}=await client.from('cosplay_site_content').select('content').eq('key','global').eq('published',true).maybeSingle();if(error)throw error;if(data?.content)apply(data.content);}}catch(e){console.warn('[CosplayChess Global CMS]',e);}bindPreview();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
