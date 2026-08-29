(()=>{
  if(window.__cosplayGamePlayerJsonAutofillLoaded)return;
  window.__cosplayGamePlayerJsonAutofillLoaded=true;

  function text(value){return typeof value==='string'?value.trim():'';}

  function normalizePerson(raw,number=null){
    if(!raw||typeof raw!=='object')return null;
    const name=text(raw.name||raw.nome||raw.fullName||raw.full_name);
    if(!name)return null;
    const photoUrl=text(raw.photoUrl||raw.photo_url||raw.fotoUrl||raw.foto_url||raw.imageUrl||raw.image_url);
    const photo=text(raw.photoDataUrl||raw.photo_data_url||raw.photo||raw.foto||raw.avatar||raw.image||raw.img)||photoUrl;
    return{
      registrationId:text(raw.registrationId||raw.registration_id||raw.id||raw.uuid),
      name,
      nick:text(raw.nick||raw.apelido),
      character:text(raw.character||raw.cosplay||raw.personagem||raw.character_name),
      photo,
      photoUrl,
      player:number,
      side:number===1?'B':number===2?'P':'',
      sideName:number===1?'Brancas':number===2?'Pretas':''
    };
  }

  function playersFromJson(data){
    if(!data||typeof data!=='object'||data.type!=='cosplaychess-participants')return null;
    const raw=data.gamePlayers;
    if(!raw||typeof raw!=='object')return null;
    const player1=normalizePerson(raw.player1||raw.player_1||raw.p1,1);
    const player2=normalizePerson(raw.player2||raw.player_2||raw.p2,2);
    if(!player1&&!player2)return null;
    return{player1,player2};
  }

  function candidatesFromJson(data){
    if(!data||typeof data!=='object'||data.type!=='cosplaychess-participants')return[];
    const source=[
      ...(Array.isArray(data.participants)?data.participants:[]),
      ...(Array.isArray(data.playerCandidates)?data.playerCandidates:[]),
      data.gamePlayers?.player1,
      data.gamePlayers?.player2
    ].filter(Boolean);
    const seen=new Set();
    const people=[];
    source.forEach(raw=>{
      const person=normalizePerson(raw,null);
      if(!person)return;
      const key=person.registrationId||`${person.name.toLowerCase()}|${person.character.toLowerCase()}`;
      if(seen.has(key))return;
      seen.add(key);
      people.push(person);
    });
    return people.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  }

  function applyName(side,name){
    const input=document.getElementById(`name-${side}`);
    if(input&&name){
      input.value=name;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function withSide(person,number,source){
    if(!person)return null;
    return{
      ...person,
      player:number,
      side:number===1?'B':'P',
      sideName:number===1?'Brancas':'Pretas',
      assignmentSource:source||'runtime'
    };
  }

  function applyPlayers(players,persist=true,source='runtime'){
    if(typeof store==='undefined'||!store||typeof store!=='object')return false;
    if(!store.g)store.g={};

    const p1=withSide(players?.player1||null,1,source);
    const p2=withSide(players?.player2||null,2,source);
    if(p1){
      store.g.registeredPlayer1={...p1};
      store.g.player1Name=p1.name;
      if(p1.photo)store.g.avatarB=p1.photo;
      applyName('B',p1.name);
    }
    if(p2){
      store.g.registeredPlayer2={...p2};
      store.g.player2Name=p2.name;
      if(p2.photo)store.g.avatarP=p2.photo;
      applyName('P',p2.name);
    }

    store.g.playerAssignmentMode=source;
    store.g.registeredPlayersImportedAt=new Date().toISOString();
    if(persist){try{save();}catch(_){}}
    try{updateUI();}catch(_){ }
    refreshAssignmentCard();
    try{window.refreshCosplayResultSync?.();}catch(_){ }
    return true;
  }

  function clearAssignedPlayers(){
    if(!store?.g)return;
    delete store.g.registeredPlayer1;
    delete store.g.registeredPlayer2;
    delete store.g.player1Name;
    delete store.g.player2Name;
    delete store.g.avatarB;
    delete store.g.avatarP;
    store.g.playerAssignmentMode='runtime';
    applyName('B','Jogador 1');
    applyName('P','Jogador 2');
    try{save();}catch(_){ }
    try{updateUI();}catch(_){ }
  }

  function restoreSavedPlayers(){
    if(typeof store==='undefined'||!store?.g)return;
    const p1=store.g.registeredPlayer1||null;
    const p2=store.g.registeredPlayer2||null;
    if(!p1&&!p2)return;
    applyPlayers({player1:p1,player2:p2},false,store.g.playerAssignmentMode||'saved');
  }

  function escapeHtml(value=''){
    return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function notify(players,hasCandidates=false){
    const p1=players?.player1?.name||'definir na hora';
    const p2=players?.player2?.name||'definir na hora';
    const old=document.getElementById('player-json-autofill-toast');
    if(old)old.remove();
    const el=document.createElement('div');
    el.id='player-json-autofill-toast';
    el.innerHTML=`<b>${players?'PLAYERS DO SITE CARREGADOS':'PLAYERS SERÃO DEFINIDOS NO JOGO'}</b><span>Player 1 · Brancas: ${escapeHtml(p1)}</span><span>Player 2 · Pretas: ${escapeHtml(p2)}</span>${hasCandidates?'<span>Você pode trocar qualquer um deles em SISTEMA → PLAYERS DA PARTIDA.</span>':''}`;
    el.style.cssText='position:fixed;right:20px;bottom:82px;z-index:15050;display:grid;gap:4px;padding:12px 15px;border-radius:10px;background:#07191d;border:1px solid #00e5ff;color:white;box-shadow:0 14px 34px rgba(0,0,0,.55);font-size:10px;max-width:410px';
    el.querySelector('b').style.color='#00e5ff';
    el.querySelectorAll('span').forEach(s=>s.style.color='#d8e4e6');
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),6200);
  }

  function candidateById(id){
    return (store?.g?.playerCandidates||[]).find(person=>person.registrationId===id)||null;
  }

  function selectOptions(selectedId,otherId){
    const people=Array.isArray(store?.g?.playerCandidates)?store.g.playerCandidates:[];
    return ['<option value="">— selecionar participante —</option>',...people.map(person=>{
      const label=`${person.name}${person.character?` · ${person.character}`:''}`;
      const disabled=otherId&&person.registrationId===otherId?' disabled':'';
      const selected=selectedId&&person.registrationId===selectedId?' selected':'';
      return `<option value="${escapeHtml(person.registrationId)}"${selected}${disabled}>${escapeHtml(label)}</option>`;
    })].join('');
  }

  function playerPreview(person,number){
    if(!person)return `<div style="width:38px;height:38px;border-radius:8px;border:1px dashed #444;display:grid;place-items:center;color:#666;">P${number}</div>`;
    const photo=person.photo||person.photoUrl||'';
    return photo
      ? `<div style="width:38px;height:38px;border-radius:8px;background:url('${String(photo).replace(/'/g,"%27")}') center/cover;border:1px solid rgba(0,229,255,.32);"></div>`
      : `<div style="width:38px;height:38px;border-radius:8px;border:1px solid #333;display:grid;place-items:center;color:#aaa;">P${number}</div>`;
  }

  function refreshAssignmentCard(){
    const card=document.getElementById('cosplay-player-assignment-card');
    if(!card||typeof store==='undefined')return;
    const p1=store?.g?.registeredPlayer1||null;
    const p2=store?.g?.registeredPlayer2||null;
    const s1=card.querySelector('#cosplay-runtime-player1');
    const s2=card.querySelector('#cosplay-runtime-player2');
    if(s1)s1.innerHTML=selectOptions(p1?.registrationId||'',p2?.registrationId||'');
    if(s2)s2.innerHTML=selectOptions(p2?.registrationId||'',p1?.registrationId||'');
    const prev1=card.querySelector('[data-player-preview="1"]');
    const prev2=card.querySelector('[data-player-preview="2"]');
    if(prev1)prev1.innerHTML=playerPreview(p1,1);
    if(prev2)prev2.innerHTML=playerPreview(p2,2);
    const status=card.querySelector('[data-player-assignment-status]');
    const hasPre=!!(store?.g?.predefinedPlayers?.player1||store?.g?.predefinedPlayers?.player2);
    if(status){
      if(p1&&p2)status.textContent=`✓ Player 1: ${p1.name} · Player 2: ${p2.name} · modo ${store.g.playerAssignmentMode==='predefined'?'pré-definido pelo site':'definido no jogo'}`;
      else status.textContent='Selecione Player 1 e Player 2 antes de iniciar a partida oficial.';
    }
    const restoreBtn=card.querySelector('[data-restore-site-players]');
    if(restoreBtn)restoreBtn.hidden=!hasPre;
  }

  function installAssignmentCard(){
    const root=document.getElementById('list-sys');
    if(!root)return false;
    if(root.querySelector('#cosplay-player-assignment-card')){refreshAssignmentCard();return true;}
    const card=document.createElement('div');
    card.id='cosplay-player-assignment-card';
    card.className='unit-card';
    card.style.cssText='background:rgba(0,229,255,.055);border-color:rgba(0,229,255,.24);';
    card.innerHTML=`
      <b style="color:var(--accent,#00e5ff);font-size:10px;letter-spacing:1px;">♟ PLAYERS DA PARTIDA</b>
      <div style="font-size:9px;color:#999;line-height:1.45;margin:7px 0 10px;">Use os Players definidos pelo site ou troque aqui na hora. Os dois modos usam a mesma sincronização de resultado.</div>
      <div style="display:grid;gap:8px;">
        <label style="display:grid;grid-template-columns:38px minmax(0,1fr);gap:8px;align-items:center;"><span data-player-preview="1"></span><span><small style="display:block;color:#00e5ff;margin-bottom:3px;">PLAYER 1 · BRANCAS</small><select id="cosplay-runtime-player1" style="width:100%;min-width:0;padding:7px;background:#0b0b0d;color:#fff;border:1px solid #333;border-radius:6px;"></select></span></label>
        <label style="display:grid;grid-template-columns:38px minmax(0,1fr);gap:8px;align-items:center;"><span data-player-preview="2"></span><span><small style="display:block;color:#ff6b8e;margin-bottom:3px;">PLAYER 2 · PRETAS</small><select id="cosplay-runtime-player2" style="width:100%;min-width:0;padding:7px;background:#0b0b0d;color:#fff;border:1px solid #333;border-radius:6px;"></select></span></label>
      </div>
      <button type="button" class="btn-play-sm" data-restore-site-players style="width:100%;font-size:8px;padding:8px 6px;margin-top:9px;" hidden>↶ USAR PLAYERS DEFINIDOS NO SITE</button>
      <div data-player-assignment-status style="font-size:8px;color:#aaa;line-height:1.4;margin-top:8px;"></div>`;
    const resultCard=root.querySelector('#match-result-export-card');
    const resetButton=[...root.querySelectorAll('button')].find(btn=>/RESET TOTAL/i.test(btn.textContent||''));
    if(resultCard)root.insertBefore(card,resultCard);
    else if(resetButton)root.insertBefore(card,resetButton);
    else root.appendChild(card);

    const choose=(number,value)=>{
      const selected=candidateById(value);
      if(!selected){refreshAssignmentCard();return;}
      const other=number===1?store?.g?.registeredPlayer2:store?.g?.registeredPlayer1;
      if(other?.registrationId&&other.registrationId===selected.registrationId){
        alert('Player 1 e Player 2 precisam ser pessoas diferentes.');
        refreshAssignmentCard();
        return;
      }
      if(number===1)applyPlayers({player1:selected},true,'runtime');
      else applyPlayers({player2:selected},true,'runtime');
    };
    card.querySelector('#cosplay-runtime-player1').addEventListener('change',event=>choose(1,event.target.value));
    card.querySelector('#cosplay-runtime-player2').addEventListener('change',event=>choose(2,event.target.value));
    card.querySelector('[data-restore-site-players]').addEventListener('click',()=>{
      const preset=store?.g?.predefinedPlayers||{};
      if(!preset.player1&&!preset.player2)return;
      applyPlayers(preset,true,'predefined');
    });
    refreshAssignmentCard();
    return true;
  }

  function inspectImportFile(input){
    const file=input?.files?.[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(String(reader.result||''));
        if(data?.type!=='cosplaychess-participants')return;
        if(!store.g)store.g={};
        const candidates=candidatesFromJson(data);
        store.g.playerCandidates=candidates;
        const players=playersFromJson(data);
        store.g.predefinedPlayers=players?{
          player1:players.player1?withSide(players.player1,1,'predefined'):null,
          player2:players.player2?withSide(players.player2,2,'predefined'):null
        }:{player1:null,player2:null};
        if(players){
          clearAssignedPlayers();
          applyPlayers(players,true,'predefined');
        }else{
          clearAssignedPlayers();
        }
        try{save();}catch(_){ }
        setTimeout(()=>{installAssignmentCard();refreshAssignmentCard();},200);
        notify(players,candidates.length>0);
      }catch(error){
        console.warn('[CosplayChess] Não foi possível ler Players do JSON:',error);
      }
    };
    reader.readAsText(file,'utf-8');
  }

  window.addEventListener('change',event=>{
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||input.id!=='import-file'||input.type!=='file')return;
    inspectImportFile(input);
  },true);

  window.applyCosplayChessRegisteredPlayers=applyPlayers;
  window.restoreCosplayChessRegisteredPlayers=restoreSavedPlayers;
  window.refreshCosplayPlayerAssignment=refreshAssignmentCard;

  const restore=()=>{
    restoreSavedPlayers();
    installAssignmentCard();
    setTimeout(()=>{restoreSavedPlayers();installAssignmentCard();},350);
    setTimeout(()=>{restoreSavedPlayers();installAssignmentCard();},1200);
    setTimeout(()=>installAssignmentCard(),2600);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});else restore();
})();
