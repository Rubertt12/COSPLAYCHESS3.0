(()=>{
  if(window.__cosplayResultCardControlsLoaded)return;
  window.__cosplayResultCardControlsLoaded=true;

  const cfg=window.COSPLAYCHESS_CONFIG;
  if(!cfg||!window.supabase)return;
  const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  let matchMap=new Map();

  async function isAdmin(){
    const {data:{session}}=await db.auth.getSession();
    if(!session)return false;
    const {data}=await db.from('cosplay_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
    return !!data;
  }

  async function fetchMatches(){
    const {data,error}=await db.from('cosplay_matches').select('id,published,collectible_enabled,source_result_id,ingest_source').order('played_at',{ascending:false});
    if(error)throw error;
    matchMap=new Map((data||[]).map(m=>[m.id,m]));
  }

  function sourceIsJson(match){
    return !!String(match?.source_result_id||'').trim();
  }

  function makeButton(match){
    const enabled=!!match.collectible_enabled;
    const button=document.createElement('button');
    button.type='button';
    button.className=`mini-btn ${enabled?'':'ghost'}`;
    button.dataset.toggleResultCard=match.id;
    button.textContent=enabled?'CARD ATIVO':'CARD DESATIVADO';
    button.title=enabled?'Ocultar o card colecionável do campeão':'Ativar o card colecionável do campeão';
    return button;
  }

  function decorate(){
    document.querySelectorAll('#adminMatches [data-edit-match]').forEach(edit=>{
      const id=edit.dataset.editMatch;
      const match=matchMap.get(id);
      const actions=edit.closest('.row-actions');
      if(!match||!actions||actions.querySelector(`[data-toggle-result-card="${id}"]`))return;

      if(sourceIsJson(match)){
        actions.insertBefore(makeButton(match),actions.querySelector('[data-delete-match]')||null);
      }else{
        const badge=document.createElement('span');
        badge.className='mini-btn ghost';
        badge.textContent='SEM JSON · CARD BLOQUEADO';
        badge.title='O card colecionável só pode ser ativado quando a partida possui resultado/JSON oficial.';
        badge.setAttribute('aria-disabled','true');
        actions.insertBefore(badge,actions.querySelector('[data-delete-match]')||null);
      }
    });
  }

  async function rebuildAutomaticAchievements(){
    const automaticNotes=['Desbloqueio automático pelo histórico de partidas.','Desbloqueio automático pelo histórico oficial de partidas.'];
    for(const note of automaticNotes){
      const {error}=await db.from('cosplay_cosplayer_achievements').delete().eq('note',note);
      if(error)throw error;
    }

    const [{data:rows,error:rErr},{data:achs,error:aErr}]=await Promise.all([
      db.from('cosplay_match_players')
        .select('match_id,registration_id,cosplayer_name,character_name,kills,survived,winner,cosplay_matches!inner(published,source_result_id)')
        .eq('cosplay_matches.published',true)
        .not('cosplay_matches.source_result_id','is',null),
      db.from('cosplay_achievements').select('id,slug')
    ]);
    if(rErr)throw rErr;
    if(aErr)throw aErr;

    const achMap=new Map((achs||[]).map(a=>[a.slug,a.id]));
    const people=new Map();
    for(const row of rows||[]){
      const key=row.registration_id?`id:${row.registration_id}`:`name:${String(row.cosplayer_name||'').trim().toLowerCase()}`;
      if(!people.has(key))people.set(key,{registrationId:row.registration_id||null,name:row.cosplayer_name,character:row.character_name,matches:new Set(),kills:0,survivals:0,wins:0});
      const p=people.get(key);
      p.matches.add(row.match_id);
      p.kills+=Number(row.kills)||0;
      p.survivals+=row.survived?1:0;
      p.wins+=row.winner?1:0;
      p.character=row.character_name||p.character;
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
          registration_id:p.registrationId,
          cosplayer_name:p.name,
          character_name:p.character||'',
          note:'Desbloqueio automático pelo histórico oficial de partidas.'
        });
        if(error&&error.code!=='23505')throw error;
      }
    }
  }

  async function toggleCard(id,button){
    const match=matchMap.get(id);
    if(!match||!sourceIsJson(match))return;
    const next=!match.collectible_enabled;
    button.disabled=true;
    button.textContent=next?'ATIVANDO...':'DESATIVANDO...';
    try{
      const {error}=await db.from('cosplay_matches').update({collectible_enabled:next,updated_at:new Date().toISOString()}).eq('id',id);
      if(error)throw error;
      match.collectible_enabled=next;
      button.className=`mini-btn ${next?'':'ghost'}`;
      button.textContent=next?'CARD ATIVO':'CARD DESATIVADO';
      button.title=next?'Ocultar o card colecionável do campeão':'Ativar o card colecionável do campeão';
    }catch(error){
      alert(error.message||'Não foi possível alterar o card.');
      button.textContent=match.collectible_enabled?'CARD ATIVO':'CARD DESATIVADO';
    }finally{
      button.disabled=false;
    }
  }

  async function deleteMatchAndDerived(id){
    const match=matchMap.get(id);
    if(!match)return;
    if(!confirm('Excluir os dados deste resultado/JSON do site?\n\nO card, o ranking, movimentos e dados derivados desta partida deixarão de aparecer.'))return;
    const {error}=await db.from('cosplay_matches').delete().eq('id',id);
    if(error)throw error;
    matchMap.delete(id);
    await rebuildAutomaticAchievements();
    location.reload();
  }

  document.addEventListener('click',event=>{
    const toggle=event.target.closest?.('[data-toggle-result-card]');
    if(toggle){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      toggleCard(toggle.dataset.toggleResultCard,toggle);
      return;
    }
    const del=event.target.closest?.('#adminMatches [data-delete-match]');
    if(del){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      deleteMatchAndDerived(del.dataset.deleteMatch).catch(error=>alert(error.message||'Não foi possível excluir o resultado.'));
    }
  },true);

  async function init(){
    if(!await isAdmin())return;
    await fetchMatches();
    decorate();
    const root=document.getElementById('adminMatches');
    if(root)new MutationObserver(()=>decorate()).observe(root,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error),{once:true});
  else init().catch(console.error);
})();
