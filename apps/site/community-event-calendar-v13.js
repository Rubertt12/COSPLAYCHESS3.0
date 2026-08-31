(() => {
  'use strict';
  if (window.__CC_EVENT_CALENDAR_V13__) return;
  window.__CC_EVENT_CALENDAR_V13__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;
  const $ = id => document.getElementById(id);
  const q = (s,r=document) => r.querySelector(s);
  const qa = (s,r=document) => [...r.querySelectorAll(s)];
  const state = { user:null, profile:null, cursor:null, selected:null, official:[], personal:[], social:[], rsvps:[], busy:false };
  const pad=n=>String(n).padStart(2,'0');
  const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const fromKey=k=>{const [y,m,d]=String(k).split('-').map(Number);return new Date(y,m-1,d);};
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
  const monthLabel=d=>new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(d);
  const fullDate=d=>new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(d);
  const fmtTime=v=>v?String(v).slice(0,5):'';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function visibleRange(){
    const first=new Date(state.cursor.getFullYear(),state.cursor.getMonth(),1);
    const start=addDays(first,-first.getDay());
    return {start,end:addDays(start,42)};
  }
  async function getMe(){
    if(state.profile)return state.profile;
    const {data:s}=await db.auth.getSession();state.user=s?.session?.user||null;if(!state.user)return null;
    const {data,error}=await db.from('cosplay_participant_profiles').select('id,user_id,display_name,nick').eq('user_id',state.user.id).neq('registration_status','cancelled').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error||!data)return null;state.profile=data;return data;
  }
  function ensureDates(){
    const now=new Date();
    if(!state.cursor)state.cursor=new Date(now.getFullYear(),now.getMonth(),1);
    if(!state.selected)state.selected=now;
  }
  async function loadMonth(){
    const me=await getMe();if(!me)return;
    ensureDates();
    const {start,end}=visibleRange(),startKey=dateKey(start),endKey=dateKey(addDays(end,-1));
    const [off,personal,social] = await Promise.all([
      db.from('cosplay_events').select('id,title,slug,venue,city,start_at,end_at,cover_url,published').eq('published',true).gte('start_at',start.toISOString()).lt('start_at',end.toISOString()).order('start_at',{ascending:true}),
      db.from('cosplay_personal_calendar_events').select('id,profile_id,title,event_date,start_time,end_time,location,notes,created_at,updated_at').eq('profile_id',me.id).gte('event_date',startKey).lte('event_date',endKey).order('event_date',{ascending:true}).order('start_time',{ascending:true}),
      db.from('cosplay_social_posts').select('id,author_profile_id,body,metadata,created_at').eq('post_type','event').eq('moderation_status','active').order('created_at',{ascending:false}).limit(250)
    ]);
    state.official=off.error?[]:(off.data||[]);
    state.personal=personal.error?[]:(personal.data||[]);
    state.social=(social.error?[]:(social.data||[])).filter(x=>{const k=String(x.metadata?.event_date||'');return k>=startKey&&k<=endKey;});
    const ids=state.social.map(x=>x.id);
    if(ids.length){const {data}=await db.from('cosplay_social_event_rsvps').select('post_id,profile_id,status').in('post_id',ids);state.rsvps=data||[];} else state.rsvps=[];
    render();
  }
  const officialKey=e=>dateKey(new Date(e.start_at));
  function forDay(key){return {
    official:state.official.filter(e=>officialKey(e)===key),
    personal:state.personal.filter(e=>e.event_date===key),
    social:state.social.filter(e=>String(e.metadata?.event_date||'')===key)
  };}
  function timeFor(type,e){if(type==='official')return new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(e.start_at));return fmtTime(type==='social'?e.metadata?.start_time:e.start_time);}
  function item(type,e){
    const row=document.createElement('article');row.className='cc13-event-item';
    const badge=document.createElement('span');badge.className=`cc13-event-type ${type}`;badge.textContent=type==='official'?'OFICIAL':type==='social'?'REDE':'MINHA AGENDA';
    const copy=document.createElement('div');copy.className='cc13-event-copy';
    const b=document.createElement('b');b.textContent=type==='social'?(e.metadata?.title||'Evento CosplayChess'):e.title;
    const meta=document.createElement('span');
    const place=type==='official'?[e.venue,e.city].filter(Boolean).join(' · '):type==='social'?(e.metadata?.location||''):e.location;
    meta.textContent=[timeFor(type,e),place].filter(Boolean).join(' · ')||'Sem horário definido';copy.append(b,meta);
    const notes=type==='social'?e.body:(type==='personal'?e.notes:'');if(notes){const small=document.createElement('small');small.textContent=notes;copy.appendChild(small);}
    if(type==='social'){
      const actions=document.createElement('div');actions.className='cc13-event-actions';
      const mine=state.rsvps.find(x=>x.post_id===e.id&&x.profile_id===state.profile.id);
      const going=state.rsvps.filter(x=>x.post_id===e.id&&x.status==='going').length;
      [['going','✓ Vou'],['interested','☆ Interessado']].forEach(([status,label])=>{const btn=document.createElement('button');btn.type='button';btn.textContent=label;btn.classList.toggle('active',mine?.status===status);btn.addEventListener('click',async()=>{btn.disabled=true;await db.rpc('cosplay_social_toggle_rsvp',{p_post:e.id,p_status:status});await loadMonth();});actions.appendChild(btn);});
      const count=document.createElement('small');count.textContent=`${going} confirmado${going===1?'':'s'}`;actions.appendChild(count);copy.appendChild(actions);
    }
    row.append(badge,copy);
    if(type==='personal'){
      const del=document.createElement('button');del.type='button';del.className='cc13-event-remove';del.textContent='×';del.title='Excluir da minha agenda';del.addEventListener('click',async()=>{if(!confirm(`Excluir “${e.title}” da sua agenda?`))return;del.disabled=true;const {error}=await db.from('cosplay_personal_calendar_events').delete().eq('id',e.id).eq('profile_id',state.profile.id);if(error){del.disabled=false;return;}await loadMonth();});row.appendChild(del);
    }
    return row;
  }
  function renderGrid(){
    const grid=$('cc13CalendarGrid'),label=$('cc13CalendarMonth');if(!grid)return;if(label)label.textContent=monthLabel(state.cursor);
    grid.replaceChildren();const {start}=visibleRange(),today=dateKey(new Date()),selected=dateKey(state.selected);
    for(let i=0;i<42;i++){
      const d=addDays(start,i),key=dateKey(d),data=forDay(key);const btn=document.createElement('button');btn.type='button';btn.className='cc13-day';
      if(d.getMonth()!==state.cursor.getMonth())btn.classList.add('outside');if(key===today)btn.classList.add('today');if(key===selected)btn.classList.add('selected');
      const num=document.createElement('b');num.textContent=String(d.getDate());const dots=document.createElement('span');dots.className='cc13-day-dots';
      if(data.official.length){const x=document.createElement('i');x.className='cc13-dot official';dots.appendChild(x);}if(data.social.length){const x=document.createElement('i');x.className='cc13-dot social';dots.appendChild(x);}if(data.personal.length){const x=document.createElement('i');x.className='cc13-dot personal';dots.appendChild(x);}
      btn.append(num,dots);btn.addEventListener('click',()=>{state.selected=d;renderGrid();renderDay();});grid.appendChild(btn);
    }
  }
  function renderDay(){
    const title=$('cc13SelectedDate'),list=$('cc13DayList'),date=$('cc13EventDate');if(title)title.textContent=fullDate(state.selected);if(date)date.value=dateKey(state.selected);if(!list)return;
    list.replaceChildren();const data=forDay(dateKey(state.selected));if(!data.official.length&&!data.social.length&&!data.personal.length){list.innerHTML='<div class="cc13-calendar-empty">Nenhum evento marcado neste dia.</div>';return;}
    data.official.forEach(e=>list.appendChild(item('official',e)));data.social.forEach(e=>list.appendChild(item('social',e)));data.personal.forEach(e=>list.appendChild(item('personal',e)));
  }
  function render(){renderGrid();renderDay();}
  function wire(){
    $('cc13Prev')?.addEventListener('click',async()=>{state.cursor=new Date(state.cursor.getFullYear(),state.cursor.getMonth()-1,1);state.selected=new Date(state.cursor);await loadMonth();});
    $('cc13Next')?.addEventListener('click',async()=>{state.cursor=new Date(state.cursor.getFullYear(),state.cursor.getMonth()+1,1);state.selected=new Date(state.cursor);await loadMonth();});
    $('cc13Today')?.addEventListener('click',async()=>{const n=new Date();state.cursor=new Date(n.getFullYear(),n.getMonth(),1);state.selected=n;await loadMonth();});
    $('cc13Add')?.addEventListener('click',()=>{const f=$('cc13CalendarForm');if(f){f.hidden=!f.hidden;if(!f.hidden){$('cc13EventDate').value=dateKey(state.selected);f.elements.title?.focus();}}});
    $('cc13CalendarForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,st=$('cc13CalendarStatus'),btn=f.querySelector('[type="submit"]');const title=String(f.elements.title.value||'').trim();if(title.length<2)return;btn.disabled=true;if(st)st.textContent='Salvando...';const payload={profile_id:state.profile.id,title,event_date:f.elements.event_date.value,start_time:f.elements.start_time.value||null,location:String(f.elements.location.value||'').trim(),notes:String(f.elements.notes.value||'').trim(),updated_at:new Date().toISOString()};const {error}=await db.from('cosplay_personal_calendar_events').insert(payload);btn.disabled=false;if(error){if(st)st.textContent='Não foi possível salvar.';return;}f.reset();f.hidden=true;if(st)st.textContent='';state.selected=fromKey(payload.event_date);state.cursor=new Date(state.selected.getFullYear(),state.selected.getMonth(),1);await loadMonth();});
  }
  async function mount(){
    if(state.busy)return;const panel=q('[data-community-panel="events"]');if(!panel||panel.hidden)return;state.busy=true;try{const me=await getMe();if(!me){panel.innerHTML='<div class="cc9-empty">Entre na Área do Participante para acessar sua agenda.</div>';return;}ensureDates();panel.innerHTML=`<section class="cc13-calendar" id="cc13EventCalendar"><header class="cc13-calendar-head"><div><span class="kicker">EVENTOS & AGENDA</span><h2>Calendário</h2><p>Veja eventos oficiais, eventos publicados na rede e compromissos que você salvou só para você.</p></div><button class="btn gold" id="cc13Today" type="button">Hoje</button></header><div class="cc13-calendar-layout"><section class="cc13-calendar-card"><div class="cc13-calendar-toolbar"><button id="cc13Prev" type="button" aria-label="Mês anterior">‹</button><strong id="cc13CalendarMonth"></strong><button id="cc13Next" type="button" aria-label="Próximo mês">›</button></div><div class="cc13-calendar-week"><span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span></div><div class="cc13-calendar-grid" id="cc13CalendarGrid"></div><div class="cc13-calendar-legend"><span><i class="cc13-dot official"></i>Oficial</span><span><i class="cc13-dot social"></i>Rede</span><span><i class="cc13-dot personal"></i>Minha agenda</span></div></section><aside class="cc13-day-card"><div class="cc13-day-head"><span>AGENDA DO DIA</span><h3 id="cc13SelectedDate"></h3></div><div class="cc13-day-list" id="cc13DayList"></div><div class="cc13-calendar-add"><button class="btn dark" id="cc13Add" type="button">＋ Adicionar à minha agenda</button><form class="cc13-calendar-form" id="cc13CalendarForm" hidden><label><span>Título</span><input name="title" maxlength="120" required placeholder="Ex.: Anime Buzz"></label><div class="cc13-calendar-form-grid"><label><span>Data</span><input id="cc13EventDate" name="event_date" type="date" required></label><label><span>Horário</span><input name="start_time" type="time"></label></div><label><span>Local</span><input name="location" maxlength="180" placeholder="Local ou cidade"></label><label><span>Observações</span><textarea name="notes" maxlength="600" rows="3"></textarea></label><div class="cc13-calendar-status" id="cc13CalendarStatus"></div><div class="cc13-form-actions"><button class="btn gold" type="submit">Salvar</button></div></form></div></aside></div></section>`;wire();await loadMonth();}finally{state.busy=false;}
  }

  document.addEventListener('click',e=>{if(!e.target.closest('[data-community-view="events"]'))return;[90,220].forEach(ms=>setTimeout(()=>mount().catch(()=>{}),ms));},true);
  const boot=()=>{const panel=q('[data-community-panel="events"]');if(panel&&!panel.hidden)setTimeout(()=>mount().catch(()=>{}),180);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
