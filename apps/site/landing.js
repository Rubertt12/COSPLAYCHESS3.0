const cfg = window.COSPLAYCHESS_CONFIG;
const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle:'long', timeStyle:'short', timeZone: cfg.timezone });
const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function loadEvents(){
  const grid = document.getElementById('eventsGrid');
  const { data, error } = await db.from('cosplay_events').select('*').eq('published', true).gte('start_at', new Date(Date.now()-86400000).toISOString()).order('start_at');
  if(error){ grid.innerHTML='<div class="empty-card">Não foi possível carregar os eventos agora.</div>'; return; }
  if(!data?.length){ grid.innerHTML='<div class="empty-card">Nenhum evento publicado ainda. O próximo capítulo está sendo preparado.</div>'; return; }
  grid.innerHTML=data.map(event=>`<article class="event-card">
    <div class="event-cover" style="${event.cover_url ? `background-image:url('${esc(event.cover_url)}')` : ''}"><span>${event.registration_open?'INSCRIÇÕES ABERTAS':'EM BREVE'}</span></div>
    <div class="event-body"><small>${dateFmt.format(new Date(event.start_at))}</small><h3>${esc(event.title)}</h3><p>${esc(event.description||'')}</p>
    <div class="event-place"><span class="event-place-icon" aria-hidden="true">📍</span><span class="event-place-copy"><b>LOCAL DO EVENTO</b><strong>${esc([event.venue,event.city].filter(Boolean).join(' • ')||'Local a definir')}</strong></span></div>
    <a class="btn ${event.registration_open?'gold':'dark'}" href="./cadastro.html?event=${event.id}">${event.registration_open?'Inscrever-se':'Ver evento'}</a></div>
  </article>`).join('');
}

async function loadGallery(){
  const grid=document.getElementById('galleryGrid');
  const {data:events,error:eventError}=await db.from('cosplay_events').select('id,title').eq('published',true);
  if(eventError||!events?.length){ grid.innerHTML='<div class="empty-card">As fotos publicadas pelo admin aparecerão aqui.</div>'; return; }
  const eventIds=events.map(event=>event.id);
  const eventNames=new Map(events.map(event=>[event.id,event.title]));
  const {data,error}=await db.from('cosplay_event_photos').select('id,photo_url,caption,event_id,created_at').in('event_id',eventIds).order('created_at',{ascending:false}).limit(12);
  if(error||!data?.length){ grid.innerHTML='<div class="empty-card">As fotos publicadas pelo admin aparecerão aqui.</div>'; return; }
  grid.innerHTML=data.map(photo=>`<figure class="gallery-item"><img src="${esc(photo.photo_url)}" alt="${esc(photo.caption||eventNames.get(photo.event_id)||'CosplayChess')}"><figcaption><b>${esc(eventNames.get(photo.event_id)||'CosplayChess')}</b><span>${esc(photo.caption||'Registro do espetáculo')}</span></figcaption></figure>`).join('');
}

loadEvents(); loadGallery();
