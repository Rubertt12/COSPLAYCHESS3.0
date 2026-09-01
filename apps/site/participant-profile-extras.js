(()=>{
  'use strict';
  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;
  if(!db||window.__CC_PARTICIPANT_PROFILE_EXTRAS__)return;
  window.__CC_PARTICIPANT_PROFILE_EXTRAS__=true;
  const BUCKET='cosplaychess-social-media';
  const $=id=>document.getElementById(id);
  let ctx=null,albumId=null,loading=false;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status=(id,msg='',kind='')=>{const el=$(id);if(!el)return;el.textContent=msg;el.dataset.kind=kind;};
  const ext=file=>file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
  const uid=()=>globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);

  async function context(){
    const {data:s}=await db.auth.getSession();
    const user=s?.session?.user;
    if(!user)return null;
    const selected=$('participantProfilePicker')?.value||'';
    let q=db.from('cosplay_participant_profiles').select('id,user_id,public_slug,profile_visible').eq('user_id',user.id).neq('registration_status','cancelled');
    if(selected)q=q.eq('id',selected);
    const {data,error}=await q.order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error||!data)return null;
    return {user,profile:data};
  }

  function build(){
    if($('participantInterestsCard'))return;
    const profileCard=$('participantProfileForm')?.closest('.premium-card');
    const mainGrid=profileCard?.parentElement;
    if(!profileCard||!mainGrid)return;

    const interests=document.createElement('section');
    interests.id='participantInterestsCard';
    interests.className='premium-card participant-extra-card participant-interests-card';
    interests.innerHTML=`<h3 class="premium-section-title"><span class="icon">✦</span> Meus interesses</h3><p class="participant-extra-intro">Esses dados aparecem na seção de interesses do seu perfil público.</p><form id="participantInterestsForm" class="participant-interests-form"><label><span>Animes / Mangás</span><textarea name="anime" maxlength="500" placeholder="Ex.: Naruto, Hunter x Hunter, Dragon Ball..."></textarea></label><label><span>Games</span><textarea name="games" maxlength="500" placeholder="Ex.: Zelda, Final Fantasy, Pokémon..."></textarea></label><label><span>Filmes e Séries</span><textarea name="films_series" maxlength="500" placeholder="Ex.: Harry Potter, Marvel, Stranger Things..."></textarea></label><label><span>Música</span><textarea name="music" maxlength="500" placeholder="Bandas, artistas e estilos que você curte..."></textarea></label><label><span>Hobbies</span><textarea name="hobbies" maxlength="500" placeholder="Ex.: cosplay, fotografia, desenho, RPG..."></textarea></label><div class="participant-extra-actions"><button class="btn gold" type="submit">▣ Salvar interesses</button><span id="participantInterestsStatus" class="participant-extra-status" aria-live="polite"></span></div></form>`;

    const gallery=document.createElement('section');
    gallery.id='participantProfileGalleryCard';
    gallery.className='premium-card participant-extra-card participant-profile-gallery-card';
    gallery.innerHTML=`<div class="participant-extra-head"><div><h3 class="premium-section-title"><span class="icon">▧</span> Fotos do meu perfil</h3><p class="participant-extra-intro">As fotos enviadas aqui ficam salvas e aparecem na galeria do seu perfil público.</p></div><label class="btn gold participant-gallery-upload">＋ Adicionar fotos<input id="participantProfileGalleryFile" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></label></div><div id="participantProfileGallery" class="participant-profile-gallery"><div class="participant-extra-empty">Carregando fotos...</div></div><div id="participantGalleryStatus" class="participant-extra-status" aria-live="polite"></div>`;

    profileCard.insertAdjacentElement('afterend',interests);
    interests.insertAdjacentElement('afterend',gallery);

    $('participantInterestsForm')?.addEventListener('submit',saveInterests);
    $('participantProfileGalleryFile')?.addEventListener('change',uploadGallery);
  }

  async function loadInterests(){
    ctx=await context();
    const form=$('participantInterestsForm');
    if(!ctx||!form)return;
    status('participantInterestsStatus','Carregando...');
    const {data,error}=await db.from('cosplay_profile_interests').select('anime,games,films_series,music,hobbies').eq('profile_id',ctx.profile.id).maybeSingle();
    if(error){status('participantInterestsStatus','Não foi possível carregar os interesses.','error');return;}
    for(const name of ['anime','games','films_series','music','hobbies'])form.elements[name].value=data?.[name]||'';
    status('participantInterestsStatus','');
  }

  async function saveInterests(event){
    event.preventDefault();
    const form=event.currentTarget;
    const button=form.querySelector('button[type="submit"]');
    ctx=await context();
    if(!ctx){status('participantInterestsStatus','Perfil não identificado. Entre novamente.','error');return;}
    button.disabled=true;status('participantInterestsStatus','Salvando...');
    const payload={profile_id:ctx.profile.id};
    for(const name of ['anime','games','films_series','music','hobbies'])payload[name]=String(form.elements[name]?.value||'').trim();
    const {error}=await db.from('cosplay_profile_interests').upsert(payload,{onConflict:'profile_id'});
    button.disabled=false;
    status('participantInterestsStatus',error?'Não foi possível salvar os interesses.':'Interesses salvos no seu perfil.',error?'error':'success');
  }

  async function ensureAlbum(){
    if(albumId)return albumId;
    ctx=ctx||await context();
    if(!ctx)throw new Error('Perfil não identificado.');
    const {data:existing,error:readError}=await db.from('cosplay_social_albums').select('id,visibility').eq('owner_profile_id',ctx.profile.id).eq('name','Fotos do perfil').order('created_at',{ascending:true}).limit(1).maybeSingle();
    if(readError)throw readError;
    if(existing){
      albumId=existing.id;
      if(existing.visibility!=='public')await db.from('cosplay_social_albums').update({visibility:'public'}).eq('id',albumId);
      return albumId;
    }
    const {data,error}=await db.from('cosplay_social_albums').insert({owner_profile_id:ctx.profile.id,name:'Fotos do perfil',description:'Galeria pública do perfil',visibility:'public'}).select('id').single();
    if(error)throw error;
    albumId=data.id;return albumId;
  }

  async function signed(path){
    const {data,error}=await db.storage.from(BUCKET).createSignedUrl(path,3600);
    return error?'':(data?.signedUrl||'');
  }

  async function loadGallery(){
    if(loading)return;loading=true;
    try{
      ctx=await context();albumId=null;
      const root=$('participantProfileGallery');
      if(!ctx||!root)return;
      const {data:albums,error:aerr}=await db.from('cosplay_social_albums').select('id,name,visibility').eq('owner_profile_id',ctx.profile.id).eq('name','Fotos do perfil').order('created_at',{ascending:true}).limit(1);
      if(aerr)throw aerr;
      albumId=albums?.[0]?.id||null;
      if(!albumId){root.innerHTML='<div class="participant-extra-empty">Você ainda não adicionou fotos ao perfil.</div>';return;}
      if(albums[0].visibility!=='public')await db.from('cosplay_social_albums').update({visibility:'public'}).eq('id',albumId);
      const {data:photos,error}=await db.from('cosplay_social_album_photos').select('id,image_path,caption,created_at').eq('album_id',albumId).eq('owner_profile_id',ctx.profile.id).order('created_at',{ascending:false}).limit(60);
      if(error)throw error;
      if(!photos?.length){root.innerHTML='<div class="participant-extra-empty">Você ainda não adicionou fotos ao perfil.</div>';return;}
      root.replaceChildren();
      for(const photo of photos){
        const url=await signed(photo.image_path);
        const item=document.createElement('article');item.className='participant-gallery-item';
        item.innerHTML=`${url?`<img src="${esc(url)}" alt="Foto do perfil" loading="lazy">`:'<div class="participant-gallery-broken">Foto indisponível</div>'}<button type="button" data-remove-photo="${esc(photo.id)}" data-path="${esc(photo.image_path)}" aria-label="Remover foto">×</button>`;
        root.appendChild(item);
      }
      root.querySelectorAll('[data-remove-photo]').forEach(btn=>btn.addEventListener('click',removePhoto));
    }catch(err){console.error(err);const root=$('participantProfileGallery');if(root)root.innerHTML='<div class="participant-extra-empty">Não foi possível carregar as fotos agora.</div>';}
    finally{loading=false;}
  }

  async function uploadGallery(event){
    const input=event.currentTarget;const files=[...(input.files||[])];input.value='';
    if(!files.length)return;
    ctx=await context();if(!ctx){status('participantGalleryStatus','Perfil não identificado.','error');return;}
    if(files.length>10){status('participantGalleryStatus','Envie no máximo 10 fotos por vez.','error');return;}
    status('participantGalleryStatus',`Enviando ${files.length} foto${files.length===1?'':'s'}...`);
    try{
      const aid=await ensureAlbum();let done=0;
      for(const file of files){
        if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use somente JPG, PNG ou WebP.');
        if(file.size>8*1024*1024)throw new Error('Cada foto pode ter no máximo 8 MB.');
        const path=`${ctx.user.id}/${ctx.profile.id}/profile-gallery/${Date.now()}-${uid()}.${ext(file)}`;
        const {error:up}=await db.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
        if(up)throw up;
        const {error:ins}=await db.from('cosplay_social_album_photos').insert({album_id:aid,owner_profile_id:ctx.profile.id,image_path:path,caption:null});
        if(ins){await db.storage.from(BUCKET).remove([path]).catch(()=>{});throw ins;}
        done++;status('participantGalleryStatus',`${done}/${files.length} foto${files.length===1?'':'s'} salva${files.length===1?'':'s'}...`);
      }
      status('participantGalleryStatus','Fotos salvas e visíveis no seu perfil público.','success');await loadGallery();
    }catch(err){console.error(err);status('participantGalleryStatus',err?.message||'Não foi possível salvar as fotos.','error');}
  }

  async function removePhoto(event){
    const btn=event.currentTarget;const id=btn.dataset.removePhoto,path=btn.dataset.path;
    if(!id||!confirm('Remover esta foto do seu perfil?'))return;
    btn.disabled=true;status('participantGalleryStatus','Removendo foto...');
    const {error}=await db.from('cosplay_social_album_photos').delete().eq('id',id);
    if(error){btn.disabled=false;status('participantGalleryStatus','Não foi possível remover a foto.','error');return;}
    if(path)await db.storage.from(BUCKET).remove([path]).catch(()=>{});
    status('participantGalleryStatus','Foto removida.','success');await loadGallery();
  }

  function bindProfileChanges(){
    $('participantProfilePicker')?.addEventListener('change',()=>setTimeout(async()=>{ctx=null;albumId=null;await loadInterests();await loadGallery();},150));
    const dashboard=document.querySelector('[data-participant-dashboard]');
    if(dashboard)new MutationObserver(()=>{if(!dashboard.hidden)setTimeout(async()=>{await loadInterests();await loadGallery();},300);}).observe(dashboard,{attributes:true,attributeFilter:['hidden']});
  }

  function bindJourney(){
    const old=$('participantShareJourney');if(!old)return;
    const fresh=old.cloneNode(true);old.replaceWith(fresh);
    fresh.addEventListener('click',()=>$('participantProfileGalleryFile')?.click());
  }

  function start(){build();bindProfileChanges();setTimeout(bindJourney,50);setTimeout(async()=>{await loadInterests();await loadGallery();},750);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
