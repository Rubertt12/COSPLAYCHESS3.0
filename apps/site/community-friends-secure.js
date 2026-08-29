(() => {
  if(window.__COSPLAY_FRIENDS_SECURE__)return;
  window.__COSPLAY_FRIENDS_SECURE__=true;
  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;if(!db)return;
  const safe=url=>{try{const u=new URL(String(url||''));return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}};
  const displayName=p=>p.display_name||p.nick||'Participante';
  let loading=false;

  const avatar=p=>{const el=document.createElement('div');el.className='community-person-avatar';const src=safe(p.character_photo_url);if(src){const img=document.createElement('img');img.src=src;img.alt=`Foto de ${displayName(p)}`;img.loading='lazy';el.appendChild(img);}else{const span=document.createElement('span');span.textContent='♜';el.appendChild(span);}return el;};

  const card=(p,mode)=>{
    const article=document.createElement('article');article.className='community-person-card';article.appendChild(avatar(p));
    const copy=document.createElement('div');copy.className='community-person-copy';const b=document.createElement('b');b.textContent=displayName(p);const s=document.createElement('span');s.textContent=p.character_name||'Participante CosplayChess';copy.append(b,s);article.appendChild(copy);
    const actions=document.createElement('div');actions.className='community-person-actions';
    const social=document.createElement('a');social.className='btn dark';social.href=p.public_slug?`./perfil-social.html?slug=${encodeURIComponent(p.public_slug)}`:'#';social.textContent='Ver comunidade';actions.appendChild(social);
    if(p.public_profile_visible&&p.public_slug){const view=document.createElement('a');view.className='btn dark';view.href=`./jogador.html?slug=${encodeURIComponent(p.public_slug)}`;view.textContent='Ver perfil';actions.appendChild(view);}
    if(mode==='incoming'){
      const accept=document.createElement('button');accept.className='btn gold';accept.type='button';accept.textContent='Aceitar';accept.addEventListener('click',()=>respond(p.friendship_id,'accepted',accept));
      const decline=document.createElement('button');decline.className='btn dark';decline.type='button';decline.textContent='Recusar';decline.addEventListener('click',()=>respond(p.friendship_id,'declined',decline));actions.append(accept,decline);
    }else if(mode==='friend'){
      const remove=document.createElement('button');remove.className='btn dark';remove.type='button';remove.textContent='Desfazer amizade';remove.addEventListener('click',()=>removeFriend(p.friendship_id,remove));actions.appendChild(remove);
    }
    article.appendChild(actions);return article;
  };

  const render=rows=>{
    const friends=document.getElementById('communityFriends');const friendsCount=document.getElementById('communityFriendsCount');const requests=document.getElementById('communityRequests');const requestSection=document.getElementById('communityRequestsSection');const requestCount=document.getElementById('communityRequestsCount');const badge=document.getElementById('communityRequestBadge');if(!friends||!requests)return;
    const accepted=rows.filter(r=>r.friendship_status==='accepted');const incoming=rows.filter(r=>r.friendship_status==='pending'&&r.incoming===true);
    friends.replaceChildren();friendsCount&&(friendsCount.textContent=String(accepted.length));if(!accepted.length)friends.innerHTML='<div class="community-empty">Você ainda não adicionou amigos. Encontre outros participantes na aba “Encontrar pessoas”.</div>';else accepted.forEach(r=>friends.appendChild(card(r,'friend')));
    requests.replaceChildren();if(requestSection)requestSection.hidden=!incoming.length;if(requestCount)requestCount.textContent=String(incoming.length);if(badge){badge.hidden=!incoming.length;badge.textContent=String(incoming.length);}incoming.forEach(r=>requests.appendChild(card(r,'incoming')));
    const sidebarCount=document.getElementById('communityFriendCount');if(sidebarCount)sidebarCount.textContent=String(accepted.length);
  };

  const load=async()=>{if(loading)return;loading=true;const{data,error}=await db.rpc('cosplay_my_social_connections');loading=false;if(error)return;render(data||[]);};
  async function respond(id,status,button){button.disabled=true;const{error}=await db.from('cosplay_friendships').update({status}).eq('id',id);if(error){button.disabled=false;return;}window.dispatchEvent(new CustomEvent('cosplay:friend-network-changed'));await load();}
  async function removeFriend(id,button){button.disabled=true;const{error}=await db.from('cosplay_friendships').delete().eq('id',id);if(error){button.disabled=false;return;}window.dispatchEvent(new CustomEvent('cosplay:friend-network-changed'));await load();}

  const bind=()=>{const nav=document.querySelector('[data-community-view="friends"]');if(nav&&nav.dataset.secureFriendsBound!=='1'){nav.dataset.secureFriendsBound='1';nav.addEventListener('click',()=>setTimeout(load,100));}setTimeout(load,900);setTimeout(load,2200);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.addEventListener('cosplay:social-shell-ready',bind);
  window.addEventListener('cosplay:friend-network-changed',()=>setTimeout(load,80));
})();