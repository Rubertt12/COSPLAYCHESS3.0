(() => {
  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;
  if(!db)return;
  const BUCKET='cosplaychess-social-media';
  const $=id=>document.getElementById(id);
  const state={viewer:null,target:null,posts:[],albums:[],photos:[],communities:[],relation:null};
  const slug=String(new URLSearchParams(location.search).get('slug')||'').trim();
  const safe=url=>{try{const u=new URL(String(url||''));return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}};
  const name=p=>p?.display_name||p?.nick||'Participante';
  const fmt=v=>{try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));}catch{return'';}};
  const setImage=(root,url,fallback='♜')=>{root.replaceChildren();const src=safe(url);if(src){const img=document.createElement('img');img.src=src;img.alt='';img.loading='lazy';root.appendChild(img);}else root.textContent=fallback;};
  const signed=async path=>{if(!path)return null;const{data,error}=await db.storage.from(BUCKET).createSignedUrl(path,3600);return error?null:data?.signedUrl||null;};

  const loadAuth=async()=>{
    const{data:s}=await db.auth.getSession();const user=s?.session?.user;if(!user){$('socialProfileAuth').hidden=false;return false;}
    const{data:mine}=await db.from('cosplay_participant_profiles').select('id,public_slug,display_name,nick,character_name,character_photo_url').eq('user_id',user.id).neq('registration_status','cancelled').order('created_at',{ascending:false}).limit(1).maybeSingle();
    state.viewer=mine||null;if(!state.viewer){$('socialProfileAuth').hidden=false;return false;}return true;
  };

  const loadTarget=async()=>{
    if(!slug)return false;
    const{data,error}=await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url,cover_photo_url,cover_position_x,cover_position_y,bio,profile_visible,registration_status')
      .eq('public_slug',slug).eq('profile_visible',true).neq('registration_status','cancelled').maybeSingle();
    if(error||!data)return false;state.target=data;return true;
  };

  const applyViewerAppearance=async()=>{
    const{data}=await db.rpc('cosplay_my_social_settings');if(!data)return;
    if(data.theme==='white-mode')document.body.classList.add('theme-white-mode');
  };

  const renderHero=async()=>{
    const p=state.target;$('socialProfileName').textContent=name(p);$('socialProfileCharacter').textContent=p.character_name||'CosplayChess';$('socialProfileNick').textContent=p.nick?`@${String(p.nick).replace(/^@/,'')}`:'';
    setImage($('socialProfileAvatar'),p.character_photo_url);
    const cover=$('socialProfileCover');const coverUrl=safe(p.cover_photo_url);if(coverUrl){cover.style.backgroundImage=`linear-gradient(180deg,rgba(8,10,17,.04),rgba(8,10,17,.28)),url("${coverUrl.replace(/"/g,'%22')}")`;cover.style.backgroundPosition=`center,${Number(p.cover_position_x??50)}% ${Number(p.cover_position_y??50)}%`;cover.style.backgroundSize='cover,cover';}
    $('socialProfilePublicLink').href=`./jogador.html?slug=${encodeURIComponent(p.public_slug)}`;
    const{data:presence}=await db.rpc('cosplay_public_profile_presence',{target_profile_id:p.id});const st=String(presence?.status_message||'').trim();if(st){$('socialProfileStatus').textContent=`“${st}”`;$('socialProfileStatus').hidden=false;}
    const{data:statsData}=await db.rpc('cosplay_public_profile_social_stats',{target_profile_id:p.id});const stats=Array.isArray(statsData)?statsData[0]:statsData||{};const boxes=$('socialProfileStats').children;if(boxes[0])boxes[0].querySelector('b').textContent=String(stats.friend_count||0);if(boxes[1])boxes[1].querySelector('b').textContent=String(stats.post_count||0);if(boxes[2])boxes[2].querySelector('b').textContent=String(stats.photo_count||0);
  };

  const loadRelation=async()=>{
    if(!state.viewer||!state.target||state.viewer.id===state.target.id)return;
    const{data}=await db.from('cosplay_friendships').select('id,requester_profile_id,addressee_profile_id,status').or(`and(requester_profile_id.eq.${state.viewer.id},addressee_profile_id.eq.${state.target.id}),and(requester_profile_id.eq.${state.target.id},addressee_profile_id.eq.${state.viewer.id})`).order('created_at',{ascending:false}).limit(1);state.relation=data?.[0]||null;
  };

  const renderFriendAction=()=>{
    const btn=$('socialProfileFriendAction');if(!btn)return;
    if(state.viewer.id===state.target.id){btn.textContent='Minha comunidade';btn.className='btn dark';btn.addEventListener('click',()=>location.href='./comunidade.html');return;}
    const r=state.relation;
    if(r?.status==='accepted'){btn.textContent='✓ Amigos';btn.className='btn dark';btn.disabled=true;return;}
    if(r?.status==='pending'){btn.className='btn dark';if(r.addressee_profile_id===state.viewer.id){btn.textContent='Responder convite';btn.addEventListener('click',()=>location.href='./comunidade.html');}else{btn.textContent='Convite enviado';btn.disabled=true;}return;}
    btn.textContent='＋ Adicionar amigo';btn.addEventListener('click',async()=>{btn.disabled=true;btn.textContent='Enviando...';const{error}=await db.from('cosplay_friendships').insert({requester_profile_id:state.viewer.id,addressee_profile_id:state.target.id,status:'pending'});if(error){btn.disabled=false;btn.textContent='Não disponível';return;}btn.textContent='Convite enviado';});
  };

  const loadPosts=async()=>{
    const{data,error}=await db.from('cosplay_social_posts').select('id,author_profile_id,body,image_path,visibility,created_at').eq('author_profile_id',state.target.id).order('created_at',{ascending:false}).limit(30);state.posts=error?[]:data||[];
    const root=$('socialProfilePosts');root.replaceChildren();if(!state.posts.length){root.innerHTML='<div class="social-profile-empty">Nenhuma publicação disponível para você.</div>';return;}
    for(const post of state.posts){const card=document.createElement('article');card.className='social-profile-post';if(post.image_path){const url=await signed(post.image_path);if(url){const wrap=document.createElement('div');wrap.className='social-profile-post-image';const img=document.createElement('img');img.src=url;img.alt=post.body||`Foto de ${name(state.target)}`;img.dataset.photoLightbox='1';img.dataset.lightboxCaption=post.body||`Foto de ${name(state.target)}`;wrap.appendChild(img);card.appendChild(wrap);}}const copy=document.createElement('div');copy.className='social-profile-post-copy';if(post.body){const p=document.createElement('p');p.textContent=post.body;copy.appendChild(p);}const small=document.createElement('small');small.textContent=`${post.visibility==='friends'?'Amigos':'Público'} · ${fmt(post.created_at)}`;copy.appendChild(small);card.appendChild(copy);root.appendChild(card);}
  };

  const loadCommunities=async()=>{
    const{data:members}=await db.from('cosplay_community_members').select('community_id,role').eq('profile_id',state.target.id).limit(60);const ids=(members||[]).map(x=>x.community_id);if(ids.length){const{data}=await db.from('cosplay_communities').select('id,name,slug,category,avatar_url,moderation_status').in('id',ids).eq('moderation_status','active');state.communities=data||[];}const root=$('socialProfileCommunities');root.replaceChildren();if(!state.communities.length){root.innerHTML='<div class="social-profile-empty">Nenhuma comunidade visível.</div>';return;}state.communities.slice(0,12).forEach(c=>{const a=document.createElement('a');a.className='social-profile-community';a.href=c.slug?`./comunidade-grupo.html?slug=${encodeURIComponent(c.slug)}`:'#';const i=document.createElement('i');const src=safe(c.avatar_url);if(src){const img=document.createElement('img');img.src=src;img.alt='';i.appendChild(img);}else i.textContent=(c.name||'C').charAt(0).toUpperCase();const copy=document.createElement('div');const b=document.createElement('b');b.textContent=c.name;const s=document.createElement('span');s.textContent=c.category||'Comunidade';copy.append(b,s);a.append(i,copy);root.appendChild(a);});
  };

  const loadAlbums=async()=>{
    const{data,error}=await db.from('cosplay_social_albums').select('id,name,visibility,created_at').eq('owner_profile_id',state.target.id).order('created_at',{ascending:false}).limit(8);state.albums=error?[]:data||[];const ids=state.albums.map(a=>a.id);if(ids.length){const{data:photos}=await db.from('cosplay_social_album_photos').select('id,album_id,image_path,created_at').in('album_id',ids).order('created_at',{ascending:false});state.photos=photos||[];}const root=$('socialProfileAlbums');root.replaceChildren();if(!state.albums.length){root.innerHTML='<div class="social-profile-empty">Nenhum álbum disponível.</div>';return;}for(const album of state.albums){const a=document.createElement('a');a.className='social-profile-album';a.href=`./album.html?id=${encodeURIComponent(album.id)}`;const thumb=document.createElement('div');thumb.className='social-profile-album-thumb';const photo=state.photos.find(p=>p.album_id===album.id);if(photo){const url=await signed(photo.image_path);if(url){const img=document.createElement('img');img.src=url;img.alt='';thumb.appendChild(img);}else thumb.textContent='▧';}else thumb.textContent='▧';const label=document.createElement('span');label.textContent=album.name;a.append(thumb,label);root.appendChild(a);}
  };

  const init=async()=>{
    await applyViewerAppearance();if(!await loadAuth())return;if(!await loadTarget()){$('socialProfileNotFound').hidden=false;return;}
    $('socialProfileContent').hidden=false;await loadRelation();await renderHero();renderFriendAction();await db.rpc('cosplay_record_profile_visit',{p_target_profile_id:state.target.id}).catch(()=>{});await Promise.all([loadPosts(),loadCommunities(),loadAlbums()]);
  };
  init().catch(()=>{$('socialProfileNotFound').hidden=false;});
})();