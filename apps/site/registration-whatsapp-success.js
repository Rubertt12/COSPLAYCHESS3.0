(()=>{
  if(window.__CC_REGISTRATION_WHATSAPP_SUCCESS__) return;
  window.__CC_REGISTRATION_WHATSAPP_SUCCESS__=true;

  function roleLabel(role){
    if(role==='player1') return 'Player 1 — Brancas';
    if(role==='player2') return 'Player 2 — Pretas';
    return 'Peça humana';
  }

  function buildPresentation(participant,event,result){
    const lines=[];
    const displayName=(participant?.nick||participant?.fullName||'').trim();
    lines.push('♟️ *Apresentação CosplayChess*');
    lines.push('');
    lines.push(`Olá, pessoal! Eu sou *${displayName}* 👋`);
    if(event?.title) lines.push(`Vou participar do *${event.title}*.`);

    const role=participant?.gameRole||'piece';
    if(role==='player1'||role==='player2'){
      lines.push(`🎮 Função: *${roleLabel(role)}*`);
    }else{
      if(participant?.characterName) lines.push(`🎭 Personagem: *${participant.characterName}*`);
      const assignedPiece=result?.assignedPiece||participant?.piecePreference;
      if(assignedPiece) lines.push(`♟️ Peça confirmada: *${assignedPiece}*`);
      if(result?.pieceFallback){
        lines.push(`↪️ A 1ª preferência (*${result.requestedPiece}*) estava lotada; foi usada a 2ª preferência.`);
      }
    }
    if(participant?.city) lines.push(`📍 Cidade: *${participant.city}*`);
    lines.push('');
    lines.push('Nos vemos no tabuleiro! ♟️');
    return lines.join('\n');
  }

  async function copyText(text){
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text);
        return true;
      }
    }catch{}
    try{
      const area=document.createElement('textarea');
      area.value=text;
      area.setAttribute('readonly','');
      area.style.position='fixed';
      area.style.opacity='0';
      area.style.pointerEvents='none';
      document.body.appendChild(area);
      area.select();
      area.setSelectionRange(0,area.value.length);
      const ok=document.execCommand('copy');
      area.remove();
      return ok;
    }catch{return false;}
  }

  function removeOldCard(){
    document.querySelector('[data-whatsapp-success-card]')?.remove();
  }

  window.addEventListener('cosplaychess:registration-success',event=>{
    const detail=event.detail||{};
    const groupUrl=String(detail.result?.whatsappGroupUrl||'').trim();
    if(!groupUrl) return;

    removeOldCard();
    const presentation=buildPresentation(detail.participant||{},detail.event||{},detail.result||{});
    const status=document.getElementById('formStatus');
    const form=document.getElementById('signupForm');
    if(!form) return;

    const card=document.createElement('section');
    card.className='registration-whatsapp-success';
    card.dataset.whatsappSuccessCard='1';
    card.innerHTML=`
      <div class="registration-whatsapp-success__icon" aria-hidden="true">✓</div>
      <div class="registration-whatsapp-success__body">
        <span class="registration-whatsapp-success__kicker">INSCRIÇÃO CONFIRMADA</span>
        <h3>Agora entre no grupo do evento</h3>
        <p>Sua apresentação será copiada. Ao abrir o WhatsApp, entre no grupo, cole a mensagem e envie.</p>
        <pre class="registration-whatsapp-success__preview"></pre>
        <button class="btn gold big registration-whatsapp-success__button" type="button">Copiar apresentação e entrar no grupo</button>
        <small>O WhatsApp não permite que sites enviem mensagens automaticamente em grupos pelo link de convite.</small>
      </div>`;

    card.querySelector('.registration-whatsapp-success__preview').textContent=presentation;
    const button=card.querySelector('.registration-whatsapp-success__button');
    button.addEventListener('click',async()=>{
      button.disabled=true;
      const copied=await copyText(presentation);
      button.textContent=copied?'Apresentação copiada ✓ Abrindo grupo...':'Abrindo grupo... copie a apresentação acima';
      setTimeout(()=>{
        window.location.href=groupUrl;
        setTimeout(()=>{button.disabled=false;button.textContent='Copiar apresentação e entrar no grupo';},1200);
      },250);
    });

    if(status?.parentNode===form) status.insertAdjacentElement('afterend',card);
    else form.appendChild(card);
    card.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
})();
