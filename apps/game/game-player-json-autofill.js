(()=>{
  if(window.__cosplayGamePlayerJsonAutofillLoaded)return;
  window.__cosplayGamePlayerJsonAutofillLoaded=true;

  function text(value){return typeof value==='string'?value.trim():'';}

  function normalizePlayer(raw,number){
    if(!raw||typeof raw!=='object')return null;
    const name=text(raw.name||raw.nome||raw.fullName||raw.full_name);
    if(!name)return null;
    const photo=text(raw.photoDataUrl||raw.photo_data_url||raw.photo||raw.foto||raw.avatar||raw.image||raw.img);
    return{
      registrationId:text(raw.registrationId||raw.registration_id||raw.id),
      name,
      nick:text(raw.nick||raw.apelido),
      photo,
      player:number,
      side:number===1?'B':'P',
      sideName:number===1?'Brancas':'Pretas'
    };
  }

  function playersFromJson(data){
    if(!data||typeof data!=='object'||data.type!=='cosplaychess-participants')return null;
    const raw=data.gamePlayers;
    if(!raw||typeof raw!=='object')return null;
    const player1=normalizePlayer(raw.player1||raw.player_1||raw.p1,1);
    const player2=normalizePlayer(raw.player2||raw.player_2||raw.p2,2);
    if(!player1&&!player2)return null;
    return{player1,player2};
  }

  function applyName(side,name){
    const input=document.getElementById(`name-${side}`);
    if(input&&name){
      input.value=name;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function applyPlayers(players,persist=true){
    if(typeof store==='undefined'||!store||typeof store!=='object')return false;
    if(!store.g)store.g={};

    const p1=players?.player1||null;
    const p2=players?.player2||null;
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

    store.g.registeredPlayersImportedAt=new Date().toISOString();
    if(persist){try{save();}catch(_){}}
    try{updateUI();}catch(_){ }
    return true;
  }

  function restoreSavedPlayers(){
    if(typeof store==='undefined'||!store?.g)return;
    const p1=store.g.registeredPlayer1||null;
    const p2=store.g.registeredPlayer2||null;
    if(!p1&&!p2)return;
    applyPlayers({player1:p1,player2:p2},false);
  }

  function notify(players){
    const p1=players?.player1?.name||'não informado';
    const p2=players?.player2?.name||'não informado';
    const old=document.getElementById('player-json-autofill-toast');
    if(old)old.remove();
    const el=document.createElement('div');
    el.id='player-json-autofill-toast';
    el.innerHTML=`<b>PLAYERS DO EVENTO CARREGADOS</b><span>Player 1 · Brancas: ${escapeHtml(p1)}</span><span>Player 2 · Pretas: ${escapeHtml(p2)}</span>`;
    el.style.cssText='position:fixed;right:20px;bottom:82px;z-index:15050;display:grid;gap:4px;padding:12px 15px;border-radius:10px;background:#07191d;border:1px solid #00e5ff;color:white;box-shadow:0 14px 34px rgba(0,0,0,.55);font-size:10px;max-width:380px';
    el.querySelector('b').style.color='#00e5ff';
    el.querySelectorAll('span').forEach(s=>s.style.color='#d8e4e6');
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),5200);
  }

  function escapeHtml(value=''){
    return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function inspectImportFile(input){
    const file=input?.files?.[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(String(reader.result||''));
        const players=playersFromJson(data);
        if(!players)return;
        applyPlayers(players,true);
        notify(players);
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

  const restore=()=>{restoreSavedPlayers();setTimeout(restoreSavedPlayers,350);setTimeout(restoreSavedPlayers,1200);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});else restore();
})();
