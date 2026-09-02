(() => {
  'use strict';
  if (window.__CC_NOTIFICATIONS_V23__) return;
  window.__CC_NOTIFICATIONS_V23__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe=v=>{try{const u=new URL(String(v||''),location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}};
  const fmt=v=>{try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return''}};
  const file=location.pathname.split('/').pop()||'comunidade.html';
  let me=null, profiles=new Map(), popover=null, channel=null, fullRows=[];

  const nameOf=p=>p?.display_name||p?.nick||'CosplayChess';
  const avatar=p=>{const src=safe(p?.character_photo_url);return `<span class="cc22-avatar">${src?`<img src="${esc(src)}" alt="">`:'♜'}</span>`};
  const icon=kind=>kind==='message'?'✉':kind==='friend_request'||kind==='friend_accepted'?'♡':kind==='follow'?'＋':kind==='post_like'?'♥':kind==='tag'?'@':kind==='community_join'?'♙':kind==='testimonial'?'✦':'♧';

  async function getMe(){
    if(me)return me;
    const {data:s}=await db.auth.getSession(); const uid=s?.session?.user?.id; if(!uid)return null;
    const {data}=await db.from('cosplay_participant_profiles').select('id').eq('user_id',uid).neq('registration_status','cancelled').order('created_at',{ascending:true}).limit(1).maybeSingle();
    me=data||null; return me;
  }
  async function loadProfiles(ids){
    const missing=[...new Set((ids||[]).filter(Boolean))].filter(id=>!profiles.has(id)); if(!missing.length)return;
    const {data}=await db.from('cosplay_participant_profiles').select('id,public_slug,display_name,nick,character_name,character_photo_url').in('id',missing);
    (data||[]).forEach(p=>profiles.set(p.id,p));
  }
  async function rows(limit=80){
    const mine=await getMe(); if(!mine)return[];
    const {data}=await db.from('cosplay_social_notifications').select('id,actor_profile_id,kind,entity_type,entity_id,body,read_at,created_at').eq('recipient_profile_id',mine.id).order('created_at',{ascending:false}).limit(limit);
    const list=data||[]; await loadProfiles(list.map(x=>x.actor_profile_id)); return list;
  }
  function setBadges(count){
    qa('[data-community-view="notifications"] .social-v2-badge').forEach(b=>{b.textContent=String(count);b.hidden=!count});
    const b=q('#ccNotificationBadge'); if(b){b.textContent=String(count);b.hidden=!count}
  }
  async function refreshBadge(){
    const mine=await getMe(); if(!mine)return;
    const {count}=await db.from('cosplay_social_notifications').select('id',{count:'exact',head:true}).eq('recipient_profile_id',mine.id).is('read_at',null);
    setBadges(count||0);
  }
  async function markOne(row){
    if(!row?.read_at){await db.from('cosplay_social_notifications').update({read_at:new Date().toISOString()}).eq('id',row.id);row.read_at=new Date().toISOString();await refreshBadge();}
  }
  async function removeOne(row){
    const mine=await getMe(); if(!mine||!row)return;
    const {error}=await db.from('cosplay_social_notifications').delete().eq('id',row.id).eq('recipient_profile_id',mine.id);
    if(error)return;
    if(popover&&!popover.hidden)openPreview();
    if(file==='notificacoes.html')renderFull();
    refreshBadge();
  }
  async function action(row){
    if(!row)return; await markOne(row);
    const actor=profiles.get(row.actor_profile_id);
    if((row.entity_type==='message'||row.kind==='message')&&row.entity_id){
      const {data:m}=await db.from('cosplay_direct_messages').select('sender_profile_id,recipient_profile_id').eq('id',row.entity_id).maybeSingle();
      const mine=await getMe(); const peer=m?(m.sender_profile_id===mine.id?m.recipient_profile_id:m.sender_profile_id):row.actor_profile_id;
      if(peer){location.href=`./mensagens.html?message=${encodeURIComponent(peer)}`;return;}
    }
    if((row.entity_type==='post'||row.kind==='post_like'||row.kind==='tag')&&row.entity_id){location.href=`./comunidade.html?post=${encodeURIComponent(row.entity_id)}`;return;}
    if(row.entity_type==='community'&&row.entity_id){
      const {data:c}=await db.from('cosplay_communities').select('slug').eq('id',row.entity_id).maybeSingle();
      if(c?.slug){location.href=`./comunidade-grupo.html?slug=${encodeURIComponent(c.slug)}`;return;}
    }
    if(row.entity_type==='friendship'||row.kind==='friend_request'||row.kind==='friend_accepted'){location.href='./amigos.html';return;}
    if(actor?.public_slug){location.href=`./jogador.html?slug=${encodeURIComponent(actor.public_slug)}`;return;}
    location.href='./notificacoes.html';
  }
  function ensurePopover(){
    if(popover)return popover;
    popover=document.createElement('div'); popover.className='cc22-popover cc23-popover'; popover.hidden=true; document.body.appendChild(popover); return popover;
  }
  function position(){
    const bell=q('.cc-right-head [data-community-view="notifications"]'); if(!bell||!popover)return;
    const r=bell.getBoundingClientRect(),w=Math.min(390,innerWidth-24);
    popover.style.top=`${Math.min(innerHeight-80,r.bottom+8)}px`; popover.style.left=`${Math.max(12,Math.min(innerWidth-w-12,r.right-w))}px`;
  }
  async function openPreview(){
    const p=ensurePopover(),list=await rows(3);
    p.innerHTML=`<div class="cc22-pop-head"><b>Notificações</b><span>${list.some(x=>!x.read_at)?'Novas atividades':'Tudo em dia'}</span></div><div class="cc22-mini-list">${list.length?list.map((row,i)=>{const actor=profiles.get(row.actor_profile_id);return `<div class="cc23-mini-wrap"><button class="cc22-mini ${row.read_at?'':'unread'}" type="button" data-index="${i}">${avatar(actor)}<span class="cc22-copy"><b>${esc(nameOf(actor))}</b><span>${esc(row.body||'Nova atividade na sua rede.')}</span><small>${esc(fmt(row.created_at))}</small></span>${row.read_at?'':'<i class="cc22-unread"></i>'}</button><button class="cc23-mini-delete" type="button" data-delete="${i}" title="Apagar notificação">×</button></div>`}).join(''):'<div class="cc22-empty">Nenhuma notificação ainda.</div>'}</div><button class="cc22-more" type="button">Ver todas as notificações</button>`;
    p.hidden=false; position();
    qa('[data-index]',p).forEach(b=>b.onclick=()=>action(list[Number(b.dataset.index)]));
    qa('[data-delete]',p).forEach(b=>b.onclick=e=>{e.stopPropagation();removeOne(list[Number(b.dataset.delete)])});
    q('.cc22-more',p).onclick=()=>{p.hidden=true;location.href='./notificacoes.html'};
  }
  async function renderFull(){
    const panel=q('[data-community-panel="notifications"]'); if(!panel)return;
    panel.innerHTML='<div class="cc22-empty">Carregando notificações...</div>';
    fullRows=await rows(100);
    panel.innerHTML=`<section class="cc22-page"><div class="cc22-page-head"><div><h2>Notificações</h2><p>Atividade recente da sua rede CosplayChess.</p></div><div class="cc23-head-actions"><button class="cc22-readall" id="cc23ReadAll" type="button">Marcar tudo como lido</button><button class="cc22-readall danger" id="cc23ClearAll" type="button">Apagar todas</button></div></div><section class="cc22-card"><div class="cc22-list">${fullRows.length?fullRows.map((row,i)=>{const actor=profiles.get(row.actor_profile_id);return `<article class="cc23-row ${row.read_at?'':'unread'}"><button class="cc23-row-main" type="button" data-row="${i}">${avatar(actor)}<span class="cc22-copy"><b>${esc(nameOf(actor))}</b><span>${esc(row.body||'Nova atividade na sua rede.')}</span><small>${esc(fmt(row.created_at))}</small></span><span class="cc22-kind">${icon(row.kind)}</span></button><button class="cc23-row-delete" type="button" data-remove="${i}" title="Apagar notificação">×</button></article>`}).join(''):'<div class="cc22-empty">Você não tem notificações.</div>'}</div></section></section>`;
    qa('[data-row]',panel).forEach(b=>b.onclick=()=>action(fullRows[Number(b.dataset.row)]));
    qa('[data-remove]',panel).forEach(b=>b.onclick=()=>removeOne(fullRows[Number(b.dataset.remove)]));
    q('#cc23ReadAll',panel)?.addEventListener('click',async()=>{const mine=await getMe();await db.from('cosplay_social_notifications').update({read_at:new Date().toISOString()}).eq('recipient_profile_id',mine.id).is('read_at',null);setBadges(0);renderFull()});
    q('#cc23ClearAll',panel)?.addEventListener('click',async()=>{if(!confirm('Apagar todas as notificações?'))return;const mine=await getMe();await db.from('cosplay_social_notifications').delete().eq('recipient_profile_id',mine.id);setBadges(0);renderFull()});
  }
  async function setupRealtime(){
    const mine=await getMe();if(!mine||channel)return;
    channel=db.channel(`cc-notifications-v23-${mine.id}`).on('postgres_changes',{event:'*',schema:'public',table:'cosplay_social_notifications',filter:`recipient_profile_id=eq.${mine.id}`},()=>{refreshBadge();if(popover&&!popover.hidden)openPreview();if(file==='notificacoes.html')renderFull()}).subscribe();
  }
  function boot(){
    refreshBadge(); setupRealtime();
    if(file==='notificacoes.html'||document.body.dataset.entryView==='notifications')setTimeout(renderFull,300);
    document.addEventListener('click',e=>{
      const bell=e.target.closest('.cc-right-head [data-community-view="notifications"]');
      if(bell){e.preventDefault();e.stopImmediatePropagation();const p=ensurePopover();p.hidden?openPreview():(p.hidden=true);return;}
      const local=e.target.closest('.community-nav [data-community-view="notifications"]');
      if(local&&file==='notificacoes.html'){e.preventDefault();e.stopImmediatePropagation();renderFull();return;}
      if(popover&&!popover.hidden&&!e.target.closest('.cc22-popover'))popover.hidden=true;
    },true);
    window.addEventListener('resize',()=>{if(popover&&!popover.hidden)position()},{passive:true});
    window.addEventListener('cosplay:right-rail-restored',()=>{if(popover&&!popover.hidden)setTimeout(position,20)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
