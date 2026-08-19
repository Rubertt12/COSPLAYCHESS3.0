(()=>{
  const button=document.querySelector('.community-nav [data-fergorverse-instagram]');
  if(!button)return;

  button.classList.add('instagram-cta','instagram-icon-only');
  button.setAttribute('aria-label','Siga @fergorverse no Instagram');
  button.setAttribute('title','Instagram @fergorverse');
  button.style.width='52px';
  button.style.height='52px';
  button.style.minWidth='52px';
  button.style.maxWidth='52px';
  button.style.padding='0';
  button.style.borderRadius='16px';
  button.style.flex='0 0 52px';
  button.style.display='inline-grid';
  button.style.placeItems='center';
  button.style.lineHeight='1';
  button.style.overflow='hidden';
  button.style.whiteSpace='nowrap';

  function iconNode(){
    const icon=document.createElement('span');
    icon.className='instagram-button-icon';
    icon.setAttribute('aria-hidden','true');
    icon.style.cssText='display:grid;place-items:center;width:26px;height:26px;min-width:26px;pointer-events:none';
    icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:26px;height:26px;display:block"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.7" r="1.1" fill="currentColor"/></svg>';
    return icon;
  }

  let enforcing=false;
  function enforceIconOnly(){
    if(enforcing)return;
    const onlyIcon=button.children.length===1&&button.firstElementChild?.classList.contains('instagram-button-icon')&&!button.firstElementChild.nextSibling;
    if(onlyIcon)return;
    enforcing=true;
    button.replaceChildren(iconNode());
    enforcing=false;
  }

  enforceIconOnly();
  button.dataset.instagramIconReady='1';

  const observer=new MutationObserver(()=>enforceIconOnly());
  observer.observe(button,{childList:true,subtree:true,characterData:true});

  window.addEventListener('pageshow',enforceIconOnly);
  setTimeout(enforceIconOnly,250);
  setTimeout(enforceIconOnly,1000);
  setTimeout(enforceIconOnly,2500);
})();
