(()=>{
  const button=[...document.querySelectorAll('.hero-actions a[href*="cadastro"]')].find(a=>/entrar no tabuleiro/i.test(a.textContent||''));
  if(!button||button.dataset.yattaReady==='1')return;
  button.dataset.yattaReady='1';
  const audio=new Audio('./audio/yata.ogg');
  audio.preload='auto';
  let navigating=false;
  button.addEventListener('click',async e=>{
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||navigating)return;
    const href=button.href;
    if(!href)return;
    e.preventDefault();
    navigating=true;
    button.classList.add('yatta-playing');
    let done=false;
    const go=()=>{if(done)return;done=true;location.href=href};
    const timer=setTimeout(go,850);
    audio.currentTime=0;
    try{
      await audio.play();
      audio.addEventListener('ended',()=>{clearTimeout(timer);go()},{once:true});
    }catch(_){clearTimeout(timer);go()}
  });
})();
