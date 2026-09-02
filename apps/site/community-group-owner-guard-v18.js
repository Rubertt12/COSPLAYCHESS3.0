(()=>{
'use strict';
if(window.__CC_COMMUNITY_OWNER_GUARD_V18__)return;window.__CC_COMMUNITY_OWNER_GUARD_V18__=true;
const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
let owner=false,checked=false,timer=0;
function enforce(){
  const toggle=q('#groupEditToggle'),card=q('#groupEditCard');
  if(!checked||!owner){if(toggle)toggle.hidden=true;if(card)card.hidden=true;qa('.cc-community-danger').forEach(x=>x.remove());}
  if(checked&&owner&&toggle)toggle.hidden=false;
}
async function check(){
  if(!db){checked=true;owner=false;enforce();return}
  const{data:s}=await db.auth.getSession();const uid=s?.session?.user?.id;if(!uid){checked=true;owner=false;enforce();return}
  const slug=new URLSearchParams(location.search).get('slug');if(!slug){checked=true;owner=false;enforce();return}
  const[{data:profiles},{data:group}]=await Promise.all([
    db.from('cosplay_participant_profiles').select('id').eq('user_id',uid).neq('registration_status','cancelled'),
    db.from('cosplay_communities').select('id,owner_profile_id,slug,moderation_status').eq('slug',slug).maybeSingle()
  ]);
  const ids=new Set((profiles||[]).map(x=>x.id));owner=Boolean(group&&group.moderation_status==='active'&&ids.has(group.owner_profile_id));checked=true;enforce();
}
const mo=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enforce,30)});if(document.body)mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','style','class']});
enforce();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>check().catch(()=>{checked=true;owner=false;enforce()}),{once:true});else check().catch(()=>{checked=true;owner=false;enforce()});
})();