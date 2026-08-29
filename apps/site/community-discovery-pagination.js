(() => {
  if(window.__COSPLAY_DISCOVERY_PAGINATION__)return;
  window.__COSPLAY_DISCOVERY_PAGINATION__=true;

  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;
  if(!db)return;
  const state={page:1,size:10,search:'',total:0,rows:[],loading:false};
  let timer=null,root=null,pager=null,summary=null,searchInput=null,myProfileId='';

  const safe=url=>{try{const u=new URL(String(url||''));return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}};
  const name=p=>p.display_name||p.nick||'Participante';
  const publicProfileUrl=p=>p.public_profile_visible&&p.public_slug?`./jogador.html?slug=${encodeURIComponent(p.public_slug)}`:'';
  const socialUrl=p=>p.public_slug?`./perfil-social.html?slug=${encodeURIComponent(p.public_slug)}`:'#';

  const loadMe=async()=>{
    if(myProfileId)return myProfileId;
    const{data:s}=await db.auth.getSession();const uid=s?.session?.user?.id;if(!uid)return '';
    const{data}=await db.from('cosplay_participant_profiles').select('id').eq('user_id',uid).neq('registration_status','cancelled').order('created_at',{ascending:false}).limit(1).maybeSingle();
    myProfileId=data?.id||'';return myProfileId;
  };

  const avatar=p=>{
    const el=document.createElement('div');el.className='community-paged-avatar';
    const src=safe(p.character_photo_url);
    if(src){const img=document.createElement('img');img.src=src;img.alt=`Foto de ${name(p)}`;img.loading='lazy';el.appendChild(img);}else el.textContent='♜';
    return el;
  };

  const friendButton=p=>{
    const b=document.createElement('button');b.type='button';b.className='btn gold';
    const status=p.friendship_status;
    if(status==='accepted'){b.className='btn dark';b.textContent='✓ Amigos';b.disabled=true;return b;}
    if(status==='pending'){
      b.className='btn dark';
      if(p.friendship_incoming){b.textContent='Responder convite';b.addEventListener('click',()=>document.querySelector('[data-community-view="friends"]')?.click());}
      else{b.textContent='Convite enviado';b.disabled=true;}
      return b;
    }
    b.textContent='＋ Adicionar amigo';
    b.addEventListener('click',async()=>{
      const myId=await loadMe();if(!myId){b.disabled=true;b.textContent='Indisponível';return;}
      b.disabled=true;b.textContent='Enviando...';
      const{error}=await db.from('cosplay_friendships').insert({requester_profile_id:myId,addressee_profile_id:p.profile_id,status:'pending'});
      if(error){b.disabled=false;b.textContent=error.code==='23505'?'Convite já existe':'Não disponível';return;}
      b.textContent='Convite enviado';
      window.dispatchEvent(new CustomEvent('cosplay:friend-network-changed'));
      setTimeout(()=>load(),250);
    });
    return b;
  };

  const card=p=>{
    const article=document.createElement('article');article.className='community-paged-person';article.appendChild(avatar(p));
    const copy=document.createElement('div');copy.className='community-paged-copy';
    const b=document.createElement('b');b.textContent=name(p);
    const char=document.createElement('span');char.textContent=p.character_name||'Participante CosplayChess';
    const nick=document.createElement('small');nick.textContent=p.nick?`@${String(p.nick).replace(/^@/,'')}`:'Perfil ativo na comunidade';
    copy.append(b,char,nick);article.appendChild(copy);
    const actions=document.createElement('div');actions.className='community-paged-actions';
    const social=document.createElement('a');social.className='btn dark';social.href=socialUrl(p);social.textContent='Ver comunidade';actions.appendChild(social);
    const publicUrl=publicProfileUrl(p);if(publicUrl){const view=document.createElement('a');view.className='btn dark';view.href=publicUrl;view.textContent='Ver perfil';actions.appendChild(view);}
    actions.appendChild(friendButton(p));article.appendChild(actions);return article;
  };

  const renderPager=()=>{
    if(!pager)return;pager.replaceChildren();const pages=Math.max(1,Math.ceil(state.total/state.size));
    const make=(label,page,disabled=false,active=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.classList.toggle('active',active);b.addEventListener('click',()=>{state.page=page;load();});return b;};
    pager.appendChild(make('‹',Math.max(1,state.page-1),state.page<=1));
    let start=Math.max(1,state.page-2),end=Math.min(pages,start+4);start=Math.max(1,end-4);
    for(let p=start;p<=end;p++)pager.appendChild(make(String(p),p,false,p===state.page));
    pager.appendChild(make('›',Math.min(pages,state.page+1),state.page>=pages));
    const info=document.createElement('span');info.className='community-people-pager-info';info.textContent=`Página ${state.page} de ${pages}`;pager.appendChild(info);
  };

  const render=()=>{
    if(!root)return;root.replaceChildren();
    if(!state.rows.length){const e=document.createElement('div');e.className='community-empty';e.textContent=state.search?'Nenhum participante encontrado para esta busca.':'Ainda não há outros participantes ativos na comunidade.';root.appendChild(e);}else state.rows.forEach(p=>root.appendChild(card(p)));
    if(summary)summary.innerHTML=`<span><b>${state.total}</b> participante${state.total===1?'':'s'} na Comunidade</span><span>10 por página</span>`;renderPager();
  };

  const load=async()=>{
    if(state.loading||!root)return;state.loading=true;root.innerHTML='<div class="community-empty">Carregando participantes...</div>';
    const{data,error}=await db.rpc('cosplay_discover_participants',{p_search:state.search||null,p_page:state.page,p_page_size:state.size});state.loading=false;
    if(error){root.innerHTML='<div class="community-empty">Não foi possível carregar os participantes agora.</div>';return;}
    state.rows=data||[];state.total=Number(state.rows[0]?.total_count||0);const pages=Math.max(1,Math.ceil(state.total/state.size));if(state.page>pages){state.page=pages;return load();}render();
  };

  const mount=()=>{
    const panel=document.querySelector('[data-community-panel="discover"]');searchInput=document.getElementById('communityPeopleSearch');const legacy=document.getElementById('communityPeople');if(!panel||!searchInput||!legacy)return false;
    legacy.hidden=true;legacy.style.display='none';
    summary=document.getElementById('communityDiscoverySummary');if(!summary){summary=document.createElement('div');summary.id='communityDiscoverySummary';summary.className='community-discovery-summary';searchInput.closest('.community-search')?.insertAdjacentElement('afterend',summary);}
    root=document.getElementById('communityPeoplePaged');if(!root){root=document.createElement('div');root.id='communityPeoplePaged';legacy.insertAdjacentElement('afterend',root);}
    pager=document.getElementById('communityPeoplePager');if(!pager){pager=document.createElement('nav');pager.id='communityPeoplePager';pager.className='community-people-pager';pager.setAttribute('aria-label','Paginação de participantes');root.insertAdjacentElement('afterend',pager);}
    if(searchInput.dataset.pagedBound!=='1'){searchInput.dataset.pagedBound='1';searchInput.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{state.search=searchInput.value.trim();state.page=1;load();},250);});}
    const nav=document.querySelector('[data-community-view="discover"]');if(nav&&nav.dataset.pagedBound!=='1'){nav.dataset.pagedBound='1';nav.addEventListener('click',()=>setTimeout(load,60));}
    load();return true;
  };

  const boot=()=>{if(mount())return;[250,700,1400,2600].forEach(ms=>setTimeout(mount,ms));};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('cosplay:social-shell-ready',boot);
  window.addEventListener('cosplay:friend-network-changed',()=>setTimeout(load,120));
})();