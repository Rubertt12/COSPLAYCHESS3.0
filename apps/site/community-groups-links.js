(() => {
  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;
  if(!db)return;
  let groups=[];
  const normalize=v=>String(v||'').trim().toLowerCase();
  const enhance=()=>{
    document.querySelectorAll('.community-group-card').forEach(card=>{
      if(card.dataset.groupLinkReady)return;
      const name=card.querySelector('.community-group-topline b')?.textContent||'';
      const category=card.querySelector('.community-group-category')?.textContent||'';
      const group=groups.find(g=>normalize(g.name)===normalize(name)&&normalize(g.category||'Geral')===normalize(category||'Geral'))||groups.find(g=>normalize(g.name)===normalize(name));
      if(!group)return;
      card.dataset.groupLinkReady='1';
      const meta=card.querySelector('.community-group-meta');
      if(!meta)return;
      const link=document.createElement('a');link.className='community-group-action join';link.href=`./comunidade-grupo.html?slug=${encodeURIComponent(group.slug)}`;link.textContent='Abrir comunidade';meta.insertBefore(link,meta.lastElementChild||null);
    });
  };
  const init=async()=>{const{data}=await db.from('cosplay_communities').select('id,name,slug,category').order('created_at',{ascending:false}).limit(300);groups=data||[];enhance();const root=document.getElementById('communityGroups');if(root)new MutationObserver(enhance).observe(root,{childList:true,subtree:true});};
  init().catch(()=>{});
})();
