(()=>{
  if(window.__COSPLAYCHESS_REGISTRATION_CRUD__)return;
  window.__COSPLAYCHESS_REGISTRATION_CRUD__=true;

  const BUCKET='cosplaychess-character-photos';
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const db=()=>window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();
  let active=null;
  let events=[];
  let frame=0;

  async function refreshRegistrations(){
    try{
      if(typeof loadRegistrations==='function')await loadRegistrations();
      if(typeof renderStats==='function')renderStats();
    }catch{
      const filter=$('#registrationEventFilter');
      if(filter)filter.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function ensureActions(){
    const root=$('#registrationsList');
    if(!root)return;
    root.querySelectorAll('.registration-row[data-registration-id]').forEach(row=>{
      const id=row.dataset.registrationId;
      const main=row.querySelector('.registration-main');
      if(!id||!main)return;

      if(!row.querySelector('.registration-photo-upload-btn')){
        const photo=document.createElement('button');
        photo.type='button';
        photo.className='registration-photo-upload-btn';
        const hasPhoto=Boolean(row.querySelector('.registration-photo-avatar'));
        photo.textContent=hasPhoto?'▣ Trocar foto':'▣ Adicionar foto';
        photo.addEventListener('click',()=>choosePhoto(id));
        main.appendChild(photo);
      }

      if(!row.querySelector('.registration-edit-btn')){
        const edit=document.createElement('button');
        edit.type='button';
        edit.className='registration-edit-btn';
        edit.textContent='✎ Editar';
        edit.addEventListener('click',()=>openEdit(id));
        main.appendChild(edit);
      }

      if(!row.querySelector('.registration-delete-btn')){
        const del=document.createElement('button');
        del.type='button';
        del.className='registration-delete-btn';
        del.textContent='× Excluir';
        del.addEventListener('click',()=>deleteRegistration(id));
        main.appendChild(del);
      }
    });
  }

  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;ensureActions();});
  }

  async function getRegistration(id){
    const client=db();
    if(!client)throw new Error('Conexão com o banco indisponível.');
    const{data,error}=await client.from('cosplay_registrations').select('*').eq('id',id).single();
    if(error)throw error;
    return data;
  }

  async function loadEvents(){
    const client=db();
    if(!client)return[];
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
        <div class="cc-registration-edit-head">
          <span>INSCRIÇÃO</span>
          <h2 id="registrationEditTitle">Editar participante</h2>
          <p>Altere os dados do participante sem precisar refazer a inscrição.</p>
        </div>
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
          <label><span>2ª opção de peça</span><select name="second_piece_preference"><option>Sem segunda preferência</option><option>Peão</option><option>Torre</option><option>Cavalo</option><option>Bispo</option><option>Rainha</option><option>Rei</option><option>Sem preferência</option></select></label>
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
    modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('.cc-registration-edit-close')||e.target.closest('[data-edit-cancel]'))closeEdit();});
    $('#registrationEditForm',modal).addEventListener('submit',saveEdit);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeEdit();});
  }

  function setEditStatus(text,type=''){
    const box=$('#registrationEditStatus');
    if(!box)return;
    box.className=`form-status wide ${type}`.trim();
    box.textContent=text;
  }

  async function openEdit(id){
    ensureModal();
    const modal=$('#registrationEditModal');
    const form=$('#registrationEditForm');
    setEditStatus('Carregando dados...');
    modal.hidden=false;
    document.body.classList.add('cc-registration-edit-opened');
    try{
      const [registration]=await Promise.all([getRegistration(id),events.length?Promise.resolve(events):loadEvents()]);
      active=registration;
      form.elements.event_id.innerHTML=events.map(ev=>`<option value="${esc(ev.id)}">${esc(ev.title)}${ev.start_at?` — ${new Date(ev.start_at).toLocaleDateString('pt-BR')}`:''}</option>`).join('');
      const values={
        event_id:registration.event_id,full_name:registration.full_name,character_name:registration.character_name,
        nick:registration.nick,whatsapp:registration.whatsapp||'',email:registration.email||'',city:registration.city,
        age:registration.age??'',status:registration.status,game_role:registration.game_role||'piece',side_preference:registration.side_preference,
        piece_preference:registration.piece_preference,second_piece_preference:registration.second_piece_preference,
        participation_type:registration.participation_type,chess_level:registration.chess_level,music_name:registration.music_name||'',
        music_url:registration.music_url||registration.theme_music_url||'',notes:registration.notes||''
      };
      Object.entries(values).forEach(([name,value])=>{if(form.elements[name])form.elements[name].value=value??'';});
      $('#registrationEditTitle').textContent=`Editar — ${registration.character_name||registration.full_name}`;
      setEditStatus('');
      form.elements.full_name.focus();
    }catch(error){
      setEditStatus(error.message||'Não foi possível carregar a inscrição.','error');
    }
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
    const form=event.currentTarget;
    const values=Object.fromEntries(new FormData(form));
    const button=form.querySelector('button[type="submit"]');
    button.disabled=true;
    setEditStatus('Salvando alterações...');
    try{
      const payload={
        event_id:values.event_id,
        full_name:String(values.full_name||'').trim(),
        character_name:String(values.character_name||'').trim(),
        nick:String(values.nick||'').trim(),
        whatsapp:String(values.whatsapp||'').trim()||null,
        email:String(values.email||'').trim()||null,
        city:String(values.city||'').trim(),
        age:values.age?Number(values.age):null,
        status:values.status,
        game_role:values.game_role,
        side_preference:values.game_role==='player1'?'Brancas':values.game_role==='player2'?'Pretas':values.side_preference,
        piece_preference:values.game_role==='piece'?values.piece_preference:'Sem preferência',
        second_piece_preference:values.game_role==='piece'?values.second_piece_preference:'Sem segunda preferência',
        participation_type:values.game_role==='piece'?values.participation_type:'Jogador',
        chess_level:values.chess_level,
        music_name:String(values.music_name||'').trim()||null,
        music_url:String(values.music_url||'').trim()||null,
        notes:String(values.notes||'').trim(),
        updated_at:new Date().toISOString()
      };
      const{error}=await client.from('cosplay_registrations').update(payload).eq('id',active.id);
      if(error)throw error;
      setEditStatus('Inscrição atualizada.','success');
      await refreshRegistrations();
      setTimeout(closeEdit,450);
    }catch(error){
      if(String(error?.code)==='23505')setEditStatus('Já existe uma inscrição com esse e-mail ou essa vaga de Player já está ocupada neste evento.','error');
      else setEditStatus(error.message||'Não foi possível salvar.','error');
    }finally{button.disabled=false;}
  }

  async function deleteRegistration(id){
    let registration;
    try{registration=await getRegistration(id);}catch(error){alert(error.message||'Não foi possível localizar a inscrição.');return;}
    const name=registration.character_name||registration.full_name||'este participante';
    if(!confirm(`Excluir definitivamente a inscrição de ${name}?\n\nEssa ação remove o participante da lista e do elenco exportado.`))return;
    const client=db();
    const{error}=await client.from('cosplay_registrations').delete().eq('id',id);
    if(error){alert(`Não foi possível excluir: ${error.message}`);return;}
    await refreshRegistrations();
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
    if(path)await db().storage.from(BUCKET).remove([path]).catch(()=>{});
  }

  async function uploadPhoto(id,file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use uma imagem JPG, PNG ou WebP.');
    if(file.size>5*1024*1024)throw new Error('A foto deve ter no máximo 5 MB.');
    const registration=await getRegistration(id);
    const path=`admin/${registration.event_id}/${id}-${Date.now()}.${fileExt(file)}`;
    const client=db();
    const{error:uploadError}=await client.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError)throw uploadError;
    const url=client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const extra=registration.extra_fields&&typeof registration.extra_fields==='object'?{...registration.extra_fields}:{};
    delete extra.photo_crop;delete extra.photoCrop;
    const{error:updateError}=await client.from('cosplay_registrations').update({character_photo_url:url,extra_fields:extra,updated_at:new Date().toISOString()}).eq('id',id);
    if(updateError){await client.storage.from(BUCKET).remove([path]).catch(()=>{});throw updateError;}
    await removeOldPhoto(registration.character_photo_url);
  }

  function choosePhoto(id){
    const input=document.createElement('input');
    input.type='file';input.accept='image/jpeg,image/png,image/webp';
    input.onchange=async()=>{
      const file=input.files?.[0];if(!file)return;
      const row=document.querySelector(`.registration-row[data-registration-id="${CSS.escape(String(id))}"]`);
      const button=row?.querySelector('.registration-photo-upload-btn');
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

  function boot(){
    ensureModal();
    const root=$('#registrationsList');
    if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    ensureActions();
    setTimeout(ensureActions,250);
    setTimeout(ensureActions,800);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
