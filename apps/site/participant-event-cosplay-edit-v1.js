(() => {
  'use strict';
  if (window.__CC_PARTICIPANT_EVENT_COSPLAY_EDIT_V1__) return;
  window.__CC_PARTICIPANT_EVENT_COSPLAY_EDIT_V1__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db?.auth) return;
  const BUCKET='cosplaychess-character-photos';
  const allowed=new Set(['image/jpeg','image/png','image/webp']);
  let events=[];
  let primaryRegistrationId='';
  let active=null;
  let pendingFile=null;
  let removePhoto=false;

  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const safe=v=>{try{const u=new URL(String(v||''),location.href);return ['http:','https:','blob:'].includes(u.protocol)?u.href:''}catch{return''}};

  function toast(message,error=false){
    let el=document.getElementById('ccEventCosplayToast');
    if(!el){el=document.createElement('div');el.id='ccEventCosplayToast';el.className='cc-event-cosplay-toast';document.body.appendChild(el)}
    el.textContent=message;el.dataset.kind=error?'error':'success';el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>el.hidden=true,2600);
  }

  function ensureModal(){
    let modal=document.getElementById('ccEventCosplayModal'); if(modal)return modal;
    modal=document.createElement('div');modal.id='ccEventCosplayModal';modal.className='cc-event-cosplay-modal';modal.hidden=true;
    modal.innerHTML=`<div class="cc-event-cosplay-backdrop" data-close></div><section class="cc-event-cosplay-dialog" role="dialog" aria-modal="true" aria-labelledby="ccEventCosplayTitle"><header><div><span>PARTICIPAÇÃO NO EVENTO</span><h3 id="ccEventCosplayTitle">Alterar cosplay</h3><p id="ccEventCosplayEvent"></p></div><button type="button" data-close aria-label="Fechar">×</button></header><form id="ccEventCosplayForm"><label><span>Personagem / cosplay</span><input id="ccEventCosplayName" maxlength="120" required></label><div class="cc-event-cosplay-photo"><div id="ccEventCosplayPreview" class="cc-event-cosplay-preview"><span>Sem foto</span></div><div class="cc-event-cosplay-tools"><label class="btn dark">Escolher nova foto<input id="ccEventCosplayFile" type="file" accept="image/jpeg,image/png,image/webp"></label><button id="ccEventCosplayRemove" class="btn dark" type="button">Remover foto</button><small>JPG, PNG ou WebP · até 5 MB</small></div></div><div class="cc-event-cosplay-note">A alteração vale somente para este evento. Seu perfil social e seus outros eventos não serão modificados.</div><div class="cc-event-cosplay-actions"><span id="ccEventCosplayStatus"></span><button class="btn gold" type="submit">Salvar cosplay deste evento</button></div></form></section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',close));
    q('#ccEventCosplayFile',modal).addEventListener('change',onFile);
    q('#ccEventCosplayRemove',modal).addEventListener('click',()=>{pendingFile=null;removePhoto=true;paintPreview('')});
    q('#ccEventCosplayForm',modal).addEventListener('submit',save);
    return modal;
  }

  function paintPreview(url){
    const root=document.getElementById('ccEventCosplayPreview');if(!root)return;root.replaceChildren();const src=safe(url);
    if(src){const img=document.createElement('img');img.src=src;img.alt='Prévia do cosplay';root.appendChild(img)}else{const span=document.createElement('span');span.textContent='Sem foto';root.appendChild(span)}
  }

  function open(row){
    active=row;pendingFile=null;removePhoto=false;const modal=ensureModal();
    q('#ccEventCosplayTitle',modal).textContent='Alterar cosplay deste evento';
    q('#ccEventCosplayEvent',modal).textContent=row.event_title||'Evento CosplayChess';
    q('#ccEventCosplayName',modal).value=row.character_name||'';
    q('#ccEventCosplayFile',modal).value='';
    q('#ccEventCosplayStatus',modal).textContent='';
    paintPreview(row.character_photo_url||'');
    modal.hidden=false;
  }

  function close(){const modal=document.getElementById('ccEventCosplayModal');if(modal)modal.hidden=true;active=null;pendingFile=null;removePhoto=false;}

  function onFile(event){
    const file=event.currentTarget.files?.[0];if(!file)return;
    if(!allowed.has(file.type)){event.currentTarget.value='';toast('Use JPG, PNG ou WebP.',true);return}
    if(file.size>5*1024*1024){event.currentTarget.value='';toast('A foto deve ter no máximo 5 MB.',true);return}
    pendingFile=file;removePhoto=false;paintPreview(URL.createObjectURL(file));
  }

  async function upload(file,userId,registrationId){
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
    const rand=crypto.randomUUID?.()||Math.random().toString(36).slice(2);
    const path=`${userId}/event-cosplays/${registrationId}/${Date.now()}-${rand}.${ext}`;
    const {error}=await db.storage.from(BUCKET).upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});if(error)throw error;
    const {data}=db.storage.from(BUCKET).getPublicUrl(path);return{path,url:data?.publicUrl||''};
  }

  async function save(event){
    event.preventDefault();if(!active)return;
    const form=event.currentTarget,submit=form.querySelector('button[type="submit"]'),status=q('#ccEventCosplayStatus',form),name=q('#ccEventCosplayName',form).value.trim();
    if(name.length<2){status.textContent='Informe o personagem.';return}
    submit.disabled=true;status.textContent='Salvando...';let uploaded=null;
    try{
      const {data:s}=await db.auth.getSession();const user=s?.session?.user;if(!user)throw new Error('Sessão expirada.');
      let photo=removePhoto?null:(active.character_photo_url||null);
      if(pendingFile){uploaded=await upload(pendingFile,user.id,active.registration_id);photo=uploaded.url||null;}
      const {data,error}=await db.rpc('cosplay_update_my_event_cosplay',{p_registration:active.registration_id,p_character_name:name,p_character_photo_url:photo});
      if(error)throw error;
      active.character_name=data?.character_name||name;active.character_photo_url=data?.character_photo_url||photo||null;
      status.textContent='Cosplay atualizado.';toast('Cosplay deste evento atualizado.');
      setTimeout(()=>location.reload(),500);
    }catch(err){
      if(uploaded?.path)db.storage.from(BUCKET).remove([uploaded.path]).catch(()=>{});
      status.textContent=err?.message?.includes('encerradas')?'As alterações deste evento já foram encerradas.':'Não foi possível salvar a alteração.';toast(status.textContent,true);submit.disabled=false;
    }
  }

  function makeButton(row,compact=false){
    const b=document.createElement('button');b.type='button';b.className=`btn dark cc-event-cosplay-edit${compact?' compact':''}`;b.textContent=compact?'Alterar cosplay':'🎭 Alterar cosplay deste evento';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open(row)});return b;
  }

  function decorate(){
    const items=qa('#participantEventCalendar .participant-calendar-item');
    events.forEach((row,index)=>{
      const primary=String(row.registration_id||'')===String(primaryRegistrationId||'');
      if(!row.is_upcoming||primary)return;
      const item=items[index];if(item&&!q('.cc-event-cosplay-edit',item))item.appendChild(makeButton(row,true));
    });
    const next=events.find(row=>row.is_upcoming&&String(row.registration_id||'')!==String(primaryRegistrationId||''));
    const nextRoot=document.getElementById('participantNextEvent');if(next&&nextRoot&&!q('.cc-event-cosplay-edit',nextRoot))nextRoot.appendChild(makeButton(next,false));
  }

  window.addEventListener('cosplay:participant-events-loaded',event=>{events=Array.isArray(event.detail?.events)?event.detail.events:[];primaryRegistrationId=event.detail?.primaryRegistrationId||'';setTimeout(decorate,50)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(decorate,1500),{once:true});else setTimeout(decorate,1500);
})();
