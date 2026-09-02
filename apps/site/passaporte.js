(() => {
  'use strict';
  window.__CC_PASSPORT_V2__ = true;
  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const $ = (id) => document.getElementById(id);
  const state = {
    user:null,
    profiles:[],
    events:new Map(),
    achievements:[],
    defs:new Map(),
    defsList:[],
    checkins:[],
    friendCount:0,
    postCount:0,
    timelineRows:[]
  };

  const displayName = (p) => p?.display_name || p?.nick || 'Participante';
  const safe = (url) => { try { const u = new URL(String(url || ''), location.href); return ['http:','https:'].includes(u.protocol) ? u.href : null; } catch { return null; } };
  const fmt = (value) => { try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)); } catch { return ''; } };
  const fmtMonthYear = (value) => { try { return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(value)); } catch { return ''; } };
  const clamp = (value, fallback = 50) => Math.max(0,Math.min(100,Number.isFinite(Number(value)) ? Number(value) : fallback));

  const load = async () => {
    if (!db) return false;
    const { data:sessionData } = await db.auth.getSession();
    state.user = sessionData?.session?.user || null;
    if (!state.user) return false;

    const { data:profiles, error } = await db.from('cosplay_participant_profiles')
      .select('id,registration_id,event_id,user_id,public_slug,display_name,nick,character_name,character_photo_url,registration_status,created_at,cover_photo_url,cover_position_x,cover_position_y,avatar_position_x,avatar_position_y')
      .eq('user_id',state.user.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:true});
    if (error || !profiles?.length) return false;
    state.profiles = profiles;

    const eventIds = [...new Set(profiles.map((p) => p.event_id).filter(Boolean))];
    const regIds = [...new Set(profiles.map((p) => p.registration_id).filter(Boolean))];
    const profileIds = profiles.map((p) => p.id).filter(Boolean);

    const eventQuery = eventIds.length
      ? db.from('cosplay_events').select('id,title,slug,venue,city,start_at,end_at,cover_url,published').in('id',eventIds)
      : Promise.resolve({data:[]});
    const awardsQuery = regIds.length
      ? db.from('cosplay_cosplayer_achievements').select('id,achievement_id,event_id,cosplayer_name,character_name,note,awarded_at,registration_id').in('registration_id',regIds).order('awarded_at',{ascending:true})
      : Promise.resolve({data:[]});
    const checkinsQuery = profileIds.length
      ? db.from('cosplay_event_checkins').select('event_id,profile_id,checked_in_at,note').in('profile_id',profileIds)
      : Promise.resolve({data:[]});
    const postsQuery = profileIds.length
      ? db.from('cosplay_social_posts').select('id,author_profile_id,created_at').in('author_profile_id',profileIds)
      : Promise.resolve({data:[]});

    const [{data:events},{data:awards},{data:defs},{data:checkins},{data:friendships},{data:posts}] = await Promise.all([
      eventQuery,
      awardsQuery,
      db.from('cosplay_achievements').select('id,title,description,icon,tier,published,sort_order').eq('published',true).order('sort_order',{ascending:true}),
      checkinsQuery,
      db.from('cosplay_friendships').select('id,requester_profile_id,addressee_profile_id,status').eq('status','accepted'),
      postsQuery
    ]);

    (events || []).forEach((e) => state.events.set(e.id,e));
    state.achievements = awards || [];
    state.defsList = defs || [];
    state.defsList.forEach((d) => state.defs.set(d.id,d));
    state.checkins = checkins || [];
    state.friendCount = (friendships || []).filter((f) => profileIds.includes(f.requester_profile_id) || profileIds.includes(f.addressee_profile_id)).length;
    state.postCount = (posts || []).length;
    return true;
  };

  const renderHero = () => {
    const primary = state.profiles[0];
    const hero = $('passportHero');
    const name = displayName(primary);

    $('passportName').replaceChildren(document.createTextNode(`${name} `));
    const italic = document.createElement('i');
    italic.textContent = 'no tabuleiro.';
    $('passportName').appendChild(italic);
    $('passportSubtitle').textContent = primary.character_name ? `Cosplay principal: ${primary.character_name}` : 'Sua história dentro do CosplayChess.';
    $('passportCharacterPill').textContent = primary.character_name || 'Perfil principal';

    const cover = safe(primary.cover_photo_url);
    if (hero && cover) {
      hero.style.setProperty('--passport-cover',`url("${cover.replace(/"/g,'%22')}")`);
      hero.style.setProperty('--passport-cover-position',`${clamp(primary.cover_position_x)}% ${clamp(primary.cover_position_y)}%`);
    }

    const avatar = $('passportAvatar');
    const avatarUrl = safe(primary.character_photo_url);
    if (avatarUrl) {
      avatar.replaceChildren();
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = `Foto de ${name}`;
      img.loading = 'eager';
      img.style.objectPosition = `${clamp(primary.avatar_position_x)}% ${clamp(primary.avatar_position_y,35)}%`;
      avatar.appendChild(img);
    }

    const uniqueEvents = new Set(state.profiles.map((p) => p.event_id).filter(Boolean));
    const uniqueAwards = new Set(state.achievements.map((a) => a.achievement_id || a.id));
    const totalDefs = state.defsList.length;
    const unlockedDefs = state.defsList.filter((d) => state.achievements.some((a) => a.achievement_id === d.id)).length;
    const progress = totalDefs ? Math.min(100,Math.round((unlockedDefs / totalDefs) * 100)) : 0;

    $('passportEvents').textContent = String(uniqueEvents.size);
    $('passportAchievements').textContent = String(uniqueAwards.size);
    $('passportFriends').textContent = String(state.friendCount);
    $('passportPosts').textContent = String(state.postCount);
    $('passportAchievementProgressText').textContent = totalDefs ? `${unlockedDefs} / ${totalDefs}` : `${uniqueAwards.size} desbloqueadas`;
    $('passportAchievementProgress').style.width = `${progress}%`;
    $('passportProgressHint').textContent = totalDefs
      ? unlockedDefs === totalDefs && totalDefs > 0 ? 'Coleção completa. Todas as conquistas disponíveis foram desbloqueadas.' : `${Math.max(0,totalDefs-unlockedDefs)} conquista${totalDefs-unlockedDefs===1?'':'s'} ainda pode${totalDefs-unlockedDefs===1?'':'m'} entrar para o seu passaporte.`
      : 'Suas conquistas aparecem aqui conforme forem concedidas.';

    const firstDate = state.profiles.map((p) => state.events.get(p.event_id)?.start_at || p.created_at).filter(Boolean).sort((a,b) => new Date(a)-new Date(b))[0];
    const uniqueCharacters = new Set(state.profiles.map((p) => String(p.character_name || '').trim().toLowerCase()).filter(Boolean));
    $('passportSince').textContent = firstDate ? `Desde ${fmtMonthYear(firstDate)}` : 'Sua jornada começou';
    $('passportCharacterCount').textContent = `${uniqueCharacters.size} cosplay${uniqueCharacters.size===1?'':'s'}`;
    $('passportCheckinCount').textContent = `${state.checkins.length} check-in${state.checkins.length===1?'':'s'}`;

    const meta = $('passportHeroMeta');
    meta.replaceChildren();
    const metaItems = [
      `${state.profiles.length} participaç${state.profiles.length===1?'ão':'ões'} vinculada${state.profiles.length===1?'':'s'}`,
      primary.public_slug ? `@${primary.public_slug}` : '',
      uniqueEvents.size ? `${uniqueEvents.size} evento${uniqueEvents.size===1?'':'s'} na jornada` : ''
    ].filter(Boolean);
    metaItems.forEach((text) => { const span=document.createElement('span'); span.textContent=text; meta.appendChild(span); });

    const link = $('passportProfileLink');
    if (primary.public_slug) link.href = `./jogador.html?slug=${encodeURIComponent(primary.public_slug)}`;
  };

  const buildTimelineRows = () => {
    const rows = [];
    state.profiles.forEach((p) => {
      const event = state.events.get(p.event_id);
      rows.push({
        type:'event',
        date:event?.start_at || p.created_at,
        icon:'🎭',
        title:event?.title || 'Participação CosplayChess',
        text:p.character_name ? `Cosplay: ${p.character_name}` : 'Participação confirmada',
        small:[event?.venue,event?.city].filter(Boolean).join(' · ')
      });
      state.checkins.filter((c) => c.profile_id === p.id).forEach((c) => rows.push({
        type:'checkin',date:c.checked_in_at,icon:'✓',title:'Check-in no evento',text:event?.title || 'Evento CosplayChess',small:c.note || 'Presença registrada'
      }));
    });
    state.achievements.forEach((a) => {
      const def = state.defs.get(a.achievement_id);
      rows.push({
        type:'achievement',date:a.awarded_at,icon:def?.icon || '🏆',title:def?.title || 'Conquista',text:a.note || def?.description || '',small:a.character_name || ''
      });
    });
    rows.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
    state.timelineRows = rows;
  };

  const renderTimeline = () => {
    const root = $('passportTimeline');
    root.replaceChildren();
    buildTimelineRows();
    if (!state.timelineRows.length) {
      const empty=document.createElement('div');empty.className='passport-empty';empty.textContent='Sua linha do tempo será construída conforme você participa dos eventos.';root.appendChild(empty);return;
    }
    state.timelineRows.forEach((row) => {
      const stop=document.createElement('article');stop.className='passport-stop';stop.dataset.type=row.type;
      const icon=document.createElement('div');icon.className='passport-stop-icon';icon.textContent=row.icon;
      const card=document.createElement('div');card.className='passport-stop-card';
      const title=document.createElement('b');title.textContent=row.title;
      const text=document.createElement('span');text.textContent=row.text || '';
      const small=document.createElement('small');small.textContent=[fmt(row.date),row.small].filter(Boolean).join(' · ');
      card.append(title,text,small);stop.append(icon,card);root.appendChild(stop);
    });
  };

  const bindTimelineFilters = () => {
    $('passportTimelineFilters')?.addEventListener('click',(event) => {
      const button=event.target.closest('button[data-filter]');if(!button)return;
      const filter=button.dataset.filter || 'all';
      document.querySelectorAll('#passportTimelineFilters button').forEach((el)=>el.classList.toggle('active',el===button));
      document.querySelectorAll('#passportTimeline .passport-stop').forEach((row)=>{row.hidden=filter!=='all'&&row.dataset.type!==filter;});
    });
  };

  const renderCharacters = () => {
    const root=$('passportCharacters');root.replaceChildren();
    const byCharacter=new Map();
    state.profiles.forEach((profile) => {
      const key=String(profile.character_name || 'CosplayChess').trim().toLowerCase();
      const event=state.events.get(profile.event_id);
      const date=event?.start_at || profile.created_at;
      const existing=byCharacter.get(key);
      if(!existing || new Date(date || 0) > new Date(existing.date || 0)) byCharacter.set(key,{profile,event,date});
    });
    const items=[...byCharacter.values()].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    $('passportCharacterBadge').textContent=`${items.length} registrado${items.length===1?'':'s'}`;
    if(!items.length){const empty=document.createElement('div');empty.className='passport-empty';empty.textContent='Seus personagens aparecerão aqui conforme você participar.';root.appendChild(empty);return;}
    items.forEach(({profile,event,date})=>{
      const card=document.createElement('article');card.className='passport-character';
      const imageWrap=document.createElement('div');imageWrap.className='passport-character-image';
      const image=safe(profile.character_photo_url);
      if(image){const img=document.createElement('img');img.src=image;img.alt=`Cosplay ${profile.character_name || ''}`;img.loading='lazy';img.style.objectPosition=`${clamp(profile.avatar_position_x)}% ${clamp(profile.avatar_position_y,35)}%`;imageWrap.appendChild(img);}else{const ph=document.createElement('div');ph.className='passport-character-placeholder';ph.textContent='🎭';imageWrap.appendChild(ph);}
      const copy=document.createElement('div');copy.className='passport-character-copy';
      const title=document.createElement('b');title.textContent=profile.character_name || 'CosplayChess';
      const eventName=document.createElement('span');eventName.textContent=event?.title || 'Participação CosplayChess';
      const small=document.createElement('small');small.textContent=[fmt(date),event?.city].filter(Boolean).join(' · ');
      copy.append(title,eventName,small);card.append(imageWrap,copy);root.appendChild(card);
    });
  };

  const renderBadges = () => {
    const root=$('passportBadges');root.replaceChildren();
    const unlockedById=new Map();state.achievements.forEach((a)=>{if(a.achievement_id)unlockedById.set(a.achievement_id,a);});
    const unlockedCount=state.defsList.filter((d)=>unlockedById.has(d.id)).length;
    $('passportBadgeCount').textContent=state.defsList.length ? `${unlockedCount} / ${state.defsList.length}` : String(state.achievements.length);

    if(state.defsList.length){
      state.defsList.forEach((def)=>{
        const award=unlockedById.get(def.id);const card=document.createElement('article');card.className=`passport-badge ${award?'unlocked':'locked'}`;
        const icon=document.createElement('i');icon.textContent=def.icon || (award?'🏆':'◇');
        const title=document.createElement('b');title.textContent=def.title || 'Conquista';
        const desc=document.createElement('span');desc.textContent=award ? (award.note || def.description || def.tier || '') : (def.description || 'Conquista ainda não desbloqueada.');
        const status=document.createElement('small');status.textContent=award ? '✓ Desbloqueada' : 'Bloqueada';
        card.append(icon,title,desc,status);root.appendChild(card);
      });
    } else if(state.achievements.length){
      state.achievements.forEach((award)=>{const def=state.defs.get(award.achievement_id)||{};const card=document.createElement('article');card.className='passport-badge unlocked';const icon=document.createElement('i');icon.textContent=def.icon||'🏆';const title=document.createElement('b');title.textContent=def.title||'Conquista';const desc=document.createElement('span');desc.textContent=award.note||def.description||'';const status=document.createElement('small');status.textContent='✓ Desbloqueada';card.append(icon,title,desc,status);root.appendChild(card);});
    } else {
      const empty=document.createElement('div');empty.className='passport-empty';empty.textContent='As conquistas concedidas pela organização aparecerão aqui.';root.appendChild(empty);
    }
  };

  const renderNextStep = () => {
    const now=Date.now();
    const upcoming=state.profiles.map((profile)=>({profile,event:state.events.get(profile.event_id)})).filter((item)=>item.event?.start_at && new Date(item.event.start_at).getTime()>now).sort((a,b)=>new Date(a.event.start_at)-new Date(b.event.start_at))[0];
    const el=$('passportNextStep');
    if(upcoming){el.textContent=`Sua próxima participação é ${upcoming.event.title}${upcoming.profile.character_name?` como ${upcoming.profile.character_name}`:''}, em ${fmt(upcoming.event.start_at)}.`;return;}
    const remaining=Math.max(0,state.defsList.length-state.defsList.filter((d)=>state.achievements.some((a)=>a.achievement_id===d.id)).length);
    el.textContent=remaining>0?`Continue participando e registrando sua presença. Ainda existem ${remaining} conquista${remaining===1?'':'s'} disponíveis para completar sua coleção.`:'Sua trajetória já está registrada. Novos eventos e conquistas continuarão expandindo este passaporte.';
  };

  $('passportShare')?.addEventListener('click',async()=>{
    const primary=state.profiles[0];
    const text=`${displayName(primary)} no CosplayChess: ${new Set(state.profiles.map((p)=>p.event_id).filter(Boolean)).size} eventos e ${state.achievements.length} conquistas.`;
    try{if(navigator.share)await navigator.share({title:'Meu Passaporte CosplayChess',text,url:location.href});else{await navigator.clipboard.writeText(text);$('passportShare').textContent='Resumo copiado ✓';setTimeout(()=>$('passportShare').textContent='Compartilhar passaporte',1500);}}catch{}
  });

  const init=async()=>{
    if(!db || !await load()){ $('passportAuth').hidden=false; return; }
    renderHero();renderTimeline();renderCharacters();renderBadges();renderNextStep();bindTimelineFilters();
    $('passportContent').hidden=false;$('passportAuth').hidden=true;
  };
  init().catch(()=>{});
})();
