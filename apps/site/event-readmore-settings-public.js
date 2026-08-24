(()=>{
  if(window.__COSPLAYCHESS_EVENT_READMORE_PUBLIC__)return;
  window.__COSPLAYCHESS_EVENT_READMORE_PUBLIC__=true;

  const grid=document.getElementById('eventsGrid');
  if(!grid)return;
  const db=()=>window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();
  let settings=[];

  function normalizeTitle(v=''){return String(v).trim().toLocaleLowerCase('pt-BR');}

  function apply(){
    if(!settings.length)return;
    grid.querySelectorAll('.event-card').forEach(card=>{
      const title=normalizeTitle(card.querySelector('.event-body h3')?.textContent||'');
      const event=settings.find(item=>normalizeTitle(item.title)===title);
      if(!event)return;
      const lines=Math.min(5,Math.max(2,Number(event.description_preview_lines)||3));
      const position=['left','center','right','full'].includes(event.read_more_position)?event.read_more_position:'left';
      card.style.setProperty('--event-description-lines',String(lines));
      card.dataset.readMorePosition=position;
    });
  }

  async function load(){
    const client=db();if(!client)return;
    const{data,error}=await client.from('cosplay_events').select('id,title,description_preview_lines,read_more_position').eq('published',true);
    if(error){console.warn('[Preferências Ler mais]',error);return;}
    settings=data||[];apply();
  }

  new MutationObserver(()=>requestAnimationFrame(apply)).observe(grid,{childList:true,subtree:true});
  load();
})();
