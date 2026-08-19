(()=>{
  const STYLE_ID='instagramCtaV2Styles';
  const FALLBACK_TEXT='Siga o @fergorverse';
  const FALLBACK_URL='https://www.instagram.com/fergorverse/';
  const ICON_SVG=`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.25" fill="currentColor"/></svg>`;

  function cleanupLegacy(){
    ['instagramIconOnlyStyles','instagramCtaFinalFixStyles',STYLE_ID].forEach(id=>document.getElementById(id)?.remove());
  }

  function injectStyles(){
    cleanupLegacy();
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .community-nav [data-fergorverse-instagram].instagram-cta-v2{
        width:min(100%,300px)!important;
        min-width:280px!important;
        height:68px!important;
        padding:8px 14px 8px 10px!important;
        border:1px solid rgba(255,255,255,.20)!important;
        border-radius:18px!important;
        display:grid!important;
        grid-template-columns:48px minmax(0,1fr) 20px!important;
        align-items:center!important;
        gap:12px!important;
        overflow:hidden!important;
        position:relative!important;
        isolation:isolate!important;
        box-sizing:border-box!important;
        color:#fff!important;
        text-decoration:none!important;
        background:linear-gradient(135deg,#833ab4 0%,#c13584 34%,#e1306c 62%,#f77737 100%)!important;
        box-shadow:0 12px 30px rgba(193,53,132,.24)!important;
        transition:transform .2s ease,box-shadow .2s ease,filter .2s ease!important;
      }
      .community-nav [data-fergorverse-instagram].instagram-cta-v2::before,
      .community-nav [data-fergorverse-instagram].instagram-cta-v2::after{
        content:none!important;
        display:none!important;
      }
      .instagram-cta-v2__icon{
        width:48px!important;
        height:48px!important;
        min-width:48px!important;
        border-radius:14px!important;
        display:grid!important;
        place-items:center!important;
        color:#fff!important;
        background:rgba(255,255,255,.14)!important;
        border:1px solid rgba(255,255,255,.16)!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.12)!important;
      }
      .instagram-cta-v2__icon svg{
        width:29px!important;
        height:29px!important;
        display:block!important;
        color:#fff!important;
        overflow:visible!important;
        opacity:1!important;
        visibility:visible!important;
        filter:none!important;
      }
      .instagram-cta-v2__icon svg rect,
      .instagram-cta-v2__icon svg circle:first-of-type{
        fill:none!important;
        stroke:#fff!important;
      }
      .instagram-cta-v2__icon svg circle:last-of-type{
        fill:#fff!important;
        stroke:none!important;
      }
      .instagram-cta-v2__content{
        min-width:0!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:flex-start!important;
        justify-content:center!important;
        gap:3px!important;
        color:#fff!important;
      }
      .instagram-cta-v2__eyebrow{
        display:block!important;
        margin:0!important;
        color:rgba(255,255,255,.78)!important;
        font-size:9px!important;
        line-height:1!important;
        font-weight:800!important;
        letter-spacing:1.15px!important;
        text-transform:uppercase!important;
        white-space:nowrap!important;
      }
      .instagram-cta-v2__label,
      .community-nav [data-fergorverse-instagram] [data-instagram-label]{
        display:block!important;
        margin:0!important;
        color:#fff!important;
        font-size:13px!important;
        line-height:1.15!important;
        font-weight:900!important;
        letter-spacing:.1px!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        opacity:1!important;
        visibility:visible!important;
        text-shadow:0 1px 2px rgba(0,0,0,.16)!important;
      }
      .instagram-cta-v2__arrow{
        display:grid!important;
        place-items:center!important;
        width:20px!important;
        height:20px!important;
        color:rgba(255,255,255,.88)!important;
        font-size:16px!important;
        line-height:1!important;
        transform:translateX(0)!important;
        transition:transform .2s ease!important;
      }
      .community-nav [data-fergorverse-instagram].instagram-cta-v2:hover{
        transform:translateY(-2px)!important;
        filter:brightness(1.06)!important;
        box-shadow:0 16px 36px rgba(193,53,132,.32)!important;
      }
      .community-nav [data-fergorverse-instagram].instagram-cta-v2:hover .instagram-cta-v2__arrow{
        transform:translate(2px,-2px)!important;
      }
      @media(max-width:520px){
        .community-nav [data-fergorverse-instagram].instagram-cta-v2{
          width:100%!important;
          min-width:0!important;
          height:64px!important;
          grid-template-columns:44px minmax(0,1fr) 18px!important;
          padding:8px 12px 8px 9px!important;
          gap:10px!important;
        }
        .instagram-cta-v2__icon{width:44px!important;height:44px!important;min-width:44px!important;border-radius:13px!important}
        .instagram-cta-v2__icon svg{width:27px!important;height:27px!important}
        .instagram-cta-v2__label,.community-nav [data-fergorverse-instagram] [data-instagram-label]{font-size:12px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function cmsContent(){
    return window.__COSPLAYCHESS_PUBLISHED_CMS__?.content || {};
  }

  function buildButton(button){
    button.classList.remove('instagram-cta','instagram-icon-only');
    button.classList.add('instagram-cta-v2');

    const icon=document.createElement('span');
    icon.className='instagram-cta-v2__icon';
    icon.setAttribute('aria-hidden','true');
    icon.innerHTML=ICON_SVG;

    const content=document.createElement('span');
    content.className='instagram-cta-v2__content';

    const eyebrow=document.createElement('small');
    eyebrow.className='instagram-cta-v2__eyebrow';
    eyebrow.textContent='Instagram';

    const label=document.createElement('strong');
    label.className='instagram-cta-v2__label';
    label.dataset.instagramLabel='true';

    const arrow=document.createElement('span');
    arrow.className='instagram-cta-v2__arrow';
    arrow.setAttribute('aria-hidden','true');
    arrow.textContent='↗';

    content.append(eyebrow,label);
    button.replaceChildren(icon,content,arrow);
    return label;
  }

  function applyFromCms(){
    injectStyles();
    const button=document.querySelector('.community-nav [data-fergorverse-instagram]');
    if(!button)return;
    const cms=cmsContent();
    const text=String(cms.instagramText || FALLBACK_TEXT).trim() || FALLBACK_TEXT;
    const url=String(cms.instagramUrl || FALLBACK_URL).trim() || FALLBACK_URL;
    const label=buildButton(button);
    label.textContent=text;
    button.href=url;
    button.target='_blank';
    button.rel='noopener noreferrer';
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
    setTimeout(applyFromCms,300);
    setTimeout(applyFromCms,1100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
