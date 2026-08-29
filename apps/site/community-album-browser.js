(() => {
  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;
  if(!db)return;
  const BUCKET='cosplaychess-social-media';
  const $=id=>document.getElementById(id);
  let profile=null;

  const loadProfile=async()=>{
    const{data:s}=await db.auth.getSession();
    const u=s?.session?.user;
    if(!u)return false;
    const{data}=await db.from('cosplay_participant_profiles')
      .select('id')
      .eq('user_id',u.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    profile=data||null;
    return !!profile;
  };

  const emptyState=grid=>{
    grid.replaceChildren();
    const empty=document.createElement('div');
    empty.className='social-ext-empty';
    empty.textContent='Você ainda não criou álbuns. Use as ferramentas abaixo para criar o primeiro.';
    grid.appendChild(empty);
  };

  const cleanupPremiumTile=albumId=>{
    document.querySelectorAll(`.premium-album-thumb[href*="id=${CSS.escape(String(albumId))}"]`).forEach(el=>el.remove());
  };

  const deleteAlbum=async(album,card,button,grid)=>{
    if(!profile||!album?.id)return;
    const ok=confirm(`Excluir o álbum “${album.name}”? Todas as fotos e marcações deste álbum também serão removidas.`);
    if(!ok)return;
    button.disabled=true;
    button.textContent='Excluindo...';

    const{data:photos}=await db.from('cosplay_social_album_photos')
      .select('image_path')
      .eq('album_id',album.id)
      .eq('owner_profile_id',profile.id);
    const paths=(photos||[]).map(x=>x.image_path).filter(Boolean);

    const{error}=await db.from('cosplay_social_albums')
      .delete()
      .eq('id',album.id)
      .eq('owner_profile_id',profile.id);

    if(error){
      button.disabled=false;
      button.textContent='Excluir álbum';
      alert('Não foi possível excluir este álbum.');
      return;
    }

    if(paths.length){
      try{await db.storage.from(BUCKET).remove(paths);}catch{}
    }

    card.remove();
    cleanupPremiumTile(album.id);
    if(!grid.querySelector('.social-ext-card'))emptyState(grid);
    window.dispatchEvent(new CustomEvent('cosplay:album-deleted',{detail:{albumId:album.id}}));
  };

  const render=async()=>{
    const panel=document.querySelector('[data-community-panel="photos"]');
    if(!panel)return;

    const{data}=await db.from('cosplay_social_albums')
      .select('id,name,description,visibility,created_at')
      .eq('owner_profile_id',profile.id)
      .order('created_at',{ascending:false});

    let section=$('communityAlbumPages');
    if(!section){
      section=document.createElement('section');
      section.id='communityAlbumPages';
      section.style.marginBottom='14px';
      const head=document.createElement('div');
      head.className='community-subhead';
      head.innerHTML='<h3>Meus álbuns</h3><span>páginas completas</span>';
      const grid=document.createElement('div');
      grid.className='social-ext-grid';
      grid.id='communityAlbumPagesGrid';
      section.append(head,grid);
      const title=panel.querySelector('.community-section-head');
      title?.insertAdjacentElement('afterend',section);
    }

    const grid=$('communityAlbumPagesGrid')||section.querySelector('.social-ext-grid');
    grid.replaceChildren();
    if(!data?.length){emptyState(grid);return;}

    (data||[]).forEach(album=>{
      const card=document.createElement('article');
      card.className='social-ext-card';
      card.dataset.albumId=album.id;

      const icon=document.createElement('div');
      icon.className='social-ext-icon';
      icon.textContent='▧';

      const top=document.createElement('div');
      top.className='social-ext-card-head';
      const copy=document.createElement('div');
      copy.className='social-ext-copy';
      const b=document.createElement('b');b.textContent=album.name;
      const span=document.createElement('span');span.textContent=album.description||'Álbum de fotos CosplayChess';
      const small=document.createElement('small');
      small.textContent=album.visibility==='private'?'🔒 privado':album.visibility==='friends'?'👥 amigos':'🌐 público';
      copy.append(b,span,small);
      top.append(icon,copy);

      const actions=document.createElement('div');
      actions.className='social-ext-actions';
      const link=document.createElement('a');
      link.className='btn gold';
      link.href=`./album.html?id=${encodeURIComponent(album.id)}`;
      link.textContent='Abrir álbum';
      const del=document.createElement('button');
      del.className='btn dark';
      del.type='button';
      del.textContent='Excluir álbum';
      del.setAttribute('aria-label',`Excluir álbum ${album.name}`);
      del.addEventListener('click',()=>deleteAlbum(album,card,del,grid));
      actions.append(link,del);

      card.append(top,actions);
      grid.appendChild(card);
    });
  };

  const init=async()=>{
    if(!await loadProfile())return;
    const wait=()=>{
      const panel=document.querySelector('[data-community-panel="photos"]');
      if(!panel)return setTimeout(wait,180);
      render();
    };
    wait();
  };

  init().catch(()=>{});
})();
