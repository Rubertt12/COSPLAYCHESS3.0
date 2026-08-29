(() => {
  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const BUCKET = 'cosplaychess-character-photos';
  const allowed = new Set(['image/jpeg','image/png','image/webp']);
  const $ = (id) => document.getElementById(id);
  let user = null;
  let profile = null;
  let previewUrl = '';

  const safe = (url) => { try { const u=new URL(String(url||'')); return ['http:','https:','blob:'].includes(u.protocol) ? u.href : null; } catch { return null; } };
  const status = (message='', kind='') => { const el=$('participantCoverStatus'); if (!el) return; el.textContent=message; el.dataset.kind=kind; };

  const objectPath = (url) => {
    try {
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const pathname = new URL(url).pathname;
      const index = pathname.indexOf(marker);
      return index >= 0 ? decodeURIComponent(pathname.slice(index + marker.length)) : null;
    } catch { return null; }
  };

  const paint = (url) => {
    const root=$('participantCoverPreview');
    if (!root) return;
    root.replaceChildren();
    const src=safe(url);
    if (!src) { const span=document.createElement('span'); span.textContent='Sem foto de capa'; root.appendChild(span); return; }
    const img=document.createElement('img');
    img.src=src;
    img.alt='Foto de capa do perfil';
    img.dataset.lightboxCaption='Foto de capa do perfil';
    root.appendChild(img);
  };

  const applyBackdrop = () => {
    const backdrop=$('participantHeroBackdrop');
    if (!backdrop) return;
    const cover=safe(profile?.cover_photo_url);
    if (cover) backdrop.style.backgroundImage=`url("${cover.replace(/"/g,'%22')}")`;
  };

  const ensureEditor = () => {
    if ($('participantCoverEditor')) return true;
    const photoBox=document.querySelector('.premium-photo-box');
    if (!photoBox) return false;
    const box=document.createElement('div');
    box.id='participantCoverEditor';
    box.className='participant-cover-editor';
    box.innerHTML=`<span>Foto de capa</span><div class="participant-cover-preview" id="participantCoverPreview"><span>Sem foto de capa</span></div><div class="participant-cover-actions"><label class="btn dark participant-cover-upload">▧ Escolher capa<input id="participantCoverFile" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="btn dark" id="participantCoverRemove" type="button">Remover capa</button><span class="participant-cover-status" id="participantCoverStatus"></span></div><div class="participant-cover-help">A capa aparece no topo do seu perfil público. JPG, PNG ou WebP · até 5 MB. <b>Use somente imagens apropriadas para todas as idades.</b></div>`;
    photoBox.insertAdjacentElement('afterend',box);
    $('participantCoverFile')?.addEventListener('change',onFile);
    $('participantCoverRemove')?.addEventListener('click',removeCover);
    return true;
  };

  const selectedProfileId = () => $('participantProfilePicker')?.value || profile?.id || '';

  const loadProfile = async () => {
    const {data:s}=await db.auth.getSession();
    user=s?.session?.user||null;
    if (!user) return false;
    const selected=selectedProfileId();
    let query=db.from('cosplay_participant_profiles').select('id,user_id,cover_photo_url,character_photo_url').eq('user_id',user.id).neq('registration_status','cancelled');
    if (selected) query=query.eq('id',selected);
    const {data,error}=selected
      ? await query.limit(1).maybeSingle()
      : await query.order('created_at',{ascending:false}).limit(1).maybeSingle();
    if (error || !data) return false;
    profile=data;
    paint(profile.cover_photo_url);
    applyBackdrop();
    return true;
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
    paint(previewUrl);
    status('Enviando capa...');
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
    const rand=crypto.randomUUID?.()||Math.random().toString(36).slice(2);
    const path=`${user.id}/profile-covers/${profile.id}/${Date.now()}-${rand}.${ext}`;
    const oldUrl=profile.cover_photo_url||null;
    const {error:uploadError}=await db.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if (uploadError) { paint(oldUrl); status('Não foi possível enviar a capa.','error'); return; }
    const {data:publicData}=db.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl=publicData?.publicUrl||null;
    if (!publicUrl) { await db.storage.from(BUCKET).remove([path]).catch(()=>{}); paint(oldUrl); status('Não foi possível gerar o link da capa.','error'); return; }
    const {error:updateError}=await db.from('cosplay_participant_profiles').update({cover_photo_url:publicUrl}).eq('id',profile.id).eq('user_id',user.id);
    if (updateError) { await db.storage.from(BUCKET).remove([path]).catch(()=>{}); paint(oldUrl); status('Não foi possível salvar a capa.','error'); return; }
    const oldPath=objectPath(oldUrl);
    if (oldPath?.startsWith(`${user.id}/profile-covers/`)) db.storage.from(BUCKET).remove([oldPath]).catch(()=>{});
    profile.cover_photo_url=publicUrl;
    paint(publicUrl);
    applyBackdrop();
    status('Capa atualizada.','success');
    setTimeout(()=>status(''),1800);
  }

  async function removeCover() {
    if (!profile && !await loadProfile()) return;
    if (!profile.cover_photo_url) return;
    status('Removendo capa...');
    const oldUrl=profile.cover_photo_url;
    const {error}=await db.from('cosplay_participant_profiles').update({cover_photo_url:null}).eq('id',profile.id).eq('user_id',user.id);
    if (error) { status('Não foi possível remover a capa.','error'); return; }
    const oldPath=objectPath(oldUrl);
    if (oldPath?.startsWith(`${user.id}/profile-covers/`)) db.storage.from(BUCKET).remove([oldPath]).catch(()=>{});
    profile.cover_photo_url=null;
    paint(null);
    const fallback=$('participantPhotoPreview')?.querySelector('img')?.src;
    const backdrop=$('participantHeroBackdrop');
    if (backdrop) backdrop.style.backgroundImage=fallback?`url("${fallback.replace(/"/g,'%22')}")`:'';
    status('Capa removida.','success');
    setTimeout(()=>status(''),1600);
  }

  const refresh = async () => {
    if (!ensureEditor()) return;
    await loadProfile();
  };

  const refreshAfterProfileChange = () => {
    setTimeout(refresh,220);
    setTimeout(async()=>{await loadProfile();applyBackdrop();},560);
    setTimeout(applyBackdrop,900);
  };

  const bind = () => {
    ensureEditor();
    $('participantProfilePicker')?.addEventListener('change',refreshAfterProfileChange);
    const dashboard=document.querySelector('[data-participant-dashboard]');
    if (dashboard) new MutationObserver(()=>{ if(!dashboard.hidden) refreshAfterProfileChange(); }).observe(dashboard,{attributes:true,attributeFilter:['hidden']});
    const avatarPreview=$('participantPhotoPreview');
    if (avatarPreview) new MutationObserver(()=>{ if(profile?.cover_photo_url) setTimeout(applyBackdrop,60); }).observe(avatarPreview,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    setTimeout(refresh,700);
    setTimeout(refresh,1800);
  };

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true}); else bind();
})();
