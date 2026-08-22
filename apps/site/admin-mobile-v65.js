(()=>{
  const shell=document.getElementById('dashboardPanel');
  const sidebar=document.querySelector('.v6-sidebar');
  if(!shell||!sidebar||shell.querySelector('.v65-mobile-menu'))return;

  const mobile=window.matchMedia('(max-width:1000px)');
  const trigger=document.createElement('button');
  const backdrop=document.createElement('button');
  const sidebarId=sidebar.id||'v65AdminSidebar';
  sidebar.id=sidebarId;

  trigger.type='button';
  trigger.className='v65-mobile-menu';
  trigger.setAttribute('aria-label','Abrir menu administrativo');
  trigger.setAttribute('aria-controls',sidebarId);
  trigger.setAttribute('aria-expanded','false');
  trigger.textContent='☰';

  backdrop.type='button';
  backdrop.className='v65-mobile-backdrop';
  backdrop.setAttribute('aria-label','Fechar menu administrativo');
  backdrop.hidden=true;

  shell.prepend(backdrop);
  shell.prepend(trigger);

  function setOpen(open){
    const next=Boolean(open&&mobile.matches&&!shell.hidden);
    shell.classList.toggle('mobile-nav-open',next);
    shell.classList.remove('collapsed');
    document.body.classList.toggle('admin-mobile-nav-open',next);
    trigger.setAttribute('aria-expanded',String(next));
    trigger.setAttribute('aria-label',next?'Fechar menu administrativo':'Abrir menu administrativo');
    trigger.textContent=next?'×':'☰';
    backdrop.hidden=!next;
  }

  trigger.addEventListener('click',()=>setOpen(!shell.classList.contains('mobile-nav-open')));
  backdrop.addEventListener('click',()=>setOpen(false));
  sidebar.addEventListener('click',event=>{
    if(event.target.closest('a,button[data-mobile-close]'))setOpen(false);
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&shell.classList.contains('mobile-nav-open'))setOpen(false);
  });

  const sync=()=>{
    if(!mobile.matches||shell.hidden)setOpen(false);
    trigger.hidden=!mobile.matches||shell.hidden;
  };
  if(typeof mobile.addEventListener==='function')mobile.addEventListener('change',sync);
  else mobile.addListener(sync);

  new MutationObserver(sync).observe(shell,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('hashchange',()=>setOpen(false));
  sync();
})();
