(()=>{
  if(window.__COSPLAYCHESS_ADMIN_EVENT_READMORE__)return;
  window.__COSPLAYCHESS_ADMIN_EVENT_READMORE__=true;

  const db=()=>window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();
  const form=()=>document.getElementById('eventForm');
  const slugify=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

  function installFields(){
    const f=form();
    if(!f||f.querySelector('[data-event-readmore-settings]'))return;
    const anchor=f.querySelector('.toggle-row')||f.querySelector('.wide');
    const block=document.createElement('div');
    block.className='two event-readmore-settings';
    block.dataset.eventReadmoreSettings='true';
    block.innerHTML=`
      <label>
        <span>Linhas antes do “Ler mais”</span>
        <select name="descriptionPreviewLines">
          <option value="2">2 linhas</option>
          <option value="3" selected>3 linhas</option>
          <option value="4">4 linhas</option>
          <option value="5">5 linhas</option>
        </select>
        <small>Define quanto da descrição aparece antes de expandir.</small>
      </label>
      <label>
        <span>Posição do “Ler mais”</span>
        <select name="readMorePosition">
          <option value="left" selected>À esquerda</option>
          <option value="center">Centralizado</option>
          <option value="right">À direita</option>
          <option value="full">Largura total</option>
        </select>
        <small>Configuração individual para este evento.</small>
      </label>`;
    if(anchor)f.insertBefore(block,anchor);else f.appendChild(block);
  }

  function fill(event){
    installFields();
    const f=form();if(!f)return;
    f.elements.descriptionPreviewLines.value=String(Math.min(5,Math.max(2,Number(event?.description_preview_lines)||3)));
    f.elements.readMorePosition.value=['left','center','right','full'].includes(event?.read_more_position)?event.read_more_position:'left';
  }

  function eventFromCurrentForm(){
    const f=form();if(!f)return null;
    const id=f.elements.id?.value;
    if(id&&Array.isArray(window.currentEvents))return window.currentEvents.find(e=>e.id===id)||null;
    try{if(id&&typeof currentEvents!=='undefined'&&Array.isArray(currentEvents))return currentEvents.find(e=>e.id===id)||null;}catch{}
    return null;
  }

  async function persistSettings(){
    const f=form();const client=db();if(!f||!client)return;
    const lines=Math.min(5,Math.max(2,Number(f.elements.descriptionPreviewLines?.value)||3));
    const position=['left','center','right','full'].includes(f.elements.readMorePosition?.value)?f.elements.readMorePosition.value:'left';
    const id=f.elements.id?.value||'';
    const slug=slugify(f.elements.slug?.value||f.elements.title?.value||'');
    const payload={description_preview_lines:lines,read_more_position:position,updated_at:new Date().toISOString()};

    if(id){
      const{error}=await client.from('cosplay_events').update(payload).eq('id',id);
      if(error)console.warn('[Ler mais do evento]',error);
      return;
    }

    for(let attempt=0;attempt<8;attempt++){
      await new Promise(r=>setTimeout(r,250));
      const{data,error}=await client.from('cosplay_events').select('id').eq('slug',slug).order('created_at',{ascending:false}).limit(1).maybeSingle();
      if(error){console.warn('[Ler mais do evento]',error);return;}
      if(data?.id){
        const result=await client.from('cosplay_events').update(payload).eq('id',data.id);
        if(result.error)console.warn('[Ler mais do evento]',result.error);
        return;
      }
    }
  }

  function bind(){
    installFields();
    const f=form();if(!f)return;

    document.addEventListener('click',e=>{
      const edit=e.target.closest('button[onclick*="editEvent"]');
      if(edit){setTimeout(()=>fill(eventFromCurrentForm()),0);return;}
      if(e.target.closest('#newEventBtn,#v6NewEvent'))setTimeout(()=>fill(null),0);
    },true);

    const modal=document.getElementById('eventModal');
    if(modal)new MutationObserver(()=>{if(!modal.hidden)fill(eventFromCurrentForm());}).observe(modal,{attributes:true,attributeFilter:['hidden']});

    f.addEventListener('submit',()=>{setTimeout(persistSettings,60);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
