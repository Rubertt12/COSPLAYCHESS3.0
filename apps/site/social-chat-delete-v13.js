(() => {
  'use strict';
  if (window.__CC_CHAT_DELETE_V13__) return;
  window.__CC_CHAT_DELETE_V13__ = true;
  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;
  let currentPeer = new URLSearchParams(location.search).get('message') || null;
  let me = null, channel = null;
  const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];

  async function getMe(){
    if(me)return me;const{data:s}=await db.auth.getSession();const user=s?.session?.user;if(!user)return null;
    const{data}=await db.from('cosplay_participant_profiles').select('id').eq('user_id',user.id).neq('registration_status','cancelled').order('created_at',{ascending:false}).limit(1).maybeSingle();me=data||null;return me;
  }
  function peerFromDom(){
    const active=q('[data-cc12-thread].active');if(active?.dataset.cc12Thread)return active.dataset.cc12Thread;
    return currentPeer;
  }
  function setBusy(control,busy){
    if(!control)return;
    if(busy){
      control.dataset.cc13Original=control.innerHTML;
      control.setAttribute('aria-disabled','true');
      control.style.pointerEvents='none';
      if('disabled' in control)control.disabled=true;
      control.innerHTML=control.classList.contains('cc13-thread-delete')?'…':'Excluindo…';
    }else{
      if(control.dataset.cc13Original)control.innerHTML=control.dataset.cc13Original;
      control.removeAttribute('aria-disabled');
      control.style.pointerEvents='';
      if('disabled' in control)control.disabled=false;
    }
  }
  async function hideConversation(peer,control){
    if(!peer)return;
    if(!confirm('Excluir esta conversa da sua lista? Isso não apaga as mensagens para a outra pessoa. Se uma nova mensagem chegar, a conversa aparecerá de novo.'))return;
    setBusy(control,true);
    const{error}=await db.rpc('cosplay_hide_direct_conversation',{p_peer:peer});
    if(error){setBusy(control,false);alert('Não foi possível excluir a conversa agora.');return;}
    sessionStorage.setItem('cc-chat-open-after-hide','1');
    const u=new URL(location.href);u.searchParams.delete('message');location.replace(u.toString());
  }
  function enhanceThreadDelete(panel){
    qa('[data-cc12-thread]',panel).forEach(thread=>{
      const peer=thread.dataset.cc12Thread;
      if(!peer||q('.cc13-thread-delete',thread))return;
      const del=document.createElement('span');
      del.className='cc13-thread-delete';
      del.setAttribute('role','button');
      del.setAttribute('aria-label','Excluir conversa');
      del.title='Excluir conversa';
      del.textContent='🗑';
      del.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();hideConversation(peer,del);});
      del.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();hideConversation(peer,del);}});
      thread.appendChild(del);
      thread.style.gridTemplateColumns='44px minmax(0,1fr) auto auto';
      thread.addEventListener('keydown',e=>{if(e.key==='Delete'&&!e.altKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();hideConversation(peer,del);}});
    });
  }
  function enhance(){
    const panel=q('[data-community-panel="messages"]');if(!panel||panel.hidden)return;
    const active=q('[data-cc12-thread].active');if(active?.dataset.cc12Thread)currentPeer=active.dataset.cc12Thread;
    qa('.cc12-delete',panel).forEach(btn=>{btn.textContent='🗑';btn.title='Excluir esta mensagem para todos';btn.setAttribute('aria-label','Excluir esta mensagem para todos');});
    enhanceThreadDelete(panel);
    const head=q('.cc12-chat-head',panel);if(!head)return;
    if(q('.cc13-delete-conversation',head))return;
    const peer=peerFromDom();if(!peer)return;
    const btn=document.createElement('button');btn.type='button';btn.className='cc13-delete-conversation';btn.innerHTML='🗑 <span>Excluir conversa</span>';
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();hideConversation(peer,btn);});
    const profile=q('.cc12-profile-link',head);if(profile)head.insertBefore(btn,profile);else head.appendChild(btn);
  }
  function schedule(){[40,120,260,520].forEach(ms=>setTimeout(enhance,ms));}
  document.addEventListener('click',e=>{
    const p=e.target.closest?.('[data-cc12-thread],[data-cc12-peer]');if(p)currentPeer=p.dataset.cc12Thread||p.dataset.cc12Peer||currentPeer;
    if(e.target.closest?.('[data-community-view="messages"],#cc12Conversation,[data-cc12-thread],[data-cc12-peer]'))schedule();
  },true);
  document.addEventListener('change',e=>{if(e.target.id==='cc12NewChat'&&e.target.value){currentPeer=e.target.value;schedule();}},true);
  document.addEventListener('submit',e=>{if(e.target.id==='cc12Compose')schedule();},true);

  async function realtime(){
    const profile=await getMe();if(!profile||channel)return;
    channel=db.channel(`cc13-chat-delete-${profile.id}`).on('postgres_changes',{event:'*',schema:'public',table:'cosplay_direct_messages'},payload=>{const m=payload.new||payload.old;if(!m)return;if(m.sender_profile_id===profile.id||m.recipient_profile_id===profile.id)schedule();}).subscribe();
  }
  const boot=()=>{
    realtime().catch(()=>{});
    if(sessionStorage.getItem('cc-chat-open-after-hide')==='1'){
      sessionStorage.removeItem('cc-chat-open-after-hide');
      setTimeout(()=>q('[data-community-view="messages"]')?.click(),650);
    }
    schedule();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('beforeunload',()=>{try{channel?.unsubscribe();}catch{}});
})();
