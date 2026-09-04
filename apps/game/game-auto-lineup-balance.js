(()=>{
  if(window.__cosplayBalancedAutoLineupLoaded)return;
  window.__cosplayBalancedAutoLineupLoaded=true;

  const TYPE_LABEL={P:'PEÃO',T:'TORRE',C:'CAVALO',B:'BISPO',Q:'RAINHA',K:'REI'};
  const FREE_TYPE_PRIORITY=['K','Q','T','B','C','P'];
  const FORMATIONS={
    20:{
      backRank:[null,null,'C1','Q1','K1','C2',null,null],
      pawns:[null,'P2','P3','P4','P5','P6','P7',null]
    },
    24:{
      backRank:[null,'T1','C1','Q1','K1','C2','T2',null],
      pawns:[null,'P2','P3','P4','P5','P6','P7',null]
    },
    32:{
      backRank:['T1','C1','B1','Q1','K1','B2','C2','T2'],
      pawns:['P1','P2','P3','P4','P5','P6','P7','P8']
    }
  };

  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function roster(){
    try{return Array.isArray(store?.g?.roster)?store.g.roster:[];}catch{return[];}
  }

  function assignedPlayerIds(){
    const ids=new Set();
    const sources=[store?.g?.registeredPlayer1,store?.g?.registeredPlayer2,store?.g?.predefinedPlayers?.player1,store?.g?.predefinedPlayers?.player2];
    sources.forEach(person=>{
      const id=person?.registrationId||person?.id;
      if(id)ids.add(String(id));
    });
    return ids;
  }

  function pieceRoster(){
    const playerIds=assignedPlayerIds();
    return roster().filter(person=>{
      const id=person?.id||person?.registrationId;
      const role=norm(person?.gameRole||person?.game_role);
      if(role==='player1'||role==='player2')return false;
      return !id||!playerIds.has(String(id));
    });
  }

  function isNoPreference(value){
    const v=norm(value);
    return !v||v==='sem preferencia'||v==='sem preferencia de peca'||v==='qualquer'||v==='qualquer peca'||v==='indiferente';
  }

  function pieceType(value){
    const v=norm(value);
    if(!v||isNoPreference(v))return'';
    if(/\b(peao|peoes|infantaria|pawn|p)\b/.test(v)||v.startsWith('pe'))return'P';
    if(/\b(torre|torres|rook|t)\b/.test(v)||v.startsWith('to'))return'T';
    if(/\b(cavalo|cavalaria|cavalos|knight|horse|c)\b/.test(v)||v.startsWith('ca'))return'C';
    if(/\b(bispo|bispos|bishop|b)\b/.test(v)||v.startsWith('bi'))return'B';
    if(/\b(rainha|dama|queen|q)\b/.test(v)||v.startsWith('ra')||v.startsWith('da'))return'Q';
    if(/\b(rei|king|k)\b/.test(v)||v.startsWith('re'))return'K';
    return'';
  }

  function preferredSide(value){
    const v=norm(value);
    if(!v||isNoPreference(v))return'';
    if(v.includes('branc')||v==='b'||v==='white')return'B';
    if(v.includes('pret')||v==='p'||v==='black')return'P';
    return'';
  }

  function sideOf(pieceId){return String(pieceId||'').endsWith('_B')?'B':String(pieceId||'').endsWith('_P')?'P':'';}
  function typeOf(pieceId){return String(pieceId||'').charAt(0);}
  function baseOf(pieceId){return String(pieceId||'').replace(/_[BP]$/,'');}
  function opposite(side){return side==='B'?'P':'B';}

  function allPieceIds(){
    try{if(typeof getInitialBoard==='function')return getInitialBoard().filter(Boolean);}catch{}
    return[
      'T1_P','C1_P','B1_P','Q1_P','K1_P','B2_P','C2_P','T2_P',
      'P1_P','P2_P','P3_P','P4_P','P5_P','P6_P','P7_P','P8_P',
      'P1_B','P2_B','P3_B','P4_B','P5_B','P6_B','P7_B','P8_B',
      'T1_B','C1_B','B1_B','Q1_B','K1_B','B2_B','C2_B','T2_B'
    ];
  }

  function configuredPieceLimit(capacity){
    let raw=null;
    try{
      raw=store?.g?.rosterEvent?.pieceLimit
        ?? store?.g?.rosterEvent?.maxParticipants
        ?? store?.g?.rosterEvent?.max_participants
        ?? store?.g?.configuredPieceLimit
        ?? store?.g?.layoutPieceCount
        ?? null;
    }catch{}
    const number=Math.floor(Number(raw));
    if(!Number.isFinite(number)||number<=0)return capacity;
    return Math.min(capacity,number);
  }

  function formationCount(limit){
    const n=Math.floor(Number(limit));
    if(n<=20)return 20;
    if(n<=24)return 24;
    return 32;
  }

  function buildFormationBoard(limit){
    const count=formationCount(limit);
    const spec=FORMATIONS[count];
    const rowFor=(ids,side)=>ids.map(id=>id?`${id}_${side}`:null);
    return[
      ...rowFor(spec.backRank,'P'),
      ...rowFor(spec.pawns,'P'),
      ...Array(32).fill(null),
      ...rowFor(spec.pawns,'B'),
      ...rowFor(spec.backRank,'B')
    ];
  }

  function balancedTargets(total,pieceIds){
    const capacity={B:pieceIds.filter(id=>sideOf(id)==='B').length,P:pieceIds.filter(id=>sideOf(id)==='P').length};
    let B=Math.ceil(total/2),P=Math.floor(total/2);
    if(B>capacity.B){const overflow=B-capacity.B;B=capacity.B;P+=overflow;}
    if(P>capacity.P){const overflow=P-capacity.P;P=capacity.P;B+=overflow;}
    B=Math.min(B,capacity.B);P=Math.min(P,capacity.P);
    return{B,P,capacity};
  }

  function participantMusic(person){
    const music=person?.music&&typeof person.music==='object'?person.music:{};
    return{
      url:person?.musicFileUrl||music.fileUrl||person?.musicUrl||music.url||'',
      name:person?.musicName||music.name||''
    };
  }

  function resetPieceAudio(id){
    try{
      if(typeof stopPiecePlayback==='function')stopPiecePlayback(id,false);
      if(typeof pieceSoundAudios!=='undefined'&&pieceSoundAudios[id]){
        try{pieceSoundAudios[id].pause();}catch{}
        delete pieceSoundAudios[id];
      }
    }catch{}
  }

  function clearManagedAssignment(pieceId){
    if(!store.p)store.p={};
    if(!store.p[pieceId])store.p[pieceId]={};
    const piece=store.p[pieceId];
    if(piece.rosterManagedName)delete piece.name;
    if(piece.rosterManagedImg)delete piece.img;
    if(piece.rosterManagedPhotoCrop)delete piece.photoCrop;
    if(piece.rosterManagedSound){delete piece.sound;delete piece.soundName;delete piece.soundSource;resetPieceAudio(pieceId);}
    delete piece.participantId;
    delete piece.participant;
    delete piece.participantRealName;
    delete piece.rosterManagedName;
    delete piece.rosterManagedImg;
    delete piece.rosterManagedPhotoCrop;
    delete piece.rosterManagedSound;
    delete piece.autoLineupReason;
  }

  function assignToPiece(pieceId,person,reason){
    if(!store.p)store.p={};
    if(!store.p[pieceId])store.p[pieceId]={};
    const target=store.p[pieceId];
    const character=String(person.character||person.name||TYPE_LABEL[typeOf(pieceId)]||pieceId).trim();
    target.name=character;
    target.participantRealName=person.name||'';
    target.participantId=person.id||person.registrationId||'';
    target.participant={...person};
    target.rosterManagedName=true;
    target.autoLineupReason=reason;

    if(person.photo){
      target.img=person.photo;
      target.rosterManagedImg=true;
      target.photoCrop=typeof window.normalizePiecePhotoCrop==='function'
        ?window.normalizePiecePhotoCrop(person.photoCrop)
        :(person.photoCrop?{...person.photoCrop}:{x:50,y:50,zoom:1});
      target.rosterManagedPhotoCrop=true;
    }else{
      delete target.img;
      delete target.rosterManagedImg;
      if(target.rosterManagedPhotoCrop)delete target.photoCrop;
      delete target.rosterManagedPhotoCrop;
    }

    const music=participantMusic(person);
    if(music.url){
      target.sound=music.url;
      target.soundName=music.name||'Música da inscrição';
      target.soundSource='registration';
      target.rosterManagedSound=true;
      resetPieceAudio(pieceId);
    }else{
      delete target.sound;
      delete target.soundName;
      delete target.soundSource;
      delete target.rosterManagedSound;
      resetPieceAudio(pieceId);
    }
    if(target.volume===undefined)target.volume=.8;
  }

  function mirrorBonus(id,assignments){
    const side=sideOf(id);
    const mirror=`${baseOf(id)}_${opposite(side)}`;
    return assignments.some(item=>item.pieceId===mirror)?1:0;
  }

  function chooseTyped(person,available,type,counts,targets,typeCounts,assignments){
    const candidates=available.filter(id=>typeOf(id)===type&&counts[sideOf(id)]<targets[sideOf(id)]);
    if(!candidates.length)return'';
    const wanted=preferredSide(person.team);
    return [...candidates].sort((a,b)=>scoreTyped(b)-scoreTyped(a)||a.localeCompare(b))[0];

    function scoreTyped(id){
      const side=sideOf(id),other=opposite(side);
      const sideDeficit=targets[side]-counts[side];
      const mirrorTypeDeficit=(typeCounts[other][type]||0)-(typeCounts[side][type]||0);
      const mirrored=mirrorBonus(id,assignments);
      const sideMatch=wanted===side?1:0;
      return sideDeficit*1000+mirrored*180+mirrorTypeDeficit*30+sideMatch*5;
    }
  }

  function chooseFree(person,available,counts,targets,typeCounts,assignments){
    const candidates=available.filter(id=>counts[sideOf(id)]<targets[sideOf(id)]);
    if(!candidates.length)return'';
    const wanted=preferredSide(person.team);
    return [...candidates].sort((a,b)=>scoreFree(b)-scoreFree(a)||a.localeCompare(b))[0];

    function scoreFree(id){
      const side=sideOf(id),other=opposite(side),type=typeOf(id);
      const sideDeficit=targets[side]-counts[side];
      const mirrorTypeDeficit=(typeCounts[other][type]||0)-(typeCounts[side][type]||0);
      const mirrored=mirrorBonus(id,assignments);
      const sideMatch=wanted===side?1:0;
      const priority=Math.max(0,FREE_TYPE_PRIORITY.length-FREE_TYPE_PRIORITY.indexOf(type));
      return sideDeficit*10000+mirrored*700+mirrorTypeDeficit*60+sideMatch*10+priority;
    }
  }

  function showNotice(message,error=false){
    document.getElementById('balanced-lineup-toast')?.remove();
    const el=document.createElement('div');
    el.id='balanced-lineup-toast';
    el.textContent=message;
    el.style.cssText=`position:fixed;right:20px;bottom:20px;z-index:19050;padding:12px 16px;border-radius:10px;background:${error?'#351018':'#071f23'};border:1px solid ${error?'#ff4f77':'#00e5ff'};color:white;font-size:11px;box-shadow:0 16px 40px rgba(0,0,0,.6);max-width:470px;`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),5200);
  }

  function showResult(summary,assignments){
    document.getElementById('auto-lineup-result')?.remove();
    const modal=document.createElement('div');
    modal.id='auto-lineup-result';
    modal.style.cssText='position:fixed;inset:0;z-index:18500;background:rgba(0,0,0,.88);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:18px;';
    const rows=assignments.map(item=>{
      const character=item.person.character||item.person.name;
      const side=sideOf(item.pieceId)==='B'?'Brancas':'Pretas';
      const reason=item.reason==='first'?'1ª opção':item.reason==='second'?'2ª opção':item.reason==='king'?'rei obrigatório':'balanceamento';
      return `<div class="al-result-row"><span><strong>${esc(character)}</strong>${item.person.name&&item.person.name!==character?`<small>${esc(item.person.name)}</small>`:''}</span><span>${esc(TYPE_LABEL[typeOf(item.pieceId)]||item.pieceId)} · ${side}</span><em>${reason}</em></div>`;
    }).join('');
    const overflow=summary.overflow.length
      ?`<div class="al-result-warning"><strong>${summary.overflow.length} fora do tabuleiro</strong><span>O formato deste evento aceita até ${summary.configuredLimit} peças. ${summary.overflow.map(p=>esc(p.character||p.name)).join(', ')}</span></div>`
      :'<div class="al-result-ok">✓ Todos os inscritos couberam no formato configurado.</div>';
    modal.innerHTML=`<div class="al-result-panel"><div class="al-result-head"><div><span>JSON BALANCEADO · FORMAÇÃO ${summary.formationCount}</span><h2>Elenco distribuído no layout oficial do tabuleiro</h2></div><button data-close>×</button></div><div class="al-kpis"><div><b>${summary.assigned}</b><span>ESCALADOS</span></div><div><b>${summary.white}</b><span>BRANCAS</span></div><div><b>${summary.black}</b><span>PRETAS</span></div><div><b>${Math.abs(summary.white-summary.black)}</b><span>DIFERENÇA</span></div></div>${overflow}<div class="al-result-list">${rows}</div><div class="al-result-actions"><button data-close class="al-secondary">REVISAR MANUALMENTE</button><button id="al-result-start" class="al-primary">INICIAR BATALHA</button></div></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>modal.remove()));
    modal.addEventListener('click',event=>{if(event.target===modal)modal.remove();});
    modal.querySelector('#al-result-start')?.addEventListener('click',()=>{modal.remove();try{if(typeof startBattle==='function')startBattle();}catch{}});
  }

  function buildBalancedLineup(){
    const people=pieceRoster();
    if(!people.length){showNotice('Importe primeiro o JSON exportado pelo site.',true);return;}
    if(typeof store==='undefined'||!store){showNotice('O jogo ainda não terminou de carregar.',true);return;}

    const everyPieceId=allPieceIds();
    const boardCapacity=everyPieceId.length;
    const configuredLimit=configuredPieceLimit(boardCapacity);
    const selectedFormation=formationCount(configuredLimit);
    const formationBoard=buildFormationBoard(selectedFormation);
    const pieceIds=formationBoard.filter(Boolean);
    const total=Math.min(people.length,configuredLimit,pieceIds.length);
    const targets=balancedTargets(total,pieceIds);

    everyPieceId.forEach(clearManagedAssignment);
    store.board=formationBoard.slice();
    if(Array.isArray(store.graveyard))store.graveyard=[];
    if(!store.g)store.g={};
    store.g.killsB=0;
    store.g.killsP=0;
    store.g.lastMove={from:null,to:null};
    store.g.enPassant=null;
    store.g.hasMoved={B:{K:false,Rk:false,Rq:false},P:{K:false,Rk:false,Rq:false}};
    store.g.configuredPieceLimit=configuredLimit;
    store.g.layoutPieceCount=selectedFormation;
    store.g.appliedLayout=selectedFormation;

    let available=[...pieceIds];
    const assignments=[];
    const pending=people.map((person,index)=>({person,index,assigned:false}));
    const counts={B:0,P:0};
    const typeCounts={B:{P:0,T:0,C:0,B:0,Q:0,K:0},P:{P:0,T:0,C:0,B:0,Q:0,K:0}};

    function take(entry,pieceId,reason){
      if(!pieceId||assignments.length>=total)return false;
      assignToPiece(pieceId,entry.person,reason);
      assignments.push({person:entry.person,pieceId,reason});
      available=available.filter(id=>id!==pieceId);
      entry.assigned=true;
      const side=sideOf(pieceId),type=typeOf(pieceId);
      counts[side]+=1;
      typeCounts[side][type]=(typeCounts[side][type]||0)+1;
      return true;
    }

    // 1ª preferência, mas somente entre as peças que existem na formação escolhida.
    pending.forEach(entry=>{
      if(assignments.length>=total)return;
      const type=pieceType(entry.person.preferredPiece);
      if(type)take(entry,chooseTyped(entry.person,available,type,counts,targets,typeCounts,assignments),'first');
    });

    // 2ª preferência.
    pending.forEach(entry=>{
      if(entry.assigned||assignments.length>=total)return;
      const type=pieceType(entry.person.secondPreferredPiece);
      if(type)take(entry,chooseTyped(entry.person,available,type,counts,targets,typeCounts,assignments),'second');
    });

    // Completa a formação priorizando espelhamento e equilíbrio entre os lados.
    pending.forEach(entry=>{
      if(entry.assigned||assignments.length>=total)return;
      take(entry,chooseFree(entry.person,available,counts,targets,typeCounts,assignments),'free');
    });

    // Mantém um Rei em cada lado ativo sem quebrar o layout centralizado.
    ['B','P'].forEach(side=>{
      if(targets[side]<=0)return;
      const kingId=pieceIds.find(id=>sideOf(id)===side&&typeOf(id)==='K');
      if(!kingId||assignments.some(item=>item.pieceId===kingId))return;
      const candidates=assignments
        .filter(item=>sideOf(item.pieceId)===side&&typeOf(item.pieceId)!=='K')
        .sort((a,b)=>({free:0,second:1,first:2,king:3}[a.reason]??4)-({free:0,second:1,first:2,king:3}[b.reason]??4));
      const replacement=candidates[0];
      if(!replacement)return;
      const oldId=replacement.pieceId;
      const oldType=typeOf(oldId);
      clearManagedAssignment(oldId);
      assignToPiece(kingId,replacement.person,'king');
      available=available.filter(id=>id!==kingId);
      if(!available.includes(oldId))available.push(oldId);
      typeCounts[side][oldType]=Math.max(0,(typeCounts[side][oldType]||0)-1);
      typeCounts[side].K=(typeCounts[side].K||0)+1;
      replacement.pieceId=kingId;
      replacement.reason='king';
    });

    // Mantém as coordenadas da formação oficial e apenas esvazia slots sem participante.
    const activePieceIds=new Set(assignments.map(item=>item.pieceId));
    store.board=formationBoard.map(id=>id&&activePieceIds.has(id)?id:null);

    const overflow=pending.filter(entry=>!entry.assigned).map(entry=>entry.person);
    const summary={
      total:people.length,
      capacity:configuredLimit,
      boardCapacity,
      configuredLimit,
      formationCount:selectedFormation,
      assigned:assignments.length,
      first:assignments.filter(a=>a.reason==='first').length,
      second:assignments.filter(a=>a.reason==='second').length,
      free:assignments.filter(a=>a.reason==='free').length,
      king:assignments.filter(a=>a.reason==='king').length,
      white:counts.B,
      black:counts.P,
      targets:{B:targets.B,P:targets.P},
      overflow
    };

    store.g.autoLineupLastRun=new Date().toISOString();
    store.g.autoLineupSummary={
      total:summary.total,
      capacity:summary.capacity,
      boardCapacity:summary.boardCapacity,
      configuredLimit:summary.configuredLimit,
      formationCount:summary.formationCount,
      assigned:summary.assigned,
      first:summary.first,
      second:summary.second,
      free:summary.free,
      king:summary.king,
      white:summary.white,
      black:summary.black,
      balanced:Math.abs(summary.white-summary.black)<=1,
      overflow:overflow.map(p=>({id:p.id,name:p.name,character:p.character}))
    };

    try{save();}catch{}
    try{renderBoard();renderGraveyard();updateUI();}catch{}
    try{if(typeof renderConfigLists==='function')renderConfigLists();}catch{}
    try{window.refreshCosplayAutoLineup?.();}catch{}
    showResult(summary,assignments);
  }

  window.buildCosplayFormationBoard=count=>buildFormationBoard(count).slice();
  window.buildCosplayBalancedAutomaticLineup=buildBalancedLineup;

  document.addEventListener('click',event=>{
    const trigger=event.target?.closest?.('.al-trigger,.al-main-trigger');
    if(!trigger||trigger.disabled)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    buildBalancedLineup();
  },true);

  let attempts=0;
  const installOverride=()=>{
    attempts+=1;
    if(typeof window.buildCosplayAutomaticLineup==='function'){
      if(!window.__cosplayOriginalAutomaticLineup)window.__cosplayOriginalAutomaticLineup=window.buildCosplayAutomaticLineup;
      window.buildCosplayAutomaticLineup=buildBalancedLineup;
      return;
    }
    if(attempts<80)setTimeout(installOverride,100);
  };
  installOverride();
})();
