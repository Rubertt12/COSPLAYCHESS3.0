(() => {
  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;
  if(!db)return;
  const state={user:null,profiles:[],events:new Map(),photos:[],tags:new Set()};
  const $=id=>document.getElementById(id);
  const fmtEvent=e=>e?.title||'Evento CosplayChess';
  const load=async()=>{
    const{data:s}=await db.auth.getSession();state.user=s?.session?.user||null;if(!state.user)return false;
    const{data:profiles,error}=await db.from('cosplay_participant_profiles').select('id,event_id,character_name').eq('user_id',state.user.id).neq('registration_status','cancelled');
    if(error||!profiles?.length)return false;state.profiles=profiles;
    const eventIds=[...new Set(profiles.map(p=>p.event_id).filter(Boolean))];if(!eventIds.length)return true;
    const[{data:events},{data:photos},{data:tags}]=await Promise.all([
      db.from('cosplay_events').select('id,title,start_at').in('id',eventIds),
      db.from('cosplay_event_photos').select('id,event_id,photo_url,caption,sort_order').in('event_id',eventIds).order('sort_order',{ascending:true}).limit(120),
      db.from('cosplay_event_photo_tags').select('photo_id,profile_id').in('profile_id',profiles.map(p=>p.id))
    ]);
    (events||[]).forEach(e=>state.events.set(e.id,e));state.photos=photos||[];state.tags=new Set((tags||[]).map(t=>`${t.photo_id}:${t.profile_id}`));return true;
  };
  const render=()=>{
    const root=$('socialExt-events');if(!root||$('socialExtOfficialTagging'))return;
    const section=document.createElement('section');section.id='socialExtOfficialTagging';section.className='event-tag-section';
    const head=document.createElement('div');head.className='event-tag-head';head.innerHTML='<div><h3>Fotos oficiais — marque-se</h3><p>Você só pode se marcar em fotos de eventos vinculados à sua própria inscrição.</p></div>';
    const grid=document.createElement('div');grid.className='event-tag-grid';
    if(!state.photos.length)grid.innerHTML='<div class="event-tag-empty">Ainda não há fotos oficiais disponíveis nos seus eventos.</div>';
    state.photos.forEach(photo=>{
      const ownProfile=state.profiles.find(p=>p.event_id===photo.event_id);if(!ownProfile)return;
      const card=document.createElement('article');card.className='event-tag-card';
      const pic=document.createElement('div');pic.className='event-tag-photo';const img=document.createElement('img');img.src=photo.photo_url;img.alt=photo.caption||`Foto oficial — ${fmtEvent(state.events.get(photo.event_id))}`;img.loading='lazy';pic.appendChild(img);
      const copy=document.createElement('div');copy.className='event-tag-copy';const b=document.createElement('b');b.textContent=fmtEvent(state.events.get(photo.event_id));const span=document.createElement('span');span.textContent=photo.caption||'Foto oficial do evento';const btn=document.createElement('button');btn.type='button';const key=`${photo.id}:${ownProfile.id}`;const paint=()=>{const tagged=state.tags.has(key);btn.textContent=tagged?'✓ Estou nesta foto':'＋ Marcar-me nesta foto';btn.classList.toggle('tagged',tagged);};paint();btn.addEventListener('click',async()=>{btn.disabled=true;if(state.tags.has(key)){const{error}=await db.from('cosplay_event_photo_tags').delete().eq('photo_id',photo.id).eq('profile_id',ownProfile.id);if(!error)state.tags.delete(key);}else{const{error}=await db.from('cosplay_event_photo_tags').insert({photo_id:photo.id,profile_id:ownProfile.id});if(!error)state.tags.add(key);}btn.disabled=false;paint();});copy.append(b,span,btn);card.append(pic,copy);grid.appendChild(card);
    });section.append(head,grid);root.appendChild(section);
  };
  const init=async()=>{if(!await load())return;const eventsButton=document.querySelector('[data-community-view="events"]');eventsButton?.addEventListener('click',()=>setTimeout(render,280));const root=$('socialExt-events');if(root)new MutationObserver(()=>{if(!root.querySelector('#socialExtOfficialTagging'))setTimeout(render,120);}).observe(root,{childList:true});if(eventsButton?.classList.contains('active'))setTimeout(render,250);};
  const wait=()=>{if($('socialExt-events'))init();else setTimeout(wait,180);};wait();
})();
