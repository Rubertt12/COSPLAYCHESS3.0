(()=>{
  if(!document.querySelector('link[data-sidebar-v62]')){const l=document.createElement('link');l.rel='stylesheet';l.href='./admin-sidebar-v62.css?v=20260821-v62';l.dataset.sidebarV62='1';document.head.appendChild(l);}
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc6=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate=v=>{try{return new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})}catch{return'—'}};
  const AUX={
    pages:{title:'Páginas',desc:'Edite as páginas públicas do CosplayChess.',icon:'□',actions:[['Abrir CMS Visual','./cms.html'],['Ver site publicado','./index.html']]},
    blog:{title:'Blog / Notícias',desc:'Gerencie notícias, comunicados e novidades do projeto.',icon:'▤',actions:[['Gerenciar no CMS','./cms.html'],['Ver site','./index.html']]},
    rules:{title:'Regras',desc:'Edite as regras públicas para participantes e público.',icon:'§',actions:[['Ver página pública','./regras.html']]},
    banners:{title:'Banners',desc:'Organize chamadas, banners e destaques visuais.',icon:'⚑',actions:[['Editar banners no CMS','./cms.html'],['Prévia pública','./index.html']]},
    testimonials:{title:'Depoimentos',desc:'Gerencie depoimentos e conteúdo social exibido no site.',icon:'〽',actions:[['Editar no CMS','./cms.html']]},
    faq:{title:'FAQ',desc:'Edite perguntas frequentes e respostas do projeto.',icon:'?',actions:[['Editar FAQ no CMS','./cms.html']]},
    settings:{title:'Configurações Gerais',desc:'Centralize ajustes gerais, conteúdo global e identidade do site.',icon:'⚙',actions:[['Abrir configurações do CMS','./cms.html']]},
    social:{title:'Redes Sociais',desc:'Gerencie links e presença social do CosplayChess.',icon:'⌘',actions:[['Editar redes no CMS','./cms.html']]},
    users:{title:'Usuários',desc:'Acompanhe inscritos, participantes confirmados e acesso administrativo.',icon:'♧',actions:[['Ver inscrições','#registrations']]},
    backup:{title:'Backup & Exportar',desc:'Exporte o elenco e mantenha cópias dos dados operacionais.',icon:'◉',actions:[['Exportar elenco','#registrations'],['Abrir Supabase','https://supabase.com/dashboard']]},
    logs:{title:'Logs de Atividade',desc:'Acompanhe alterações recentes registradas pelo painel.',icon:'☷',actions:[['Voltar ao Dashboard','#overview']]}
  };

  if(!document.querySelector('script[data-admin-rules-loader]')){const s=document.createElement('script');s.src='./admin-rules.js?v=20260824-rules1';s.async=false;s.dataset.adminRulesLoader='1';document.body.appendChild(s);}

  function getEvents(){try{return Array.isArray(currentEvents)?currentEvents:[]}catch{return[]}}
  function getRegs(){try{return Array.isArray(registrations)?registrations:[]}catch{return[]}}
  function syncAuthLayout(){const dash=$('#dashboardPanel');document.body.classList.toggle('admin-authenticated',!!dash&&!dash.hidden);}

  function createAuxViews(){
    const main=$('.v6-main'); if(!main)return;
    const linkMap={'Páginas':'pages','Blog / Notícias':'blog','Regras':'rules','Banners':'banners','Depoimentos':'testimonials','FAQ':'faq','Configurações Gerais':'settings','Redes Sociais':'social','Usuários':'users','Backup & Exportar':'backup','Logs de Atividade':'logs'};
    Object.entries(linkMap).forEach(([label,id])=>{const a=$$('.v6-nav a').find(x=>x.textContent.trim().includes(label));if(a)a.setAttribute('href','#'+id);});
    Object.entries(AUX).forEach(([id,cfg])=>{
      if($('#'+id))return;
      const s=document.createElement('section');s.id=id;s.className='v6-view v6-management v6-aux-view';s.dataset.view=id;s.hidden=true;
      const actions=cfg.actions.map(([label,href])=>`<a class="v6-aux-action" href="${href}" ${href.startsWith('http')||href.endsWith('.html')?'target="_blank" rel="noopener"':''}><span>${cfg.icon}</span><div><b>${label}</b><small>Abrir recurso →</small></div></a>`).join('');
      s.innerHTML=`<div class="v6-management-head"><div><h2>${cfg.title}</h2><p>${cfg.desc}</p></div></div><div class="v6-aux-grid">${actions}<article class="v6-aux-info"><span>STATUS</span><b>Área pronta para expansão</b><p>Esta seção agora é independente e pode receber ferramentas próprias sem misturar conteúdo com outras telas.</p></article></div>`;
      main.appendChild(s);
    });
  }

  function ensureViews(){
    createAuxViews();
    ['overview','events','registrations'].forEach(id=>{const el=$('#'+id);if(el){el.classList.add('v6-view');el.dataset.view=id;}});
    const gallery=$('#eventGalleryPanel');if(gallery){gallery.classList.add('v6-view','v6-management');gallery.dataset.view='gallery';}
  }

  function viewIdFromHash(hash){const raw=(hash||'').replace('#','');if(raw==='eventGalleryPanel')return'gallery';if(['overview','events','registrations','gallery',...Object.keys(AUX)].includes(raw))return raw;return'overview';}

  function openView(id,{push=true}={}){
    ensureViews();
    if(id==='gallery'&&!$('#eventGalleryPanel')){setTimeout(()=>openView('gallery',{push:false}),120);return;}
    if(!$('.v6-view[data-view="'+id+'"]'))id='overview';
    $$('.v6-view').forEach(v=>{v.hidden=v.dataset.view!==id;v.classList.toggle('is-active',v.dataset.view===id);});
    $$('.v6-nav a').forEach(a=>{const vid=viewIdFromHash(a.getAttribute('href'));a.classList.toggle('active',vid===id&&a.getAttribute('href')?.startsWith('#'));});
    document.body.dataset.adminView=id;
    if(push){const hash=id==='gallery'?'#eventGalleryPanel':'#'+id;if(location.hash!==hash)history.replaceState({},'',hash);}
    const active=$('.v6-view.is-active');if(active)active.scrollTop=0;
  }

  function renderUpcoming(){const root=$('#v6Upcoming');if(!root)return;const events=getEvents(),regs=getRegs(),count=new Map();regs.forEach(r=>count.set(r.event_id,(count.get(r.event_id)||0)+1));const list=[...events].sort((a,b)=>new Date(a.start_at)-new Date(b.start_at)).slice(0,4);root.innerHTML=list.length?list.map(e=>{const n=count.get(e.id)||0,max=Number(e.max_participants)||0,pct=max?Math.min(100,Math.round(n/max*100)):0;return `<div class="v6-event-row"><div class="v6-event-cover" style="${e.cover_url?`background-image:url('${esc6(e.cover_url)}')`:''}"></div><div class="v6-event-main"><b>${esc6(e.title||'Evento')}</b><span>▣ ${fmtDate(e.start_at)} &nbsp; ⦿ ${esc6([e.venue,e.city].filter(Boolean).join(', ')||'Local a definir')}</span></div><span class="v6-status ${e.registration_open?'open':'closed'}">${e.published?'Publicado':'Rascunho'}</span><div class="v6-progress"><small><span>${pct}%</span><span>${n}/${max||'—'}</span></small><div class="v6-progress-track"><i style="width:${pct}%"></i></div></div></div>`;}).join(''):'<div class="empty-card">Nenhum evento cadastrado.</div>';}
  function renderActivity(){
    const root=$('#v6Activity');if(!root)return;
    const regs=getRegs().slice(0,5);
    root.innerHTML=regs.length?regs.map((r,i)=>{
      const personName=r.full_name||r.character_name||'Participante';
      const characterName=r.character_name||personName;
      const initial=(personName.trim().charAt(0)||'♟').toUpperCase();
      const photoStyle=typeof window.registrationPhotoImageStyle==='function'?window.registrationPhotoImageStyle(r):'object-position:center';
      const avatar=r.character_photo_url
        ?`<div class="v6-activity-icon v6-activity-photo" style="overflow:hidden;padding:0;border:2px solid rgba(139,92,246,.42);background:#0e1926"><img src="${esc6(r.character_photo_url)}" alt="Foto de ${esc6(personName)}" loading="lazy" style="width:100%;height:100%;display:block;object-fit:cover;${photoStyle}"></div>`
        :`<div class="v6-activity-icon" aria-label="${esc6(personName)}">${esc6(initial)}</div>`;
      const details=`${esc6(personName)}${r.character_name?` • ${esc6(characterName)}`:''} · ${esc6(r.cosplay_events?.title||'CosplayChess')}`;
      return `<div class="v6-activity-row">${avatar}<div class="v6-activity-main"><b>${i===0?'Nova inscrição':'Inscrição atualizada'}</b><span>${details}</span></div><span class="v6-activity-time">${fmtDate(r.created_at)}</span></div>`;
    }).join(''):'<div class="empty-card">Sem atividade recente.</div>';
  }
  function renderDonut(){const regs=getRegs(),total=regs.length,confirmed=regs.filter(r=>r.status==='confirmed').length,wait=regs.filter(r=>r.status==='waitlist').length,cancelled=regs.filter(r=>r.status==='cancelled').length;const el=$('#v6Donut');if(el){const a=total?confirmed/total*100:0,b=total?wait/total*100:0;el.style.background=`conic-gradient(#7c3aed 0 ${a}%,#2e7df6 ${a}% ${a+b}%,#ef4444 ${a+b}% 100%)`;}const num=$('#v6DonutTotal');if(num)num.textContent=total;const legend=$('#v6Legend');if(legend)legend.innerHTML=`<div><i style="background:#7c3aed"></i>Confirmados <b>${confirmed}</b></div><div><i style="background:#2e7df6"></i>Em análise <b>${wait}</b></div><div><i style="background:#ef4444"></i>Cancelados <b>${cancelled}</b></div>`;}
  function renderSpark(){const regs=getRegs(),svg=$('#v6SparkSvg');if(!svg)return;const days=[6,5,4,3,2,1,0].map(d=>{const x=new Date();x.setHours(0,0,0,0);x.setDate(x.getDate()-d);return x}),vals=days.map(d=>regs.filter(r=>{const x=new Date(r.created_at);return x>=d&&x<new Date(d.getTime()+86400000)}).length),max=Math.max(1,...vals),w=300,h=150,pts=vals.map((v,i)=>`${i*(w/6)},${h-(v/max)*(h-20)-10}`).join(' ');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.innerHTML=`<defs><linearGradient id="v6g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#8b5cf6" stop-opacity=".35"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></linearGradient></defs><polygon points="0,${h} ${pts} ${w},${h}" fill="url(#v6g)"/><polyline points="${pts}" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;}
  function renderExtraMetrics(){const pending=getRegs().filter(r=>r.status==='waitlist').length;$('#statPending')?.replaceChildren(document.createTextNode(String(pending)));const next=getEvents().filter(e=>new Date(e.start_at)>=new Date()).length;$('#statUpcoming')?.replaceChildren(document.createTextNode(String(next)));}
  function renderV6(){ensureViews();renderUpcoming();renderActivity();renderDonut();renderSpark();renderExtraMetrics();}

  try{if(typeof renderStats==='function'){const base=renderStats;renderStats=function(){base();renderV6();};}}catch{}
  $('#v6NewEvent')?.addEventListener('click',()=>$('#newEventBtn')?.click());$('#v6Logout')?.addEventListener('click',()=>$('#logoutBtn')?.click());$('#v6Menu')?.addEventListener('click',()=>$('#dashboardPanel')?.classList.toggle('collapsed'));$('#v6Collapse')?.addEventListener('click',()=>$('#dashboardPanel')?.classList.toggle('collapsed'));
  $('#v6Search')?.addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();$$('.admin-event,.registration-row').forEach(el=>el.style.display=!q||el.textContent.toLowerCase().includes(q)?'':'none');});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#v6Search')?.focus();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'){e.preventDefault();$('#newEventBtn')?.click();}if(e.key==='Escape'&&!$('#eventModal')?.hidden)$('#eventModal').hidden=true;});
  document.addEventListener('click',e=>{const a=e.target.closest('.v6-nav a[href^="#"],.v6-aux-action[href^="#"],.v6-card-head a[href^="#"]');if(!a)return;e.preventDefault();openView(viewIdFromHash(a.getAttribute('href')));});
  window.addEventListener('hashchange',()=>openView(viewIdFromHash(location.hash),{push:false}));
  const identity=$('#adminIdentity');if(identity)new MutationObserver(()=>{const name=identity.textContent.trim();if(name){const s=$('#sidebarIdentity'),g=$('#v6GreetingName');if(s)s.textContent=name;if(g)g.textContent=name.split('@')[0];}}).observe(identity,{childList:true,subtree:true});
  const dash=$('#dashboardPanel');if(dash)new MutationObserver(()=>{syncAuthLayout();if(!dash.hidden)requestAnimationFrame(()=>{renderV6();openView(viewIdFromHash(location.hash),{push:false});});}).observe(dash,{attributes:true,attributeFilter:['hidden']});
  const galleryWatch=new MutationObserver(()=>{if($('#eventGalleryPanel')){ensureViews();if(viewIdFromHash(location.hash)==='gallery')openView('gallery',{push:false});galleryWatch.disconnect();}});galleryWatch.observe(document.body,{childList:true,subtree:true});
  syncAuthLayout();setTimeout(()=>{renderV6();openView(viewIdFromHash(location.hash),{push:false});},300);
})();