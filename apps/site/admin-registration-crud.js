(()=>{
  if(window.__COSPLAYCHESS_REGISTRATION_ACTIONS_V5__)return;
  window.__COSPLAYCHESS_REGISTRATION_ACTIONS_V5__=true;

  const BUCKET='cosplaychess-character-photos';
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const db=()=>window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();
  let active=null;
  let events=[];
  let frame=0;

  async function refreshRegistrations(){
    try{
      if(typeof window.loadRegistrations==='function')await window.loadRegistrations();
      else if(typeof loadRegistrations==='function')await loadRegistrations();
      else if(typeof window.renderRegistrations==='function')window.renderRegistrations();
      if(typeof window.renderStats==='function')window.renderStats();
      else if(typeof renderStats==='function')renderStats();
    }catch(error){
      console.error('[Inscrições] Falha ao atualizar lista',error);
      if(typeof window.renderRegistrations==='function')window.renderRegistrations();
    }
  }

  function localRegistration(id){
    try{
      const rows=Array.isArray(window.registrations)?window.registrations:(typeof registrations!=='undefined'&&Array.isArray(registrations)?registrations:[]);
      return rows.find(row=>String(row.id)===String(id))||null;
    }catch{return null;}
  }

  async function getRegistration(id){
    const local=localRegistration(id);
    if(local)return local;
    const client=db();
    if(!client)throw new Error('Conexão com o banco indisponível.');
    const{data,error}=await client.from('cosplay_registrations').select('*').eq('id',id).single();
    if(error)throw error;
    return data;
  }

  function targetFor(row){
    return row.querySelector('.registration-actions-buttons')||row.querySelector('.registration-main');
  }

  function cleanLabel(button){
    return String(button?.textContent||'').replace(/[×✕✖✎▣]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  }

  function matchesKind(button,kind){
    const text=cleanLabel(button);
    if(kind==='photo')return button.classList.contains('registration-photo-upload-btn')||/^trocar foto|^adicionar foto/.test(text);
    if(kind==='contact')return button.classList.contains('privacy-reveal-btn')||/^ver contato|^ocultar contato/.test(text);
    if(kind==='edit')return button.classList.contains('registration-edit-btn')||/^editar(?:\s|$)/.test(text);
    if(kind==='delete')return button.classList.contains('registration-delete-btn')||/^excluir(?:\s|$)/.test(text);
    return false;
  }

  function canonicalButton(row,target,id,kind,label,className,handler){
    const candidates=[...row.querySelectorAll('button')].filter(button=>matchesKind(button,kind));
    let keep=candidates[0]||null;
    candidates.slice(1).forEach(button=>button.remove());

    const signature=`${kind}:${id}:v5`;
    if(keep?.dataset.ccActionSignature===signature)return keep;

    const button=keep?keep.cloneNode(true):document.createElement('button');
    button.type='button';
    button.removeAttribute('onclick');
    button.dataset.ccActionSignature=signature;
    button.dataset.registrationId=String(id);
    button.classList.add('mini-btn',className);
    if(kind==='delete')button.classList.add('danger');
    button.textContent=label;
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      handler(button,event);
    });

    if(keep)keep.replaceWith(button);
    else target.appendChild(button);
    return button;
  }

  const maskEmail=(value='')=>{
    const [local='',domain='']=String(value||'').split('@');
    if(!domain)return '••••••';
    const shown=local.slice(0,Math.min(2,local.length));
    return `${shown}${'•'.repeat(Math.max(4,local.length-shown.length))}@${domain}`;
  };
  const maskPhone=(value='')=>{
    const digits=String(value||'').replace(/\D/g,'');
    return digits.length<4?'••••••••':`••••••${digits.slice(-4)}`;
  };

  function setContact(row,registration,revealed){
    const contact=row.querySelector('.registration-main small');
    if(!contact)return;
    contact.classList.add('registration-contact-private');
    contact.textContent=revealed
      ?`${registration?.email||''} • ${registration?.whatsapp||''} • ${registration?.side_preference||''}`
      :`${maskEmail(registration?.email)} • ${maskPhone(registration?.whatsapp)} • ${registration?.side_preference||''}`;
  }

  function ensureActions(){
    const root=$('#registrationsList');
    if(!root)return;
    root.querySelectorAll('.registration-row[data-registration-id]').forEach(row=>{
      const id=row.dataset.registrationId;
      const target=targetFor(row);
      const registration=localRegistration(id);
      if(!id||!target)return;

      row.dataset.privacyReady='1';
      setContact(row,registration,false);

      const hasPhoto=Boolean(row.querySelector('.registration-photo-avatar img'));
      canonicalButton(row,target,id,'photo',hasPhoto?'▣ Trocar foto':'▣ Adicionar foto','registration-photo-upload-btn',button=>choosePhoto(id,button));

      const contactButton=canonicalButton(row,target,id,'contact','Ver contato','privacy-reveal-btn',button=>{
        const show=button.dataset.revealed!=='1';
        button.dataset.revealed=show?'1':'0';
        button.textContent=show?'Ocultar contato':'Ver contato';
        setContact(row,localRegistration(id)||registration,show);
      });
      contactButton.dataset.revealed='0';

      canonicalButton(row,target,id,'edit','Editar','registration-edit-btn',()=>openEdit(id));
      canonicalButton(row,target,id,'delete','Excluir','registration-delete-btn',button=>deleteRegistration(id,button));
    });
  }

  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;ensureActions();});
  }

  async function loadEvents(){
    const client=db();
    if(!client)throw new Error('Conexão com o banco indisponível.');
    const{data,error}=await client.from('cosplay_events').select('id,title,start_at').order('start_at',{ascending:false});
    if(error)throw error;
    events=data||[];
    return events;
  }

  function ensureModal(){
    if($('#registrationEditModal'))return;
    const modal=document.createElement('div');
    modal.id='registrationEditModal';
    modal.className='cc-registration-edit-modal';
    modal.hidden=true;
    modal.innerHTML=`
      <div class="cc-registration-edit-card" role="dialog" aria-modal="true" aria-labelledby="registrationEditTitle">
        <button class="cc-registration-edit-close" type="button" aria-label="Fechar">×</button>
        <div class="cc-registration-edit-head"><span>INSCRIÇÃO</span><h2 id="registrationEditTitle">Editar participante</h2><p>Altere os dados do participante sem precisar refazer a inscrição.</p></div>
        <form id="registrationEditForm" class="cc-registration-edit-form">
          <label class="wide"><span>Evento *</span><select name="event_id" required></select></label>
          <label><span>Nome completo *</span><input name="full_name" required></label>
          <label><span>Personagem *</span><input name="character_name" required></label>
          <label><span>Apelido</span><input name="nick"></label>
          <label><span>Telefone / WhatsApp</span><input name="whatsapp" inputmode="tel"></label>
          <label><span>E-mail</span><input type="email" name="email"></label>
          <label><span>Cidade</span><input name="city"></label>
          <label><span>Idade</span><input type="number" name="age" min="8" max="120"></label>
          <label><span>Status</span><select name="status"><option value="confirmed">Confirmado</option><option value="waitlist">Em análise</option><option value="pending">Pendente</option><option value="cancelled">Cancelado</option></select></label>
          <label><span>Função</span><select name="game_role"><option value="piece">Peça</option><option value="player1">Player 1 — Brancas</option><option value="player2">Player 2 — Pretas</option></select></label>
          <label><span>Lado</span><select name="side_preference"><option>Sem preferência</option><option>Brancas</option><option>Pretas</option></select></label>
          <label><span>Peça preferida</span><select name="piece_preference"><option>Sem preferência</option><option>Peão</option><option>Torre</option><option>Cavalo</option><option>Bispo</option><option>Rainha</option><option>Rei</option></select></label>
          <label><span>2ª opção de peça</span><select name="second_piece_preference"><option>Sem segunda preferência</option><option>Peão</option><option>Torre</option><option>Cavalo</option><option>Bispo</option><option>Rainha</option><option>Rei</option></select></label>
          <label><span>Participação</span><select name="participation_type"><option>Cosplayer</option><option>Jogador e cosplayer</option><option>Jogador</option></select></label>
          <label><span>Nível no xadrez</span><select name="chess_level"><option>Iniciante</option><option>Intermediário</option><option>Avançado</option><option>Competitivo</option></select></label>
          <label><span>Música / tema</span><input name="music_name"></label>
          <label><span>Link da música</span><input type="url" name="music_url"></label>
          <label class="wide"><span>Observações</span><textarea name="notes" rows="3"></textarea></label>
          <div id="registrationEditStatus" class="form-status wide"></div>
          <div class="cc-registration-edit-actions wide"><button type="button" class="v5-btn ghost" data-edit-cancel>Cancelar</button><button type="submit" class="v5-btn gold">Salvar alterações</button></div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',event=>{if(event.target===modal||event.target.closest('.cc-registration-edit-close')||event.target.closest('[data-edit-cancel]'))closeEdit();});
    $('#registrationEditForm',modal).addEventListener('submit',saveEdit);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden)closeEdit();});
  }

  function editStatus(text,type=''){
    const box=$('#registrationEditStatus');
    if(!box)return;
    box.className=`form-status wide ${type}`.trim();
    box.textContent=text;
  }

  async function openEdit(id){
    ensureModal();
    const modal=$('#registrationEditModal');
    const form=$('#registrationEditForm');
    modal.hidden=false;
    document.body.classList.add('cc-registration-edit-opened');
    editStatus('Carregando dados...');
    try{
      const registration=await getRegistration(id);
      if(!events.length)await loadEvents();
      active=registration;
      form.elements.event_id.innerHTML=events.map(event=>`<option value="${esc(event.id)}">${esc(event.title)}${event.start_at?` — ${new Date(event.start_at).toLocaleDateString('pt-BR')}`:''}</option>`).join('');
      const values={event_id:registration.event_id,full_name:registration.full_name,character_name:registration.character_name,nick:registration.nick,whatsapp:registration.whatsapp||'',email:registration.email||'',city:registration.city,age:registration.age??'',status:registration.status,game_role:registration.game_role||'piece',side_preference:registration.side_preference||'Sem preferência',piece_preference:registration.piece_preference||'Sem preferência',second_piece_preference:registration.second_piece_preference||'Sem segunda preferência',participation_type:registration.participation_type||'Cosplayer',chess_level:registration.chess_level||'Iniciante',music_name:registration.music_name||'',music_url:registration.music_url||registration.theme_music_url||'',notes:registration.notes||''};
      Object.entries(values).forEach(([name,value])=>{if(form.elements[name])form.elements[name].value=value??'';});
      $('#registrationEditTitle').textContent=`Editar — ${registration.character_name||registration.full_name||'participante'}`;
      editStatus('');
      form.elements.full_name.focus();
    }catch(error){editStatus(error.message||'Não foi possível carregar a inscrição.','error');}
  }

  function closeEdit(){
    const modal=$('#registrationEditModal');
    if(modal)modal.hidden=true;
    active=null;
    document.body.classList.remove('cc-registration-edit-opened');
  }

  async function saveEdit(event){
    event.preventDefault();
    if(!active)return;
    const client=db();
    if(!client)return editStatus('Conexão com o banco indisponível.','error');
    const form=event.currentTarget;
    const values=Object.fromEntries(new FormData(form));
    const button=form.querySelector('button[type="submit"]');
    button.disabled=true;
    editStatus('Salvando alterações...');
    try{
      const payload={event_id:values.event_id,full_name:String(values.full_name||'').trim(),character_name:String(values.character_name||'').trim(),nick:String(values.nick||'').trim(),whatsapp:String(values.whatsapp||'').trim()||null,email:String(values.email||'').trim()||null,city:String(values.city||'').trim(),age:values.age?Number(values.age):null,status:values.status,game_role:values.game_role,side_preference:values.game_role==='player1'?'Brancas':values.game_role==='player2'?'Pretas':values.side_preference,piece_preference:values.game_role==='piece'?values.piece_preference:'Sem preferência',second_piece_preference:values.game_role==='piece'?values.second_piece_preference:'Sem segunda preferência',participation_type:values.game_role==='piece'?values.participation_type:'Jogador',chess_level:values.chess_level,music_name:String(values.music_name||'').trim()||null,music_url:String(values.music_url||'').trim()||null,notes:String(values.notes||'').trim(),updated_at:new Date().toISOString()};
      const{data,error}=await client.from('cosplay_registrations').update(payload).eq('id',active.id).select('id').single();
      if(error)throw error;
      if(!data?.id)throw new Error('O cadastro não foi atualizado.');
      editStatus('Inscrição atualizada.','success');
      await refreshRegistrations();
      setTimeout(closeEdit,400);
    }catch(error){editStatus(error.message||'Não foi possível salvar.','error');}
    finally{button.disabled=false;}
  }

  async function deleteRegistration(id,button=null){
    const client=db();
    if(!client){alert('Conexão com o banco indisponível.');return;}
    let registration;
    try{registration=await getRegistration(id);}catch(error){alert(error.message||'Não foi possível localizar a inscrição.');return;}
    const name=registration.character_name||registration.full_name||'este participante';
    if(!confirm(`Excluir definitivamente a inscrição de ${name}?\n\nEssa ação não pode ser desfeita.`))return;
    const oldText=button?.textContent||'Excluir';
    if(button){button.disabled=true;button.textContent='Excluindo...';}
    try{
      const{data,error}=await client.from('cosplay_registrations').delete().eq('id',id).select('id');
      if(error)throw error;
      if(!Array.isArray(data)||!data.some(row=>String(row.id)===String(id)))throw new Error('O banco não confirmou a exclusão desta inscrição.');
      await refreshRegistrations();
    }catch(error){
      alert(`Não foi possível excluir: ${error.message||error}`);
      if(button){button.disabled=false;button.textContent=oldText;}
    }
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
    delete extra.photo_crop;delete extra.photoCrop;
    const{error:updateError}=await client.from('cosplay_registrations').update({character_photo_url:url,extra_fields:extra,updated_at:new Date().toISOString()}).eq('id',id);
    if(updateError){try{await client.storage.from(BUCKET).remove([path]);}catch{}throw updateError;}
    await removeOldPhoto(registration.character_photo_url);
  }

  function choosePhoto(id,button=null){
    const input=document.createElement('input');
    input.type='file';input.accept='image/jpeg,image/png,image/webp';
    input.onchange=async()=>{
      const file=input.files?.[0];if(!file)return;
      const oldText=button?.textContent||'';
      if(button){button.disabled=true;button.textContent='Enviando foto...';}
      try{await uploadPhoto(id,file);await refreshRegistrations();}
      catch(error){alert(error.message||'Não foi possível enviar a foto.');if(button){button.disabled=false;button.textContent=oldText;}}
    };
    input.click();
  }

  window.openRegistrationEditor=openEdit;
  window.deleteRegistration=(id)=>deleteRegistration(id,null);
  window.chooseRegistrationPhoto=choosePhoto;

  function boot(){
    ensureModal();
    const root=$('#registrationsList');
    if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    ensureActions();
    setTimeout(ensureActions,200);
    setTimeout(ensureActions,700);
    setTimeout(ensureActions,1400);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
