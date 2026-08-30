(() => {
  if(window.__COSPLAY_PLAYER_SOCIAL_ENTRY__)return;
  window.__COSPLAY_PLAYER_SOCIAL_ENTRY__=true;
  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;
  if(!db)return;
  const slug=String(new URLSearchParams(location.search).get('slug')||'').trim();
  if(!slug)return;

  const record=async()=>{
    const{data:s}=await db.auth.getSession();
    if(!s?.session?.user)return;
    const{data:target,error}=await db.from('cosplay_participant_profiles')
      .select('id').eq('public_slug',slug).eq('profile_visible',true)
      .neq('registration_status','cancelled').maybeSingle();
    if(error||!target?.id)return;
    await db.rpc('cosplay_record_profile_visit',{p_target_profile_id:target.id}).catch(()=>{});
  };

  const boot=()=>record().catch(()=>{});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();