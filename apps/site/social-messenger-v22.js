(() => {
  'use strict';
  if (window.__CC_SOCIAL_MESSENGER_V22__) return;
  window.__CC_SOCIAL_MESSENGER_V22__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db?.auth) return;

  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe=v=>{try{const u=new URL(String(v||''),location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}};
  const state={me:null,people:[],presence:new Map(),tab:'conversations',busy:false,refreshTimer:0,observer:null};

  const nameOf=p=>p?.display_name||p?.nick||'Participante';
  const ago=value=>{
    if(!value)return'Offline';
    const ms=Date.now()-new Date(value).getTime();
    if(!Number.isFinite(ms)||ms<0)return'Offline';
    const min=Math.floor(ms/60000);
    if(min<1)return'Visto agora';
    if(min<60)return`Visto há ${min} min`;
    const h=Math.floor(min/60);
    if(h<24)return`Visto há ${h} h`;
    const d=Math.floor(h/24);
    if(d===1)return'Visto ontem';
    return`Visto há ${d} dias`;
  };
  const presenceOf=id=>state.presence.get(id)||{profile_id:id,online:false,last_seen_at:null,presence_status:'offline'};
  const statusClass=row=>row?.presence_status==='hidden'?'hidden':row?.online?(row?.presence_status==='busy'?'busy':'online'):'offline';
  const statusLabel=row=>{
    if(!row||row.presence_status==='hidden')return'Status oculto';
    if(row.online)return row.presence_status==='busy'?'Ocupado agora':'Online agora';
    return row.last_seen_at?ago(row.last_seen_at):'Offline';
  };

  async function getMe(){
    if(state.me)return state.me;
    const {data:s}=await db.auth.getSession();const uid=s?.session?.user?.id;if(!uid)return null;
    const {data}=await db.from('cosplay_participant_profiles').select('id,user_id').eq('user_id',uid).neq('registration_status','cancelled').order('created_at',{ascending:true}).limit(1).maybeSingle();
    state.me=data||null;return state.me;
  }

  async function loadPeople(){
    const mine=await getMe();if(!mine)return[];
    const {data,error}=await db.rpc('cosplay_discover_participants',{p_search:'',p_page:1,p_page_size:200});
    if(error)return[];
    state.people=(data||[]).filter(x=>x.profile_id&&x.profile_id!==mine.id).map(x=>({id:x.profile_id,public_slug:x.public_slug,display_name:x.display_name,nick:x.nick,character_name:x.character_name,character_photo_url:x.character_photo_url}));
    return state.people;
  }

  async function refreshPresence(){
    if(state.busy)return;
    const ids=state.people.map(p=>p.id).filter(Boolean);if(!ids.length)return;
    state.busy=true;
    try{
      const {data,error}=await db.rpc('cosplay_message_presence',{p_profile_ids:ids});
      if(!error){state.presence.clear();(data||[]).forEach(row=>state.presence.set(row.profile_id,row));renderPeople();paintConversationStatuses();}
    }finally{state.busy=false;}
  }

  function renderPeople(){
    const root=q('#cc22PeopleList');if(!root)return;
    const term=(q('#cc20Search')?.value||'').trim().toLocaleLowerCase('pt-BR');
    let people=[...state.people];
    if(term)people=people.filter(p=>`${nameOf(p)} ${p.character_name||''}`.toLocaleLowerCase('pt-BR').includes(term));
    people.sort((a,b)=>{
      const pa=presenceOf(a.id),pb=presenceOf(b.id);const oa=pa.online?0:1,ob=pb.online?0:1;
      return oa-ob||nameOf(a).localeCompare(nameOf(b),'pt-BR');
    });
    const onlineCount=people.filter(p=>presenceOf(p.id).online).length;
    const tabCount=q('#cc22PeopleCount');if(tabCount)tabCount.textContent=String(state.people.length);
    const onlineBadge=q('#cc22OnlineCount');if(onlineBadge)onlineBadge.textContent=String(onlineCount);
    root.innerHTML=people.length?people.map(p=>{
      const row=presenceOf(p.id),cls=statusClass(row),src=safe(p.character_photo_url);
      return `<button class="cc22-user-row" type="button" data-cc22-peer="${esc(p.id)}"><span class="cc22-user-avatar">${src?`<img src="${esc(src)}" alt="Foto de ${esc(nameOf(p))}" loading="lazy" decoding="async">`:'♜'}<i class="${cls}"></i></span><span class="cc22-user-copy"><b>${esc(nameOf(p))}</b><span>${esc(p.character_name||'CosplayChess')}</span><small class="${cls}">${esc(statusLabel(row))}</small></span><span class="cc22-user-action">Mensagem</span></button>`;
    }).join(''):'<div class="cc22-empty">Nenhum participante encontrado.</div>';
  }

  function paintConversationStatuses(){
    qa('.cc20-thread[data-peer]').forEach(button=>{
      const id=button.dataset.peer,row=presenceOf(id),copy=q('.cc20-thread-copy',button);if(!copy)return;
      let small=q('.cc21-thread-status',copy);if(!small){small=document.createElement('small');small.className='cc21-thread-status';q('b',copy)?.insertAdjacentElement('afterend',small);}
      const cls=statusClass(row);small.textContent=statusLabel(row);small.dataset.state=cls;
      const dot=q('.cc20-dot',button);if(dot){dot.classList.remove('online','busy','offline');dot.classList.add(cls==='hidden'?'offline':cls);}
    });
    const active=q('.cc20-thread.active[data-peer]');
    if(active){const row=presenceOf(active.dataset.peer),status=q('.cc20-status-text');if(status){const cls=statusClass(row);status.textContent=statusLabel(row);status.classList.remove('online','busy','offline');status.classList.add(cls==='hidden'?'offline':cls);}}
  }

  function openPeer(id){
    if(!id)return;
    const existing=q(`.cc20-thread[data-peer="${CSS.escape(id)}"]`);
    if(existing){existing.click();setTab('conversations');return;}
    const newButton=q('#cc20New');
    if(newButton){
      const panel=q('#cc20NewPanel');if(panel?.hidden)newButton.click();
      setTimeout(()=>{
        const target=q(`.cc20-new-person[data-peer="${CSS.escape(id)}"]`);
        if(target){target.click();setTab('conversations');}
        else location.href=`./mensagens.html?message=${encodeURIComponent(id)}`;
      },60);
      return;
    }
    location.href=`./mensagens.html?message=${encodeURIComponent(id)}`;
  }

  function setTab(tab){
    state.tab=tab==='people'?'people':'conversations';
    qa('.cc22-list-tab').forEach(b=>b.classList.toggle('active',b.dataset.cc22Tab===state.tab));
    const threads=q('#cc20Threads'),title=q('.cc20-conversations-title'),people=q('#cc22PeopleList');
    if(threads)threads.classList.toggle('cc22-hidden',state.tab==='people');
    if(title)title.classList.toggle('cc22-hidden',state.tab==='people');
    if(people)people.hidden=state.tab!=='people';
    const search=q('#cc20Search');if(search)search.placeholder=state.tab==='people'?'Buscar participante...':'Buscar conversa...';
    if(state.tab==='people')renderPeople();
  }

  function enhance(){
    const chat=q('.cc20'),list=q('.cc20-list'),head=q('.cc20-list-head'),threads=q('#cc20Threads');
    if(!chat||!list||!head||!threads)return false;
    if(!q('#cc22ListTabs')){
      const tabs=document.createElement('div');tabs.id='cc22ListTabs';tabs.className='cc22-list-tabs';tabs.innerHTML='<button class="cc22-list-tab active" type="button" data-cc22-tab="conversations">Conversas <b id="cc22ConversationCount">0</b></button><button class="cc22-list-tab" type="button" data-cc22-tab="people">Participantes <b id="cc22PeopleCount">0</b></button>';
      const title=q('.cc20-conversations-title');list.insertBefore(tabs,title||threads);
      tabs.addEventListener('click',e=>{const b=e.target.closest('[data-cc22-tab]');if(b)setTab(b.dataset.cc22Tab)});
    }
    if(!q('#cc22PeopleList')){
      const people=document.createElement('div');people.id='cc22PeopleList';people.className='cc22-people';people.hidden=true;list.appendChild(people);
    }
    const conversationsCount=q('#cc20Count')?.textContent||'0';const badge=q('#cc22ConversationCount');if(badge)badge.textContent=conversationsCount;
    const search=q('#cc20Search');if(search&&!search.dataset.cc22Bound){search.dataset.cc22Bound='1';search.addEventListener('input',()=>{if(state.tab==='people')renderPeople();setTimeout(()=>{const b=q('#cc22ConversationCount');if(b)b.textContent=q('#cc20Count')?.textContent||'0';},0)});}
    if(!chat.dataset.cc22Delegated){chat.dataset.cc22Delegated='1';chat.addEventListener('click',e=>{const row=e.target.closest('[data-cc22-peer]');if(row){e.preventDefault();openPeer(row.dataset.cc22Peer);}});}
    setTab(state.tab);paintConversationStatuses();return true;
  }

  async function boot(){
    const mine=await getMe();if(!mine)return;
    await loadPeople();
    let tries=0;
    const wait=()=>{
      tries++;
      if(enhance()){renderPeople();refreshPresence().catch(()=>{});return;}
      if(tries<40)setTimeout(wait,100);
    };
    wait();
    const panel=q('[data-community-panel="messages"]')||document.body;
    state.observer=new MutationObserver(()=>{clearTimeout(state._paint);state._paint=setTimeout(()=>{enhance();renderPeople();paintConversationStatuses();},70)});
    state.observer.observe(panel,{childList:true,subtree:true});
    state.refreshTimer=setInterval(()=>refreshPresence().catch(()=>{}),30000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPresence().catch(()=>{})});
    window.addEventListener('focus',()=>refreshPresence().catch(()=>{}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot().catch(()=>{}),{once:true});else boot().catch(()=>{});
})();
