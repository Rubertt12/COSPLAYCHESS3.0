(()=>{
  if(window.__cosplayGamePlayerJsonAutofillLoaded)return;
  window.__cosplayGamePlayerJsonAutofillLoaded=true;

  const txt=v=>typeof v==='string'?v.trim():'';
  const pick=(o,keys)=>{
    if(!o||typeof o!=='object')return'';
    for(const k of keys){const v=o[k];if(typeof v==='string'&&v.trim())return v.trim();if(typeof v==='number'&&Number.isFinite(v))return String(v);}
    return'';
  };
  const roleOf=raw=>{
    if(!raw||typeof raw!=='object')return'piece';
    const role=String(raw.gameRole??raw.game_role??raw.role??'').trim().toLowerCase().replace(/[_\s-]+/g,'');
    if(['player1','p1','jogador1'].includes(role))return'player1';
    if(['player2','p2','jogador2'].includes(role))return'player2';
    const slot=Number(raw.playerSlot??raw.player_slot??raw.player);
    if(slot===1)return'player1';
    if(slot===2)return'player2';
    const nav=String(raw.navbarSlot??raw.navbar_slot??'').trim().toLowerCase().replace(/[_\s-]+/g,'');
    if(nav==='player1'||nav==='p1')return'player1';
    if(nav==='player2'||nav==='p2')return'player2';
    return'piece';
  };

  function person(raw,number=null){
    if(!raw||typeof raw!=='object')return null;
    const name=pick(raw,['name','nome','fullName','full_name','nomeCompleto','nome_completo']);
    if(!name)return null;
    const photoUrl=pick(raw,['photoUrl','photo_url','fotoUrl','foto_url','imageUrl','image_url']);
    const photo=pick(raw,['photoDataUrl','photo_data_url','photo','foto','avatar','image','img','profileImage','profile_image'])||photoUrl;
    return{
      registrationId:pick(raw,['registrationId','registration_id','id','uuid']),
      name,
      nick:pick(raw,['nick','apelido']),
      character:pick(raw,['character','cosplay','personagem','character_name']),
      photo,photoUrl,
      gameRole:number===1?'player1':number===2?'player2':roleOf(raw),
      player:number,
      playerSlot:number,
      navbarSlot:number===1?'player1':number===2?'player2':'',
      side:number===1?'B':number===2?'P':'',
      sideName:number===1?'Brancas':number===2?'Pretas':''
    };
  }

  function sources(data){
    if(!data||typeof data!=='object')return[];
    return[
      ...(Array.isArray(data.playerCandidates)?data.playerCandidates:[]),
      ...(Array.isArray(data.participants)?data.participants:[]),
      ...(Array.isArray(data.players)?data.players:[]),
      ...(Array.isArray(data.roster)?data.roster:[])
    ].filter(Boolean);
  }

  function findPlayer(data,number){
    const direct=number===1
      ?(data?.gamePlayers?.player1||data?.gamePlayers?.player_1||data?.gamePlayers?.p1)
      :(data?.gamePlayers?.player2||data?.gamePlayers?.player_2||data?.gamePlayers?.p2);
    let found=direct||sources(data).find(x=>roleOf(x)===(number===1?'player1':'player2'))||null;
    if(!found)return null;
    let p=person(found,number);
    if(!p)return null;
    if(!p.photo&&p.registrationId){
      const same=sources(data).find(x=>pick(x,['registrationId','registration_id','id','uuid'])===p.registrationId);
      const fallback=person(same,number);
      if(fallback)p={...fallback,...p,photo:p.photo||fallback.photo,photoUrl:p.photoUrl||fallback.photoUrl};
    }
    return p;
  }

  function candidates(data){
    const all=[...sources(data),data?.gamePlayers?.player1,data?.gamePlayers?.player2].filter(Boolean);
    const seen=new Set(),out=[];
    all.forEach(raw=>{
      const p=person(raw,null);if(!p)return;
      const key=p.registrationId||`${p.name.toLowerCase()}|${p.character.toLowerCase()}`;
      if(seen.has(key))return;seen.add(key);out.push(p);
    });
    return out.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  }

  function unlinkPlayerFromBoard(p){
    if(!p||typeof store==='undefined'||!store?.p)return 0;
    const wantedId=String(p.registrationId||p.id||'').trim();
    const wantedName=String(p.name||'').trim().toLowerCase();
    let cleared=0;
    Object.entries(store.p).forEach(([pieceId,piece])=>{
      if(!piece||typeof piece!=='object')return;
      const linkedId=String(piece.participantId||piece.participant?.registrationId||piece.participant?.id||'').trim();
      const linkedName=String(piece.participant?.name||piece.participantRealName||'').trim().toLowerCase();
      const same=(wantedId&&linkedId&&wantedId===linkedId)||(!wantedId&&wantedName&&linkedName===wantedName);
      if(!same)return;

      const playerPhoto=p.photo||p.photoUrl||'';
      if(piece.rosterManagedName||String(piece.name||'').trim()===String(p.character||p.name||'').trim())delete piece.name;
      if(piece.rosterManagedImg||!playerPhoto||piece.img===playerPhoto)delete piece.img;
      if(piece.rosterManagedPhotoCrop)delete piece.photoCrop;
      if(piece.rosterManagedSound){
        try{if(typeof stopPiecePlayback==='function')stopPiecePlayback(pieceId,false);}catch(_){}
        delete piece.sound;delete piece.soundName;delete piece.soundSource;
      }
      delete piece.participantId;
      delete piece.participant;
      delete piece.participantRealName;
      delete piece.rosterManagedName;
      delete piece.rosterManagedImg;
      delete piece.rosterManagedPhotoCrop;
      delete piece.rosterManagedSound;
      delete piece.autoLineupReason;
      cleared+=1;
    });
    return cleared;
  }

  function paint(number,p){
    if(typeof store==='undefined'||!store)return;
    if(!store.g)store.g={};
    const side=number===1?'B':'P';
    const regKey=number===1?'registeredPlayer1':'registeredPlayer2';
    const nameKey=number===1?'player1Name':'player2Name';
    const avatarKey=`avatar${side}`;
    const input=document.getElementById(`name-${side}`);
    const img=document.getElementById(`img-${side}`);
    if(!p){
      delete store.g[regKey];delete store.g[nameKey];store.g[avatarKey]='';
      if(input)input.value=number===1?'Jogador 1':'Jogador 2';
      if(img)img.style.backgroundImage='';
      return;
    }
    unlinkPlayerFromBoard(p);
    const fixed={...p,player:number,playerSlot:number,navbarSlot:`player${number}`,side,sideName:number===1?'Brancas':'Pretas'};
    store.g[regKey]=fixed;store.g[nameKey]=fixed.name;store.g[avatarKey]=fixed.photo||fixed.photoUrl||'';
    if(input){input.value=fixed.name;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
    if(img){const a=store.g[avatarKey];img.style.backgroundImage=a?`url("${String(a).replace(/"/g,'%22')}")`:'';img.style.backgroundPosition='center';img.style.backgroundSize='cover';img.style.backgroundRepeat='no-repeat';}
  }

  function apply(players,persist=true,source='predefined'){
    if(typeof store==='undefined'||!store)return false;
    if(!store.g)store.g={};
    paint(1,players?.player1||null);paint(2,players?.player2||null);
    store.g.predefinedPlayers={player1:players?.player1||null,player2:players?.player2||null};
    store.g.playerAssignmentMode=source;
    store.g.registeredPlayersImportedAt=new Date().toISOString();
    if(persist){try{save();}catch(_){}}
    try{renderBoard();}catch(_){}
    try{updateUI();}catch(_){}
    refreshCard();
    return true;
  }

  function playersFrom(data){
    if(!data||typeof data!=='object'||data.type!=='cosplaychess-participants')return null;
    const player1=findPlayer(data,1),player2=findPlayer(data,2);
    return player1||player2?{player1,player2}:null;
  }

  function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));}
  function options(selected,other){
    const list=Array.isArray(store?.g?.playerCandidates)?store.g.playerCandidates:[];
    return '<option value="">— selecionar participante —</option>'+list.map(p=>`<option value="${esc(p.registrationId)}"${selected===p.registrationId?' selected':''}${other===p.registrationId?' disabled':''}>${esc(p.name+(p.character?' · '+p.character:''))}</option>`).join('');
  }
  function preview(p,n){const photo=p?.photo||p?.photoUrl||'';return photo?`<span style="display:block;width:38px;height:38px;border-radius:50%;background:url(&quot;${esc(photo)}&quot;) center/cover;border:1px solid #555"></span>`:`<span style="display:grid;place-items:center;width:38px;height:38px;border-radius:50%;border:1px dashed #555;color:#777">P${n}</span>`;}
  function refreshCard(){
    const card=document.getElementById('cosplay-player-assignment-card');if(!card)return;
    const p1=store?.g?.registeredPlayer1||null,p2=store?.g?.registeredPlayer2||null;
    const s1=card.querySelector('#cosplay-runtime-player1'),s2=card.querySelector('#cosplay-runtime-player2');
    if(s1)s1.innerHTML=options(p1?.registrationId||'',p2?.registrationId||'');
    if(s2)s2.innerHTML=options(p2?.registrationId||'',p1?.registrationId||'');
    const a=card.querySelector('[data-p1-preview]'),b=card.querySelector('[data-p2-preview]');if(a)a.innerHTML=preview(p1,1);if(b)b.innerHTML=preview(p2,2);
    const st=card.querySelector('[data-player-status]');if(st)st.textContent=`Player 1: ${p1?.name||'não definido'} · Player 2: ${p2?.name||'não definido'}`;
  }
  function installCard(){
    const root=document.getElementById('list-sys');if(!root)return false;
    let card=document.getElementById('cosplay-player-assignment-card');if(card){refreshCard();return true;}
    card=document.createElement('div');card.id='cosplay-player-assignment-card';card.className='unit-card';card.innerHTML=`<b style="color:var(--accent,#00e5ff);font-size:10px">♟ PLAYERS DA PARTIDA</b><div style="font-size:9px;color:#999;margin:6px 0 10px">Players vindos do site ocupam a navbar e nunca entram no tabuleiro.</div><label style="display:grid;grid-template-columns:40px 1fr;gap:8px;align-items:center"><span data-p1-preview></span><span><small>PLAYER 1 · BRANCAS</small><select id="cosplay-runtime-player1" style="width:100%"></select></span></label><label style="display:grid;grid-template-columns:40px 1fr;gap:8px;align-items:center;margin-top:8px"><span data-p2-preview></span><span><small>PLAYER 2 · PRETAS</small><select id="cosplay-runtime-player2" style="width:100%"></select></span></label><div data-player-status style="font-size:8px;color:#aaa;margin-top:8px"></div>`;
    root.prepend(card);
    const choose=(n,id)=>{const p=(store?.g?.playerCandidates||[]).find(x=>x.registrationId===id);if(!p){refreshCard();return;}const p1=n===1?person(p,1):(store.g.registeredPlayer1||null);const p2=n===2?person(p,2):(store.g.registeredPlayer2||null);if(p1?.registrationId&&p2?.registrationId&&p1.registrationId===p2.registrationId){alert('Player 1 e Player 2 precisam ser pessoas diferentes.');refreshCard();return;}apply({player1:p1,player2:p2},true,'runtime');};
    card.querySelector('#cosplay-runtime-player1').addEventListener('change',e=>choose(1,e.target.value));
    card.querySelector('#cosplay-runtime-player2').addEventListener('change',e=>choose(2,e.target.value));
    refreshCard();return true;
  }

  function importPlayers(input){
    const file=input?.files?.[0];if(!file)return;
    const reader=new FileReader();reader.onload=()=>{try{
      const data=JSON.parse(String(reader.result||''));if(data?.type!=='cosplaychess-participants')return;
      if(!store.g)store.g={};store.g.playerCandidates=candidates(data);
      const players=playersFrom(data);
      const force=()=>{apply(players||{player1:null,player2:null},true,players?'predefined':'runtime');installCard();};
      force();setTimeout(force,120);setTimeout(force,450);setTimeout(force,1100);
      const p1=players?.player1?.name||'não definido',p2=players?.player2?.name||'não definido';
      console.info(`[CosplayChess] JSON → Navbar | P1: ${p1} | P2: ${p2}`);
    }catch(e){console.warn('[CosplayChess] Falha ao aplicar Players do JSON:',e);}};reader.readAsText(file,'utf-8');
  }

  window.addEventListener('change',e=>{const input=e.target;if(input instanceof HTMLInputElement&&input.id==='import-file'&&input.type==='file')importPlayers(input);},true);
  window.applyCosplayChessRegisteredPlayers=apply;
  window.restoreCosplayChessRegisteredPlayers=()=>{const p1=store?.g?.registeredPlayer1||null,p2=store?.g?.registeredPlayer2||null;if(p1||p2)apply({player1:p1,player2:p2},false,store?.g?.playerAssignmentMode||'saved');};
  window.refreshCosplayPlayerAssignment=refreshCard;
  const boot=()=>{installCard();setTimeout(installCard,400);setTimeout(installCard,1400);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();