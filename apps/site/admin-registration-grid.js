(()=>{
  const PAGE_SIZE=5;
  let currentPage=1;

  function safe(v=''){
    return typeof esc==='function'?esc(v):String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function pageButton(page,label=String(page),extra=''){
    return `<button type="button" class="registration-page-btn ${extra}" data-registration-page="${page}">${label}</button>`;
  }

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
      btn.addEventListener('click',()=>{
        currentPage=Number(btn.dataset.registrationPage)||1;
        window.renderRegistrations();
        root.scrollIntoView({behavior:'smooth',block:'nearest'});
      });
    });
  }

  window.renderRegistrations=function(){
    const root=document.getElementById('registrationsList');
    if(!root)return;
    const rows=Array.isArray(registrations)?registrations:[];
    if(!rows.length){
      currentPage=1;
      root.innerHTML='<div class="empty-card">Nenhum inscrito encontrado.</div>';
      return;
    }

    const totalPages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
    currentPage=Math.min(Math.max(1,currentPage),totalPages);
    const start=(currentPage-1)*PAGE_SIZE;
    const pageRows=rows.slice(start,start+PAGE_SIZE);

    root.innerHTML=`<div class="registration-card-grid">${pageRows.map(r=>`
      <article class="registration-card">
        <div class="registration-card-head">
          <div class="registration-card-avatar" style="${r.character_photo_url?`background-image:url('${safe(r.character_photo_url)}')`:''}">
            ${r.character_photo_url?'':'<span>♟</span>'}
          </div>
          <div class="registration-card-title">
            <span class="registration-event-name">${safe(r.cosplay_events?.title||'Evento')}</span>
            <h3>${safe(r.character_name||'Personagem')}</h3>
            <p>${safe(r.full_name||'')}</p>
          </div>
        </div>
        <div class="registration-card-details">
          <div><span>E-mail</span><b>${safe(r.email||'—')}</b></div>
          <div><span>WhatsApp</span><b>${safe(r.whatsapp||'—')}</b></div>
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
        </div>
      </article>`).join('')}</div>`;

    renderPagination(root,totalPages,rows.length);
  };

  const filter=document.getElementById('registrationEventFilter');
  if(filter){
    filter.addEventListener('change',()=>{currentPage=1;});
  }

  if(document.getElementById('registrationsList') && typeof registrations!=='undefined' && registrations.length){
    window.renderRegistrations();
  }
})();
