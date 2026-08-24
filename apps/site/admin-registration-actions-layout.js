(()=>{
  const ROOT_ID='registrationsList';
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

  function buttonKind(button){
    if(!button)return '';
    if(button.classList.contains('registration-photo-upload-btn'))return 'photo-upload';
    if(button.classList.contains('registration-photo-edit-btn'))return 'photo';
    if(button.classList.contains('privacy-reveal-btn'))return 'contact';
    if(button.classList.contains('registration-email-resend-btn'))return 'email';
    if(button.classList.contains('registration-edit-btn'))return 'edit';
    if(button.classList.contains('registration-delete-btn'))return 'delete';
    const text=(button.textContent||'').replace(/[×✕✖✎▣✉]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
    if(/^trocar foto|^adicionar foto/.test(text))return 'photo-upload';
    if(/^ajustar foto/.test(text))return 'photo';
    if(/^ver contato|^ocultar contato/.test(text))return 'contact';
    if(/^reenviar e-mail|^reenviar email/.test(text))return 'email';
    if(/^editar(?:\s|$)/.test(text))return 'edit';
    if(/^excluir(?:\s|$)/.test(text))return 'delete';
    return '';
  }

  async function resendConfirmation(id,button){
    const registration=localRegistration(id);
    if(!registration){alert('Não foi possível localizar esta inscrição.');return;}
    if(registration.status!=='confirmed'){
      alert('O reenvio está disponível apenas para inscrições confirmadas.');
      return;
    }
    if(!registration.email){alert('Este inscrito não possui e-mail cadastrado.');return;}
    if(!confirm(`Reenviar o e-mail de confirmação para ${registration.full_name||registration.character_name||'este inscrito'}?\n\nDestino: ${registration.email}`))return;

    const db=client();
    if(!db){alert('Conexão com o banco indisponível.');return;}
    const oldText=button.textContent;
    button.disabled=true;
    button.textContent='Enviando...';

    try{
      const {data:{session}}=await db.auth.getSession();
      if(!session?.access_token)throw new Error('Sua sessão administrativa expirou. Entre novamente no painel.');
      const cfg=window.COSPLAYCHESS_CONFIG;
      const response=await fetch(`${cfg.functionsBase}/cosplaychess-resend-confirmation`,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'apikey':cfg.supabaseKey,
          'Authorization':`Bearer ${session.access_token}`
        },
        body:JSON.stringify({registrationId:id})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||result.detail||'Não foi possível reenviar o e-mail.');
      registration.email_status='sent';
      registration.email_error=null;
      button.textContent='E-mail reenviado ✓';
      button.title='Último envio confirmado pelo Brevo';
      alert(result.message||`E-mail reenviado para ${registration.email}.`);
      setTimeout(()=>{button.textContent='Reenviar e-mail';button.disabled=false;},1800);
    }catch(error){
      alert(`Não foi possível reenviar o e-mail: ${error.message||error}`);
      button.textContent=oldText;
      button.disabled=false;
    }
  }

  function ensureEmailButton(row){
    const id=row.dataset.registrationId;
    if(!id)return null;
    let button=row.querySelector('.registration-email-resend-btn');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='mini-btn registration-email-resend-btn';
      button.textContent='Reenviar e-mail';
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        resendConfirmation(id,button);
      });
      row.appendChild(button);
    }
    const registration=localRegistration(id);
    const unavailable=!registration?.email||registration?.status!=='confirmed';
    button.disabled=unavailable;
    button.title=!registration?.email
      ?'Este inscrito não possui e-mail cadastrado'
      :registration?.status!=='confirmed'
        ?'Disponível apenas para inscrições confirmadas'
        :registration?.email_status==='failed'
          ?'O último envio falhou. Clique para tentar novamente.'
          :registration?.email_status==='sent'
            ?'Reenviar a confirmação para este inscrito'
            :'Enviar novamente a confirmação por e-mail';
    return button;
  }

  function ensureBar(row){
    let bar=row.querySelector(':scope > .registration-actions-bar');
    if(bar)return bar;
    bar=document.createElement('div');
    bar.className='registration-actions-bar';
    bar.innerHTML='<div class="registration-actions-status"></div><div class="registration-actions-buttons"></div>';
    row.appendChild(bar);
    return bar;
  }

  function sameOrder(container,desired){
    const current=[...container.children].filter(node=>desired.includes(node));
    return current.length===desired.length&&desired.every((node,index)=>current[index]===node);
  }

  function organizeRow(row){
    if(!row)return false;
    ensureEmailButton(row);
    const status=row.querySelector('select[onchange*="updateRegistrationStatus"]');
    const actionButtons=[...row.querySelectorAll('button')]
      .map(button=>({button,kind:buttonKind(button)}))
      .filter(item=>item.kind);

    if(!status&&!actionButtons.length)return false;

    const bar=ensureBar(row);
    const statusBox=bar.querySelector('.registration-actions-status');
    const buttonsBox=bar.querySelector('.registration-actions-buttons');
    let changed=false;

    if(status&&status.parentElement!==statusBox){
      statusBox.appendChild(status);
      changed=true;
    }

    const priority={'photo-upload':5,photo:10,contact:20,email:25,edit:30,delete:40};
    actionButtons.sort((a,b)=>(priority[a.kind]||99)-(priority[b.kind]||99));
    const desired=actionButtons.map(item=>item.button);

    actionButtons.forEach(({button,kind})=>{
      button.classList.add('registration-card-action',`registration-card-action-${kind}`);
    });

    if(desired.some(button=>button.parentElement!==buttonsBox)||!sameOrder(buttonsBox,desired)){
      desired.forEach(button=>buttonsBox.appendChild(button));
      changed=true;
    }

    const shouldHide=!status&&!actionButtons.length;
    if(bar.hidden!==shouldHide)bar.hidden=shouldHide;
    return changed;
  }

  function organize(){
    const root=document.getElementById(ROOT_ID);
    if(!root)return;
    root.querySelectorAll('.registration-row').forEach(organizeRow);
  }

  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      organize();
    });
  }

  function boot(){
    const root=document.getElementById(ROOT_ID);
    if(!root)return;
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    organize();
    setTimeout(organize,200);
    setTimeout(organize,700);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

(()=>{
  if(window.__COSPLAYCHESS_MANUAL_REGISTRATION_LOADER__)return;
  window.__COSPLAYCHESS_MANUAL_REGISTRATION_LOADER__=true;
  if(!document.querySelector('link[data-manual-registration]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./admin-registration-manual.css?v=20260824-manual3';
    link.dataset.manualRegistration='true';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-manual-registration]')){
    const script=document.createElement('script');
    script.src='./admin-registration-manual.js?v=20260824-manual3';
    script.async=false;
    script.dataset.manualRegistration='true';
    document.body.appendChild(script);
  }
})();
