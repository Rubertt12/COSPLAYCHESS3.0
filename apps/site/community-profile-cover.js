(() => {
  if(window.__COSPLAY_COMMUNITY_PROFILE_COVER__)return;
  window.__COSPLAY_COMMUNITY_PROFILE_COVER__=true;

  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;
  if(!db)return;

  const safe=value=>{try{const u=new URL(String(value||''));return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}};
  const clamp=value=>Math.max(0,Math.min(100,Number.isFinite(Number(value))?Number(value):50));

  const apply=async()=>{
    const cover=document.querySelector('.community-me-cover');
    if(!cover)return false;

    const{data:s}=await db.auth.getSession();
    const user=s?.session?.user;
    if(!user)return false;

    const{data:profile,error}=await db.from('cosplay_participant_profiles')
      .select('id,cover_photo_url,cover_position_x,cover_position_y')
      .eq('user_id',user.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(error||!profile)return false;

    const url=safe(profile.cover_photo_url);
    if(!url){
      cover.classList.remove('has-profile-cover');
      cover.style.removeProperty('background-image');
      cover.style.removeProperty('background-position');
      cover.style.removeProperty('background-size');
      return true;
    }

    const x=clamp(profile.cover_position_x??50);
    const y=clamp(profile.cover_position_y??50);
    cover.classList.add('has-profile-cover');
    cover.style.setProperty('background-image',`linear-gradient(180deg,rgba(7,9,17,.05),rgba(7,9,17,.34)),url("${url.replace(/"/g,'%22')}")`,'important');
    cover.style.setProperty('background-position',`center,${x}% ${y}%`,'important');
    cover.style.setProperty('background-size','cover,cover','important');
    cover.style.setProperty('background-repeat','no-repeat,no-repeat','important');
    return true;
  };

  const run=()=>apply().catch(()=>{});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('cosplay:social-shell-ready',run);
  window.addEventListener('pageshow',run);
  setTimeout(run,450);
  setTimeout(run,1400);
})();
