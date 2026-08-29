(() => {
  if (window.__COSPLAY_EVENT_CALENDAR__) return;
  window.__COSPLAY_EVENT_CALENDAR__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const state = {
    user: null,
    profile: null,
    cursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selected: new Date(),
    official: [],
    personal: []
  };

  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const fromKey = (key) => { const [y,m,d]=String(key).split('-').map(Number); return new Date(y,m-1,d); };
  const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
  const monthLabel = (d) => new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(d);
  const fullDate = (d) => new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(d);
  const timeText = (value) => value ? String(value).slice(0,5) : '';
  const eventTime = (e) => {
    if (e.start_at) return new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(e.start_at));
    return timeText(e.start_time);
  };

  const waitFor = (selector, timeout=7000) => new Promise((resolve) => {
    const found=document.querySelector(selector);
    if(found) return resolve(found);
    const obs=new MutationObserver(()=>{const el=document.querySelector(selector);if(el){obs.disconnect();resolve(el);}});
    obs.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>{obs.disconnect();resolve(document.querySelector(selector));},timeout);
  });

  const loadMe = async () => {
    const {data:s}=await db.auth.getSession();
    state.user=s?.session?.user||null;
    if(!state.user) return false;
    const {data,error}=await db.from('cosplay_participant_profiles')
      .select('id,user_id,display_name,nick,registration_status,created_at')
      .eq('user_id',state.user.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(error||!data) return false;
    state.profile=data;
    return true;
  };

  const visibleRange = () => {
    const first=new Date(state.cursor.getFullYear(),state.cursor.getMonth(),1);
    const start=addDays(first,-first.getDay());
    return {start,end:addDays(start,42)};
  };

  const loadMonth = async () => {
    if(!state.profile && !await loadMe()) return;
    const {start,end}=visibleRange();
    const startKey=dateKey(start);
    const endKey=dateKey(addDays(end,-1));
    const [{data:official,error:officialError},{data:personal,error:personalError}] = await Promise.all([
      db.from('cosplay_events')
        .select('id,title,slug,venue,city,start_at,end_at,cover_url,published')
        .eq('published',true)
        .gte('start_at',start.toISOString())
        .lt('start_at',end.toISOString())
        .order('start_at',{ascending:true}),
      db.from('cosplay_personal_calendar_events')
        .select('id,profile_id,title,event_date,start_time,end_time,location,notes,created_at,updated_at')
        .eq('profile_id',state.profile.id)
        .gte('event_date',startKey)
        .lte('event_date',endKey)
        .order('event_date',{ascending:true})
        .order('start_time',{ascending:true})
    ]);
    state.official=officialError?[]:(official||[]);
    state.personal=personalError?[]:(personal||[]);
    render();
  };

  const officialKey = (e) => dateKey(new Date(e.start_at));
  const eventsFor = (key) => ({
    official: state.official.filter(e=>officialKey(e)===key),
    personal: state.personal.filter(e=>e.event_date===key)
  });

  const createItem = (e,type) => {
    const row=document.createElement('article');
    row.className=`social-calendar-item ${type}`;
    const badge=document.createElement('span');
    badge.className='social-calendar-item-badge';
    badge.textContent=type==='official'?'OFICIAL':'MINHA AGENDA';
    const copy=document.createElement('div');
    copy.className='social-calendar-item-copy';
    const title=document.createElement('b');title.textContent=e.title;
    const meta=document.createElement('span');
    const place=type==='official'?[e.venue,e.city].filter(Boolean).join(' · '):e.location;
    meta.textContent=[eventTime(e),place].filter(Boolean).join(' · ')||'Sem horário definido';
    copy.append(title,meta);
    if(type==='personal'&&e.notes){const note=document.createElement('small');note.textContent=e.notes;copy.appendChild(note);}
    row.append(badge,copy);
    if(type==='personal'){
      const remove=document.createElement('button');
      remove.type='button';remove.className='social-calendar-remove';remove.setAttribute('aria-label',`Remover ${e.title}`);remove.textContent='×';
      remove.addEventListener('click',async()=>{
        if(!confirm(`Remover “${e.title}” da sua agenda?`)) return;
        remove.disabled=true;
        const {error}=await db.from('cosplay_personal_calendar_events').delete().eq('id',e.id).eq('profile_id',state.profile.id);
        if(error){remove.disabled=false;return;}
        await loadMonth();
      });
      row.appendChild(remove);
    }
    return row;
  };

  const renderDayPanel = () => {
    const key=dateKey(state.selected);
    const {official,personal}=eventsFor(key);
    const title=document.getElementById('socialCalendarSelectedDate');
    const list=document.getElementById('socialCalendarDayList');
    const dateInput=document.getElementById('socialCalendarEventDate');
    if(title) title.textContent=fullDate(state.selected);
    if(dateInput) dateInput.value=key;
    if(!list) return;
    list.replaceChildren();
    if(!official.length&&!personal.length){const empty=document.createElement('div');empty.className='social-calendar-empty';empty.textContent='Nenhum evento marcado neste dia.';list.appendChild(empty);return;}
    official.forEach(e=>list.appendChild(createItem(e,'official')));
    personal.forEach(e=>list.appendChild(createItem(e,'personal')));
  };

  const renderGrid = () => {
    const grid=document.getElementById('socialCalendarGrid');
    const label=document.getElementById('socialCalendarMonthLabel');
    if(!grid) return;
    if(label) label.textContent=monthLabel(state.cursor);
    grid.replaceChildren();
    ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].forEach(name=>{const h=document.createElement('div');h.className='social-calendar-weekday';h.textContent=name;grid.appendChild(h);});
    const {start}=visibleRange();
    const today=dateKey(new Date());
    const selected=dateKey(state.selected);
    for(let i=0;i<42;i++){
      const d=addDays(start,i);const key=dateKey(d);const data=eventsFor(key);
      const btn=document.createElement('button');btn.type='button';btn.className='social-calendar-day';btn.dataset.date=key;
      if(d.getMonth()!==state.cursor.getMonth())btn.classList.add('outside');
      if(key===today)btn.classList.add('today');
      if(key===selected)btn.classList.add('selected');
      if(data.official.length)btn.classList.add('has-official');
      if(data.personal.length)btn.classList.add('has-personal');
      const num=document.createElement('b');num.textContent=String(d.getDate());btn.appendChild(num);
      const marks=document.createElement('span');marks.className='social-calendar-marks';
      if(data.official.length){const mark=document.createElement('i');mark.className='official';mark.title=`${data.official.length} evento(s) oficial(is)`;marks.appendChild(mark);}
      if(data.personal.length){const mark=document.createElement('i');mark.className='personal';mark.title=`${data.personal.length} item(ns) na agenda`;marks.appendChild(mark);}
      btn.appendChild(marks);
      btn.addEventListener('click',()=>{state.selected=d;renderGrid();renderDayPanel();});
      grid.appendChild(btn);
    }
  };

  const render = () => { renderGrid(); renderDayPanel(); };

  const openForm = () => {
    const form=document.getElementById('socialCalendarForm');
    if(!form)return;
    form.hidden=false;
    const input=form.elements.title; if(input) setTimeout(()=>input.focus(),0);
  };

  const closeForm = () => {
    const form=document.getElementById('socialCalendarForm');
    if(!form)return;
    form.hidden=true;
    form.reset();
    const dateInput=document.getElementById('socialCalendarEventDate');if(dateInput)dateInput.value=dateKey(state.selected);
    const status=document.getElementById('socialCalendarStatus');if(status)status.textContent='';
  };

  const mount = async () => {
    const panel=await waitFor('[data-community-panel="events"]');
    const legacyRoot=document.getElementById('socialExt-events');
    if(!panel||!legacyRoot||document.getElementById('communityEventCalendar'))return;
    if(!await loadMe())return;

    const root=document.createElement('section');
    root.id='communityEventCalendar';root.className='social-calendar';
    root.innerHTML=`
      <div class="social-calendar-head">
        <div><span>MINHA AGENDA</span><h3>Calendário de eventos</h3><p>Eventos oficiais aparecem automaticamente. Você também pode marcar compromissos e outros eventos só na sua agenda.</p></div>
        <button class="btn gold" id="socialCalendarAdd" type="button">＋ Novo evento</button>
      </div>
      <div class="social-calendar-layout">
        <div class="social-calendar-card">
          <div class="social-calendar-toolbar"><button type="button" id="socialCalendarPrev" aria-label="Mês anterior">‹</button><strong id="socialCalendarMonthLabel"></strong><button type="button" id="socialCalendarNext" aria-label="Próximo mês">›</button></div>
          <div class="social-calendar-grid" id="socialCalendarGrid"></div>
          <div class="social-calendar-legend"><span><i class="official"></i>Evento oficial</span><span><i class="personal"></i>Minha agenda</span></div>
        </div>
        <aside class="social-calendar-day-panel">
          <div class="social-calendar-day-head"><span>AGENDA DO DIA</span><h4 id="socialCalendarSelectedDate"></h4></div>
          <div id="socialCalendarDayList" class="social-calendar-day-list"></div>
          <form id="socialCalendarForm" class="social-calendar-form" hidden>
            <div class="social-calendar-form-head"><b>Novo evento na minha agenda</b><button type="button" id="socialCalendarCancel" aria-label="Fechar">×</button></div>
            <label><span>Título</span><input name="title" maxlength="120" required placeholder="Ex.: Anime Buzz"></label>
            <div class="social-calendar-form-grid"><label><span>Data</span><input id="socialCalendarEventDate" name="event_date" type="date" required></label><label><span>Horário</span><input name="start_time" type="time"></label></div>
            <label><span>Local</span><input name="location" maxlength="180" placeholder="Local ou cidade"></label>
            <label><span>Observações</span><textarea name="notes" maxlength="600" rows="3" placeholder="Informações que você quer lembrar..."></textarea></label>
            <div class="social-calendar-form-actions"><span id="socialCalendarStatus"></span><button class="btn gold" type="submit">Salvar na agenda</button></div>
          </form>
        </aside>
      </div>`;
    panel.insertBefore(root,legacyRoot);

    document.getElementById('socialCalendarPrev')?.addEventListener('click',async()=>{state.cursor=new Date(state.cursor.getFullYear(),state.cursor.getMonth()-1,1);state.selected=new Date(state.cursor);await loadMonth();});
    document.getElementById('socialCalendarNext')?.addEventListener('click',async()=>{state.cursor=new Date(state.cursor.getFullYear(),state.cursor.getMonth()+1,1);state.selected=new Date(state.cursor);await loadMonth();});
    document.getElementById('socialCalendarAdd')?.addEventListener('click',openForm);
    document.getElementById('socialCalendarCancel')?.addEventListener('click',closeForm);
    document.getElementById('socialCalendarForm')?.addEventListener('submit',async(e)=>{
      e.preventDefault();
      const form=e.currentTarget;const status=document.getElementById('socialCalendarStatus');const submit=form.querySelector('[type="submit"]');
      const title=String(form.elements.title.value||'').trim();if(title.length<2)return;
      submit.disabled=true;if(status)status.textContent='Salvando...';
      const payload={profile_id:state.profile.id,title,event_date:form.elements.event_date.value,start_time:form.elements.start_time.value||null,location:String(form.elements.location.value||'').trim(),notes:String(form.elements.notes.value||'').trim(),updated_at:new Date().toISOString()};
      const {error}=await db.from('cosplay_personal_calendar_events').insert(payload);
      submit.disabled=false;
      if(error){if(status)status.textContent='Não foi possível salvar.';return;}
      closeForm();state.selected=fromKey(payload.event_date);state.cursor=new Date(state.selected.getFullYear(),state.selected.getMonth(),1);await loadMonth();
    });

    document.querySelector('[data-community-view="events"]')?.addEventListener('click',()=>loadMonth().catch(()=>{}));
    await loadMonth();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount().catch(()=>{}),{once:true});else mount().catch(()=>{});
})();