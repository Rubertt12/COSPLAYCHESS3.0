(()=>{
  const root=document.getElementById('registrationsList');
  const exportBtn=document.getElementById('exportRosterBtn');
  if(!root||!exportBtn)return;

  const maskEmail=(value='')=>{
    const [local='',domain='']=String(value).split('@');
    if(!domain)return '••••••';
    const shown=local.slice(0,Math.min(2,local.length));
    return `${shown}${'•'.repeat(Math.max(4,local.length-shown.length))}@${domain}`;
  };
  const maskPhone=(value='')=>{
    const text=String(value||'');
    const digits=text.replace(/\D/g,'');
    if(digits.length<4)return '••••••••';
    return `••••••${digits.slice(-4)}`;
  };
  const getRegistrationFromRow=row=>{
    const select=row.querySelector('select[onchange*="updateRegistrationStatus"]');
    const match=select?.getAttribute('onchange')?.match(/updateRegistrationStatus\('([^']+)'/);
    const id=match?.[1];
    return id&&typeof registrations!=='undefined'?registrations.find(r=>String(r.id)===String(id)):null;
  };
  const setTextIfChanged=(el,text)=>{
    if(el&&el.textContent!==text)el.textContent=text;
  };

  function protectRows(){
    root.querySelectorAll('.registration-row').forEach(row=>{
      const r=getRegistrationFromRow(row);if(!r)return;
      const main=row.querySelector('.registration-main');
      const contact=main?.querySelector('small');
      if(!main||!contact)return;

      if(!row.dataset.privacyReady){
        row.dataset.privacyReady='1';
        contact.classList.add('registration-contact-private');
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='mini-btn privacy-reveal-btn';
        btn.textContent='Ver contato';
        btn.dataset.revealed='0';
        btn.onclick=()=>{
          const show=btn.dataset.revealed!=='1';
          btn.dataset.revealed=show?'1':'0';
          btn.textContent=show?'Ocultar contato':'Ver contato';
          const text=show
            ? `${r.email||''} • ${r.whatsapp||''} • ${r.side_preference||''}`
            : `${maskEmail(r.email)} • ${maskPhone(r.whatsapp)} • ${r.side_preference||''}`;
          setTextIfChanged(contact,text);
        };
        main.appendChild(btn);
      }

      const reveal=row.querySelector('.privacy-reveal-btn');
      if(reveal?.dataset.revealed!=='1'){
        setTextIfChanged(contact,`${maskEmail(r.email)} • ${maskPhone(r.whatsapp)} • ${r.side_preference||''}`);
      }
    });
  }

  const style=document.createElement('style');
  style.textContent='.registration-contact-private{letter-spacing:.15px}.privacy-reveal-btn{margin-top:6px;width:max-content;font-size:8px;padding:5px 8px}';
  document.head.appendChild(style);

  let privacyFrame=0;
  const scheduleProtectRows=()=>{
    if(privacyFrame)return;
    privacyFrame=requestAnimationFrame(()=>{
      privacyFrame=0;
      protectRows();
    });
  };
  new MutationObserver(scheduleProtectRows).observe(root,{childList:true,subtree:true});
  protectRows();

  exportBtn.onclick=async()=>{
    const eventId=document.getElementById('registrationEventFilter').value;
    if(!eventId){alert('Selecione um evento antes de exportar o elenco.');return;}
    const event=currentEvents.find(e=>e.id===eventId);
    const rows=registrations.filter(r=>r.event_id===eventId&&r.status!=='cancelled');
    if(!rows.length){alert('Esse evento não possui participantes para exportar.');return;}
    exportBtn.disabled=true;exportBtn.textContent='Preparando fotos...';
    try{
      const participants=[];
      for(const r of rows){
        let photoDataUrl='';
        try{photoDataUrl=await urlToDataUrl(r.character_photo_url);}catch{}
        participants.push({
          id:r.id,nome:r.full_name,nick:r.nick,cosplay:r.character_name,cidade:r.city,
          lado:r.side_preference,peca:r.piece_preference||'Sem preferência',
          segundaPeca:r.second_piece_preference||'Sem segunda preferência',
          participacao:r.participation_type,photoDataUrl
        });
      }
      const payload={type:'cosplaychess-participants',version:3,exportedAt:new Date().toISOString(),privacy:'contact-fields-omitted',event:{id:event.id,name:event.title,startAt:event.start_at,venue:event.venue,city:event.city},participants};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`CosplayChess_${slugify(event.title)}_elenco.json`;a.click();URL.revokeObjectURL(a.href);
    }finally{exportBtn.disabled=false;exportBtn.textContent='Exportar para o app';}
  };
})();
