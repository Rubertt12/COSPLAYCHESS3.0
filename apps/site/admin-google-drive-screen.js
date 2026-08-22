(()=>{
  if(window.__cosplayGoogleDriveScreen)return;
  window.__cosplayGoogleDriveScreen=true;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const db=window.COSPLAYCHESS_DB;

  function removeOneDrive(){
    $$('[href="#onedrive"],#onedrive,#odConnectModal,#odFolderModal').forEach(el=>el.remove());
  }

  function ensureNav(){
    const nav=$('.v6-nav'); if(!nav)return null;
    let a=nav.querySelector('[href="#googledrive"]');
    if(!a){
      a=document.createElement('a');
      a.href='#googledrive';
      a.innerHTML='<i class="gd-nav-mark">G</i><span>Google Drive</span>';
      const titles=$$('.v6-nav-title',nav);
      const cfg=titles.find(x=>x.textContent.includes('CONFIGURAÇÕES'));
      if(cfg)cfg.insertAdjacentElement('afterend',a); else nav.appendChild(a);
    }
    a.classList.add('gd-nav-link');
    return a;
  }

  function decorate(){
    const view=$('#googledrive'); if(!view)return false;
    view.dataset.view='googledrive';
    view.classList.add('v6-view','gd-page');
    if(!view.querySelector('.gd-page-banner')){
      const head=view.querySelector('.v6-management-head');
      const banner=document.createElement('div');
      banner.className='gd-page-banner';
      banner.innerHTML=`<div class="gd-page-brand"><span class="gd-google-logo">G</span><div><span class="gd-eyebrow">INTEGRAÇÃO DE MÍDIA</span><h2>Google Drive</h2><p>Centralize os álbuns dos eventos no Drive e sincronize as fotos para a galeria pública do CosplayChess.</p></div></div><div class="gd-page-badge"><i></i><span>Google Drive API</span></div>`;
      head?.replaceWith(banner);
      const stats=document.createElement('div');
      stats.className='gd-page-stats';
      stats.innerHTML=`<article><span>EVENTOS VINCULADOS</span><b id="gdLinkedMetric">—</b><small>pastas associadas</small></article><article><span>ÚLTIMA SINCRONIZAÇÃO</span><b id="gdLastSyncMetric">—</b><small id="gdLastSyncDetail">nenhuma sincronização</small></article><article><span>PASTA RAIZ</span><b id="gdRootMetric">Não definida</b><small>origem dos álbuns</small></article>`;
      banner.insertAdjacentElement('afterend',stats);
    }
    refreshMetrics();
    return true;
  }

  async function refreshMetrics(){
    const rootName=(()=>{try{return JSON.parse(localStorage.getItem('cosplayGoogleDriveRoot')||'null')?.name}catch{return null}})();
    const rootEl=$('#gdRootMetric'); if(rootEl)rootEl.textContent=rootName||'Não definida';
    if(!db)return;
    try{
      const {data,error}=await db.from('cosplay_google_drive_event_links').select('event_id,folder_name,last_synced_at').order('last_synced_at',{ascending:false,nullsFirst:false});
      if(error)throw error;
      const rows=data||[];
      const linked=$('#gdLinkedMetric'); if(linked)linked.textContent=String(rows.length);
      const last=rows.find(x=>x.last_synced_at);
      const metric=$('#gdLastSyncMetric'), detail=$('#gdLastSyncDetail');
      if(last){
        const d=new Date(last.last_synced_at);
        if(metric)metric.textContent=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
        if(detail)detail.textContent=`${last.folder_name||'Pasta'} · ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
      }else{
        if(metric)metric.textContent='—'; if(detail)detail.textContent='nenhuma sincronização';
      }
    }catch(e){
      const linked=$('#gdLinkedMetric'); if(linked)linked.textContent='—';
    }
  }

  function openDrive({push=true}={}){
    removeOneDrive(); ensureNav();
    if(!decorate())return false;
    $$('.v6-view').forEach(v=>{const on=v.id==='googledrive'||v.dataset.view==='googledrive';v.hidden=!on;v.classList.toggle('is-active',on)});
    $$('.v6-nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#googledrive'));
    document.body.dataset.adminView='googledrive';
    if(push&&location.hash!=='#googledrive')history.replaceState({},'','#googledrive');
    $('#googledrive')?.scrollTo?.({top:0});
    refreshMetrics();
    return true;
  }

  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href="#googledrive"]'); if(!a)return;
    e.preventDefault();e.stopImmediatePropagation();
    openDrive();
  },true);

  window.addEventListener('hashchange',()=>{if(location.hash==='#googledrive')setTimeout(()=>openDrive({push:false}),0)});
  window.addEventListener('cosplay:gallery-updated',()=>refreshMetrics());
  window.addEventListener('cosplay:google-drive-ready',()=>{removeOneDrive();ensureNav();decorate();if(location.hash==='#googledrive')setTimeout(()=>openDrive({push:false}),0)});

  function boot(){removeOneDrive();ensureNav();if(decorate()&&location.hash==='#googledrive')openDrive({push:false});}
  setTimeout(boot,350);setTimeout(boot,900);setTimeout(boot,1800);
})();