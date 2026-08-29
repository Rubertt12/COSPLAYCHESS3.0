(() => {
  if(window.__COSPLAY_VISITORS_RPC__)return;
  window.__COSPLAY_VISITORS_RPC__=true;
  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;if(!db)return;
  const safe=url=>{try{const u=new URL(String(url||''));return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}};
  const fmt=value=>{try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}catch{return'';}};
  const load=async()=>{
    const root=document.getElementById('socialV2Visitors');if(!root)return false;
    const{data,error}=await db.rpc('cosplay_my_recent_visitors',{p_limit:12});
    if(error){root.innerHTML='<div class="social-v2-empty">Não foi possível carregar os visitantes.</div>';return true;}
    root.replaceChildren();
    if(!data?.length){root.innerHTML='<div class="social-v2-empty">Nenhuma visita registrada ainda.</div>';return true;}
    data.forEach(v=>{
      const a=document.createElement('a');a.className='social-v2-visitor';a.href=v.public_slug?`./perfil-social.html?slug=${encodeURIComponent(v.public_slug)}`:'#';
      const av=document.createElement('div');av.className='social-v2-avatar';const src=safe(v.character_photo_url);if(src){const img=document.createElement('img');img.src=src;img.alt='';img.loading='lazy';av.appendChild(img);}else av.textContent='♜';
      const b=document.createElement('b');b.textContent=v.display_name||v.nick||'Participante';const small=document.createElement('small');small.textContent=fmt(v.visited_at);a.append(av,b,small);root.appendChild(a);
    });return true;
  };
  const schedule=()=>[120,380,800].forEach(ms=>setTimeout(load,ms));
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-community-view="social-settings"]'))schedule();},true);
  window.addEventListener('cosplay:social-settings-saved',schedule);
  window.addEventListener('cosplay:social-shell-ready',schedule);
})();