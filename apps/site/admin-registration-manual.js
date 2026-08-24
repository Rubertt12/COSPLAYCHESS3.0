(()=>{
  if(window.__COSPLAYCHESS_ADMIN_MANUAL_REGISTRATION__)return;
  window.__COSPLAYCHESS_ADMIN_MANUAL_REGISTRATION__=true;

  const $=(s,r=document)=>r.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getDb=()=>window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();
  let events=[];

  function ensureButton(){
    const actions=$('#registrations .panel-actions');
    if(!actions||$('#manualRegistrationBtn'))return;
    const button=document.createElement('button');
    button.id='manualRegistrationBtn';
    button.type='button';
    button.className='v5-btn dark cc-manual-registration-open';
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Nova inscrição</span>';
    const exportBtn=$('#exportRosterBtn');
    actions.insertBefore(button,exportBtn||null);
    button.addEventListener('click',openModal);
  }

  function ensureModal(){
    if($('#manualRegistrationModal'))return;
    const modal=document.createElement('div');
    modal.id='manualRegistrationModal';
    modal.className='cc-manual-registration-modal';
    modal.hidden=true;
    modal.innerHTML=`
      <div class="cc-manual-registration-card" role="dialog" aria-modal="true" aria-labelledby="manualRegistrationTitle">
        <button class="cc-manual-registration-close" type="button" aria-label="Fechar cadastro">×</button>
        <div class="cc-manual-registration-head">
          <span>CADASTRO PRESENCIAL</span>
          <h2 id="manualRegistrationTitle">Nova inscrição manual</h2>
          <p>Para quem chegou no evento e precisa ser incluído na hora. E-mail e telefone são opcionais.</p>
        </div>
        <form id="manualRegistrationForm" class="cc-manual-registration-form">
          <label class="wide"><span>Evento *</span><select name="event_id" required><option value="">Selecione um evento</option></select></label>
          <label><span>Nome completo *</span><input name="full_name" required autocomplete="name"></label>
          <label><span>Personagem *</span><input name="character_name" required></label>
          <label><span>Apelido</span><input name="nick"></label>
          <label><span>Telefone / WhatsApp</span><input name="whatsapp" inputmode="tel" autocomplete="tel" placeholder="Opcional"></label>
          <label><span>E-mail</span><input type="email" name="email" autocomplete="email" placeholder="Opcional"></label>
          <label><span>Cidade</span><input name="city"></label>
          <label><span>Idade</span><input type="number" name="age" min="8" max="120" inputmode="numeric"></label>
          <label><span>Status</span><select name="status"><option value="confirmed" selected>Confirmado</option><option value="waitlist">Em análise</option><option value="pending">Pendente</option><option value="cancelled">Cancelado</option></select></label>
          <label><span>Lado</span><select name="side_preference"><option>Sem preferência</option><option>Brancas</option><option>Pretas</option></select></label>
          <label><span>Peça preferida</span><select name="piece_preference"><option>Sem preferência</option><option>Peão</option><option>Torre</option><option>Cavalo</option><option>Bispo</option><option>Rainha</option><option>Rei</option></select></label>
          <label><span>2ª opção de peça</span><select name="second_piece_preference"><option>Sem segunda preferência</option><option>Peão</option><option>Torre</option><option>Cavalo</option><option>Bispo</option><option>Rainha</option><option>Rei</option></select></label>
          <label class="wide"><span>Observações</span><textarea name="notes" rows="3" placeholder="Informações rápidas do participante, se necessário"></textarea></label>
          <div class="cc-manual-registration-note wide">Contato opcional para inscrições feitas presencialmente. A pessoa será adicionada à mesma lista das inscrições do site.</div>
          <div id="manualRegistrationStatus" class="form-status wide"></div>
          <div class="cc-manual-registration-actions wide"><button type="button" class="v5-btn ghost" data-manual-cancel>Cancelar</button><button type="submit" class="v5-btn gold">Salvar inscrição</button></div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',event=>{if(event.target===modal||event.target.closest('.cc-manual-registration-close')||event.target.closest('[data-manual-cancel]'))closeModal();});
    $('#manualRegistrationForm',modal).addEventListener('submit',submitRegistration);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden)closeModal();});
  }

  async function loadEvents(){
    const db=getDb();if(!db)return;
    const select=$('#manualRegistrationForm select[name="event_id"]');
    if(!select)return;
    select.innerHTML='<option value="">Carregando eventos...</option>';
    const{data,error}=await db.from('cosplay_events').select('id,title,start_at,published,registration_open').order('start_at',{ascending:false});
    if(error){select.innerHTML='<option value="">Não foi possível carregar os eventos</option>';return;}
    events=data||[];
    select.innerHTML='<option value="">Selecione um evento</option>'+events.map(event=>{
      const date=event.start_at?new Date(event.start_at).toLocaleDateString('pt-BR'):'';
      return `<option value="${esc(event.id)}">${esc(event.title)}${date?` — ${esc(date)}`:''}${event.registration_open?'':' — inscrições fechadas'}</option>`;
    }).join('');
    const filter=$('#registrationEventFilter');
    if(filter?.value&&events.some(event=>event.id===filter.value))select.value=filter.value;
  }

  async function openModal(){
    ensureModal();
    const modal=$('#manualRegistrationModal');
    const form=$('#manualRegistrationForm');
    form.reset();
    form.elements.status.value='confirmed';
    form.elements.side_preference.value='Sem preferência';
    form.elements.piece_preference.value='Sem preferência';
    form.elements.second_piece_preference.value='Sem segunda preferência';
    $('#manualRegistrationStatus').textContent='';
    modal.hidden=false;
    document.body.classList.add('cc-manual-registration-opened');
    await loadEvents();
    form.elements.full_name.focus();
  }

  function closeModal(){
    const modal=$('#manualRegistrationModal');
    if(modal)modal.hidden=true;
    document.body.classList.remove('cc-manual-registration-opened');
  }

  function setStatus(text,type=''){
    const box=$('#manualRegistrationStatus');if(!box)return;
    box.className=`form-status wide ${type}`.trim();box.textContent=text;
  }

  async function submitRegistration(event){
    event.preventDefault();
    const db=getDb();if(!db)return setStatus('Banco de dados indisponível.','error');
    const form=event.currentTarget;
    const data=Object.fromEntries(new FormData(form));
    const saveButton=form.querySelector('button[type="submit"]');
    saveButton.disabled=true;setStatus('Salvando inscrição...');
    try{
      const payload={
        event_id:data.event_id,
        full_name:String(data.full_name||'').trim(),
        character_name:String(data.character_name||'').trim(),
        nick:String(data.nick||'').trim(),
        email:String(data.email||'').trim()||null,
        whatsapp:String(data.whatsapp||'').trim()||null,
        city:String(data.city||'').trim(),
        age:data.age?Number(data.age):null,
        status:data.status||'confirmed',
        side_preference:data.side_preference||'Sem preferência',
        piece_preference:data.piece_preference||'Sem preferência',
        second_piece_preference:data.second_piece_preference||'Sem segunda preferência',
        notes:String(data.notes||'').trim(),
        participation_type:'Cosplayer',
        availability:'Qualquer horário',
        chess_level:'Iniciante',
        extra_fields:{source:'admin_manual',registered_in_person:true,contact_optional:true}
      };
      const{error}=await db.from('cosplay_registrations').insert(payload);
      if(error)throw error;
      setStatus('Inscrição criada com sucesso.','success');
      const filter=$('#registrationEventFilter');
      if(filter){filter.value=payload.event_id;filter.dispatchEvent(new Event('change',{bubbles:true}));}
      else if(typeof window.loadRegistrations==='function')await window.loadRegistrations();
      setTimeout(closeModal,550);
    }catch(error){
      console.error('[Inscrição manual]',error);
      if(String(error?.code)==='23505')setStatus('Já existe uma inscrição com esse e-mail neste evento.','error');
      else setStatus(`Não foi possível salvar: ${error.message||'erro desconhecido'}`,'error');
    }finally{saveButton.disabled=false;}
  }

  function boot(){ensureButton();ensureModal();new MutationObserver(ensureButton).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

(()=>{
  if(window.__COSPLAYCHESS_REGISTRATION_CRUD_ASSET_LOADER__)return;
  window.__COSPLAYCHESS_REGISTRATION_CRUD_ASSET_LOADER__=true;
  const css=document.createElement('link');
  css.rel='stylesheet';css.href='./admin-registration-crud.css?v=20260824-crud3';css.dataset.registrationCrud='true';
  document.head.appendChild(css);
  const script=document.createElement('script');
  script.src='./admin-registration-crud.js?v=20260824-crud3';script.async=false;script.dataset.registrationCrud='true';
  document.body.appendChild(script);
})();
