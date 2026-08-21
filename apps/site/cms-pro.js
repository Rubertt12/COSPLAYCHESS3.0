(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  function decorateShell(){
    const tabs=$('.cms-page-tabs');
    if(tabs&&!$('.cms-workspace-label')){
      const label=document.createElement('div');
      label.className='cms-workspace-label';
      label.textContent='CONTEÚDO DO SITE';
      tabs.parentNode.insertBefore(label,tabs);
    }
    const sidebar=$('.cms-sidebar');
    if(sidebar&&!$('.cms-sidebar-footer')){
      const footer=document.createElement('div');
      footer.className='cms-sidebar-footer';
      footer.innerHTML='<a href="./admin.html">Central de Comando</a><a href="./index.html" target="_blank" rel="noopener">Site publicado ↗</a>';
      sidebar.appendChild(footer);
    }
  }

  function addUnsavedBadge(){
    const status=$('#cmsStatus');
    const head=$('.cms-preview-head strong');
    if(!status||!head)return;
    const update=()=>{
      const dirty=status.classList.contains('dirty');
      let badge=$('.cms-unsaved-badge');
      if(dirty&&!badge){badge=document.createElement('span');badge.className='cms-unsaved-badge';badge.textContent='Alterações pendentes';head.appendChild(badge);}
      if(!dirty&&badge)badge.remove();
    };
    new MutationObserver(update).observe(status,{attributes:true,subtree:true,childList:true});
    update();
  }

  function improveGroups(){
    $$('.cms-group').forEach((group,i)=>{
      if(!group.hasAttribute('data-pro-ready')){
        group.setAttribute('data-pro-ready','1');
        if(i===0)group.open=true;
      }
    });
  }

  function improveSearch(){
    const search=$('#cmsSearch');
    if(!search||search.dataset.proReady)return;
    search.dataset.proReady='1';
    search.placeholder='Buscar texto, botão, imagem ou seção...';
    search.addEventListener('input',()=>{
      const term=search.value.trim().toLowerCase();
      if(!term)return;
      $$('.cms-group').forEach(g=>{if(g.textContent.toLowerCase().includes(term))g.open=true;});
    });
  }

  function improveDeviceTabs(){
    const labels={desktop:'▱ Desktop',tablet:'▯ Tablet',mobile:'▯ Celular'};
    $$('[data-device]').forEach(btn=>{if(labels[btn.dataset.device])btn.textContent=labels[btn.dataset.device];});
  }

  function observeEditor(){
    const editor=$('#cmsEditor');
    if(!editor)return;
    const run=()=>improveGroups();
    new MutationObserver(run).observe(editor,{childList:true,subtree:true});
    run();
  }

  function bindTabTitles(){
    const titles={landing:'Landing page',global:'Cabeçalho, rodapé e identidade',registration:'Página de inscrição',about:'Página Sobre',universe:'Universo',hall:'Hall da Fama',ranking:'Ranking',achievements:'Conquistas'};
    $$('[data-page]').forEach(btn=>btn.addEventListener('click',()=>{
      const title=$('#cmsPreviewTitle');
      if(title&&titles[btn.dataset.page])title.childNodes[0].nodeValue=titles[btn.dataset.page];
    }));
  }

  function init(){decorateShell();addUnsavedBadge();improveSearch();improveDeviceTabs();observeEditor();bindTabTitles();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();