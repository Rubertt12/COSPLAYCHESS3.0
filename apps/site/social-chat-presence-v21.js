(() => {
  'use strict';
  if (window.__CC_CHAT_PRESENCE_V21__) return;
  window.__CC_CHAT_PRESENCE_V21__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const state={presence:new Map(),timer:0,paintTimer:0,busy:false};

  const ago = value => {
    if (!value) return 'Offline';
    const ms = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(ms) || ms < 0) return 'Offline';
    const min = Math.floor(ms/60000);
    if (min < 1) return 'Visto agora';
    if (min < 60) return `Visto há ${min} min`;
    const h = Math.floor(min/60);
    if (h < 24) return `Visto há ${h} h`;
    const d = Math.floor(h/24);
    return d === 1 ? 'Visto ontem' : `Visto há ${d} dias`;
  };

  const label = row => {
    if (!row || row.presence_status === 'hidden') return 'Status oculto';
    if (row.online) return row.presence_status === 'busy' ? 'Ocupado agora' : 'Online agora';
    return row.last_seen_at ? ago(row.last_seen_at) : 'Offline';
  };

  const className = row => row?.online ? (row.presence_status === 'busy' ? 'busy' : 'online') : 'offline';

  function paintThread(button) {
    const id=button.dataset.peer; if(!id)return;
    const row=state.presence.get(id),copy=q('.cc20-thread-copy',button); if(!copy)return;
    let status=q('.cc21-thread-status',copy);
    if(!status){status=document.createElement('small');status.className='cc21-thread-status';const name=q('b',copy);name?.insertAdjacentElement('afterend',status);}
    status.textContent=label(row); status.dataset.state=className(row);
    const dot=q('.cc20-dot',button); if(dot){dot.classList.remove('online','busy','offline');dot.classList.add(className(row));}
  }

  function paintNewPerson(button) {
    const id=button.dataset.peer,row=state.presence.get(id),small=q('small',button); if(!id||!small)return;
    const text=small.textContent||''; const character=text.split(' · ')[0]||'CosplayChess';
    small.textContent=`${character} · ${label(row)}`;
    small.dataset.state=className(row);
    const dot=q('.cc20-dot',button); if(dot){dot.classList.remove('online','busy','offline');dot.classList.add(className(row));}
  }

  function paintHeader() {
    const active=q('.cc20-thread.active[data-peer]'); if(!active)return;
    const id=active.dataset.peer,row=state.presence.get(id),status=q('.cc20-status-text'); if(!status)return;
    status.textContent=label(row); status.dataset.state=className(row); status.classList.remove('online','busy','offline');status.classList.add(className(row));
    const dot=q('.cc20-head-avatar .cc20-dot'); if(dot){dot.classList.remove('online','busy','offline');dot.classList.add(className(row));}
  }

  function paint() {
    qa('.cc20-thread[data-peer]').forEach(paintThread);
    qa('.cc20-new-person[data-peer]').forEach(paintNewPerson);
    paintHeader();
  }

  function schedulePaint(){clearTimeout(state.paintTimer);state.paintTimer=setTimeout(paint,70);}

  async function refresh() {
    if(state.busy)return; const ids=[...new Set(qa('.cc20 [data-peer]').map(x=>x.dataset.peer).filter(Boolean))]; if(!ids.length)return;
    state.busy=true;
    try{
      const {data,error}=await db.rpc('cosplay_message_presence',{p_profile_ids:ids});
      if(!error){state.presence.clear();(data||[]).forEach(row=>state.presence.set(row.profile_id,row));paint();}
    }finally{state.busy=false;}
  }

  function boot(){
    const root=q('[data-community-panel="messages"]')||document.body;
    new MutationObserver(()=>{schedulePaint();clearTimeout(state.timer);state.timer=setTimeout(()=>refresh().catch(()=>{}),160);}).observe(root,{childList:true,subtree:true});
    [500,1400,3000].forEach(ms=>setTimeout(()=>refresh().catch(()=>{}),ms));
    setInterval(()=>refresh().catch(()=>{}),45000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh().catch(()=>{})});
    window.addEventListener('focus',()=>refresh().catch(()=>{}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
