(() => {
  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const BUCKET = 'cosplaychess-character-photos';
  const allowed = new Set(['image/jpeg','image/png','image/webp']);
  const $ = (id) => document.getElementById(id);
  let user = null;
  let profile = null;
  let previewUrl = '';
  let adjusting = false;
  let dragging = false;
  let dragState = null;
  let draftX = 50;
  let draftY = 50;
  let positionDirty = false;

  const safe = (url) => { try { const u=new URL(String(url||'')); return ['http:','https:','blob:'].includes(u.protocol) ? u.href : null; } catch { return null; } };
  const clamp = (value) => Math.max(0,Math.min(100,Math.round(Number(value)||0)));
  const status = (message='', kind='') => { const el=$('participantCoverStatus'); if (!el) return; el.textContent=message; el.dataset.kind=kind; };

  const objectPath = (url) => {
    try {
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const pathname = new URL(url).pathname;
      const index = pathname.indexOf(marker);
      return index >= 0 ? decodeURIComponent(pathname.slice(index + marker.length)) : null;
    } catch { return null; }
  };

  const setDraftFromProfile = () => {
    draftX=clamp(profile?.cover_position_x ?? 50);
    draftY=clamp(profile?.cover_position_y ?? 50);
    positionDirty=false;
  };

  const applyPosition = () => {
    const preview=$('participantCoverPreview');
    const img=preview?.querySelector('img');
    if(img)img.style.objectPosition=`${draftX}% ${draftY}%`;
    const backdrop=$('participantHeroBackdrop');
    if(backdrop)backdrop.style.backgroundPosition=`${draftX}% ${draftY}%`;
    const readout=$('participantCoverPositionReadout');
    if(readout)readout.textContent=`X ${draftX}% · Y ${draftY}%`;
    const save=$('participantCoverSavePosition');
    if(save)save.disabled=!profile?.cover_photo_url||!positionDirty;
  };

  const updatePositionControls = () => {
    const hasCover=Boolean(profile?.cover_photo_url || $('participantCoverPreview')?.querySelector('img'));
    const controls=$('participantCoverPositionControls');
    if(controls)controls.hidden=!hasCover;
    const adjust=$('participantCoverAdjust');
    const center=$('participantCoverCenter');
    const save=$('participantCoverSavePosition');
    if(adjust){adjust.disabled=!hasCover;adjust.textContent=adjusting?'✓ Finalizar ajuste':'✥ Ajustar posição';}
    if(center)center.disabled=!hasCover;
    if(save)save.disabled=!hasCover||!positionDirty;
    const preview=$('participantCoverPreview');
    preview?.classList.toggle('is-adjusting',adjusting&&hasCover);
    const hint=$('participantCoverPositionHint');
    if(hint)hint.textContent=adjusting?'Arraste a imagem para escolher o enquadramento.':'Você pode reposicionar a capa antes de salvar.';
    applyPosition();
  };

  const paint = (url) => {
    const root=$('participantCoverPreview');
    if (!root) return;
    root.replaceChildren();
    const src=safe(url);
    if (!src) {
      const span=document.createElement('span');span.textContent='Sem foto de capa';root.appendChild(span);
      adjusting=false;positionDirty=false;updatePositionControls();
      return;
    }
    const img=document.createElement('img');
    img.src=src;
    img.alt='Foto de capa do perfil';
    img.dataset.lightboxCaption='Foto de capa do perfil';
    img.draggable=false;
    root.appendChild(img);
    requestAnimationFrame(()=>{applyPosition();updatePositionControls();});
  };

  const applyBackdrop = () => {
    const backdrop=$('participantHeroBackdrop');
    if (!backdrop) return;
    const cover=safe(profile?.cover_photo_url);
    if (cover) {
      backdrop.style.backgroundImage=`url("${cover.replace(/"/g,'%22')}")`;
      backdrop.style.backgroundPosition=`${draftX}% ${draftY}%`;
    }
  };

  const ensureEditor = () => {
    if ($('participantCoverEditor')) return true;
    const photoBox=document.querySelector('.premium-photo-box');
    if (!photoBox) return false;
    const box=document.createElement('div');
    box.id='participantCoverEditor';
    box.className='participant-cover-editor';
    box.innerHTML=`<span>Foto de capa</span><div class="participant-cover-preview" id="participantCoverPreview"><span>Sem foto de capa</span></div><div class="participant-cover-position-controls" id="participantCoverPositionControls" hidden><div class="participant-cover-position-copy"><b id="participantCoverPositionHint">Você pode reposicionar a capa antes de salvar.</b><small id="participantCoverPositionReadout">X 50% · Y 50%</small></div><div class="participant-cover-position-buttons"><button class="btn dark" id="participantCoverAdjust" type="button">✥ Ajustar posição</button><button class="btn dark" id="participantCoverCenter" type="button">Centralizar</button><button class="btn gold" id="participantCoverSavePosition" type="button" disabled>Salvar posição</button></div></div><div class="participant-cover-actions"><label class="btn dark participant-cover-upload">▧ Escolher capa<input id="participantCoverFile" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="btn dark" id="participantCoverRemove" type="button">Remover capa</button><span class="participant-cover-status" id="participantCoverStatus"></span></div><div class="participant-cover-help">A capa aparece no topo do seu perfil público. JPG, PNG ou WebP · até 5 MB. <b>Use somente imagens apropriadas para todas as idades.</b></div>`;
    photoBox.insertAdjacentElement('afterend',box);
    $('participantCoverFile')?.addEventListener('change',onFile);
    $('participantCoverRemove')?.addEventListener('click',removeCover);
    $('participantCoverAdjust')?.addEventListener('click',toggleAdjust);
    $('participantCoverCenter')?.addEventListener('click',centerPosition);
    $('participantCoverSavePosition')?.addEventListener('click',savePosition);
    bindDrag();
    return true;
  };

  const selectedProfileId = () => $('participantProfilePicker')?.value || profile?.id || '';

  const loadProfile = async () => {
    const {data:s}=await db.auth.getSession();
    user=s?.session?.user||null;
    if (!user) return false;
    const selected=selectedProfileId();
    let query=db.from('cosplay_participant_profiles').select('id,user_id,cover_photo_url,cover_position_x,cover_position_y,character_photo_url').eq('user_id',user.id).neq('registration_status','cancelled');
    if (selected) query=query.eq('id',selected);
    const {data,error}=selected
      ? await query.limit(1).maybeSingle()
      : await query.order('created_at',{ascending:false}).limit(1).maybeSingle();
    if (error || !data) return false;
    profile=data;
    adjusting=false;
    setDraftFromProfile();
    paint(profile.cover_photo_url);
    applyBackdrop();
    updatePositionControls();
    return true;
  };

  function toggleAdjust() {
    if(!profile?.cover_photo_url)return;
    adjusting=!adjusting;
    updatePositionControls();
    if(adjusting)status('Arraste a capa para reposicionar.');
    else status(positionDirty?'Posição ajustada. Salve para aplicar.':'');
  }

  function centerPosition() {
    if(!profile?.cover_photo_url)return;
    draftX=50;draftY=50;positionDirty=true;applyPosition();updatePositionControls();status('Capa centralizada. Clique em Salvar posição.');
  }

  async function savePosition() {
    if(!profile?.cover_photo_url||!positionDirty)return;
    const button=$('participantCoverSavePosition');if(button)button.disabled=true;
    status('Salvando posição...');
    const {error}=await db.from('cosplay_participant_profiles').update({cover_position_x:draftX,cover_position_y:draftY}).eq('id',profile.id).eq('user_id',user.id);
    if(error){if(button)button.disabled=false;status('Não foi possível salvar a posição.','error');return;}
    profile.cover_position_x=draftX;profile.cover_position_y=draftY;positionDirty=false;adjusting=false;applyPosition();applyBackdrop();updatePositionControls();status('Posição da capa salva.','success');setTimeout(()=>status(''),1800);
  }

  const bindDrag = () => {
    const root=$('participantCoverPreview');
    if(!root||root.dataset.dragBound==='1')return;
    root.dataset.dragBound='1';
    root.addEventListener('click',(e)=>{if(adjusting){e.preventDefault();e.stopPropagation();}},true);
    root.addEventListener('pointerdown',(e)=>{
      if(!adjusting||!root.querySelector('img'))return;
      e.preventDefault();e.stopPropagation();
      dragging=true;root.classList.add('is-dragging');
      const rect=root.getBoundingClientRect();
      dragState={pointerId:e.pointerId,startClientX:e.clientX,startClientY:e.clientY,startX:draftX,startY:draftY,width:Math.max(rect.width,1),height:Math.max(rect.height,1)};
      try{root.setPointerCapture(e.pointerId);}catch{}
    });
    root.addEventListener('pointermove',(e)=>{
      if(!dragging||!dragState||e.pointerId!==dragState.pointerId)return;
      e.preventDefault();
      const dx=e.clientX-dragState.startClientX;const dy=e.clientY-dragState.startClientY;
      draftX=clamp(dragState.startX-(dx/dragState.width)*100);
      draftY=clamp(dragState.startY-(dy/dragState.height)*100);
      positionDirty=true;applyPosition();
    });
    const finish=(e)=>{
      if(!dragging||!dragState||e.pointerId!==dragState.pointerId)return;
      dragging=false;root.classList.remove('is-dragging');
      try{root.releasePointerCapture(e.pointerId);}catch{}
      dragState=null;updatePositionControls();status('Posição ajustada. Clique em Salvar posição.');
    };
    root.addEventListener('pointerup',finish);root.addEventListener('pointercancel',finish);
  };

  async function onFile(event) {
    const input=event.currentTarget;
    const file=input.files?.[0];
    input.value='';
    if (!file) return;
    if (!allowed.has(file.type)) { status('Use JPG, PNG ou WebP.','error'); return; }
    if (file.size>5*1024*1024) { status('A capa deve ter no máximo 5 MB.','error'); return; }
    if (!profile && !await loadProfile()) { status('Não foi possível identificar seu perfil.','error'); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl=URL.createObjectURL(file);
    draftX=50;draftY=50;positionDirty=false;adjusting=false;
    paint(previewUrl);
    status('Enviando capa...');
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
    const rand=crypto.randomUUID?.()||Math.random().toString(36).slice(2);
    const path=`${user.id}/profile-covers/${profile.id}/${Date.now()}-${rand}.${ext}`;
    const oldUrl=profile.cover_photo_url||null;
    const {error:uploadError}=await db.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if (uploadError) { setDraftFromProfile();paint(oldUrl); status('Não foi possível enviar a capa.','error'); return; }
    const {data:publicData}=db.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl=publicData?.publicUrl||null;
    if (!publicUrl) { await db.storage.from(BUCKET).remove([path]).catch(()=>{}); setDraftFromProfile();paint(oldUrl); status('Não foi possível gerar o link da capa.','error'); return; }
    const {error:updateError}=await db.from('cosplay_participant_profiles').update({cover_photo_url:publicUrl,cover_position_x:50,cover_position_y:50}).eq('id',profile.id).eq('user_id',user.id);
    if (updateError) { await db.storage.from(BUCKET).remove([path]).catch(()=>{}); setDraftFromProfile();paint(oldUrl); status('Não foi possível salvar a capa.','error'); return; }
    const oldPath=objectPath(oldUrl);
    if (oldPath?.startsWith(`${user.id}/profile-covers/`)) db.storage.from(BUCKET).remove([oldPath]).catch(()=>{});
    profile.cover_photo_url=publicUrl;profile.cover_position_x=50;profile.cover_position_y=50;
    setDraftFromProfile();paint(publicUrl);applyBackdrop();updatePositionControls();
    status('Capa atualizada. Agora você pode ajustar a posição.','success');
    setTimeout(()=>status(''),2600);
  }

  async function removeCover() {
    if (!profile && !await loadProfile()) return;
    if (!profile.cover_photo_url) return;
    status('Removendo capa...');
    const oldUrl=profile.cover_photo_url;
    const {error}=await db.from('cosplay_participant_profiles').update({cover_photo_url:null,cover_position_x:50,cover_position_y:50}).eq('id',profile.id).eq('user_id',user.id);
    if (error) { status('Não foi possível remover a capa.','error'); return; }
    const oldPath=objectPath(oldUrl);
    if (oldPath?.startsWith(`${user.id}/profile-covers/`)) db.storage.from(BUCKET).remove([oldPath]).catch(()=>{});
    profile.cover_photo_url=null;profile.cover_position_x=50;profile.cover_position_y=50;adjusting=false;setDraftFromProfile();paint(null);
    const fallback=$('participantPhotoPreview')?.querySelector('img')?.src;
    const backdrop=$('participantHeroBackdrop');
    if (backdrop){backdrop.style.backgroundImage=fallback?`url("${fallback.replace(/"/g,'%22')}")`:'';backdrop.style.backgroundPosition='50% 50%';}
    updatePositionControls();status('Capa removida.','success');setTimeout(()=>status(''),1600);
  }

  const refresh = async () => { if (!ensureEditor()) return; bindDrag(); await loadProfile(); };
  const refreshAfterProfileChange = () => { setTimeout(refresh,220);setTimeout(async()=>{await loadProfile();applyBackdrop();},560);setTimeout(()=>{applyPosition();applyBackdrop();},900); };

  const bind = () => {
    ensureEditor();bindDrag();
    $('participantProfilePicker')?.addEventListener('change',refreshAfterProfileChange);
    const dashboard=document.querySelector('[data-participant-dashboard]');
    if (dashboard) new MutationObserver(()=>{ if(!dashboard.hidden) refreshAfterProfileChange(); }).observe(dashboard,{attributes:true,attributeFilter:['hidden']});
    const avatarPreview=$('participantPhotoPreview');
    if (avatarPreview) new MutationObserver(()=>{ if(profile?.cover_photo_url) setTimeout(()=>{applyPosition();applyBackdrop();},60); }).observe(avatarPreview,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    setTimeout(refresh,700);setTimeout(refresh,1800);
  };

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true}); else bind();
})();