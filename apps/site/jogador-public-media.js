(() => {
  const db = window.getCosplayChessDb ? window.getCosplayChessDb() : window.COSPLAYCHESS_DB;
  if (!db) return;
  const BUCKET='cosplaychess-social-media';
  const $=id=>document.getElementById(id);
  const safe=(value)=>{try{const u=new URL(String(value||''));return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}};
  const waitFor=(sel,ms=6000)=>new Promise(resolve=>{const found=document.querySelector(sel);if(found)return resolve(found);const obs=new MutationObserver(()=>{const el=document.querySelector(sel);if(el){obs.disconnect();resolve(el);}});obs.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>{obs.disconnect();resolve(document.querySelector(sel));},ms);});
  const waitPhotoWallReady=async()=>{const wall=await waitFor('#playerPhotoWall');if(!wall)return null;const loading=()=>wall.querySelector('.player-social-empty')?.textContent?.toLowerCase().includes('carregando');if(!loading())return wall;return new Promise(resolve=>{const obs=new MutationObserver(()=>{if(!loading()){obs.disconnect();resolve(wall);}});obs.observe(wall,{childList:true,subtree:true,characterData:true});setTimeout(()=>{obs.disconnect();resolve(wall);},5000);});};
  const signed=async path=>{const{data,error}=await db.storage.from(BUCKET).createSignedUrl(path,3600);return error?null:data?.signedUrl||null;};

  const loadProfile=async()=>{
    const slug=String(new URLSearchParams(location.search).get('slug')||'').trim();
    if(!slug)return null;
    const{data,error}=await db.from('cosplay_participant_profiles').select('id,display_name,nick,cover_photo_url,profile_visible').eq('public_slug',slug).eq('profile_visible',true).maybeSingle();
    return error?null:data||null;
  };

  const renderCover=async profile=>{
    if(!profile?.cover_photo_url)return;
    const hero=await waitFor('.player-hero-card');
    if(!hero||hero.querySelector('.player-public-cover'))return;
    const src=safe(profile.cover_photo_url);if(!src)return;
    hero.classList.add('has-public-cover');
    const cover=document.createElement('div');cover.className='player-public-cover';
    const img=document.createElement('img');img.src=src;img.alt=`Foto de capa de ${profile.display_name||profile.nick||'participante'}`;img.dataset.lightboxCaption=img.alt;
    const label=document.createElement('span');label.className='player-public-cover-label';label.textContent='Foto de capa';
    cover.append(img,label);hero.prepend(cover);
  };

  const renderPublicAlbumPhotos=async profile=>{
    const wall=await waitPhotoWallReady();
    if(!wall||!profile)return;
    const{data:albums,error:albumsError}=await db.from('cosplay_social_albums').select('id,name,visibility,created_at').eq('owner_profile_id',profile.id).eq('visibility','public').order('created_at',{ascending:false}).limit(16);
    if(albumsError||!albums?.length)return;
    const albumIds=albums.map(a=>a.id);
    const albumMap=new Map(albums.map(a=>[a.id,a]));
    const{data:photos,error:photoError}=await db.from('cosplay_social_album_photos').select('id,album_id,image_path,caption,created_at').in('album_id',albumIds).order('created_at',{ascending:false}).limit(48);
    if(photoError||!photos?.length)return;

    const empty=wall.querySelector('.player-social-empty');
    if(empty)empty.remove();
    const existing=new Set([...wall.querySelectorAll('img')].map(img=>img.dataset.imagePath||''));
    let added=0;
    for(const photo of photos){
      if(!photo.image_path||existing.has(photo.image_path))continue;
      const url=await signed(photo.image_path);if(!url)continue;
      const tile=document.createElement('a');tile.className='player-photo-tile public-album-photo';tile.href=`./album.html?id=${encodeURIComponent(photo.album_id)}`;tile.setAttribute('aria-label',`Abrir álbum ${albumMap.get(photo.album_id)?.name||'público'}`);
      const img=document.createElement('img');img.src=url;img.alt=photo.caption||`Foto pública de ${profile.display_name||profile.nick||'participante'}`;img.loading='lazy';img.dataset.imagePath=photo.image_path;img.dataset.lightboxCaption=img.alt;
      const label=document.createElement('span');label.className='public-album-label';label.textContent=albumMap.get(photo.album_id)?.name||'Álbum público';
      tile.append(img,label);wall.appendChild(tile);existing.add(photo.image_path);added++;
    }
    if(added&&!document.querySelector('.public-photo-source')){
      const panel=wall.closest('.player-social-panel');const head=panel?.querySelector('.player-social-panel-head');
      if(head){const note=document.createElement('div');note.className='public-photo-source';note.textContent='Inclui fotos de posts e álbuns públicos';head.insertAdjacentElement('afterend',note);}
    }
  };

  const init=async()=>{const profile=await loadProfile();if(!profile)return;await Promise.all([renderCover(profile),renderPublicAlbumPhotos(profile)]);};
  const content=$('playerContent');
  if(content&&!content.hidden)init().catch(()=>{});else if(content){const obs=new MutationObserver(()=>{if(!content.hidden){obs.disconnect();init().catch(()=>{});}});obs.observe(content,{attributes:true,attributeFilter:['hidden']});}
})();
