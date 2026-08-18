(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;
  if(!cfg||!window.supabase)return;

  const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const q=id=>document.getElementById(id);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let staged=null;

  function setStatus(text,type=''){
    const el=q('resultImportStatus');
    if(!el)return;
    el.className=`form-status ${type}`;
    el.textContent=text;
  }

  function isResult(data){
    return !!(data&&typeof data==='object'&&data.type==='cosplaychess-result'&&Number(data.version)>=1&&data.matchId&&data.event?.id&&Array.isArray(data.participants));
  }

  function playerName(data,n){
    return data?.players?.[`player${n}`]?.name?.trim()||`Jogador ${n}`;
  }

  function winnerLabel(data){
    if(data.winner?.side==='DRAW')return 'Empate';
    const n=Number(data.winner?.player);
    return n===1||n===2?`Player ${n} · ${playerName(data,n)}`:'Vencedor não identificado';
  }

  function sideName(side){return side==='B'?'Brancas':side==='P'?'Pretas':'Empate';}

  async function requireAdmin(){
    const {data:{session}}=await db.auth.getSession();
    if(!session)throw new Error('Sua sessão administrativa expirou. Entre novamente.');
    const {data:admin,error}=await db.from('cosplay_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
    if(error||!admin)throw new Error('Apenas administradores podem importar resultados.');
    return session;
  }

  async function inspectResult(data,fileName){
    await requireAdmin();
    if(!isResult(data))throw new Error('Este arquivo não é um resultado oficial do CosplayChess.');

    if(data.winner?.side!=='DRAW'&&![1,2].includes(Number(data.winner?.player))){
      throw new Error('O JSON não informa corretamente se o vencedor foi o Player 1 ou Player 2.');
    }

    const {data:duplicate,error:dupErr}=await db.from('cosplay_matches').select('id,match_label,played_at').eq('source_result_id',data.matchId).maybeSingle();
    if(dupErr)throw dupErr;
    if(duplicate)throw new Error('Este resultado já foi processado anteriormente. O ranking não será duplicado.');

    const {data:event,error:eventErr}=await db.from('cosplay_events').select('id,title,start_at,venue,city').eq('id',data.event.id).maybeSingle();
    if(eventErr)throw eventErr;
    if(!event)throw new Error('O evento deste JSON não foi encontrado no site. Use o resultado gerado a partir do JSON exportado por este painel.');

    const {data:regs,error:regErr}=await db.from('cosplay_registrations')
      .select('id,event_id,full_name,character_name,character_photo_url,status')
      .eq('event_id',event.id)
      .neq('status','cancelled');
    if(regErr)throw regErr;

    const regMap=new Map((regs||[]).map(r=>[String(r.id),r]));
    const ids=new Set();
    const duplicateParticipants=[];
    const unknown=[];
    const recognized=[];

    for(const p of data.participants){
      const id=String(p.registrationId||'');
      if(!id){unknown.push(p);continue;}
      if(ids.has(id)){duplicateParticipants.push(p);continue;}
      ids.add(id);
      const reg=regMap.get(id);
      if(!reg)unknown.push(p);else recognized.push({participant:p,registration:reg});
    }

    if(duplicateParticipants.length)throw new Error('O arquivo possui participante duplicado. Exporte o resultado novamente pelo jogo.');

    staged={data,fileName,event,recognized,unknown};
    renderPreview(staged);
    return staged;
  }

  function renderPreview(info){
    const root=q('resultImportPreview');
    const confirm=q('confirmResultImportBtn');
    if(!root||!confirm)return;

    const d=info.data;
    const winner=d.winner?.side==='DRAW'?null:Number(d.winner?.player);
    const other=winner===1?2:winner===2?1:null;
    const p1=playerName(d,1),p2=playerName(d,2);
    const finished=d.match?.finishedAt||d.exportedAt;
    const when=finished?new Date(finished).toLocaleString('pt-BR'):'—';
    const warning=info.unknown.length
      ? `<div class="result-import-warning"><b>⚠ ${info.unknown.length} participante(s) não reconhecido(s)</b><span>${info.unknown.map(x=>esc(x.character||x.name||'Sem identificação')).join(', ')}</span><small>A publicação fica bloqueada para evitar ranking incorreto. Gere o resultado usando o mesmo JSON de inscrições deste evento.</small></div>`
      : '<div class="result-import-ok">✓ Todos os participantes do resultado foram reconhecidos pelo ID da inscrição.</div>';

    root.hidden=false;
    root.innerHTML=`
      <div class="result-preview-head">
        <div><span>ARQUIVO VALIDADO</span><h3>${esc(info.event.title)}</h3><small>${esc(info.fileName||'resultado.json')} · ${esc(d.matchId)}</small></div>
        <div class="result-winner-chip">${d.winner?.side==='DRAW'?'EMPATE':`🏆 PLAYER ${winner}`}</div>
      </div>
      <div class="result-preview-grid">
        <div><span>PLAYER 1 · BRANCAS</span><b>${esc(p1)}</b></div>
        <div><span>PLAYER 2 · PRETAS</span><b>${esc(p2)}</b></div>
        <div><span>RESULTADO</span><b>${esc(winnerLabel(d))}</b></div>
        <div><span>FINALIZADA EM</span><b>${esc(when)}</b></div>
        <div><span>NO TABULEIRO</span><b>${info.recognized.length}</b></div>
        <div><span>CAPTURAS</span><b>${Number(d.totals?.player1Captures)||0} × ${Number(d.totals?.player2Captures)||0}</b></div>
      </div>
      ${warning}
      <div class="result-import-achievements">
        <b>🏅 O que será atualizado</b>
        <span>Ranking de todos os participantes · vitória para todo o lado do Player ${winner||'—'} · Hall da Fama da partida · conquistas automáticas.</span>
        <small>Quem estiver entrando na primeira partida oficial desbloqueia <strong>♟️ Primeiro Movimento</strong>.</small>
      </div>
      ${other?`<div class="result-import-versus"><span>PLAYER ${winner}<b>${esc(playerName(d,winner))}</b><em>${esc(sideName(d.winner.side))} · vencedor</em></span><i>VS</i><span>PLAYER ${other}<b>${esc(playerName(d,other))}</b><em>${other===1?'Brancas':'Pretas'}</em></span></div>`:''}`;

    confirm.disabled=info.unknown.length>0;
    confirm.textContent=info.unknown.length?'CORRIGIR ARQUIVO ANTES DE PUBLICAR':'CONFIRMAR E ATUALIZAR O SITE';
    setStatus(info.unknown.length?'O arquivo foi lido, mas há participantes que não correspondem às inscrições deste evento.':'Resultado pronto para confirmação.',info.unknown.length?'error':'success');
  }

  async function syncAchievements(){
    const [{data:rows,error:rErr},{data:achs,error:aErr}]=await Promise.all([
      db.from('cosplay_match_players').select('match_id,cosplayer_name,character_name,kills,died,survived,winner'),
      db.from('cosplay_achievements').select('id,slug')
    ]);
    if(rErr)throw rErr;
    if(aErr)throw aErr;

    const achMap=new Map((achs||[]).map(a=>[a.slug,a.id]));
    const people=new Map();
    for(const r of rows||[]){
      const key=(r.cosplayer_name||'').trim().toLowerCase();
      if(!key)continue;
      if(!people.has(key))people.set(key,{name:r.cosplayer_name,character:r.character_name,matches:new Set(),kills:0,survivals:0,wins:0});
      const p=people.get(key);
      p.matches.add(r.match_id);
      p.kills+=Number(r.kills)||0;
      p.survivals+=r.survived?1:0;
      p.wins+=r.winner?1:0;
      p.character=r.character_name||p.character;
    }

    for(const p of people.values()){
      const unlocked=[];
      if(p.matches.size>=1)unlocked.push('primeira-partida');
      if(p.kills>=1)unlocked.push('primeira-captura');
      if(p.kills>=5)unlocked.push('cacador');
      if(p.survivals>=3)unlocked.push('sobrevivente');
      if(p.matches.size>=5)unlocked.push('veterano');
      if(p.wins>=1)unlocked.push('campeao');
      if(p.survivals>=5)unlocked.push('imortal');

      for(const slug of unlocked){
        const achievementId=achMap.get(slug);
        if(!achievementId)continue;
        const {error}=await db.from('cosplay_cosplayer_achievements').insert({
          achievement_id:achievementId,
          event_id:null,
          cosplayer_name:p.name,
          character_name:p.character||'',
          note:'Desbloqueio automático pelo histórico de partidas.'
        });
        if(error&&error.code!=='23505')throw error;
      }
    }
  }

  async function confirmImport(){
    if(!staged)return;
    const button=q('confirmResultImportBtn');
    const published=q('resultImportPublished')?.checked!==false;
    button.disabled=true;
    setStatus('Validando novamente e gravando o resultado...');
    let saved=null;

    try{
      await requireAdmin();
      const d=staged.data;
      const {data:duplicate,error:dupErr}=await db.from('cosplay_matches').select('id').eq('source_result_id',d.matchId).maybeSingle();
      if(dupErr)throw dupErr;
      if(duplicate)throw new Error('Este resultado já foi processado. Nenhum ponto foi duplicado.');

      const winnerNumber=d.winner?.side==='DRAW'?null:Number(d.winner.player);
      const opponentNumber=winnerNumber===1?2:winnerNumber===2?1:null;
      const winnerName=winnerNumber?playerName(d,winnerNumber):'Empate';
      const opponentName=opponentNumber?playerName(d,opponentNumber):'Empate';
      const playedAt=d.match?.finishedAt||d.exportedAt||new Date().toISOString();

      const matchPayload={
        event_id:staged.event.id,
        match_label:d.match?.label||'Partida oficial',
        played_at:playedAt,
        winner_character:winnerNumber?`PLAYER ${winnerNumber}`:'EMPATE',
        winner_cosplayer:winnerName,
        opponent_character:opponentNumber?`PLAYER ${opponentNumber}`:'EMPATE',
        opponent_cosplayer:opponentName,
        winner_photo_url:null,
        opponent_photo_url:null,
        notes:`Resultado importado automaticamente do CosplayChess. ${winnerNumber?`Player ${winnerNumber} (${winnerName}) venceu pelo lado ${sideName(d.winner.side)}.`:'A partida terminou empatada.'} ID: ${d.matchId}`,
        published,
        source_result_id:d.matchId,
        winner_player:winnerNumber,
        winner_side:d.winner?.side||'DRAW',
        player1_name:playerName(d,1),
        player2_name:playerName(d,2),
        result_version:Number(d.version)||1,
        updated_at:new Date().toISOString()
      };

      const {data:match,error:matchErr}=await db.from('cosplay_matches').insert(matchPayload).select().single();
      if(matchErr)throw matchErr;
      saved=match;

      const players=staged.recognized.map(({participant:p,registration:r})=>({
        match_id:match.id,
        registration_id:r.id,
        cosplayer_name:r.full_name||p.name||'',
        character_name:p.character||r.character_name||'',
        piece_type:p.pieceType||p.pieceId?.charAt(0)||'',
        side:p.side||'',
        kills:Math.max(0,Number(p.captures)||0),
        died:!!p.died,
        survived:p.survived!==false&&!p.died,
        winner:d.winner?.side!=='DRAW'&&Number(p.player)===winnerNumber,
        photo_url:r.character_photo_url||null,
        player_number:[1,2].includes(Number(p.player))?Number(p.player):(p.side==='B'?1:p.side==='P'?2:null),
        piece_id:p.pieceId||null,
        moves:Math.max(0,Number(p.moves)||0)
      }));

      if(players.length){
        const {error:playersErr}=await db.from('cosplay_match_players').insert(players);
        if(playersErr)throw playersErr;
      }

      await syncAchievements();
      setStatus('Resultado publicado! Ranking, Hall da Fama e conquistas foram atualizados.','success');
      button.textContent='✓ RESULTADO PROCESSADO';
      q('resultImportInput').value='';
      setTimeout(()=>location.reload(),1400);
    }catch(error){
      if(saved?.id){
        try{await db.from('cosplay_matches').delete().eq('id',saved.id);}catch(_){ }
      }
      setStatus(error.message||'Não foi possível processar o resultado.','error');
      button.disabled=false;
    }
  }

  async function readFile(file){
    staged=null;
    q('resultImportPreview').hidden=true;
    q('confirmResultImportBtn').disabled=true;
    setStatus('Lendo e conferindo o arquivo...');
    try{
      const raw=await file.text();
      const data=JSON.parse(raw);
      await inspectResult(data,file.name);
    }catch(error){
      setStatus(error.message||'JSON inválido.','error');
    }
  }

  function init(){
    const input=q('resultImportInput');
    const choose=q('chooseResultImportBtn');
    const confirm=q('confirmResultImportBtn');
    if(!input||!choose||!confirm)return;
    choose.addEventListener('click',()=>input.click());
    input.addEventListener('change',()=>{const file=input.files?.[0];if(file)readFile(file);});
    confirm.addEventListener('click',confirmImport);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();