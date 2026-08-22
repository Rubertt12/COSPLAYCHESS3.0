(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc6=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate=v=>{try{return new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})}catch{return'—'}};
  const fmtTime=v=>{try{return new Date(v).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}catch{return''}};

  function getEvents(){try{return Array.isArray(currentEvents)?currentEvents:[]}catch{return[]}}
  function getRegs(){try{return Array.isArray(registrations)?registrations:[]}catch{return[]}}

  function syncAuthLayout(){
    const dash=$('#dashboardPanel');
    document.body.classList.toggle('admin-authenticated',!!dash&&!dash.hidden);
  }

  function renderUpcoming(){
    const root=$('#v6Upcoming'); if(!root)return;
    const events=getEvents(); const regs=getRegs();
    const count=new Map(); regs.forEach(r=>count.set(r.event_id,(count.get(r.event_id)||0)+1));
    const list=[...events].sort((a,b)=>new Date(a.start_at)-new Date(b.start_at)).slice(0,4);
    root.innerHTML=list.length?list.map(e=>{
      const n=count.get(e.id)||0, max=Number(e.max_participants)||0, pct=max?Math.min(100,Math.round(n/max*100)):0;
      return `<div class="v6-event-row">
        <div class="v6-event-cover" style="${e.cover_url?`background-image:url('${esc6(e.cover_url)}')`:''}"></div>
        <div class="v6-event-main"><b>${esc6(e.title||'Evento')}</b><span>▣ ${fmtDate(e.start_at)} &nbsp; ⦿ ${esc6([e.venue,e.city].filter(Boolean).join(', ')||'Local a definir')}</span></div>
        <span class="v6-status ${e.registration_open?'open':'closed'}">${e.published?'Publicado':'Rascunho'}</span>
        <div class="v6-progress"><small><span>${pct}%</span><span>${n}/${max||'—'}</span></small><div class="v6-progress-track"><i style="width:${pct}%"></i></div></div>
      </div>`;
    }).join(''):'<div class="empty-card">Nenhum evento cadastrado.</div>';
  }

  function renderActivity(){
    const root=$('#v6Activity'); if(!root)return;
    const regs=getRegs().slice(0,5);
    root.innerHTML=regs.length?regs.map((r,i)=>`<div class="v6-activity-row"><div class="v6-activity-icon">${i===0?'＋':'♟'}</div><div class="v6-activity-main"><b>${i===0?'Nova inscrição':'Inscrição atualizada'}</b><span>${esc6(r.character_name||r.full_name||'Participante')} · ${esc6(r.cosplay_events?.title||'CosplayChess')}</span></div><span class="v6-activity-time">${fmtDate(r.created_at)}</span></div>`).join(''):'<div class="empty-card">Sem atividade recente.</div>';
  }

  function renderDonut(){
    const total=getRegs().length;
    const confirmed=getRegs().filter(r=>r.status==='confirmed').length;
    const wait=getRegs().filter(r=>r.status==='waitlist').length;
    const cancelled=getRegs().filter(r=>r.status==='cancelled').length;
    const el=$('#v6Donut'); if(el){const a=total?confirmed/total*100:0,b=total?wait/total*100:0;el.style.background=`conic-gradient(#7c3aed 0 ${a}%,#2e7df6 ${a}% ${a+b}%,#ef4444 ${a+b}% 100%)`;}
    const num=$('#v6DonutTotal'); if(num)num.textContent=total;
    const legend=$('#v6Legend'); if(legend)legend.innerHTML=`<div><i style="background:#7c3aed"></i>Confirmados <b>${confirmed}</b></div><div><i style="background:#2e7df6"></i>Em análise <b>${wait}</b></div><div><i style="background:#ef4444"></i>Cancelados <b>${cancelled}</b></div>`;
  }

  function renderSpark(){
    const regs=getRegs(); const svg=$('#v6SparkSvg'); if(!svg)return;
    const days=[6,5,4,3,2,1,0].map(d=>{const x=new Date();x.setHours(0,0,0,0);x.setDate(x.getDate()-d);return x});
    const vals=days.map(d=>regs.filter(r=>{const x=new Date(r.created_at);return x>=d&&x<new Date(d.getTime()+86400000)}).length);
    const max=Math.max(1,...vals), w=300,h=150;
    const pts=vals.map((v,i)=>`${i*(w/6)},${h-(v/max)*(h-20)-10}`).join(' ');
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    svg.innerHTML=`<defs><linearGradient id="v6g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#8b5cf6" stop-opacity=".35"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></linearGradient></defs><polygon points="0,${h} ${pts} ${w},${h}" fill="url(#v6g)"/><polyline points="${pts}" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  function renderExtraMetrics(){
    const pending=getRegs().filter(r=>r.status==='waitlist').length;
    $('#statPending')?.replaceChildren(document.createTextNode(String(pending)));
    const next=getEvents().filter(e=>new Date(e.start_at)>=new Date()).length;
    $('#statUpcoming')?.replaceChildren(document.createTextNode(String(next)));
  }

  function renderV6(){renderUpcoming();renderActivity();renderDonut();renderSpark();renderExtraMetrics();}

  try{
    if(typeof renderStats==='function'){
      const base=renderStats;
      renderStats=function(){base();renderV6();};
    }
  }catch{}

  $('#v6NewEvent')?.addEventListener('click',()=>$('#newEventBtn')?.click());
  $('#v6Logout')?.addEventListener('click',()=>$('#logoutBtn')?.click());
  $('#v6Menu')?.addEventListener('click',()=>$('#dashboardPanel')?.classList.toggle('collapsed'));
  $('#v6Collapse')?.addEventListener('click',()=>$('#dashboardPanel')?.classList.toggle('collapsed'));
  $('#v6Search')?.addEventListener('input',e=>{
    const q=e.target.value.trim().toLowerCase();
    $$('.admin-event,.registration-row').forEach(el=>el.style.display=!q||el.textContent.toLowerCase().includes(q)?'':'none');
  });
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#v6Search')?.focus();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'){e.preventDefault();$('#newEventBtn')?.click();}
  });
  $$('.v6-nav a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{$$('.v6-nav a').forEach(x=>x.classList.remove('active'));a.classList.add('active')}));

  const identity=$('#adminIdentity');
  if(identity){new MutationObserver(()=>{const name=identity.textContent.trim();if(name){const s=$('#sidebarIdentity');const g=$('#v6GreetingName');if(s)s.textContent=name;if(g)g.textContent=name.split('@')[0];}}).observe(identity,{childList:true,subtree:true});}
  const dash=$('#dashboardPanel'); if(dash)new MutationObserver(()=>{syncAuthLayout();if(!dash.hidden)requestAnimationFrame(renderV6)}).observe(dash,{attributes:true,attributeFilter:['hidden']});
  syncAuthLayout(); setTimeout(renderV6,300);
})();
