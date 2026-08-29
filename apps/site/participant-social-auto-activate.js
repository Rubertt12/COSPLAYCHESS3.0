(() => {
  if(window.__COSPLAY_PARTICIPANT_SOCIAL_AUTO_ACTIVATE__)return;
  window.__COSPLAY_PARTICIPANT_SOCIAL_AUTO_ACTIVATE__=true;
  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;if(!db?.auth)return;
  let running=false;
  const activate=async()=>{
    if(running)return;running=true;
    try{
      const{data:s}=await db.auth.getSession();if(!s?.session?.user)return;
      const{data,error}=await db.rpc('cosplay_activate_my_social_profile');
      if(!error&&data?.activated){window.dispatchEvent(new CustomEvent('cosplay:social-profile-activated',{detail:data}));}
    }catch{}finally{running=false;}
  };
  db.auth.onAuthStateChange((event,session)=>{
    if(event==='USER_UPDATED'&&session?.user)setTimeout(activate,0);
  });
})();