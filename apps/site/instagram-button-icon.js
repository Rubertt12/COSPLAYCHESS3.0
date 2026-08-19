(()=>{
  const button=document.querySelector('.community-nav [data-fergorverse-instagram]');
  if(!button||button.dataset.instagramIconReady==='1')return;

  button.dataset.instagramIconReady='1';
  button.classList.add('instagram-cta','instagram-icon-only');
  button.setAttribute('aria-label','Siga @fergorverse no Instagram');
  button.setAttribute('title','Instagram @fergorverse');

  button.textContent='';
  button.style.width='52px';
  button.style.height='52px';
  button.style.minWidth='52px';
  button.style.padding='0';
  button.style.borderRadius='16px';
  button.style.flex='0 0 52px';
  button.style.display='inline-grid';
  button.style.placeItems='center';
  button.style.lineHeight='1';

  const icon=document.createElement('span');
  icon.className='instagram-button-icon';
  icon.setAttribute('aria-hidden','true');
  icon.style.display='grid';
  icon.style.placeItems='center';
  icon.style.width='26px';
  icon.style.height='26px';
  icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:26px;height:26px;display:block"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.7" r="1.1" fill="currentColor"/></svg>';

  button.appendChild(icon);
})();
