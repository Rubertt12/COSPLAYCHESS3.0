(()=>{
  if(window.__cosplayGalleryDriveLiveSync)return;
  window.__cosplayGalleryDriveLiveSync=true;

  const db=window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();
  if(!db)return;
  const SESSION_KEY='cosplayGoogleDriveOAuthSession';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function getToken(){
    try{
      const s=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');
      return s?.access_token&&s?.expires_at>Date.now()+5000?s.access_token:'';
    }catch{return''}
  }

  async function refreshGallery(eventId){
    const filter=document.getElementById('galleryEventFilter');
    if(filter){
      const has=[...filter.options].some(o=>o.value===String(eventId));
      if(has)filter.value=String(eventId);
      filter.dispatchEvent(new Event('change',{bubbles:true}));
    }
    try{if(typeof window.loadEvents==='function')await window.loadEvents()}catch{}
    try{if(typeof window.renderStats==='function')window.renderStats()}catch{}
    window.dispatchEvent(new CustomEvent('cosplay:gallery-changed',{detail:{eventId:String(eventId)}}));
  }

  function storagePath(url=''){
    const marker='/storage/v1/object/public/cosplaychess-event-media/';
    const pos=String(url).indexOf(marker);
    if(pos<0)return'';
    try{return decodeURIComponent(String(url).slice(pos+marker.length).split('?')[0])}catch{return''}
  }

  async function driveImageIds(folderId,token){
    const q=`'${String(folderId).replace(/'/g,"\\'")}' in parents and mimeType contains 'image/' and trashed=false`;
    const u=new URL('https://www.googleapis.com/drive/v3/files');
    u.searchParams.set('q',q);
    u.searchParams.set('pageSize','1000');
    u.searchParams.set('fields','files(id)');
    const r=await fetch(u,{headers:{Authorization:`Bearer ${token}`}});
    if(!r.ok)throw new Error(`Google Drive HTTP ${r.status}`);
    const j=await r.json();
    return new Set((j.files||[]).map(x=>String(x.id)));
  }

  async function mirrorDeletedDrivePhotos(eventId,folderId){
    const token=getToken();
    if(!token||!folderId)return 0;
    const live=await driveImageIds(folderId,token);
    const {data,error}=await db.from('cosplay_event_photos')
      .select('id,photo_url,source_file_id')
      .eq('event_id',eventId)
      .eq('source_provider','google_drive');
    if(error)throw error;
    const stale=(data||[]).filter(row=>row.source_file_id&&!live.has(String(row.source_file_id)));
    for(const row of stale){
      const path=storagePath(row.photo_url);
      if(path){try{await db.storage.from('cosplaychess-event-media').remove([path])}catch{}}
      const {error:delErr}=await db.from('cosplay_event_photos').delete().eq('id',row.id);
      if(delErr)throw delErr;
    }
    return stale.length;
  }

  async function waitForSync(eventId,before){
    for(let i=0;i<80;i++){
      await sleep(500);
      const {data}=await db.from('cosplay_google_drive_event_links')
        .select('folder_id,last_synced_at')
        .eq('event_id',eventId)
        .maybeSingle();
      const after=data?.last_synced_at||'';
      if(after&&after!==before){
        try{await mirrorDeletedDrivePhotos(eventId,data?.folder_id)}catch(err){console.warn('Limpeza Google Drive:',err?.message||err)}
        await refreshGallery(eventId);
        return;
      }
    }
  }

  document.addEventListener('click',async e=>{
    const btn=e.target.closest('[data-gd-sync],#gdEventSyncNow');
    if(!btn)return;
    let eventId=btn.dataset.gdSync||'';
    if(!eventId){eventId=document.querySelector('#eventForm')?.elements?.id?.value||''}
    if(!eventId)return;
    let before='';
    try{
      const {data}=await db.from('cosplay_google_drive_event_links').select('last_synced_at').eq('event_id',eventId).maybeSingle();
      before=data?.last_synced_at||'';
    }catch{}
    waitForSync(String(eventId),before);
  },true);

  // Exclusões, uploads e alterações feitas diretamente na aba Galeria já recarregam
  // o grid pelo admin-gallery.js. Este observer apenas avisa os demais módulos da tela.
  let timer=0;
  const watch=()=>{
    const grid=document.getElementById('eventGalleryGrid');
    if(!grid||grid.dataset.liveSync==='1')return false;
    grid.dataset.liveSync='1';
    new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>window.dispatchEvent(new CustomEvent('cosplay:gallery-rendered')),80);
    }).observe(grid,{childList:true,subtree:true});
    return true;
  };
  if(!watch()){
    const t=setInterval(()=>{if(watch())clearInterval(t)},200);
    setTimeout(()=>clearInterval(t),15000);
  }
})();