(()=>{
  if(window.__CC_ADMIN_CONTACT_PRIVACY_V2__)return;
  window.__CC_ADMIN_CONTACT_PRIVACY_V2__=true;

  const root=document.getElementById('registrationsList');
  const exportBtn=document.getElementById('exportRosterBtn');
  if(!root)return;

  const revealed=new Set();
  let forceMaskAll=false;
  let privacyFrame=0;

  const maskEmail=(value='')=>{
    const [local='',domain='']=String(value||'').split('@');
    if(!domain)return '••••••';
    const shown=local.slice(0,Math.min(2,local.length));
    return `${shown}${'•'.repeat(Math.max(4,local.length-shown.length))}@${domain}`;
  };
  const maskPhone=(value='')=>{
    const digits=String(value||'').replace(/\D/g,'');
    if(digits.length<4)return '••••••••';
    return `••••••${digits.slice(-4)}`;
  };
  const rows=()=>{
    try{return typeof registrations!=='undefined'&&Array.isArray(registrations)?registrations:[];}
    catch{return [];}
  };
  const registrationById=id=>rows().find(r=>String(r.id)===String(id))||null;
  const idFromAction=(container)=>{
    const direct=container?.dataset?.registrationId;
    if(direct)return direct;
    const candidates=[
      container?.querySelector('.registration-email-resend-btn'),
      container?.querySelector('.registration-delete-btn'),
      container?.querySelector('select[onchange*="updateRegistrationStatus"]')
    ].filter(Boolean);
    for(const el of candidates){
      const text=`${el.getAttribute('onclick')||''} ${el.getAttribute('onchange')||''}`;
      const match=text.match(/(?:resendRegistrationEmail|deleteRegistration|updateRegistrationStatus)\('([^']+)'/);
      if(match?.[1])return match[1];
    }
    return '';
  };
  const globalUnlocked=()=>{
    const bar=root.querySelector('.registration-privacy-bar');
    if(!bar)return false;
    return /liberados temporariamente|desbloqueado/i.test(bar.textContent||'');
  };

  function contactTargets(container){
    if(container.matches('.registration-card')){
      const blocks=[...container.querySelectorAll('.registration-card-details>div')];
      const emailBlock=blocks.find(x=>/^e-mail$/i.test(x.querySelector('span')?.textContent?.trim()||''));
      const phoneBlock=blocks.find(x=>/^whatsapp$/i.test(x.querySelector('span')?.textContent?.trim()||''));
      return {email:emailBlock?.querySelector('b')||null,phone:phoneBlock?.querySelector('b')||null};
    }
    if(container.matches('.registration-list-row')){
      const block=container.querySelector('.registration-list-contact');
      return {email:block?.querySelector('b')||null,phone:block?.querySelector('small')||null};
    }
    const main=container.querySelector('.registration-main');
    return {legacy:main?.querySelector('small')||null};
  }

  function actionHost(container){
    if(container.matches('.registration-card'))return container.querySelector('.registration-card-footer')||container;
    if(container.matches('.registration-list-row'))return container.querySelector('.registration-list-actions')||container;
    return container.querySelector('.registration-actions-buttons')||container.querySelector('.registration-main')||container;
  }

  function applyContact(container){
    const id=idFromAction(container);
    if(!id)return;
    container.dataset.registrationId=id;
    const r=registrationById(id);
    if(!r)return;

    const globallyOpen=globalUnlocked()&&!forceMaskAll;
    const show=globallyOpen||revealed.has(id);
    const target=contactTargets(container);

    if(target.legacy){
      target.legacy.classList.add('registration-contact-private');
      target.legacy.textContent=show
        ?`${r.email||''} • ${r.whatsapp||''} • ${r.side_preference||''}`
        :`${maskEmail(r.email)} • ${maskPhone(r.whatsapp)} • ${r.side_preference||''}`;
    }else{
      if(target.email)target.email.textContent=show?(r.email||'—'):maskEmail(r.email);
      if(target.phone)target.phone.textContent=show?(r.whatsapp||'—'):maskPhone(r.whatsapp);
    }

    const host=actionHost(container);
    let btn=container.querySelector('.privacy-reveal-btn');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.className='mini-btn privacy-reveal-btn registration-card-action registration-card-action-contact';
      btn.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        if(revealed.has(id))revealed.delete(id);else revealed.add(id);
        applyContact(container);
      });
      host.appendChild(btn);
    }
    btn.dataset.revealed=revealed.has(id)?'1':'0';
    btn.textContent=revealed.has(id)?'Ocultar contato':'Ver contato';
    btn.hidden=globallyOpen;
  }

  function fixGlobalPrivacyBar(){
    const bar=root.querySelector('.registration-privacy-bar');
    const btn=bar?.querySelector('.registration-privacy-actions button');
    const label=bar?.querySelector('.registration-privacy-actions span');
    if(!bar||!btn)return;

    if(globalUnlocked()){
      btn.hidden=false;
      if(forceMaskAll){
        btn.textContent='Ver contatos';
        btn.classList.remove('contact-open');
        if(label)label.textContent='E-mail e WhatsApp protegidos';
      }else{
        btn.textContent='Ocultar contatos';
        btn.classList.add('contact-open');
      }
      if(!btn.dataset.privacyV2){
        btn.dataset.privacyV2='1';
        btn.addEventListener('click',event=>{
          if(!globalUnlocked())return;
          event.preventDefault();
          event.stopPropagation();
          forceMaskAll=!forceMaskAll;
          if(forceMaskAll)revealed.clear();
          decorate();
        },true);
      }
    }
  }

  function decorate(){
    root.querySelectorAll('.registration-row,.registration-card,.registration-list-row').forEach(applyContact);
    fixGlobalPrivacyBar();
  }

  const schedule=()=>{
    if(privacyFrame)return;
    privacyFrame=requestAnimationFrame(()=>{
      privacyFrame=0;
      decorate();
    });
  };

  const style=document.createElement('style');
  style.textContent=`
    .registration-contact-private{letter-spacing:.15px}
    .privacy-reveal-btn{width:max-content}
    .registration-main>.privacy-reveal-btn{margin-top:6px;font-size:8px;padding:5px 8px}
    .registration-card-footer .privacy-reveal-btn,.registration-list-actions .privacy-reveal-btn{white-space:nowrap}
  `;
  document.head.appendChild(style);

  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  decorate();

  const filter=document.getElementById('registrationEventFilter');
  filter?.addEventListener('change',()=>{revealed.clear();forceMaskAll=false;schedule();});

  if(exportBtn){
    exportBtn.onclick=async()=>{
      const eventId=document.getElementById('registrationEventFilter')?.value;
      if(!eventId){alert('Selecione um evento antes de exportar o elenco.');return;}
      const event=typeof currentEvents!=='undefined'?currentEvents.find(e=>e.id===eventId):null;
      const list=rows().filter(r=>r.event_id===eventId&&r.status!=='cancelled');
      if(!list.length){alert('Esse evento não possui participantes para exportar.');return;}
      exportBtn.disabled=true;exportBtn.textContent='Preparando fotos...';
      try{
        const participants=[];
        for(const r of list){
          let photoDataUrl='';
          try{if(typeof urlToDataUrl==='function')photoDataUrl=await urlToDataUrl(r.character_photo_url);}catch{}
          participants.push({
            id:r.id,nome:r.full_name,nick:r.nick,cosplay:r.character_name,cidade:r.city,
            lado:r.side_preference,peca:r.piece_preference||'Sem preferência',
            segundaPeca:r.second_piece_preference||'Sem segunda preferência',
            participacao:r.participation_type,photoDataUrl
          });
        }
        const payload={type:'cosplaychess-participants',version:3,exportedAt:new Date().toISOString(),privacy:'contact-fields-omitted',event:{id:event?.id||eventId,name:event?.title||'',startAt:event?.start_at||'',venue:event?.venue||'',city:event?.city||''},participants};
        const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
        const a=document.createElement('a');a.href=URL.createObjectURL(blob);
        const safeName=typeof slugify==='function'?slugify(event?.title||'evento'):'evento';
        a.download=`CosplayChess_${safeName}_elenco.json`;a.click();URL.revokeObjectURL(a.href);
      }finally{exportBtn.disabled=false;exportBtn.textContent='Exportar para o app';}
    };
  }
})();
