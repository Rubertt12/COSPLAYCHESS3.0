(()=>{
  if(window.__COSPLAYCHESS_REGISTRATION_PHOTO_UPLOAD__)return;
  window.__COSPLAYCHESS_REGISTRATION_PHOTO_UPLOAD__=true;

  const BUCKET='cosplaychess-character-photos';
  const db=()=>window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();
  let frame=0;

  async function refreshRegistrations(){
    try{
      if(typeof loadRegistrations==='function')await loadRegistrations();
      else if(typeof window.renderRegistrations==='function')window.renderRegistrations();
      if(typeof renderStats==='function')renderStats();
    }catch{
      if(typeof window.renderRegistrations==='function')window.renderRegistrations();
    }
  }

  function extractId(item){
    if(item?.dataset?.registrationId)return item.dataset.registrationId;
    const button=item?.querySelector('[onclick*="deleteRegistration("]');
    const source=button?.getAttribute('onclick')||'';
    const match=source.match(/deleteRegistration\('([^']+)'/);
    return match?.[1]||'';
  }

  function hasPhoto(item){
    if(item.querySelector('.registration-photo-avatar img'))return true;
    const avatar=item.querySelector('.registration-card-avatar,.registration-list-avatar,.avatar');
    const bg=avatar?.style?.backgroundImage||'';
    return Boolean(bg&&bg!=='none');
  }

  function targetFor(item){
    if(item.classList.contains('registration-row')){
      return item.querySelector('.registration-actions-buttons')||item.querySelector('.registration-main');
    }
    if(item.classList.contains('registration-card'))return item.querySelector('.registration-card-footer');
    if(item.classList.contains('registration-list-row'))return item.querySelector('.registration-list-actions');
    return null;
  }

  function ensureButtons(){
    const root=document.getElementById('registrationsList');
    if(!root)return;
    root.querySelectorAll('.registration-row[data-registration-id],.registration-card,.registration-list-row').forEach(item=>{
      if(item.querySelector('.registration-photo-upload-btn'))return;
      const id=extractId(item);
      const target=targetFor(item);
      if(!id||!target)return;
      const button=document.createElement('button');
      button.type='button';
      button.className='mini-btn registration-photo-upload-btn';
      button.textContent=hasPhoto(item)?'▣ Trocar foto':'▣ Adicionar foto';
      button.addEventListener('click',()=>choosePhoto(id,button));
      const deleteButton=target.querySelector('.registration-delete-btn,[onclick*="deleteRegistration("]');
      target.insertBefore(button,deleteButton||null);
    });
  }

  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;ensureButtons();});
  }

  async function getRegistration(id){
    const client=db();
    if(!client)throw new Error('Conexão com o banco indisponível.');
    const{data,error}=await client.from('cosplay_registrations').select('*').eq('id',id).single();
    if(error)throw error;
    return data;
  }

  function fileExt(file){
    const byType={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    return byType[file.type]||(file.name.split('.').pop()||'jpg').toLowerCase();
  }

  async function removeOldPhoto(url){
    if(!url)return;
    const marker=`/storage/v1/object/public/${BUCKET}/`;
    const index=String(url).indexOf(marker);
    if(index<0)return;
    const path=decodeURIComponent(String(url).slice(index+marker.length).split('?')[0]);
    if(!path)return;
    try{await db().storage.from(BUCKET).remove([path]);}catch{}
  }

  async function uploadPhoto(id,file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use uma imagem JPG, PNG ou WebP.');
    if(file.size>5*1024*1024)throw new Error('A foto deve ter no máximo 5 MB.');

    const registration=await getRegistration(id);
    const client=db();
    const path=`admin/${registration.event_id}/${id}-${Date.now()}.${fileExt(file)}`;
    const{error:uploadError}=await client.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError)throw uploadError;

    const url=client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const extra=registration.extra_fields&&typeof registration.extra_fields==='object'?{...registration.extra_fields}:{};
    delete extra.photo_crop;
    delete extra.photoCrop;

    const{error:updateError}=await client.from('cosplay_registrations')
      .update({character_photo_url:url,extra_fields:extra,updated_at:new Date().toISOString()})
      .eq('id',id);
    if(updateError){
      try{await client.storage.from(BUCKET).remove([path]);}catch{}
      throw updateError;
    }
    await removeOldPhoto(registration.character_photo_url);
  }

  function choosePhoto(id,button=null){
    const input=document.createElement('input');
    input.type='file';
    input.accept='image/jpeg,image/png,image/webp';
    input.onchange=async()=>{
      const file=input.files?.[0];
      if(!file)return;
      const oldText=button?.textContent||'';
      if(button){button.disabled=true;button.textContent='Enviando foto...';}
      try{
        await uploadPhoto(id,file);
        await refreshRegistrations();
      }catch(error){
        alert(error.message||'Não foi possível enviar a foto.');
        if(button){button.disabled=false;button.textContent=oldText;}
      }
    };
    input.click();
  }

  window.chooseRegistrationPhoto=choosePhoto;

  function boot(){
    const root=document.getElementById('registrationsList');
    if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    ensureButtons();
    setTimeout(ensureButtons,250);
    setTimeout(ensureButtons,800);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
