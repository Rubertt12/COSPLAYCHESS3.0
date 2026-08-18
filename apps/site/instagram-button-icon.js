(()=>{
  const button=document.querySelector('.community-nav [data-fergorverse-instagram]');
  if(!button||button.dataset.instagramIconReady==='1')return;
  button.dataset.instagramIconReady='1';
  button.setAttribute('aria-label','Siga @fergorverse no Instagram');
  const icon=document.createElement('span');
  icon.className='instagram-button-icon';
  icon.setAttribute('aria-hidden','true');
  icon.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.7" r="1.1" fill="currentColor"/></svg>';
  button.textContent='';
  button.append(icon,document.createTextNode('Siga @fergorverse'));
  button.style.display='inline-flex';
  button.style.alignItems='center';
  button.style.justifyContent='center';
  button.style.gap='9px';
})();
