(()=>{
  if(!document.querySelector('link[data-admin-v5-polish]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./admin-v5-polish.css?v=20260821-polish2';
    link.dataset.adminV5Polish='1';
    document.head.appendChild(link);
  }

  const intro=document.querySelector('#authPanel .admin-intro h1');
  if(intro) intro.innerHTML='Controle os próximos <i>capítulos do espetáculo.</i>';
  const introP=document.querySelector('#authPanel .admin-intro p');
  if(introP) introP.textContent='Entre para administrar eventos, fotos, inscrições e o elenco que será enviado ao aplicativo do CosplayChess.';

  const esc2=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate=(v)=>{try{return new Date(v).toLocaleDateString('pt-BR')}catch{return''}};
  const fmtShort=(v)=>{try{return new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})}catch{return''}};

  function renderDashboardExtras(){
    const bars=document.getElementById('eventBars');
    const recent=document.getElementById('recentRegistrations');
    const upcoming=document.getElementById('upcomingEvents');
    if(!bars||!recent||!upcoming)return;

    const events=Array.isArray(currentEvents)?currentEvents:[];
    const regs=Array.isArray(registrations)?registrations:[];
    const countByEvent=new Map();
    regs.forEach(r=>countByEvent.set(r.event_id,(countByEvent.get(r.event_id)||0)+1));

    const chartEvents=[...events].sort((a,b)=>new Date(b.start_at)-new Date(a.start_at)).slice(0,6).reverse();
    const max=Math.max(1,...chartEvents.map(e=>countByEvent.get(e.id)||0));
    bars.innerHTML=chartEvents.length?chartEvents.map(e=>{
      const value=countByEvent.get(e.id)||0;
      const height=Math.max(8,Math.round((value/max)*82));
      return `<div class="bar-item"><span class="bar-value">${value}</span><div class="bar-column" style="height:${height}%"></div><span class="bar-label" title="${esc2(e.title)}">${esc2(e.title)}</span></div>`;
    }).join(''):'<div class="empty-card">Sem dados de eventos.</div>';

    recent.innerHTML=regs.length?regs.slice(0,4).map(r=>{
      const status=r.status||'waitlist';
      const label=status==='confirmed'?'Aprovado':status==='cancelled'?'Cancelado':'Pendente';
      return `<div class="recent-item"><div class="recent-avatar" style="${r.character_photo_url?`background-image:url('${esc2(r.character_photo_url)}')`:''}"></div><div class="recent-main"><b>${esc2(r.character_name||r.full_name||'Inscrição')}</b><small>${esc2(r.cosplay_events?.title||r.full_name||'CosplayChess')}</small></div><div class="recent-status"><span class="${status}">${label}</span><small>${fmtDate(r.created_at)}</small></div></div>`;
    }).join(''):'<div class="empty-card">Nenhuma inscrição recente.</div>';

    const now=Date.now();
    const next=[...events].filter(e=>new Date(e.start_at).getTime()>=now).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at)).slice(0,3);
    const source=next.length?next:[...events].sort((a,b)=>new Date(b.start_at)-new Date(a.start_at)).slice(0,3);
    upcoming.innerHTML=source.length?source.map(e=>{
      const total=countByEvent.get(e.id)||0;
      const maxP=e.max_participants||'—';
      return `<div class="upcoming-item"><div class="upcoming-cover" style="${e.cover_url?`background-image:url('${esc2(e.cover_url)}')`:''}"></div><div class="upcoming-main"><b>${esc2(e.title)}</b><span>▣ ${fmtShort(e.start_at)} &nbsp; • &nbsp; ${esc2([e.venue,e.city].filter(Boolean).join(' - ')||'Local a definir')}</span></div><div class="upcoming-side"><b>${e.registration_open?'Inscrições abertas':'Inscrições fechadas'}</b><span>${total} / ${maxP} inscritos</span></div></div>`;
    }).join(''):'<div class="empty-card">Nenhum evento cadastrado.</div>';
  }

  function relocateGallery(){
    const gallery=document.getElementById('eventGalleryPanel');
    const content=document.querySelector('.v5-content');
    const footer=content?.querySelector('.admin-footer');
    if(!gallery||!content||gallery.parentElement===content)return;
    gallery.classList.add('v5-section');
    if(footer) content.insertBefore(gallery,footer); else content.appendChild(gallery);
    const upload=gallery.querySelector('#galleryUploadBtn');
    if(upload){upload.classList.remove('btn');upload.classList.add('v5-btn');}
  }

  const oldRenderStats=typeof renderStats==='function'?renderStats:null;
  if(oldRenderStats) renderStats=function(){oldRenderStats();renderDashboardExtras();};

  document.getElementById('quickNewEvent')?.addEventListener('click',()=>document.getElementById('newEventBtn')?.click());
  document.querySelector('.v5-welcome button')?.addEventListener('click',e=>e.currentTarget.parentElement.remove());

  const dash=document.getElementById('dashboardPanel');
  if(dash){
    const obs=new MutationObserver(()=>{
      if(!dash.hidden)renderDashboardExtras();
      relocateGallery();
    });
    obs.observe(dash,{attributes:true,childList:true,subtree:true,attributeFilter:['hidden']});
  }

  setTimeout(()=>{renderDashboardExtras();relocateGallery();},250);
  setTimeout(relocateGallery,900);
})();
