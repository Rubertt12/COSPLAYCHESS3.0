(()=>{
  const STYLE_ID='instagramCtaFinalFixStyles';
  const FALLBACK_TEXT='Siga o @fergorverse';
  const FALLBACK_URL='https://www.instagram.com/fergorverse/';

  function removeIconOnlyArtifacts(){
    document.getElementById('instagramIconOnlyStyles')?.remove();
    document.getElementById(STYLE_ID)?.remove();
  }

  function injectStyles(){
    removeIconOnlyArtifacts();
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .community-nav [data-fergorverse-instagram]{
        width:auto!important;
        height:52px!important;
        min-width:52px!important;
        max-width:none!important;
        flex:0 0 auto!important;
        padding:0 18px!important;
        border-radius:16px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:10px!important;
        line-height:1!important;
        overflow:hidden!important;
        font-size:11px!important;
        font-weight:900!important;
        letter-spacing:.2px!important;
        white-space:nowrap!important;
        color:#fff!important;
      }
      .community-nav [data-fergorverse-instagram] > svg{display:none!important}
      .community-nav [data-fergorverse-instagram] .instagram-glyph-cms{
        display:block!important;
        position:relative!important;
        width:23px!important;
        height:23px!important;
        min-width:23px!important;
        box-sizing:border-box!important;
        border:2.2px solid #fff!important;
        border-radius:7px!important;
        background:transparent!important;
        opacity:1!important;
        visibility:visible!important;
        pointer-events:none!important;
      }
      .community-nav [data-fergorverse-instagram] .instagram-glyph-cms::before{
        content:""!important;
        position:absolute!important;
        left:50%!important;
        top:50%!important;
        width:7px!important;
        height:7px!important;
        box-sizing:border-box!important;
        border:2px solid #fff!important;
        border-radius:50%!important;
        transform:translate(-50%,-50%)!important;
        background:transparent!important;
      }
      .community-nav [data-fergorverse-instagram] .instagram-glyph-cms::after{
        content:""!important;
        position:absolute!important;
        right:3.5px!important;
        top:3.5px!important;
        width:3px!important;
        height:3px!important;
        border-radius:50%!important;
        background:#fff!important;
      }
      .community-nav [data-fergorverse-instagram] .instagram-cms-label{
        display:inline-block!important;
        position:relative!important;
        z-index:2!important;
        font-size:11px!important;
        font-weight:900!important;
        line-height:1.1!important;
        color:#fff!important;
        white-space:nowrap!important;
      }
      @media(max-width:430px){
        .community-nav [data-fergorverse-instagram]{height:48px!important;padding:0 14px!important;gap:8px!important}
        .community-nav [data-fergorverse-instagram] .instagram-glyph-cms{width:21px!important;height:21px!important;min-width:21px!important}
        .community-nav [data-fergorverse-instagram] .instagram-cms-label{font-size:10px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function cmsContent(){
    return window.__COSPLAYCHESS_PUBLISHED_CMS__?.content || {};
  }

  function ensureButtonStructure(button){
    button.classList.remove('instagram-icon-only');
    button.classList.add('instagram-cta');

    let glyph=button.querySelector(':scope > .instagram-glyph-cms');
    if(!glyph){
      glyph=document.createElement('i');
      glyph.className='instagram-glyph-cms';
      glyph.setAttribute('aria-hidden','true');
    }

    let label=button.querySelector(':scope > .instagram-cms-label');
    if(!label){
      label=document.createElement('span');
      label.className='instagram-cms-label';
    }

    button.replaceChildren(glyph,label);
    return label;
  }

  function applyFromCms(){
    injectStyles();
    const button=document.querySelector('.community-nav [data-fergorverse-instagram]');
    if(!button)return;
    const content=cmsContent();
    const label=ensureButtonStructure(button);
    const text=String(content.instagramText || label.textContent || FALLBACK_TEXT).trim() || FALLBACK_TEXT;
    const url=String(content.instagramUrl || button.getAttribute('href') || FALLBACK_URL).trim() || FALLBACK_URL;
    label.textContent=text;
    button.href=url;
    button.setAttribute('aria-label',text);
    button.setAttribute('title',text);
  }

  function detachLegacyObserver(){
    const nav=document.querySelector('.community-nav');
    if(!nav)return;
    const clone=nav.cloneNode(true);
    nav.replaceWith(clone);
  }

  function init(){
    detachLegacyObserver();
    applyFromCms();
    window.addEventListener('cosplaychess:cms-applied',applyFromCms);
    setTimeout(applyFromCms,350);
    setTimeout(applyFromCms,1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
