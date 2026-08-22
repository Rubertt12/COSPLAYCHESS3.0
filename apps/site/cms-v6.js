(()=>{
  const tabs=document.querySelector('.cms-page-tabs');
  if(tabs && !tabs.dataset.v6Ready){
    tabs.dataset.v6Ready='1';
    const buttons=[...tabs.querySelectorAll('button[data-page]')];
    const groups=[
      {title:'PÁGINAS PRINCIPAIS',ids:['landing','about','universe']},
      {title:'COMUNIDADE & JOGO',ids:['registration','hall','ranking','achievements']},
      {title:'CONFIGURAÇÕES GLOBAIS',ids:['global']}
    ];
    tabs.innerHTML='';
    groups.forEach(group=>{
      const wrap=document.createElement('div');wrap.className='cms-nav-group';
      const title=document.createElement('div');title.className='cms-nav-group-title';title.textContent=group.title;wrap.appendChild(title);
      group.ids.forEach(id=>{const b=buttons.find(x=>x.dataset.page===id);if(b)wrap.appendChild(b);});
      tabs.appendChild(wrap);
    });
    buttons.filter(b=>!groups.some(g=>g.ids.includes(b.dataset.page))).forEach(b=>tabs.appendChild(b));
  }

  const sidebar=document.querySelector('.cms-sidebar');
  const toolbar=document.querySelector('.cms-toolbar');
  if(sidebar&&toolbar&&!document.querySelector('.cms-quickbar')){
    const quick=document.createElement('div');quick.className='cms-quickbar';
    quick.innerHTML='<a href="./admin.html">← Admin</a><a href="./index.html" target="_blank" rel="noopener">Ver site ↗</a>';
    toolbar.insertAdjacentElement('beforebegin',quick);
  }

  const search=document.getElementById('cmsSearch');
  const save=document.getElementById('cmsSave');
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save?.click();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search?.focus();}
  });

  if(search&&!search.placeholder.includes('Ctrl'))search.placeholder='Buscar campo...  (Ctrl K)';
  if(save&&!save.title)save.title='Salvar e publicar (Ctrl+S)';

  const status=document.getElementById('cmsStatus');
  if(status){
    const obs=new MutationObserver(()=>{
      if(status.classList.contains('dirty'))document.title='● CMS Visual — alterações pendentes';
      else document.title='CMS Visual — CosplayChess';
    });
    obs.observe(status,{attributes:true,attributeFilter:['class']});
  }
})();