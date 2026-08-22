(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;if(!cfg||!window.supabase)return;
  const db=window.COSPLAYCHESS_DB||window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>{try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:cfg.timezone}).format(new Date(v))}catch{return''}};
  function fanHtml(event,photos,compact=false){
    const pics=(photos||[]).filter(p=>p.photo_url).slice(0,4);const cover=event.cover_url||pics[0]?.photo_url||'';
    const slots=['s1','s2','s3','s4'].map((c,i)=>pics[i]?`<span class="gallery-album-sheet ${c}" style="background-image:url('${esc(pics[i].photo_url)}')"></span>`:'').join('');
    const place=[event.venue,event.city].filter(Boolean).join(' • ')||'Local a definir';
    return `<div class="gallery-album-fan">${slots}<span class="gallery-album-cover" style="${cover?`background-image:url('${esc(cover)}')`:''}">${compact?'':(photos.length?'<span class="gallery-album-badge">ÁLBUM</span>':'')}</span></div><div class="gallery-album-body"><div class="gallery-album-date">▣ ${esc(fmt(event.start_at))}</div><h3 class="gallery-album-title">${esc(event.title||'Evento')}</h3><div class="gallery-album-meta"><span>⌖ ${esc(place)}</span><span>▧ ${photos.length} foto${photos.length===1?'':'s'}</span></div>${compact?'':`<a class="gallery-album-cta" href="./galeria-eventos.html?event=${encodeURIComponent(event.id)}">Ver álbum completo →</a>`}</div>`;
  }
  async function data(){
    const {data:events,error}=await db.from('cosplay_events').select('id,title,venue,city,start_at,cover_url,published').eq('published',true).order('start_at',{ascending:false});if(error)throw error;
    const ids=(events||[]).map(e=>e.id);if(!ids.length)return {events:[],by:new Map()};
    const {data:photos}=await db.from('cosplay_event_photos').select('id,event_id,photo_url,caption,sort_order,created_at').in('event_id',ids).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
    const by=new Map();(photos||[]).forEach(p=>{const k=String(p.event_id);if(!by.has(k))by.set(k,[]);by.get(k).push(p)});return {events:events||[],by};
  }
  async function renderLanding(){const root=document.getElementById('galleryGrid');if(!root)return;try{const {events,by}=await data();const withPhotos=events.filter(e=>(by.get(String(e.id))||[]).length||e.cover_url).slice(0,8);root.className='gallery-albums-v2';root.innerHTML=withPhotos.length?withPhotos.map(e=>`<article class="gallery-album-card">${fanHtml(e,by.get(String(e.id))||[])}</article>`).join(''):'<div class="gallery-albums-empty">Ainda não há álbuns publicados.</div>';}catch(e){console.error(e)}}
  function renderAdminPreview(){const panel=document.getElementById('eventGalleryPanel'),filter=document.getElementById('galleryEventFilter');if(!panel||!filter||!filter.value)return;const event=(window.galleryEvents||[]).find?.(e=>String(e.id)===String(filter.value));const photos=Array.isArray(window.galleryPhotos)?window.galleryPhotos:[];if(!event)return;let box=panel.querySelector('.admin-album-preview-v2');if(!box){box=document.createElement('div');box.className='admin-album-preview-v2';const grid=panel.querySelector('#eventGalleryGrid');panel.insertBefore(box,grid);}box.innerHTML=fanHtml(event,photos,true)+`<div style="text-align:center;margin-top:10px"><a class="mini-btn" target="_blank" rel="noopener" href="./galeria-eventos.html?event=${encodeURIComponent(event.id)}">Abrir álbum público ↗</a></div>`}
  if(document.getElementById('galleryGrid')){renderLanding();setTimeout(renderLanding,1200)}
  const hook=()=>{const f=document.getElementById('galleryEventFilter');if(!f)return false;f.addEventListener('change',()=>setTimeout(renderAdminPreview,250));new MutationObserver(()=>setTimeout(renderAdminPreview,120)).observe(document.getElementById('eventGalleryGrid'),{childList:true});setTimeout(renderAdminPreview,400);return true};
  if(!hook()){const o=new MutationObserver(()=>{if(hook())o.disconnect()});o.observe(document.body,{childList:true,subtree:true})}
})();