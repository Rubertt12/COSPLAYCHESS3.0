(() => {
  'use strict';
  if (window.__CC_SOCIAL_CHAT_V12__) return;
  window.__CC_SOCIAL_CHAT_V12__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;
  const BUCKET = 'cosplaychess-social-media';
  const $ = id => document.getElementById(id);
  const q = (s, r=document) => r.querySelector(s);
  const qa = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = v => { try { const u = new URL(String(v || ''), location.href); return ['http:','https:','blob:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const fmt = v => { try { return new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(v)); } catch { return ''; } };
  const nameOf = p => p?.display_name || p?.nick || 'Participante';
  const profileHref = p => p?.public_slug ? `./jogador.html?slug=${encodeURIComponent(p.public_slug)}` : '#';
  const state = {
    user:null, me:null, people:new Map(), messages:[], selectedPeer:null,
    presence:null, presenceIds:new Set(), dmChannel:null, typingChannel:null,
    recorder:null, recordStream:null, recordChunks:[], recordStarted:0, recordTimer:0,
    pendingAudio:null, pendingAudioUrl:'', imagePreviewUrl:'', busy:false
  };
  const ANIME_EMOJI = ['🍥','🍙','🍜','⚡','🔥','💥','✨','🌀','🐉','🐲','👊','🗡️','⚔️','🏴‍☠️','👒','🎴','🃏','🌙','☄️','🦊','🐸','😤','😳','😂','🥺','😎','🤩','💜','💛','❤️‍🔥','🌸','💫','(≧▽≦)','(づ｡◕‿‿◕｡)づ','(ง •̀_•́)ง','NANI?!','YATTA!'];

  function toast(message,error=false){
    let el=$('cc12Toast');
    if(!el){el=document.createElement('div');el.id='cc12Toast';el.style.cssText='position:fixed;z-index:99999;left:50%;bottom:92px;transform:translateX(-50%);max-width:calc(100vw - 28px);padding:10px 14px;border:1px solid rgba(158,93,225,.45);border-radius:10px;background:rgba(7,9,15,.97);color:#f4f0f8;font:700 11px Inter,system-ui;box-shadow:0 16px 42px rgba(0,0,0,.45)';document.body.appendChild(el);}el.textContent=message;el.style.borderColor=error?'rgba(239,100,116,.55)':'rgba(158,93,225,.45)';el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>el.hidden=true,2300);
  }

  async function getMe(){
    if(state.me) return state.me;
    const {data:s}=await db.auth.getSession();state.user=s?.session?.user||null;if(!state.user)return null;
    const {data,error}=await db.from('cosplay_participant_profiles').select('id,user_id,public_slug,display_name,nick,character_name,character_photo_url').eq('user_id',state.user.id).neq('registration_status','cancelled').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error||!data)return null;state.me=data;state.people.set(data.id,data);return data;
  }

  async function loadPeople(){
    const me=await getMe();if(!me)return;
    const {data,error}=await db.rpc('cosplay_discover_participants',{p_search:'',p_page:1,p_page_size:200});if(error)return;
    (data||[]).forEach(x=>{if(!x.profile_id)return;state.people.set(x.profile_id,{id:x.profile_id,public_slug:x.public_slug,display_name:x.display_name,nick:x.nick,character_name:x.character_name,character_photo_url:x.character_photo_url});});
  }

  function switchToChat(){
    qa('[data-community-panel]').forEach(p=>{const on=p.dataset.communityPanel==='messages';p.hidden=!on;p.classList.toggle('active',on);});
    qa('[data-community-view]').forEach(b=>b.classList.toggle('active',b.dataset.communityView==='messages'));
    document.body.dataset.ccView='messages-v12';
  }

  async function signed(path){if(!path)return '';const {data,error}=await db.storage.from(BUCKET).createSignedUrl(path,3600);return error?'':data?.signedUrl||'';}
  function isOnline(id){return state.presenceIds.has(id);}

  async function loadMessages(){
    const me=await getMe();if(!me)return;
    const {data,error}=await db.from('cosplay_direct_messages').select('id,sender_profile_id,recipient_profile_id,body,attachment_path,attachment_type,metadata,read_at,created_at').eq('moderation_status','active').order('created_at',{ascending:true}).limit(1500);
    if(error)throw error;state.messages=data||[];
    const ids=[...new Set(state.messages.flatMap(m=>[m.sender_profile_id,m.recipient_profile_id]))].filter(Boolean);
    const missing=ids.filter(id=>!state.people.has(id));if(missing.length){const {data:p}=await db.from('cosplay_participant_profiles').select('id,public_slug,display_name,nick,character_name,character_photo_url').in('id',missing);(p||[]).forEach(x=>state.people.set(x.id,x));}
  }

  function latestByPeer(){const me=state.me,map=new Map(),unread=new Map();state.messages.forEach(m=>{const peer=m.sender_profile_id===me.id?m.recipient_profile_id:m.sender_profile_id;if(!peer)return;map.set(peer,m);if(m.recipient_profile_id===me.id&&!m.read_at)unread.set(peer,(unread.get(peer)||0)+1);});return{map,unread};}
  function attachmentLabel(m){if(m.attachment_type==='audio')return '🎙️ Áudio';if(m.attachment_type==='image')return '📷 Foto';return m.body||'';}

  function renderOnline(){
    const root=$('cc12OnlineList'),count=$('cc12OnlineCount');if(!root)return;
    const people=[...state.presenceIds].filter(id=>id!==state.me?.id).map(id=>state.people.get(id)).filter(Boolean);
    if(count)count.textContent=String(people.length);
    root.innerHTML=people.map(p=>{const img=safeUrl(p.character_photo_url);return `<button class="cc12-online-person" type="button" data-cc12-peer="${esc(p.id)}" title="Conversar com ${esc(nameOf(p))}"><span class="cc12-online-avatar">${img?`<img src="${esc(img)}" alt="">`:'♜'}<i class="cc12-online-dot"></i></span><span>${esc(nameOf(p).split(' ')[0])}</span></button>`;}).join('')||'<div class="cc12-online-empty">Ninguém online agora.</div>';
    qa('[data-cc12-peer]',root).forEach(b=>b.addEventListener('click',()=>openPeer(b.dataset.cc12Peer)));
    renderThreads();updateConversationPresence();
  }

  function renderThreads(){
    const root=$('cc12ThreadList');if(!root||!state.me)return;const {map,unread}=latestByPeer();
    const ids=[...map.keys()].sort((a,b)=>new Date(map.get(b).created_at)-new Date(map.get(a).created_at));
    root.innerHTML=ids.map(id=>{const p=state.people.get(id),m=map.get(id),img=safeUrl(p?.character_photo_url),online=isOnline(id);return `<button class="cc12-thread ${state.selectedPeer===id?'active':''}" type="button" data-cc12-thread="${esc(id)}"><span class="cc12-thread-avatar ${online?'online':''}">${img?`<img src="${esc(img)}" alt="">`:'♜'}</span><span class="cc12-thread-copy"><b>${esc(nameOf(p))}</b><span>${esc(attachmentLabel(m))}</span></span>${unread.get(id)?`<i class="cc12-unread">${unread.get(id)}</i>`:''}</button>`;}).join('')||'<div class="cc12-online-empty">Nenhuma conversa ainda. Clique em alguém online ou escolha “Nova conversa”.</div>';
    qa('[data-cc12-thread]',root).forEach(b=>b.addEventListener('click',()=>openPeer(b.dataset.cc12Thread)));
  }

  async function renderConversation(){
    const root=$('cc12Conversation'),me=state.me,peer=state.people.get(state.selectedPeer);if(!root||!me||!peer)return;
    root.closest('.cc12-chat')?.classList.add('in-conversation');
    const now=new Date().toISOString();await db.from('cosplay_direct_messages').update({read_at:now}).eq('sender_profile_id',peer.id).eq('recipient_profile_id',me.id).is('read_at',null);
    state.messages.forEach(m=>{if(m.sender_profile_id===peer.id&&m.recipient_profile_id===me.id&&!m.read_at)m.read_at=now;});
    const img=safeUrl(peer.character_photo_url),online=isOnline(peer.id);
    root.innerHTML=`<div class="cc12-chat-head"><button class="cc12-chat-back" type="button" aria-label="Voltar">←</button><span class="cc12-chat-head-avatar ${online?'online':''}">${img?`<img src="${esc(img)}" alt="">`:'♜'}</span><div class="cc12-chat-head-copy"><b>${esc(nameOf(peer))}</b><small id="cc12PresenceText" class="${online?'online':''}">${online?'● Online agora':`Cosplay: ${esc(peer.character_name||'CosplayChess')}`}</small></div><a class="cc12-profile-link" href="${esc(profileHref(peer))}">Ver perfil</a></div><div id="cc12Stream" class="cc12-stream"></div><div id="cc12Typing" class="cc12-typing"></div><div id="cc12Pending" class="cc12-pending"></div><form id="cc12Compose" class="cc12-compose"><button id="cc12EmojiToggle" class="cc12-tool" type="button" title="Emoji de anime">🍥</button><label class="cc12-tool" title="Enviar foto">📷<input id="cc12Image" type="file" accept="image/jpeg,image/png,image/webp"></label><button id="cc12Record" class="cc12-tool" type="button" title="Gravar áudio">🎙️</button><textarea id="cc12Body" maxlength="2000" rows="1" placeholder="Mensagem..."></textarea><button class="cc12-send" type="submit">Enviar</button><div id="cc12EmojiPanel" class="cc12-emoji-panel" hidden><strong>EMOJIS & REAÇÕES DE ANIME</strong><div class="cc12-emoji-grid">${ANIME_EMOJI.map(x=>`<button type="button" class="${x.length>3?'text':''}" data-cc12-emoji="${esc(x)}">${esc(x)}</button>`).join('')}</div></div></form>`;
    q('.cc12-chat-back',root)?.addEventListener('click',()=>root.closest('.cc12-chat')?.classList.remove('in-conversation'));
    await renderStream();wireComposer(peer.id);setupTyping(peer.id);renderThreads();updateUnreadBadge();
  }

  async function renderStream(){
    const stream=$('cc12Stream'),me=state.me,peerId=state.selectedPeer;if(!stream)return;stream.replaceChildren();
    const rows=state.messages.filter(m=>(m.sender_profile_id===me.id&&m.recipient_profile_id===peerId)||(m.sender_profile_id===peerId&&m.recipient_profile_id===me.id));
    for(const m of rows){const row=document.createElement('div');const mine=m.sender_profile_id===me.id;row.className=`cc12-bubble-row${mine?' mine':''}`;const bubble=document.createElement('div');bubble.className='cc12-bubble';
      if(m.attachment_path){const url=await signed(m.attachment_path);if(url&&m.attachment_type==='audio'){const a=document.createElement('audio');a.controls=true;a.preload='metadata';a.src=url;bubble.appendChild(a);}else if(url){const img=document.createElement('img');img.src=url;img.alt='Foto enviada';img.dataset.photoLightbox='';bubble.appendChild(img);}}
      if(m.body){const text=document.createElement('div');text.textContent=m.body;bubble.appendChild(text);}
      const meta=document.createElement('div');meta.className='cc12-bubble-meta';meta.innerHTML=`<span>${fmt(m.created_at)}</span>${mine?`<span class="${m.read_at?'cc12-seen':''}">${m.read_at?'✓✓':'✓'}</span>`:''}`;bubble.appendChild(meta);row.appendChild(bubble);
      if(mine){const del=document.createElement('button');del.type='button';del.className='cc12-delete';del.title='Excluir mensagem';del.textContent='×';del.addEventListener('click',()=>deleteMessage(m));row.appendChild(del);}stream.appendChild(row);
    }
    stream.scrollTop=stream.scrollHeight;
  }

  function updateConversationPresence(){const el=$('cc12PresenceText');if(!el||!state.selectedPeer)return;const p=state.people.get(state.selectedPeer),on=isOnline(state.selectedPeer);el.classList.toggle('online',on);el.textContent=on?'● Online agora':`Cosplay: ${p?.character_name||'CosplayChess'}`;const av=q('.cc12-chat-head-avatar');av?.classList.toggle('online',on);}

  function clearPending(){if(state.pendingAudioUrl)URL.revokeObjectURL(state.pendingAudioUrl);state.pendingAudio=null;state.pendingAudioUrl='';if(state.imagePreviewUrl)URL.revokeObjectURL(state.imagePreviewUrl);state.imagePreviewUrl='';const img=$('cc12Image');if(img)img.value='';const p=$('cc12Pending');if(p){p.className='cc12-pending';p.replaceChildren();}}
  function showImagePreview(file){clearPending();state.imagePreviewUrl=URL.createObjectURL(file);const p=$('cc12Pending');if(!p)return;p.className='cc12-pending show';p.innerHTML=`<img src="${esc(state.imagePreviewUrl)}" alt="Prévia"><span>${esc(file.name)} · ${(file.size/1048576).toFixed(1)} MB</span><button type="button" title="Remover">×</button>`;q('button',p)?.addEventListener('click',clearPending);}
  function showAudioPreview(blob){clearPending();state.pendingAudio=blob;state.pendingAudioUrl=URL.createObjectURL(blob);const p=$('cc12Pending');if(!p)return;p.className='cc12-pending show';p.innerHTML=`<audio controls src="${esc(state.pendingAudioUrl)}"></audio><span>Áudio gravado</span><button type="button" title="Remover">×</button>`;q('button',p)?.addEventListener('click',clearPending);}

  function wireComposer(peerId){
    const form=$('cc12Compose'),body=$('cc12Body'),image=$('cc12Image'),emojiToggle=$('cc12EmojiToggle'),panel=$('cc12EmojiPanel'),record=$('cc12Record');if(!form)return;
    body?.addEventListener('input',()=>{sendTyping(peerId);body.style.height='auto';body.style.height=Math.min(120,body.scrollHeight)+'px';});
    body?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
    image?.addEventListener('change',()=>{const f=image.files?.[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024){toast('Use JPG, PNG ou WebP com até 10 MB.',true);image.value='';return;}showImagePreview(f);});
    emojiToggle?.addEventListener('click',()=>panel.hidden=!panel.hidden);qa('[data-cc12-emoji]',panel).forEach(b=>b.addEventListener('click',()=>{const token=b.dataset.cc12Emoji||'';const start=body.selectionStart??body.value.length,end=body.selectionEnd??start;body.value=body.value.slice(0,start)+(start?' ':'')+token+' '+body.value.slice(end);body.focus();body.selectionStart=body.selectionEnd=(start+(start?1:0)+token.length+1);panel.hidden=true;}));
    record?.addEventListener('click',()=>state.recorder?.state==='recording'?stopRecording():startRecording());
    form.addEventListener('submit',e=>sendMessage(e,peerId));
  }

  async function startRecording(){
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Seu navegador não permite gravar áudio aqui.',true);return;}
    try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});state.recordStream=stream;const options={};if(MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus'))options.mimeType='audio/webm;codecs=opus';const rec=new MediaRecorder(stream,options);state.recorder=rec;state.recordChunks=[];rec.ondataavailable=e=>{if(e.data?.size)state.recordChunks.push(e.data);};rec.onstop=()=>{const mime=(rec.mimeType||'audio/webm').split(';')[0];const blob=new Blob(state.recordChunks,{type:mime});state.recordStream?.getTracks().forEach(t=>t.stop());state.recordStream=null;state.recorder=null;clearInterval(state.recordTimer);$('cc12Record')?.classList.remove('recording');$('cc12Record')&&($('cc12Record').textContent='🎙️');$('cc12RecordTime')?.remove();if(blob.size)showAudioPreview(blob);};rec.start(250);state.recordStarted=Date.now();$('cc12Record')?.classList.add('recording');$('cc12Record')&&($('cc12Record').textContent='■');const timer=document.createElement('span');timer.id='cc12RecordTime';timer.className='cc12-record-time';q('.cc12-compose')?.appendChild(timer);const paint=()=>{const sec=Math.floor((Date.now()-state.recordStarted)/1000);timer.textContent=`Gravando ${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;if(sec>=180)stopRecording();};paint();state.recordTimer=setInterval(paint,500);}catch{toast('Não consegui acessar o microfone. Verifique a permissão do navegador.',true);}
  }
  function stopRecording(){try{if(state.recorder?.state==='recording')state.recorder.stop();}catch{}}

  async function uploadAttachment(file,type){
    if(!file)return null;const mime=(file.type||'application/octet-stream').split(';')[0];let ext='bin';if(type==='image')ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';else ext=mime.includes('ogg')?'ogg':mime.includes('mpeg')?'mp3':mime.includes('mp4')||mime.includes('m4a')?'m4a':mime.includes('wav')?'wav':'webm';
    const path=`${state.user.id}/${state.me.id}/messages/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;const {error}=await db.storage.from(BUCKET).upload(path,file,{contentType:mime,cacheControl:'3600',upsert:false});if(error)throw error;return path;
  }

  async function sendMessage(e,peerId){
    e.preventDefault();if(state.busy)return;const form=e.currentTarget,body=$('cc12Body')?.value.trim()||'',image=$('cc12Image')?.files?.[0]||null,audio=state.pendingAudio;let file=image,type=image?'image':audio?'audio':'text';if(audio){file=new File([audio],`audio-${Date.now()}.webm`,{type:audio.type||'audio/webm'});type='audio';}
    if(!body&&!file)return;if(type==='audio'&&file.size>15*1024*1024){toast('O áudio deve ter no máximo 15 MB.',true);return;}state.busy=true;const btn=q('.cc12-send',form);if(btn)btn.disabled=true;let path=null;
    try{if(file)path=await uploadAttachment(file,type);const {data,error}=await db.from('cosplay_direct_messages').insert({sender_profile_id:state.me.id,recipient_profile_id:peerId,body:body||'',attachment_path:path,attachment_type:type,metadata:type==='audio'?{recorded:true}:{} }).select('id,sender_profile_id,recipient_profile_id,body,attachment_path,attachment_type,metadata,read_at,created_at').single();if(error)throw error;state.messages.push(data);$('cc12Body').value='';clearPending();renderThreads();await renderStream();}
    catch(err){if(path)await db.storage.from(BUCKET).remove([path]).catch(()=>{});toast(err?.message?.toLowerCase().includes('policy')?'Este participante não permite mensagens suas no momento.':'Não foi possível enviar a mensagem.',true);}finally{state.busy=false;if(btn)btn.disabled=false;}
  }

  async function deleteMessage(m){if(!confirm('Excluir esta mensagem?'))return;const {error}=await db.from('cosplay_direct_messages').delete().eq('id',m.id);if(error){toast('Não foi possível excluir a mensagem.',true);return;}if(m.attachment_path)await db.storage.from(BUCKET).remove([m.attachment_path]).catch(()=>{});state.messages=state.messages.filter(x=>x.id!==m.id);renderThreads();renderStream();}

  function setupTyping(peerId){try{state.typingChannel?.unsubscribe();}catch{}const key=[state.me.id,peerId].sort().join(':');const ch=db.channel(`cc12-typing-${key}`,{config:{broadcast:{self:false}}});ch.on('broadcast',{event:'typing'},payload=>{if(payload.payload?.from!==peerId)return;const el=$('cc12Typing');if(!el)return;el.textContent=`${nameOf(state.people.get(peerId))} está digitando...`;clearTimeout(el._t);el._t=setTimeout(()=>el.textContent='',1400);});ch.subscribe();state.typingChannel=ch;}
  function sendTyping(peerId){try{state.typingChannel?.send({type:'broadcast',event:'typing',payload:{from:state.me.id,to:peerId}});}catch{}}

  async function openPeer(id){if(!id||id===state.me?.id)return;if(!state.people.has(id)){const {data}=await db.from('cosplay_participant_profiles').select('id,public_slug,display_name,nick,character_name,character_photo_url').eq('id',id).maybeSingle();if(data)state.people.set(id,data);}state.selectedPeer=id;renderThreads();await renderConversation();}

  async function updateUnreadBadge(){const me=state.me;if(!me)return;const {count}=await db.from('cosplay_direct_messages').select('id',{count:'exact',head:true}).eq('recipient_profile_id',me.id).is('read_at',null).eq('moderation_status','active');let badge=q('[data-community-view="messages"] .cc9-nav-badge');const nav=q('.community-nav [data-community-view="messages"]');if(!badge&&nav){badge=document.createElement('b');badge.className='cc9-nav-badge';nav.appendChild(badge);}if(badge){badge.textContent=String(count||0);badge.hidden=!count;}}

  async function setupPresence(){
    if(state.presence)return;const me=await getMe();if(!me)return;const ch=db.channel('cc-social-online-v12',{config:{presence:{key:me.id}}});
    const sync=()=>{const raw=ch.presenceState(),ids=new Set();Object.values(raw||{}).flat().forEach(x=>{if(x?.profile_id&&state.people.has(x.profile_id))ids.add(x.profile_id);});ids.add(me.id);state.presenceIds=ids;renderOnline();};ch.on('presence',{event:'sync'},sync);ch.on('presence',{event:'join'},sync);ch.on('presence',{event:'leave'},sync);ch.subscribe(async status=>{if(status==='SUBSCRIBED'){await ch.track({profile_id:me.id,at:new Date().toISOString()});sync();}});state.presence=ch;
  }

  function setupDmRealtime(){if(state.dmChannel||!state.me)return;const ch=db.channel(`cc12-dm-${state.me.id}`).on('postgres_changes',{event:'*',schema:'public',table:'cosplay_direct_messages'},async payload=>{const m=payload.new||payload.old;if(!m||![m.sender_profile_id,m.recipient_profile_id].includes(state.me.id))return;try{await loadMessages();renderThreads();if(state.selectedPeer)await renderConversation();else updateUnreadBadge();}catch{}}).subscribe();state.dmChannel=ch;}

  async function renderChat(){
    const panel=q('[data-community-panel="messages"]');if(!panel)return;const me=await getMe();if(!me){panel.innerHTML='<div class="cc12-empty-chat"><div><b>Entre na sua conta</b>Faça login na Área do Participante para conversar.</div></div>';return;}await loadPeople();try{await loadMessages();}catch{panel.innerHTML='<div class="cc12-empty-chat"><div><b>Não consegui carregar as mensagens</b>Atualize a página e tente novamente.</div></div>';return;}
    switchToChat();panel.innerHTML=`<div class="cc12-panel"><div class="cc9-panel-head"><div><h2>Mensagens</h2><p>Converse em tempo real, envie fotos, áudios e reações de anime.</p></div></div><div class="cc12-chat"><aside class="cc12-side"><div class="cc12-side-head"><h3>Conversas</h3><p>Participantes online aparecem primeiro.</p><select id="cc12NewChat" class="cc12-new-chat"><option value="">＋ Nova conversa...</option>${[...state.people.values()].filter(p=>p.id!==me.id).sort((a,b)=>nameOf(a).localeCompare(nameOf(b))).map(p=>`<option value="${esc(p.id)}">${esc(nameOf(p))} — ${esc(p.character_name||'CosplayChess')}</option>`).join('')}</select></div><div class="cc12-online-wrap"><div class="cc12-section-title"><span>Online agora</span><b id="cc12OnlineCount">0</b></div><div id="cc12OnlineList" class="cc12-online-list"><div class="cc12-online-empty">Verificando...</div></div></div><div class="cc12-thread-title">Conversas recentes</div><div id="cc12ThreadList" class="cc12-thread-list"></div></aside><section id="cc12Conversation" class="cc12-conversation"><div class="cc12-empty-chat"><div><b>Escolha alguém para conversar</b>Clique em uma pessoa online, numa conversa recente ou em “Nova conversa”.</div></div></section></div></div>`;
    $('cc12NewChat')?.addEventListener('change',e=>{if(e.target.value)openPeer(e.target.value);});renderThreads();renderOnline();await setupPresence();setupDmRealtime();updateUnreadBadge();if(state.selectedPeer)await renderConversation();
  }

  document.addEventListener('click',e=>{const trigger=e.target.closest('[data-community-view="messages"]');if(!trigger)return;setTimeout(()=>renderChat().catch(()=>{}),70);},true);
  const params=new URLSearchParams(location.search),message=params.get('message');if(message)state.selectedPeer=message;
  const boot=()=>setTimeout(()=>{if(message||!q('[data-community-panel="messages"]')?.hidden)renderChat().catch(()=>{});else Promise.all([getMe(),loadPeople()]).then(()=>setupPresence()).catch(()=>{});},650);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('beforeunload',()=>{try{state.presence?.untrack();state.presence?.unsubscribe();state.dmChannel?.unsubscribe();state.typingChannel?.unsubscribe();state.recordStream?.getTracks().forEach(t=>t.stop());}catch{}});
})();