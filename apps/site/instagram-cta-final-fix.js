(()=>{
  const STYLE_ID='instagramCtaFinalFixStyles';
  const FALLBACK_TEXT='Siga o @fergorverse';
  const FALLBACK_URL='https://www.instagram.com/fergorverse/';
  const ICON_SVG=`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="2.15"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" stroke-width="2.15"/><circle cx="17.35" cy="6.7" r="1.25" fill="currentColor"/></svg>`;

  function removeLegacyArtifacts(){
    document.getElementById('instagramIconOnlyStyles')?.remove();
    document.getElementById(STYLE_ID)?.remove();
  }

  function injectStyles(){
    removeLegacyArtifacts();
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .community-nav [data-fergorverse-instagram]{
        width:auto!important;
        height:58px!important;
        min-width:250px!important;
        max-width:100%!important;
        flex:0 0 auto!important;
        padding:0 24px 0 16px!important;
        border-radius:16px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:flex-start!important;
        gap:14px!important;
        line-height:1!important;
        overflow:hidden!important;
        position:relative!important;
        isolation:isolate!important;
        font-size:13px!important;
        font-weight:900!important;
        letter-spacing:.25px!important;
        white-space:nowrap!important;
        color:#fff!important;
        box-sizing:border-box!important;
      }
      .community-nav [data-fergorverse-instagram]::after,
      .community-nav [data-fergorverse-instagram]::before{
        content:none!important;
        display:none!important;
      }
      .community-nav [data-fergorverse-instagram] .instagram-cms-icon{
        display:inline-grid!important;
        place-items:center!important;
        width:32px!important;
        height:32px!important;
        min-width:32px!important;
        flex:0 0 32px!important;
        color:#fff!important;
        position:relative!important;
        z-index:2!important;
        line-height:0!important;
        margin-left:0!important;
      }
      .community-nav [data-fergorverse-instagram] .instagram-cms-icon svg{
        display:block!important;
        width:32px!important;
        height:32px!important;
        min-width:32px!important;
        max-width:none!important;
        overflow:visible!important;
        opacity:1!important;
        visibility:visible!important;
        color:#fff!important;
        fill:none!important;
        stroke:none!important;
        filter:none!important;
      }
      .community-nav [data-fergorverse-instagram] .instagram-cms-icon svg rect,
      .community-nav [data-fergorverse-instagram] .instagram-cms-icon svg circle:nth-of-type(1){
        fill:none!important;
        stroke:#fff!important;
        stroke-width:2.15!important;
      }
      .community-nav [data-fergorverse-instagram] .instagram-cms-icon svg circle:nth-of-type(2){
        fill:#fff!important;
        stroke:none!important;
      }
      .community-nav [data-fergorverse-instagram] .instagram-cms-label{
        display:inline-block!important;
        position:relative!important;
        z-index:2!important;
        font-size:13px!important;
        font-weight:900!important;
        line-height:1.15!important;
        color:#fff!important;
        white-space:nowrap!important;
        flex:1 1 auto!important;
        text-align:left!important;
        text-shadow:none!important;
      }
      .community-nav [data-fergorverse-instagram]:hover{
        transform:translateY(-2px)!important;
        filter:brightness(1.08)!important;
        box-shadow:0 14px 34px rgba(193,53,132,.30)!important;
      }
      @media(max-width:520px){
        .community-nav [data-fergorverse-instagram]{
          width:100%!important;
          min-width:0!important;
          height:54px!important;
          padding:0 18px 0 14px!important;
          gap:12px!important;
        }
        .community-nav [data-fergorverse-instagram] .instagram-cms-icon,
        .community-nav [data-fergorverse-instagram] .instagram-cms-icon svg{
          width:29px!important;height:29px!important;min-width:29px!important;flex-basis:29px!important
        }
        .community-nav [data-fergorverse-instagram] .instagram-cms-label{font-size:12px!important}
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

    let icon=button.querySelector(':scope > .instagram-cms-icon');
    if(!icon){
      icon=document.createElement('span');
      icon.className='instagram-cms-icon';
      icon.setAttribute('aria-hidden','true');
      icon.innerHTML=ICON_SVG;
    }

    let label=button.querySelector(':scope > .instagram-cms-label');
    if(!label){
      label=document.createElement('span');
      label.className='instagram-cms-label';
    }

    button.replaceChildren(icon,label);
    return label;
  }

  function applyFromCms(){
    injectStyles();
    const button=document.querySelector('.community-nav [data-fergorverse-instagram]');
    if(!button)return;
    const content=cmsContent();
    const previousText=button.querySelector('span')?.textContent?.trim();
    const label=ensureButtonStructure(button);
    const text=String(content.instagramText || previousText || FALLBACK_TEXT).trim() || FALLBACK_TEXT;
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
