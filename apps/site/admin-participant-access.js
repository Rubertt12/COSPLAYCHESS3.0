(()=>{
  if(window.__COSPLAYCHESS_PARTICIPANT_ACCESS_ADMIN__)return;
  window.__COSPLAYCHESS_PARTICIPANT_ACCESS_ADMIN__=true;

  const accessByRegistration=new Map();
  let refreshPromise=null;
  let frame=0;

  function client(){
    return window.COSPLAYCHESS_DB||window.getCosplayChessDb?.()||null;
  }

  function localRegistration(id){
    try{
      const rows=typeof registrations!=='undefined'&&Array.isArray(registrations)?registrations:[];
      return rows.find(row=>String(row.id)===String(id))||null;
    }catch{return null;}
  }

  function stateMeta(status){
    if(status==='invited')return{label:'Convite enviado',button:'Reenviar acesso',tone:'invited'};
    if(status==='active')return{label:'Conta ativa',button:'Enviar recuperação',tone:'active'};
    if(status==='blocked')return{label:'Acesso bloqueado',button:'Bloqueado',tone:'blocked'};
    return{label:'Acesso não enviado',button:'Liberar acesso',tone:'not-sent'};
  }

  function formatDate(value){
    if(!value)return'';
    try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));}
    catch{return'';}
  }

  async function refreshAccessStates(){
    if(refreshPromise)return refreshPromise;
    refreshPromise=(async()=>{
      const db=client();
      if(!db)return;
      const{data:{session}}=await db.auth.getSession();
      if(!session?.user)return;
      const{data,error}=await db.from('cosplay_participant_access')
        .select('registration_id,status,invite_count,last_invited_at,activated_at');
      if(error){
        if(!/permission|policy|jwt|auth/i.test(error.message||''))console.warn('[CosplayChess] Falha ao carregar acessos dos participantes:',error.message);
        return;
      }
      accessByRegistration.clear();
      (data||[]).forEach(row=>accessByRegistration.set(String(row.registration_id),row));
      organize();
    })().finally(()=>{refreshPromise=null;});
    return refreshPromise;
  }

  async function sendAccess(registration,button){
    const db=client();
    if(!db){alert('Conexão com o banco indisponível.');return;}
    if(!registration?.email){alert('Este participante não possui e-mail cadastrado.');return;}
    if(registration.status!=='confirmed'){alert('Confirme a inscrição antes de liberar o acesso.');return;}

    const current=accessByRegistration.get(String(registration.id));
    const meta=stateMeta(current?.status);
    if(current?.status==='blocked'){alert('Este acesso está bloqueado.');return;}
    const active=current?.status==='active';
    const action=active?'Enviar um link para o participante criar uma nova senha?':current?.status==='invited'?'Reenviar o link de criação de senha?':'Liberar a Área do Participante e enviar o link para criação da senha?';
    if(!confirm(`${action}\n\nParticipante: ${registration.full_name||registration.character_name||'Inscrito'}\nE-mail: ${registration.email}`))return;

    const oldText=button.textContent;
    button.disabled=true;
    button.dataset.busy='1';
    button.textContent='Enviando...';
    try{
      const{data:{session}}=await db.auth.getSession();
      if(!session?.access_token)throw new Error('Sua sessão administrativa expirou. Entre novamente.');
      const cfg=window.COSPLAYCHESS_CONFIG;
      const response=await fetch(`${cfg.functionsBase}/cosplaychess-participant-invite`,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'apikey':cfg.supabaseKey,
          'Authorization':`Bearer ${session.access_token}`
        },
        body:JSON.stringify({registrationId:registration.id})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||result.detail||'Não foi possível enviar o acesso.');
      await refreshAccessStates();
      alert(result.message||`Acesso enviado para ${registration.email}.`);
    }catch(error){
      alert(`Não foi possível enviar o acesso: ${error.message||error}`);
    }finally{
      button.dataset.busy='0';
      button.disabled=false;
      button.textContent=oldText;
      organize();
    }
  }

  function ensureControls(row){
    const id=String(row?.dataset?.registrationId||'');
    if(!id)return;
    const registration=localRegistration(id);
    if(!registration)return;

    const bar=row.querySelector(':scope > .registration-actions-bar');
    if(!bar)return;
    const statusBox=bar.querySelector('.registration-actions-status');
    const buttonsBox=bar.querySelector('.registration-actions-buttons');
    if(!statusBox||!buttonsBox)return;

    let badge=statusBox.querySelector('.participant-access-state');
    if(!badge){
      badge=document.createElement('span');
      badge.className='participant-access-state';
      statusBox.appendChild(badge);
    }

    let button=buttonsBox.querySelector('.registration-participant-access-btn');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='mini-btn registration-card-action registration-participant-access-btn';
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        const live=localRegistration(id);
        if(live)sendAccess(live,button);
      });
      buttonsBox.appendChild(button);
    }

    const current=accessByRegistration.get(id)||null;
    const meta=stateMeta(current?.status);
    const unavailable=!registration.email||registration.status!=='confirmed';
    badge.className=`participant-access-state ${meta.tone}`;
    badge.textContent=unavailable
      ?(!registration.email?'Sem e-mail para acesso':'Acesso após confirmação')
      :meta.label;
    badge.title=current?.status==='active'&&current?.activated_at
      ?`Conta ativada em ${formatDate(current.activated_at)}`
      :current?.last_invited_at
        ?`Último envio: ${formatDate(current.last_invited_at)}${current?.invite_count?` · ${current.invite_count} envio(s)`:''}`
        :'';

    if(button.dataset.busy!=='1')button.textContent=meta.button;
    button.disabled=button.dataset.busy==='1'||unavailable||current?.status==='blocked';
    button.title=!registration.email
      ?'Cadastre um e-mail antes de liberar o acesso'
      :registration.status!=='confirmed'
        ?'Disponível somente para inscrições confirmadas'
        :current?.status==='active'
          ?'Enviar link seguro para criação de uma nova senha'
          :current?.status==='invited'
            ?'Reenviar o convite da Área do Participante'
            :'Liberar a Área do Participante';
  }

  function organize(){
    const root=document.getElementById('registrationsList');
    if(!root)return;
    root.querySelectorAll('.registration-row').forEach(ensureControls);
  }

  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;organize();});
  }

  function boot(){
    const root=document.getElementById('registrationsList');
    if(!root)return;
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    organize();
    refreshAccessStates();
    const db=client();
    db?.auth?.onAuthStateChange?.(()=>setTimeout(()=>refreshAccessStates(),0));
    setTimeout(refreshAccessStates,500);
    setTimeout(refreshAccessStates,1600);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
