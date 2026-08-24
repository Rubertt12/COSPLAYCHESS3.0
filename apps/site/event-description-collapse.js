(()=>{
  if(window.__COSPLAYCHESS_EVENT_DESCRIPTION_COLLAPSE__)return;
  window.__COSPLAYCHESS_EVENT_DESCRIPTION_COLLAPSE__=true;

  const grid=document.getElementById('eventsGrid');
  if(!grid)return;

  const setupCard=card=>{
    const body=card.querySelector('.event-body');
    const p=body?.querySelector(':scope > p');
    if(!body||!p||p.closest('.event-description-wrap'))return;

    const wrap=document.createElement('div');
    wrap.className='event-description-wrap';
    p.classList.add('event-description');
    body.insertBefore(wrap,p);
    wrap.appendChild(p);

    const btn=document.createElement('button');
    btn.type='button';
    btn.className='event-description-toggle';
    btn.textContent='Ler mais';
    btn.setAttribute('aria-expanded','false');
    btn.hidden=true;
    wrap.appendChild(btn);

    const sync=()=>{
      if(wrap.classList.contains('is-expanded'))return;
      btn.hidden=!(p.scrollHeight>p.clientHeight+2);
    };

    btn.addEventListener('click',()=>{
      const expanded=wrap.classList.toggle('is-expanded');
      btn.textContent=expanded?'Ler menos':'Ler mais';
      btn.setAttribute('aria-expanded',String(expanded));
      if(!expanded)requestAnimationFrame(sync);
    });

    requestAnimationFrame(()=>requestAnimationFrame(sync));
  };

  const process=()=>grid.querySelectorAll('.event-card').forEach(setupCard);
  const observer=new MutationObserver(process);
  observer.observe(grid,{childList:true});
  process();
  window.addEventListener('resize',()=>requestAnimationFrame(process));
})();
