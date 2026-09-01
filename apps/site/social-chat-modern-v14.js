(() => {
  'use strict';
  if (window.__CC_CHAT_MODERN_V14__) return;
  window.__CC_CHAT_MODERN_V14__ = true;

  if(!document.querySelector('script[data-cc-chat-presence-v19]')){
    const presence=document.createElement('script');
    presence.src='./social-chat-presence-v19.js?v=20260901-1';
    presence.defer=true;
    presence.dataset.ccChatPresenceV19='true';
    document.head.appendChild(presence);
  }

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;
  const q = (s,r=document) => r.querySelector(s);
  const safe = (v) => { try { const u=new URL(String(v||''),location.href); return ['http:','https:'].includes(u.protocol)?u.href:''; } catch { return ''; } };
  const nameOf = (p) => p?.display_name || p?.nick || 'Participante';
  let currentPeer = new URLSearchParams(location.search).get('message') || null;
  let profileCache = new Map();

  async function loadProfile(id){
    if(!id)return null;
    if(profileCache.has(id))return profileCache.get(id);
    const {data}=await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url')
      .eq('id',id)
      .maybeSingle();
    if(data)profileCache.set(id,data);
    return data||null;
  }

  function isOnline(){ return !!q('.cc12-chat-head-avatar.online'); }
  function mediaCounts(){
    const stream=q('#cc12Stream');
    return {
      images: stream ? stream.querySelectorAll('.cc12-bubble img').length : 0,
      audios: stream ? stream.querySelectorAll('.cc12-bubble audio').length : 0
    };
  }
  function mutedKey(id){ return `cc-chat-muted:${id}`; }
  function isMuted(id){ return localStorage.getItem(mutedKey(id))==='1'; }

  function ensureInfoToggle(panel){
    const head=q('.cc12-chat-head',panel);if(!head)return;
    let button=q('.cc14-chat-info-toggle',head);
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='cc14-chat-info-toggle';
      button.title='Detalhes da conversa';
      button.setAttribute('aria-label','Detalhes da conversa');
      button.textContent='ⓘ';
      const profile=q('.cc12-profile-link',head);
      if(profile)head.insertBefore(button,profile);else head.appendChild(button);
      button.addEventListener('click',()=>{
        const details=q('.cc14-details',panel);if(!details)return;
        details.classList.toggle('open');
      });
    }
  }

  async function renderDetails(){
    const panel=q('[data-community-panel="messages"]');
    const chat=q('.cc12-chat',panel||document);
    if(!panel||panel.hidden||!chat||!currentPeer)return;
    const profile=await loadProfile(currentPeer);if(!profile)return;
    ensureInfoToggle(panel);
    let details=q('.cc14-details',chat);
    if(!details){details=document.createElement('aside');details.className='cc14-details';chat.appendChild(details);}
    chat.classList.add('cc14-details-ready');
    const counts=mediaCounts();
    const online=isOnline();
    const image=safe(profile.character_photo_url);
    const profileHref=profile.public_slug?`./jogador.html?slug=${encodeURIComponent(profile.public_slug)}`:'#';
    const muted=isMuted(profile.id);
    details.innerHTML=`
      <div class="cc14-details-head"><b>Detalhes</b><button class="cc14-details-close" type="button" aria-label="Fechar">×</button></div>
      <div class="cc14-details-profile">
        <div class="cc14-details-avatar">${image?`<img src="${image}" alt="">`:'♜'}</div>
        <h3></h3><p></p>
        <span class="cc14-details-status ${online?'':'offline'}">${online?'● Online agora':'○ Offline'}</span>
      </div>
      <section class="cc14-details-section">
        <span>Mídias trocadas</span>
        <div class="cc14-media-stats">
          <div class="cc14-media-stat"><b>${counts.images}</b><small>Fotos</small></div>
          <div class="cc14-media-stat"><b>${counts.audios}</b><small>Áudios</small></div>
        </div>
      </section>
      <section class="cc14-details-section">
        <span>Ações</span>
        <div class="cc14-detail-actions">
          <a class="cc14-detail-action" href="${profileHref}">👤 Ver perfil</a>
          <button class="cc14-detail-action cc14-mute" type="button">${muted?'🔕 Ativar notificações':'🔔 Silenciar conversa'}</button>
          <button class="cc14-detail-action danger cc14-delete-thread" type="button">🗑 Excluir conversa</button>
        </div>
      </section>`;
    q('.cc14-details-profile h3',details).textContent=nameOf(profile);
    q('.cc14-details-profile p',details).textContent=profile.character_name?`Cosplay: ${profile.character_name}`:'Participante CosplayChess';
    q('.cc14-details-close',details)?.addEventListener('click',()=>details.classList.remove('open'));
    q('.cc14-mute',details)?.addEventListener('click',(e)=>{
      const next=!isMuted(profile.id);
      localStorage.setItem(mutedKey(profile.id),next?'1':'0');
      e.currentTarget.textContent=next?'🔕 Ativar notificações':'🔔 Silenciar conversa';
    });
    q('.cc14-delete-thread',details)?.addEventListener('click',()=>{
      const existing=q('.cc13-delete-conversation',panel);
      if(existing)existing.click();
    });
  }

  function refresh(){ [70,180,420].forEach(ms=>setTimeout(()=>renderDetails().catch(()=>{}),ms)); }

  document.addEventListener('click',(event)=>{
    const peer=event.target.closest?.('[data-cc12-thread],[data-cc12-peer]');
    if(peer){currentPeer=peer.dataset.cc12Thread||peer.dataset.cc12Peer||currentPeer;refresh();return;}
    if(event.target.closest?.('[data-community-view="messages"]'))refresh();
    if(event.target.closest?.('.cc12-chat-back'))q('.cc14-details')?.classList.remove('open');
  },true);
  document.addEventListener('change',(event)=>{
    if(event.target?.id==='cc12NewChat'&&event.target.value){currentPeer=event.target.value;refresh();}
  },true);
  document.addEventListener('submit',(event)=>{if(event.target?.id==='cc12Compose')setTimeout(refresh,220);},true);
  window.addEventListener('resize',()=>q('.cc14-details')?.classList.remove('open'),{passive:true});

  const boot=()=>{
    if(!currentPeer){const active=q('[data-cc12-thread].active');if(active)currentPeer=active.dataset.cc12Thread||null;}
    refresh();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
