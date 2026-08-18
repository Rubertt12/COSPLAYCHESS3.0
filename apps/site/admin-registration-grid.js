(()=>{
  const PAGE_SIZE=5;
  const CONTACT_UNLOCK_MS=5*60*1000;
  let currentPage=1;
  let contactsUnlockedUntil=0;

  function safe(v=''){
    return typeof esc==='function'?esc(v):String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  const contactsUnlocked=()=>Date.now()<contactsUnlockedUntil;
  const hiddenContact=(type)=>type==='email'?'••••••••@••••••.•••':'(••) •••••-••••';

  function pageButton(page,label=String(page),extra=''){
    return `<button type="button" class="registration-page-btn ${extra}" data-registration-page="${page}">${label}</button>`;
  }

  function ensureContactModal(){
    if(document.getElementById('contactUnlockModal'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <div id="contactUnlockModal" class="contact-unlock-modal" hidden>
        <div class="contact-unlock-card" role="dialog" aria-modal="true" aria-labelledby="contactUnlockTitle">
          <button type="button" class="contact-unlock-close" aria-label="Fechar">×</button>
          <span class="kicker">DADOS PROTEGIDOS</span>
          <h2 id="contactUnlockTitle">Ver contatos</h2>
          <p>E-mail e WhatsApp ficam ocultos por segurança. Confirme sua senha de administrador para liberar por 5 minutos.</p>
          <form id="contactUnlockForm">
            <label><span>Senha</span><input id="contactUnlockPassword" type="password" autocomplete="current-password" required placeholder="Sua senha"></label>
            <button class="btn gold" type="submit">Desbloquear contatos</button>
            <div id="contactUnlockStatus" class="form-status" aria-live="polite"></div>
          </form>
        </div>
      </div>`);
    const modal=document.getElementById('contactUnlockModal');
    modal.querySelector('.contact-unlock-close').onclick=()=>{modal.hidden=true;};
    modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true;});
    document.getElementById('contactUnlockForm').onsubmit=async e=>{
      e.preventDefault();
      const status=document.getElementById('contactUnlockStatus');
      const password=document.getElementById('contactUnlockPassword').value;
      status.className='form-status';status.textContent='Verificando...';
      try{
        const {data:{user}}=await db.auth.getUser();
        if(!user?.email)throw new Error('Sessão administrativa não encontrada.');
        const {error}=await db.auth.signInWithPassword({email:user.email,password});
        if(error)throw new Error('Senha incorreta.');
        contactsUnlockedUntil=Date.now()+CONTACT_UNLOCK_MS;
        status.className='form-status success';status.textContent='Contatos liberados por 5 minutos.';
        document.getElementById('contactUnlockPassword').value='';
        setTimeout(()=>{modal.hidden=true;window.renderRegistrations();},350);
        setTimeout(()=>{if(!contactsUnlocked())window.renderRegistrations();},CONTACT_UNLOCK_MS+250);
      }catch(err){status.className='form-status error';status.textContent=err.message||'Não foi possível validar a senha.';}
    };
  }

  window.unlockRegistrationContacts=()=>{
    ensureContactModal();
    const modal=document.getElementById('contactUnlockModal');
    const status=document.getElementById('contactUnlockStatus');
    status.className='form-status';status.textContent='';
    modal.hidden=false;
    setTimeout(()=>document.getElementById('contactUnlockPassword')?.focus(),30);
  };

  window.deleteRegistration=async(id,name='este inscrito')=>{
    const label=name||'este inscrito';
    if(!confirm(`Excluir definitivamente ${label}?\n\nEssa ação não pode ser desfeita.`))return;
    try{
      const {error}=await db.from('cosplay_registrations').delete().eq('id',id);
      if(error)throw error;
      registrations=registrations.filter(r=>r.id!==id);
      const totalPages=Math.max(1,Math.ceil(registrations.length/PAGE_SIZE));
      currentPage=Math.min(currentPage,totalPages);
      if(typeof renderStats==='function')renderStats();
      window.renderRegistrations();
    }catch(err){alert(`Não foi possível excluir o inscrito: ${err.message||err}`);}
  };

  function renderPagination(root,totalPages,totalItems){
    if(totalPages<=1){
      root.insertAdjacentHTML('beforeend',`<div class="registration-pagination single"><span>${totalItems} inscrito${totalItems===1?'':'s'}</span></div>`);
      return;
    }
    const pages=[];
    const start=Math.max(1,currentPage-2);
    const end=Math.min(totalPages,currentPage+2);
    if(start>1){pages.push(pageButton(1));if(start>2)pages.push('<span class="registration-page-gap">…</span>');}
    for(let p=start;p<=end;p++)pages.push(pageButton(p,String(p),p===currentPage?'active':''));
    if(end<totalPages){if(end<totalPages-1)pages.push('<span class="registration-page-gap">…</span>');pages.push(pageButton(totalPages));}
    root.insertAdjacentHTML('beforeend',`
      <div class="registration-pagination">
        <span class="registration-page-info">Página ${currentPage} de ${totalPages} • ${totalItems} inscritos</span>
        <div class="registration-page-controls">
          ${pageButton(Math.max(1,currentPage-1),'‹ Anterior',currentPage===1?'disabled':'')}
          ${pages.join('')}
          ${pageButton(Math.min(totalPages,currentPage+1),'Próxima ›',currentPage===totalPages?'disabled':'')}
        </div>
      </div>`);
    root.querySelectorAll('[data-registration-page]').forEach(btn=>{
      if(btn.classList.contains('disabled')){btn.disabled=true;return;}
      btn.addEventListener('click',()=>{currentPage=Number(btn.dataset.registrationPage)||1;window.renderRegistrations();root.scrollIntoView({behavior:'smooth',block:'nearest'});});
    });
  }

  window.renderRegistrations=function(){
    const root=document.getElementById('registrationsList');
    if(!root)return;
    const rows=Array.isArray(registrations)?registrations:[];
    if(!rows.length){currentPage=1;root.innerHTML='<div class="empty-card">Nenhum inscrito encontrado.</div>';return;}
    const totalPages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
    currentPage=Math.min(Math.max(1,currentPage),totalPages);
    const start=(currentPage-1)*PAGE_SIZE;
    const pageRows=rows.slice(start,start+PAGE_SIZE);
    const unlocked=contactsUnlocked();

    root.innerHTML=`
      <div class="registration-privacy-bar">
        <span>${unlocked?'Contatos liberados temporariamente':'E-mail e WhatsApp protegidos'}</span>
        <button type="button" class="mini-btn ${unlocked?'contact-open':''}" onclick="${unlocked?'void(0)':'unlockRegistrationContacts()'}">${unlocked?'Desbloqueado':'Ver contatos'}</button>
      </div>
      <div class="registration-card-grid">${pageRows.map(r=>`
      <article class="registration-card">
        <div class="registration-card-head">
          <div class="registration-card-avatar" style="${r.character_photo_url?`background-image:url('${safe(r.character_photo_url)}')`:''}">${r.character_photo_url?'':'<span>♟</span>'}</div>
          <div class="registration-card-title">
            <span class="registration-event-name">${safe(r.cosplay_events?.title||'Evento')}</span>
            <h3>${safe(r.character_name||'Personagem')}</h3>
            <p>${safe(r.full_name||'')}</p>
          </div>
        </div>
        <div class="registration-card-details">
          <div><span>E-mail</span><b class="protected-contact">${unlocked?safe(r.email||'—'):hiddenContact('email')}</b></div>
          <div><span>WhatsApp</span><b class="protected-contact">${unlocked?safe(r.whatsapp||'—'):hiddenContact('phone')}</b></div>
          <div><span>Lado</span><b>${safe(r.side_preference||'Sem preferência')}</b></div>
          <div><span>Peça</span><b>${safe(r.piece_preference||'Sem preferência')}</b></div>
          <div class="registration-detail-wide"><span>2ª preferência</span><b>${safe(r.second_piece_preference||'Sem segunda preferência')}</b></div>
        </div>
        <div class="registration-card-footer">
          <label><span>Status</span>
            <select onchange="updateRegistrationStatus('${safe(r.id)}',this.value)">
              <option value="confirmed" ${r.status==='confirmed'?'selected':''}>Confirmado</option>
              <option value="waitlist" ${r.status==='waitlist'?'selected':''}>Lista de espera</option>
              <option value="cancelled" ${r.status==='cancelled'?'selected':''}>Cancelado</option>
            </select>
          </label>
          <button type="button" class="mini-btn danger registration-delete-btn" onclick="deleteRegistration('${safe(r.id)}','${safe((r.full_name||r.character_name||'este inscrito').replace(/'/g,"&#39;"))}')">Excluir inscrito</button>
        </div>
      </article>`).join('')}</div>`;
    renderPagination(root,totalPages,rows.length);
  };

  const filter=document.getElementById('registrationEventFilter');
  if(filter)filter.addEventListener('change',()=>{currentPage=1;contactsUnlockedUntil=0;});
  ensureContactModal();
  if(document.getElementById('registrationsList')&&typeof registrations!=='undefined'&&registrations.length)window.renderRegistrations();
})();
