(()=>{
  const STYLE_ID='instagramCtaFinalFixStyles';

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .community-nav [data-fergorverse-instagram]{
        width:52px!important;height:52px!important;min-width:52px!important;max-width:52px!important;
        flex:0 0 52px!important;padding:0!important;border-radius:16px!important;
        display:inline-grid!important;place-items:center!important;line-height:1!important;
        overflow:hidden!important;font-size:0!important;color:#fff!important;
      }
      .community-nav [data-fergorverse-instagram] > *:not(.instagram-glyph-final){display:none!important}
      .community-nav [data-fergorverse-instagram] .instagram-glyph-final{
        display:block!important;position:relative!important;width:25px!important;height:25px!important;
        box-sizing:border-box!important;border:2.3px solid #fff!important;border-radius:7px!important;
        opacity:1!important;visibility:visible!important;transform:none!important;
        background:transparent!important;z-index:3!important;pointer-events:none!important;
      }
      .community-nav [data-fergorverse-instagram] .instagram-glyph-final::before{
        content:""!important;position:absolute!important;left:50%!important;top:50%!important;
        width:8px!important;height:8px!important;box-sizing:border-box!important;
        border:2.1px solid #fff!important;border-radius:50%!important;
        transform:translate(-50%,-50%)!important;background:transparent!important;
      }
      .community-nav [data-fergorverse-instagram] .instagram-glyph-final::after{
        content:""!important;position:absolute!important;right:4px!important;top:4px!important;
        width:3.5px!important;height:3.5px!important;border-radius:50%!important;
        background:#fff!important;box-shadow:none!important;transform:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function fixButton(){
    injectStyles();
    const button=document.querySelector('.community-nav [data-fergorverse-instagram]');
    if(!button)return;
    button.classList.add('instagram-cta','instagram-icon-only');
    button.setAttribute('aria-label','Instagram @fergorverse');
    button.setAttribute('title','Instagram @fergorverse');

    let glyph=button.querySelector(':scope > .instagram-glyph-final');
    if(!glyph){
      button.replaceChildren();
      glyph=document.createElement('i');
      glyph.className='instagram-glyph-final';
      glyph.setAttribute('aria-hidden','true');
      button.appendChild(glyph);
    }else{
      [...button.children].forEach(child=>{if(child!==glyph)child.remove();});
    }
  }

  function init(){
    fixButton();
    const nav=document.querySelector('.community-nav');
    if(!nav)return;
    let queued=false;
    new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;fixButton();});
    }).observe(nav,{childList:true,subtree:true,characterData:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
