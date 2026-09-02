(()=>{
'use strict';
if(window.__CC_CHAT_ALERTS_V25__)return;window.__CC_CHAT_ALERTS_V25__=true;
const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;
if(!db)return;
const q=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=v=>{try{const u=new URL(String(v||''),location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}};
const BASE_TITLE='Mensagens — CosplayChess';
const seen=new Set();
let me=null,user=null,channel=null,audioCtx=null,unread=0,flashTimer=null,lastSender=null;

function injectStyle(){
  if(q('#ccChatAlertsV25Style'))return;
  const s=document.createElement('style');s.id='ccChatAlertsV25Style';s.textContent=`
  .cc-dm-alert-toggle{appearance:none;border:1px solid var(--line,#343741);background:var(--panel,#12151b);color:var(--text,#f5f5f5);border-radius:10px;padding:8px 11px;font:800 10px Inter,system-ui;cursor:pointer;white-space:nowrap;transition:.18s ease}
  .cc-dm-alert-toggle:hover{transform:translateY(-1px);border-color:#c89b4b}.cc-dm-alert-toggle.is-on{color:#d6b46d;border-color:rgba(214,180,109,.55)}.cc-dm-alert-toggle.is-blocked{opacity:.65}
  .cc-dm-incoming-toast{position:fixed;z-index:2147483000;right:18px;top:88px;width:min(360px,calc(100vw - 28px));display:grid;grid-template-columns:46px 1fr auto;align-items:center;gap:11px;padding:11px 12px;border:1px solid rgba(199,154,72,.38);border-radius:14px;background:color-mix(in srgb,var(--panel,#14161c) 94%,transparent);color:var(--text,#fff);box-shadow:0 18px 50px rgba(0,0,0,.35);backdrop-filter:blur(14px);cursor:pointer;text-align:left;opacity:0;transform:translateY(-10px);pointer-events:none;transition:.2s ease}
  .cc-dm-incoming-toast.show{opacity:1;transform:translateY(0);pointer-events:auto}.cc-dm-toast-avatar{width:46px;height:46px;border-radius:50%;overflow:hidden;background:#242832;display:grid;place-items:center;font-size:20px}.cc-dm-toast-avatar img{width:100%;height:100%;object-fit:cover}.cc-dm-toast-copy{min-width:0;display:grid;gap:2px}.cc-dm-toast-copy b{font:850 12px Inter,system-ui;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cc-dm-toast-copy small{font:600 10px Inter,system-ui;color:var(--muted,#a9adb8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cc-dm-toast-mark{font-size:18px;color:#d4a756}
  @media(max-width:720px){.cc-dm-incoming-toast{top:74px;right:10px}.cc-dm-alert-toggle{padding:7px 9px}}
  `;document.head.appendChild(s);
}

function unlockAudio(){
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
    audioCtx=audioCtx||new Ctx();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
  }catch{}
}
function ping(){
  try{
    unlockAudio();if(!audioCtx||audioCtx.state!=='running')return;
    const t=audioCtx.currentTime;
    [[0,680,.07],[.085,920,.095]].forEach(([d,f,len])=>{
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.setValueAtTime(f,t+d);
      g.gain.setValueAtTime(.0001,t+d);g.gain.exponentialRampToValueAtTime(.06,t+d+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d+len);
      o.connect(g);g.connect(audioCtx.destination);o.start(t+d);o.stop(t+d+len+.03);
    });
  }catch{}
}
function preview(m){
  if(m?.attachment_type==='image')return'📷 Enviou uma foto';
  if(m?.attachment_type==='audio')return'🎙 Enviou um áudio';
  const text=String(m?.body||'Nova mensagem').replace(/\s+/g,' ').trim();return text.length>110?`${text.slice(0,107)}…`:text;
}
function senderName(p){return p?.display_name||p?.nick||p?.character_name||'Participante'}
function stopFlash(){if(flashTimer){clearInterval(flashTimer);flashTimer=null}}
function setTitle(){
  stopFlash();
  if(!unread){document.title=BASE_TITLE;return}
  let flip=false;
  const draw=()=>{document.title=flip?`(${unread}) Nova mensagem 💬`:`(${unread}) ${BASE_TITLE}`;flip=!flip};
  draw();if(document.hidden)flashTimer=setInterval(draw,1100);
}
function clearTabAlert(){unread=0;lastSender=null;stopFlash();document.title=BASE_TITLE}
function showToast(sender,m){
  let root=q('#ccDmIncomingToast');if(!root){root=document.createElement('button');root.type='button';root.id='ccDmIncomingToast';root.className='cc-dm-incoming-toast';document.body.appendChild(root)}
  const src=safe(sender?.character_photo_url);
  root.innerHTML=`<span class="cc-dm-toast-avatar">${src?`<img src="${esc(src)}" alt="">`:'♜'}</span><span class="cc-dm-toast-copy"><b>${esc(senderName(sender))}</b><small>${esc(preview(m))}</small></span><span class="cc-dm-toast-mark">💬</span>`;
  root.onclick=()=>{clearTabAlert();location.href=`./mensagens.html?message=${encodeURIComponent(m.sender_profile_id)}`};
  root.classList.add('show');clearTimeout(root._hide);root._hide=setTimeout(()=>root.classList.remove('show'),5200);
}
async function browserNotify(sender,m){
  if(!document.hidden||!('Notification'in window)||Notification.permission!=='granted')return;
  try{
    const n=new Notification(senderName(sender),{body:preview(m),icon:safe(sender?.character_photo_url)||'./img/logofergoverse.png',tag:`cc-dm-${m.sender_profile_id}`,renotify:true});
    n.onclick=()=>{window.focus();clearTabAlert();location.href=`./mensagens.html?message=${encodeURIComponent(m.sender_profile_id)}`;n.close()};
  }catch{}
}
async function getSender(id){
  const {data}=await db.from('cosplay_participant_profiles').select('id,display_name,nick,character_name,character_photo_url,public_slug').eq('id',id).maybeSingle();return data||null;
}
function permissionLabel(){
  if(!('Notification'in window))return null;
  if(Notification.permission==='granted')return['🔔 Notificações ativas','is-on'];
  if(Notification.permission==='denied')return['🔕 Notificações bloqueadas','is-blocked'];
  return['🔔 Ativar notificações',''];
}
function mountPermissionButton(){
  const top=q('.cc20-top');if(!top||q('#ccDmAlertPermission'))return;
  const info=permissionLabel();if(!info)return;
  const b=document.createElement('button');b.id='ccDmAlertPermission';b.type='button';b.className=`cc-dm-alert-toggle ${info[1]}`;b.textContent=info[0];
  b.onclick=async()=>{unlockAudio();if(!('Notification'in window))return;if(Notification.permission==='default'){try{await Notification.requestPermission()}catch{}}const next=permissionLabel();b.textContent=next?.[0]||'Notificações';b.className=`cc-dm-alert-toggle ${next?.[1]||''}`};
  top.appendChild(b);
}
async function warmSeen(){
  const {data}=await db.from('cosplay_direct_messages').select('id').eq('recipient_profile_id',me.id).order('created_at',{ascending:false}).limit(100);(data||[]).forEach(x=>seen.add(x.id));
}
async function incoming(m){
  if(!m||m.recipient_profile_id!==me.id||m.sender_profile_id===me.id||seen.has(m.id))return;
  seen.add(m.id);const sender=await getSender(m.sender_profile_id);lastSender=m.sender_profile_id;unread+=1;setTitle();ping();showToast(sender,m);browserNotify(sender,m);
}
async function init(){
  injectStyle();
  const {data:s}=await db.auth.getSession();user=s?.session?.user||null;if(!user)return;
  const {data:p}=await db.from('cosplay_participant_profiles').select('id,user_id').eq('user_id',user.id).neq('registration_status','cancelled').order('created_at',{ascending:true}).limit(1).maybeSingle();me=p||null;if(!me)return;
  await warmSeen();
  channel=db.channel(`cc-dm-alerts-v25-${me.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'cosplay_direct_messages',filter:`recipient_profile_id=eq.${me.id}`},e=>incoming(e.new)).subscribe();
  mountPermissionButton();
  const mo=new MutationObserver(()=>mountPermissionButton());mo.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('pointerdown',unlockAudio,{once:true,capture:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){setTimeout(clearTabAlert,350)}else if(unread)setTitle()});
  window.addEventListener('focus',()=>{if(!document.hidden)setTimeout(clearTabAlert,350)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>init().catch(()=>{}),250));else setTimeout(()=>init().catch(()=>{}),250);
})();