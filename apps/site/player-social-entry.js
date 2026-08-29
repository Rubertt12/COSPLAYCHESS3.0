(() => {
  if(window.__COSPLAY_PLAYER_SOCIAL_ENTRY__)return;
  window.__COSPLAY_PLAYER_SOCIAL_ENTRY__=true;
  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;if(!db)return;
  const slug=String(new URLSearchParams(location.search).get('slug')||'').trim();if(!slug)return;

  const addLink=()=>{
    const actions=document.querySelector('.player-actions');if(!actions||actions.querySelector('[data-player-community-link]'))return false;
    const link=document.createElement('a');link.className='btn dark';link.dataset.playerCommunityLink='1';link.href=`./perfil-social.html?slug=${encodeURIComponent(slug)}`;link.textContent='✦ Ver comunidade';actions.prepend(link);return true;
  };

  const record=async()=>{
    const{data:s}=await db.auth.getSession();if(!s?.session?.user)return;
    const{data:target,error}=await db.from('cosplay_participant_profiles').select('id').eq('public_slug',slug).eq('profile_visible',true).neq('registration_status','cancelled').maybeSingle();
    if(error||!target?.id)return;
    await db.rpc('cosplay_record_profile_visit',{p_target_profile_id:target.id}).catch(()=>{});
  };

  const boot=()=>{if(!addLink()){setTimeout(addLink,350);setTimeout(addLink,1100);}record().catch(()=>{});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();