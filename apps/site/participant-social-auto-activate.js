(() => {
  if(window.__COSPLAY_PARTICIPANT_SOCIAL_AUTO_ACTIVATE__)return;
  window.__COSPLAY_PARTICIPANT_SOCIAL_AUTO_ACTIVATE__=true;
  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;

  const loadEventCards=()=>{
    if(!document.getElementById('participantEventCardsCss')){
      const link=document.createElement('link');
      link.id='participantEventCardsCss';
      link.rel='stylesheet';
      link.href='./participant-event-cards-v1.css?v=20260902-1';
      document.head.appendChild(link);
    }
    if(!document.getElementById('participantEventCardsJs')){
      const script=document.createElement('script');
      script.id='participantEventCardsJs';
      script.src='./participant-event-cards-v1.js?v=20260902-2';
      script.defer=true;
      document.body.appendChild(script);
    }
  };
  loadEventCards();

  if(!db?.auth)return;
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
