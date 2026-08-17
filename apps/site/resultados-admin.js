(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;
  const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const msg=(el,text,type='')=>{el.className=`form-status ${type}`;el.textContent=text;};
  let events=[],registrations=[],matches=[],achievements=[],team=[];

  async function requireAdmin(){
    const {data:{session}}=await db.auth.getSession();
    if(!session){location.href='./admin.html';return false;}
    const {data:admin}=await db.from('cosplay_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
    if(!admin){location.href='./admin.html';return false;}
    document.getElementById('historyLoading').hidden=true;document.getElementById('historyPanel').hidden=false;return true;
  }

  function localInputValue(v){const d=v?new Date(v):new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
  function setSelectOptions(select,items,first){select.innerHTML=first+items.map(i=>`<option value="${i.id}">${esc(i.title||i.name)}</option>`).join('');}

  async function loadBase(){
    const [{data:e,error:eErr},{data:a,error:aErr},{data:t,error:tErr}]=await Promise.all([
      db.from('cosplay_events').select('id,title,start_at').order('start_at',{ascending:false}),
      db.from('cosplay_achievements').select('*').order('sort_order'),
      db.from('cosplay_team_members').select('*').order('sort_order')
    ]);
    if(eErr)throw eErr;if(aErr)throw aErr;if(tErr)throw tErr;
    events=e||[];achievements=a||[];team=t||[];
    setSelectOptions(document.getElementById('matchEvent'),events,'<option value="">Selecione...</option>');
    setSelectOptions(document.getElementById('awardEvent'),events,'<option value="">Conquista geral</option>');
    document.getElementById('awardAchievement').innerHTML='<option value="">Selecione...</option>'+achievements.map(a=>`<option value="${a.id}">${esc(a.icon)} ${esc(a.title)}</option>`).join('');
    renderTeam();
  }

  async function loadMatches(){
    const {data,error}=await db.from('cosplay_matches').select('*,cosplay_events(title)').order('played_at',{ascending:false});if(error)throw error;matches=data||[];
    const root=document.getElementById('adminMatches');
    root.innerHTML=matches.length?matches.map(m=>`<article class="community-admin-item"><b>${esc(m.winner_character)} (${esc(m.winner_cosplayer)})</b><span>${esc(m.cosplay_events?.title||'')} • ${esc(m.match_label)} • ${new Date(m.played_at).toLocaleDateString('pt-BR')}</span><div class="row-actions"><button class="mini-btn" data-edit-match="${m.id}">Editar</button><button class="mini-btn danger" data-delete-match="${m.id}">Excluir</button></div></article>`).join(''):'<div class="empty-card">Nenhuma partida registrada.</div>';
    root.querySelectorAll('[data-edit-match]').forEach(b=>b.onclick=()=>editMatch(b.dataset.editMatch));
    root.querySelectorAll('[data-delete-match]').forEach(b=>b.onclick=()=>deleteMatch(b.dataset.deleteMatch));
  }

  async function loadAwards(){
    const {data,error}=await db.from('cosplay_cosplayer_achievements').select('id,cosplayer_name,character_name,note,awarded_at,cosplay_achievements(title,icon),cosplay_events(title)').order('awarded_at',{ascending:false}).limit(50);if(error)throw error;
    const root=document.getElementById('adminAwards');
    root.innerHTML=data?.length?data.map(a=>`<article class="community-admin-item"><b>${esc(a.cosplay_achievements?.icon||'🏆')} ${esc(a.cosplay_achievements?.title||'Conquista')}</b><span>${esc(a.cosplayer_name)}${a.character_name?` • ${esc(a.character_name)}`:''}${a.cosplay_events?.title?` • ${esc(a.cosplay_events.title)}`:''}</span><button class="mini-btn danger" data-delete-award="${a.id}">Remover</button></article>`).join(''):'<div class="empty-card">Nenhum troféu concedido ainda.</div>';
    root.querySelectorAll('[data-delete-award]').forEach(b=>b.onclick=async()=>{if(!confirm('Remover este troféu?'))return;const{error}=await db.from('cosplay_cosplayer_achievements').delete().eq('id',b.dataset.deleteAward);if(error)alert(error.message);else loadAwards();});
  }

  async function loadParticipants(eventId){
    const root=document.getElementById('participantStats');registrations=[];
    if(!eventId){root.innerHTML='<div class="empty-card">Selecione um evento.</div>';return;}
    const {data,error}=await db.from('cosplay_registrations').select('id,full_name,character_name,character_photo_url,piece_preference,side_preference,status').eq('event_id',eventId).neq('status','cancelled').order('full_name');
    if(error){root.innerHTML='<div class="empty-card">Não foi possível carregar o elenco.</div>';return;}
    registrations=data||[];
    root.innerHTML=registrations.length?registrations.map(r=>`<div class="participant-stat-row" data-registration="${r.id}" data-name="${esc(r.full_name)}" data-character="${esc(r.character_name)}" data-piece="${esc(r.piece_preference||'')}" data-side="${esc(r.side_preference||'')}" data-photo="${esc(r.character_photo_url||'')}"><div><b>${esc(r.character_name)}</b><small>${esc(r.full_name)} • ${esc(r.piece_preference||'Peça não definida')}</small></div><input type="number" min="0" value="0" data-kills aria-label="Capturas"><label><input type="checkbox" data-died> Morreu</label><label><input type="checkbox" data-winner> Venceu</label></div>`).join(''):'<div class="empty-card">Nenhum inscrito encontrado para este evento.</div>';
  }

  function collectPlayerStats(){
    return [...document.querySelectorAll('.participant-stat-row[data-registration]')].map(row=>({
      registration_id:row.dataset.registration,
      cosplayer_name:row.dataset.name,
      character_name:row.dataset.character,
      piece_type:row.dataset.piece||'',
      side:row.dataset.side||'',
      kills:Number(row.querySelector('[data-kills]').value)||0,
      died:row.querySelector('[data-died]').checked,
      survived:!row.querySelector('[data-died]').checked,
      winner:row.querySelector('[data-winner]').checked,
      photo_url:row.dataset.photo||null
    }));
  }

  document.getElementById('matchEvent').onchange=e=>loadParticipants(e.target.value);
  document.getElementById('matchForm').elements.playedAt.value=localInputValue();

  document.getElementById('matchForm').onsubmit=async e=>{
    e.preventDefault();const form=e.currentTarget,d=Object.fromEntries(new FormData(form)),status=document.getElementById('matchStatus');msg(status,'Salvando partida...');
    try{
      const players=collectPlayerStats();
      const winnerReg=registrations.find(r=>r.full_name.trim().toLowerCase()===d.winnerCosplayer.trim().toLowerCase()||r.character_name.trim().toLowerCase()===d.winnerCharacter.trim().toLowerCase());
      const opponentReg=registrations.find(r=>r.full_name.trim().toLowerCase()===(d.opponentCosplayer||'').trim().toLowerCase()||r.character_name.trim().toLowerCase()===(d.opponentCharacter||'').trim().toLowerCase());
      const payload={event_id:d.eventId,match_label:d.matchLabel||'Partida',played_at:new Date(d.playedAt).toISOString(),winner_character:d.winnerCharacter,winner_cosplayer:d.winnerCosplayer,opponent_character:d.opponentCharacter||'',opponent_cosplayer:d.opponentCosplayer||'',winner_photo_url:winnerReg?.character_photo_url||null,opponent_photo_url:opponentReg?.character_photo_url||null,notes:d.notes||'',published:d.published==='true',updated_at:new Date().toISOString()};
      let saved;
      if(d.id){const{data,error}=await db.from('cosplay_matches').update(payload).eq('id',d.id).select().single();if(error)throw error;saved=data;await db.from('cosplay_match_players').delete().eq('match_id',saved.id);}else{const{data,error}=await db.from('cosplay_matches').insert(payload).select().single();if(error)throw error;saved=data;}
      if(players.length){const{error}=await db.from('cosplay_match_players').insert(players.map(p=>({...p,match_id:saved.id})));if(error)throw error;}
      await syncAutomaticAchievements();
      msg(status,'Partida salva. Ranking e conquistas atualizados.','success');
      form.reset();form.elements.playedAt.value=localInputValue();document.getElementById('participantStats').innerHTML='<div class="empty-card">Selecione um evento.</div>';
      await Promise.all([loadMatches(),loadAwards()]);
    }catch(err){msg(status,err.message,'error');}
  };

  async function editMatch(id){
    const m=matches.find(x=>x.id===id);if(!m)return;const f=document.getElementById('matchForm');
    f.elements.id.value=m.id;f.elements.eventId.value=m.event_id;f.elements.matchLabel.value=m.match_label;f.elements.playedAt.value=localInputValue(m.played_at);f.elements.published.value=String(m.published);f.elements.winnerCharacter.value=m.winner_character;f.elements.winnerCosplayer.value=m.winner_cosplayer;f.elements.opponentCharacter.value=m.opponent_character||'';f.elements.opponentCosplayer.value=m.opponent_cosplayer||'';f.elements.notes.value=m.notes||'';
    await loadParticipants(m.event_id);
    const {data}=await db.from('cosplay_match_players').select('*').eq('match_id',id);
    for(const p of data||[]){const row=document.querySelector(`.participant-stat-row[data-registration="${p.registration_id}"]`);if(!row)continue;row.querySelector('[data-kills]').value=p.kills||0;row.querySelector('[data-died]').checked=!!p.died;row.querySelector('[data-winner]').checked=!!p.winner;}
    scrollTo({top:0,behavior:'smooth'});
  }

  async function deleteMatch(id){if(!confirm('Excluir esta partida? O ranking será recalculado sem ela.'))return;const{error}=await db.from('cosplay_matches').delete().eq('id',id);if(error)return alert(error.message);await loadMatches();}

  function renderTeam(){
    const root=document.getElementById('teamEditor');
    root.innerHTML=team.length?team.map(m=>`<div class="team-editor-row" data-team-id="${m.id}"><input data-field="name" value="${esc(m.name)}" placeholder="Nome"><input data-field="role" value="${esc(m.role||'')}" placeholder="Função"><input data-field="photo_url" value="${esc(m.photo_url||'')}" placeholder="URL da foto (opcional)"><textarea data-field="bio" placeholder="Bio">${esc(m.bio||'')}</textarea><div class="row-actions"><label class="hint"><input type="checkbox" data-field="published" ${m.published?'checked':''}> Publicado</label><button class="mini-btn" data-save-team="${m.id}">Salvar</button><button class="mini-btn danger" data-delete-team="${m.id}">Excluir</button></div></div>`).join(''):'<div class="empty-card">Nenhuma pessoa cadastrada.</div>';
    root.querySelectorAll('[data-save-team]').forEach(b=>b.onclick=()=>saveTeam(b.dataset.saveTeam));
    root.querySelectorAll('[data-delete-team]').forEach(b=>b.onclick=()=>deleteTeam(b.dataset.deleteTeam));
  }

  async function saveTeam(id){const row=document.querySelector(`[data-team-id="${id}"]`);const get=f=>row.querySelector(`[data-field="${f}"]`);const payload={name:get('name').value.trim(),role:get('role').value.trim(),photo_url:get('photo_url').value.trim()||null,bio:get('bio').value.trim(),published:get('published').checked,updated_at:new Date().toISOString()};const{error}=await db.from('cosplay_team_members').update(payload).eq('id',id);if(error)alert(error.message);else{const m=team.find(x=>x.id===id);Object.assign(m,payload);alert('Bio atualizada.');}}
  async function deleteTeam(id){if(!confirm('Remover esta pessoa da página pública?'))return;const{error}=await db.from('cosplay_team_members').delete().eq('id',id);if(error)return alert(error.message);team=team.filter(x=>x.id!==id);renderTeam();}
  document.getElementById('addTeamMemberBtn').onclick=async()=>{const{data,error}=await db.from('cosplay_team_members').insert({name:'Nova pessoa',role:'Fergorverse',bio:'',sort_order:(team.at(-1)?.sort_order||0)+10,published:false}).select().single();if(error)return alert(error.message);team.push(data);renderTeam();};

  document.getElementById('awardForm').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget)),box=document.getElementById('awardStatus');msg(box,'Concedendo troféu...');const payload={achievement_id:d.achievementId,event_id:d.eventId||null,cosplayer_name:d.cosplayerName.trim(),character_name:(d.characterName||'').trim(),note:(d.note||'').trim()};const{error}=await db.from('cosplay_cosplayer_achievements').insert(payload);if(error)return msg(box,error.message,'error');e.currentTarget.reset();msg(box,'Troféu concedido.','success');await loadAwards();};

  async function syncAutomaticAchievements(){
    const [{data:rows,error:rErr},{data:achs,error:aErr}]=await Promise.all([db.from('cosplay_match_players').select('match_id,cosplayer_name,character_name,kills,died,survived,winner'),db.from('cosplay_achievements').select('id,slug')]);
    if(rErr||aErr)return;
    const achMap=new Map((achs||[]).map(a=>[a.slug,a.id]));const people=new Map();
    for(const r of rows||[]){const key=r.cosplayer_name.trim().toLowerCase();if(!people.has(key))people.set(key,{name:r.cosplayer_name,character:r.character_name,matches:new Set(),kills:0,survivals:0,wins:0});const p=people.get(key);p.matches.add(r.match_id);p.kills+=Number(r.kills)||0;p.survivals+=r.survived?1:0;p.wins+=r.winner?1:0;p.character=r.character_name||p.character;}
    for(const p of people.values()){
      const unlocked=[];if(p.matches.size>=1)unlocked.push('primeira-partida');if(p.kills>=1)unlocked.push('primeira-captura');if(p.kills>=5)unlocked.push('cacador');if(p.survivals>=3)unlocked.push('sobrevivente');if(p.matches.size>=5)unlocked.push('veterano');if(p.wins>=1)unlocked.push('campeao');if(p.survivals>=5)unlocked.push('imortal');
      for(const slug of unlocked){const achievementId=achMap.get(slug);if(!achievementId)continue;const{error}=await db.from('cosplay_cosplayer_achievements').insert({achievement_id:achievementId,event_id:null,cosplayer_name:p.name,character_name:p.character,note:'Desbloqueio automático pelo histórico de partidas.'});if(error&&error.code!=='23505')console.warn(error);}
    }
  }

  async function init(){
    if(!await requireAdmin())return;
    try{await loadBase();await Promise.all([loadMatches(),loadAwards()]);}catch(err){document.getElementById('historyPanel').innerHTML=`<div class="empty-card">Erro ao carregar o painel: ${esc(err.message)}</div>`;}
  }
  init();
})();