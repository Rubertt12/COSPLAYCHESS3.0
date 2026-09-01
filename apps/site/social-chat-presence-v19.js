(() => {
  'use strict';
  if (window.__CC_CHAT_PRESENCE_V19__) return;
  window.__CC_CHAT_PRESENCE_V19__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const q = (s,r=document) => r.querySelector(s);
  const qa = (s,r=document) => [...r.querySelectorAll(s)];
  const state = { me:null, statuses:new Map(), profiles:new Map(), busy:false };

  const css = `
    body.cc-v4.cc19-chat-active .cc-center{grid-column:2/4!important;max-width:none!important;width:auto!important;padding-right:18px!important}
    body.cc-v4.cc19-chat-active .cc-right{display:none!important}
    body.cc-v4.cc19-chat-active.cc-left-collapsed .cc-center{grid-column:2/4!important;padding-left:8px!important;padding-right:18px!important}
    body.cc-v4.cc19-chat-active .community-main,[data-community-panel="messages"]{max-width:none!important;width:100%!important}
    body.cc-v4.cc19-chat-active [data-community-panel="messages"]>.cc12-panel{width:100%!important;max-width:none!important}
    body.cc-v4.cc19-chat-active .cc12-chat{width:100%!important;max-width:none!important;grid-template-columns:minmax(310px,360px) minmax(0,1fr)!important;border-radius:16px!important}

    .cc19-own-presence{display:flex;align-items:center;gap:8px;margin-top:9px;padding:8px 10px;border:1px solid var(--line);border-radius:11px;background:var(--panel2)}
    .cc19-own-presence>span{display:flex;align-items:center;gap:7px;min-width:0;font-size:9px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
    .cc19-presence-dot{width:9px;height:9px;border-radius:50%;flex:0 0 9px;background:#8892a4;box-shadow:0 0 0 3px rgba(136,146,164,.13)}
    .cc19-presence-dot.online{background:#29b66f;box-shadow:0 0 0 3px rgba(41,182,111,.14)}
    .cc19-presence-dot.busy{background:#e4a626;box-shadow:0 0 0 3px rgba(228,166,38,.15)}
    .cc19-presence-dot.offline{background:#929bad;box-shadow:0 0 0 3px rgba(146,155,173,.13)}
    .cc19-own-presence select{margin-left:auto;min-width:106px;height:30px;padding:0 28px 0 9px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text);font:700 10px Inter,system-ui;outline:none}

    .cc12-thread{position:relative!important;display:grid!important;grid-template-columns:52px minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;padding:10px 11px!important}
    .cc12-thread-avatar{position:relative!important;width:50px!important;height:50px!important;min-width:50px!important;border-radius:50%!important;overflow:visible!important;background:var(--panel2)!important;border:1px solid var(--line)!important;display:grid!important;place-items:center!important}
    .cc12-thread-avatar img{width:100%!important;height:100%!important;border-radius:50%!important;object-fit:cover!important;display:block!important}
    .cc12-thread-avatar::after{content:'';position:absolute;right:0;bottom:1px;width:11px;height:11px;border-radius:50%;background:#929bad;border:2px solid var(--panel);box-sizing:content-box}
    .cc12-thread[data-cc19-status="online"] .cc12-thread-avatar::after{background:#29b66f}
    .cc12-thread[data-cc19-status="busy"] .cc12-thread-avatar::after{background:#e4a626}
    .cc12-thread[data-cc19-status="offline"] .cc12-thread-avatar::after{background:#929bad}
    .cc12-thread-copy{display:flex!important;flex-direction:column!important;gap:3px!important;min-width:0!important;text-align:left!important}
    .cc12-thread-copy b{font-size:11.5px!important;line-height:1.2!important}
    .cc12-thread-copy span{font-size:9px!important;color:var(--muted)!important}
    .cc19-thread-status{display:flex!important;align-items:center!important;gap:5px!important;font-size:8px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.03em!important;color:var(--muted)!important;margin-top:1px!important}
    .cc19-thread-status .cc19-presence-dot{width:6px;height:6px;flex-basis:6px;box-shadow:none}
    .cc12-unread{align-self:center!important}

    .cc12-online-person{min-width:66px!important}
    .cc12-online-avatar{width:48px!important;height:48px!important;border-radius:50%!important;border:1px solid var(--line)!important;background:var(--panel2)!important;overflow:visible!important}
    .cc12-online-avatar img{width:100%!important;height:100%!important;border-radius:50%!important;object-fit:cover!important}
    .cc12-online-dot{width:10px!important;height:10px!important;right:0!important;bottom:1px!important;background:#29b66f!important;border:2px solid var(--panel)!important}
    .cc12-online-person[data-cc19-status="busy"] .cc12-online-dot{background:#e4a626!important}

    .cc12-chat-head{min-height:72px!important;padding:10px 16px!important;gap:11px!important}
    .cc12-chat-head-avatar{position:relative!important;width:50px!important;height:50px!important;min-width:50px!important;border-radius:50%!important;background:var(--panel2)!important;border:1px solid var(--line)!important;overflow:visible!important;display:grid!important;place-items:center!important}
    .cc12-chat-head-avatar img{width:100%!important;height:100%!important;border-radius:50%!important;object-fit:cover!important}
    .cc12-chat-head-avatar::after{content:'';position:absolute;right:-1px;bottom:2px;width:11px;height:11px;border-radius:50%;background:#929bad;border:2px solid var(--panel)}
    .cc12-chat-head[data-cc19-status="online"] .cc12-chat-head-avatar::after{background:#29b66f}
    .cc12-chat-head[data-cc19-status="busy"] .cc12-chat-head-avatar::after{background:#e4a626}
    .cc12-chat-head-copy{min-width:0!important;display:flex!important;flex-direction:column!important;gap:3px!important}
    .cc12-chat-head-copy b{font-size:13px!important}
    .cc12-chat-head-copy small{font-size:9px!important;color:var(--muted)!important}
    .cc12-chat-head-copy small.online{color:#29a966!important}
    .cc12-chat-head-copy small.cc19-busy{color:#c88a10!important}
    .cc19-profile-photo-fallback{font-size:18px;color:var(--muted)}

    body[data-cc-theme="white-mode"] .cc19-own-presence{background:#f7f8fb!important;border-color:#dfe4ec!important}
    body[data-cc-theme="white-mode"] .cc19-own-presence select{background:#fff!important;color:#172033!important;border-color:#d8dfe9!important}
    body[data-cc-theme="white-mode"] .cc12-thread-avatar,body[data-cc-theme="white-mode"] .cc12-chat-head-avatar,body[data-cc-theme="white-mode"] .cc12-online-avatar{background:#fff!important;border-color:#dce2eb!important}
    body[data-cc-theme="white-mode"] .cc12-thread-avatar::after,body[data-cc-theme="white-mode"] .cc12-chat-head-avatar::after,body[data-cc-theme="white-mode"] .cc12-online-dot{border-color:#fff!important}

    @media(max-width:900px){body.cc-v4.cc19-chat-active .cc12-chat{grid-template-columns:minmax(270px,320px) minmax(0,1fr)!important}}
    @media(max-width:680px){
      body.cc-v4.cc19-chat-active .cc-center{grid-column:1!important;padding:0!important}
      body.cc-v4.cc19-chat-active .cc12-chat{grid-template-columns:1fr!important;border-radius:0!important}
      .cc19-own-presence{margin-top:7px}
      .cc12-thread{grid-template-columns:50px minmax(0,1fr) auto!important}
    }
  `;
  const style=document.createElement('style');style.id='ccChatPresenceV19Css';style.textContent=css;document.head.appendChild(style);

  const labelFor = s => s==='busy'?'Ocupado':s==='offline'?'Offline':'Online';
  const statusFor = (id,live) => {
    const pref=state.statuses.get(id)||'online';
    if(pref==='offline') return 'offline';
    if(!live) return 'offline';
    return pref==='busy'?'busy':'online';
  };

  async function getMe(){
    if(state.me)return state.me;
    const {data:s}=await db.auth.getSession();const uid=s?.session?.user?.id;if(!uid)return null;
    const {data}=await db.from('cosplay_participant_profiles').select('id,display_name,character_photo_url').eq('user_id',uid).neq('registration_status','cancelled').order('created_at',{ascending:false}).limit(1).maybeSingle();
    state.me=data||null;return state.me;
  }

  async function hydrate(ids){
    ids=[...new Set(ids.filter(Boolean))];if(!ids.length)return;
    const [{data:settings},{data:profiles}]=await Promise.all([
      db.from('cosplay_profile_social_settings').select('profile_id,presence_status').in('profile_id',ids),
      db.from('cosplay_participant_profiles').select('id,character_photo_url,display_name').in('id',ids)
    ]);
    (settings||[]).forEach(x=>state.statuses.set(x.profile_id,x.presence_status||'online'));
    (profiles||[]).forEach(x=>state.profiles.set(x.id,x));
  }

  function ensurePhoto(host,id){
    if(!host||host.querySelector('img'))return;
    const src=state.profiles.get(id)?.character_photo_url;if(!src)return;
    const img=document.createElement('img');img.src=src;img.alt='';img.loading='lazy';host.textContent='';host.appendChild(img);
  }

  function decorateThread(row){
    const id=row.dataset.cc12Thread;if(!id)return;
    const avatar=q('.cc12-thread-avatar',row);const live=avatar?.classList.contains('online');const status=statusFor(id,live);
    row.dataset.cc19Status=status;ensurePhoto(avatar,id);
    const copy=q('.cc12-thread-copy',row);if(copy&&!q('.cc19-thread-status',copy)){
      const s=document.createElement('small');s.className='cc19-thread-status';s.innerHTML=`<i class="cc19-presence-dot ${status}"></i><span>${labelFor(status)}</span>`;copy.appendChild(s);
    }else{
      const s=q('.cc19-thread-status',copy);if(s){const dot=q('.cc19-presence-dot',s);if(dot)dot.className=`cc19-presence-dot ${status}`;const text=q('span',s);if(text)text.textContent=labelFor(status);}
    }
  }

  function decorateOnline(btn){
    const id=btn.dataset.cc12Peer;if(!id)return;const av=q('.cc12-online-avatar',btn);const status=statusFor(id,true);btn.dataset.cc19Status=status;ensurePhoto(av,id);
    btn.title=`${state.profiles.get(id)?.display_name||'Participante'} · ${labelFor(status)}`;
  }

  function decorateConversation(){
    const head=q('.cc12-chat-head');if(!head)return;
    const active=q('.cc12-thread.active');const id=active?.dataset.cc12Thread;if(!id)return;
    const av=q('.cc12-chat-head-avatar',head);const live=av?.classList.contains('online');const status=statusFor(id,live);head.dataset.cc19Status=status;ensurePhoto(av,id);
    const presence=q('#cc12PresenceText',head);if(presence){presence.classList.remove('online','cc19-busy');if(status==='online'){presence.textContent='● Online agora';presence.classList.add('online');}else if(status==='busy'){presence.textContent='● Ocupado';presence.classList.add('cc19-busy');}else presence.textContent='● Offline';}
  }

  async function ensureOwnSelector(){
    const head=q('.cc12-side-head');if(!head||q('.cc19-own-presence',head))return;
    const me=await getMe();if(!me)return;await hydrate([me.id]);
    const current=state.statuses.get(me.id)||'online';
    const wrap=document.createElement('label');wrap.className='cc19-own-presence';wrap.innerHTML=`<span><i class="cc19-presence-dot ${current}"></i>Seu status</span><select aria-label="Seu status no chat"><option value="online">Online</option><option value="busy">Ocupado</option><option value="offline">Offline</option></select>`;
    const select=q('select',wrap);select.value=current;select.addEventListener('change',async()=>{
      const value=select.value;select.disabled=true;
      const {error}=await db.from('cosplay_profile_social_settings').upsert({profile_id:me.id,presence_status:value,updated_at:new Date().toISOString()},{onConflict:'profile_id'});
      select.disabled=false;if(error){select.value=state.statuses.get(me.id)||'online';return;}
      state.statuses.set(me.id,value);const dot=q('.cc19-presence-dot',wrap);dot.className=`cc19-presence-dot ${value}`;
    });
    head.appendChild(wrap);
  }

  async function enhance(){
    const panel=q('[data-community-panel="messages"]');const active=panel&& !panel.hidden && !!q('.cc12-chat',panel);document.body.classList.toggle('cc19-chat-active',!!active);if(!active)return;
    if(state.busy)return;state.busy=true;
    try{
      const ids=[...qa('[data-cc12-thread]').map(x=>x.dataset.cc12Thread),...qa('[data-cc12-peer]').map(x=>x.dataset.cc12Peer)];
      await hydrate(ids);await ensureOwnSelector();qa('[data-cc12-thread]').forEach(decorateThread);qa('[data-cc12-peer]').forEach(decorateOnline);decorateConversation();
    }finally{state.busy=false;}
  }

  let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(enhance,90);};
  const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-community-view="messages"],[data-cc12-thread],[data-cc12-peer],.cc-collapse'))[60,180,420].forEach(ms=>setTimeout(enhance,ms));},true);
  window.addEventListener('resize',schedule,{passive:true});
  [300,800,1600].forEach(ms=>setTimeout(enhance,ms));
})();
