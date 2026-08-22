(()=>{
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function decorateArchive(){
    const cards=[...document.querySelectorAll('.archive-card')];
    cards.forEach(card=>{
      if(card.dataset.fanReady==='1')return;
      const cover=card.querySelector('.archive-cover');if(!cover)return;
      const href=card.getAttribute('href')||'';let eventId='';try{eventId=new URL(href,location.href).searchParams.get('event')||''}catch{}
      if(!eventId)return;
      const badge=cover.querySelector('.archive-badge');const countText=badge?.textContent||'';
      const count=parseInt((countText.match(/\d+/)||['0'])[0],10)||0;
      if(!count){card.dataset.fanReady='1';return;}
      const fan=document.createElement('span');fan.className='album-fan';
      const urls=[];
      const bg=cover.style.backgroundImage?.match(/url\(["']?(.*?)["']?\)/)?.[1];if(bg)urls.push(bg);
      fan.innerHTML=Array.from({length:Math.min(3,Math.max(2,count))},(_,i)=>`<i class="album-fan-card" data-fan-index="${i}"></i>`).join('');
      cover.prepend(fan);card.dataset.fanReady='1';
      hydrateFan(eventId,fan,urls);
    });
  }
  async function hydrateFan(eventId,fan,fallback=[]){
    try{
      const db=window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();if(!db)return;
      const {data}=await db.from('cosplay_event_photos').select('photo_url,sort_order,created_at').eq('event_id',eventId).order('sort_order',{ascending:true}).order('created_at',{ascending:false}).limit(4);
      const photos=(data||[]).map(x=>x.photo_url).filter(Boolean);const pool=[...photos,...fallback];
      [...fan.children].forEach((el,i)=>{const u=pool[i%pool.length];if(u)el.style.backgroundImage=`url("${String(u).replace(/"/g,'%22')}")`;});
    }catch{}
  }
  function decorateAlbum(){
    const album=document.getElementById('albumView');if(!album||album.hidden||album.dataset.heroReady==='1')return;
    const title=document.getElementById('albumTitle');const desc=document.getElementById('albumDescription');const meta=document.getElementById('albumMeta');const grid=document.getElementById('albumGrid');if(!title||!grid)return;
    const photos=[...grid.querySelectorAll('.album-photo img')].map(img=>img.src).filter(Boolean);
    const eventId=new URLSearchParams(location.search).get('event');
    const hero=document.createElement('section');hero.className='album-cover-hero';hero.innerHTML=`<div class="album-cover-stack"><i class="album-hero-fan"></i><i class="album-hero-fan"></i><div class="album-cover-main"></div></div><div class="album-cover-copy"><span class="kicker">ÁLBUM DO EVENTO</span><h1>${esc(title.textContent||'Evento')}</h1><div class="album-meta">${meta?.innerHTML||''}</div><p>${esc(desc?.textContent||'Registros do espetáculo.')}</p></div>`;
    const head=album.querySelector('.album-head');if(head)head.after(hero);else album.prepend(hero);
    if(head)head.style.display='none';album.dataset.heroReady='1';
    hydrateAlbumHero(eventId,hero,photos);
  }
  async function hydrateAlbumHero(eventId,hero,photos){
    let cover='';try{const db=window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();if(db&&eventId){const {data}=await db.from('cosplay_events').select('cover_url').eq('id',eventId).maybeSingle();cover=data?.cover_url||'';}}catch{}
    const pool=[cover,...photos].filter(Boolean);const main=hero.querySelector('.album-cover-main');if(pool[0])main.style.backgroundImage=`url("${pool[0].replace(/"/g,'%22')}")`;
    hero.querySelectorAll('.album-hero-fan').forEach((el,i)=>{const u=pool[i+1]||pool[0];if(u)el.style.backgroundImage=`url("${u.replace(/"/g,'%22')}")`;});
  }
  const run=()=>{decorateArchive();decorateAlbum();};
  const obs=new MutationObserver(run);obs.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,120));else setTimeout(run,120);
  setTimeout(run,600);
})();
