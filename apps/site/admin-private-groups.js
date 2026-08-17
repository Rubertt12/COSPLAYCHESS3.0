(()=>{
  if(typeof db==='undefined')return;
  const D=db;
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let mounted=false;

  async function renderPrivateGroups(){
    const root=document.getElementById('eventGroupsList');
    if(!root)return;
    root.innerHTML='<div class="empty-card">Carregando configuração privada...</div>';
    const [{data:events,error:eventError},{data:privateRows,error:privateError}]=await Promise.all([
      D.from('cosplay_events').select('id,title,start_at').order('start_at',{ascending:false}),
      D.from('cosplay_event_private').select('event_id,whatsapp_group_url')
    ]);
    const error=eventError||privateError;
    if(error){root.innerHTML=`<div class="empty-card">${esc(error.message)}</div>`;return;}
    const map=new Map((privateRows||[]).map(row=>[String(row.event_id),row.whatsapp_group_url||'']));
    root.innerHTML=(events||[]).length?(events||[]).map(e=>`<div class="group-row"><b>${esc(e.title)}</b><input data-private-group-id="${e.id}" value="${esc(map.get(String(e.id))||'')}" placeholder="https://chat.whatsapp.com/..." autocomplete="off"><button type="button" class="mini-btn" data-save-private-group="${e.id}">Salvar</button></div>`).join(''):'<div class="empty-card">Crie um evento para configurar o grupo dele.</div>';
    root.querySelectorAll('[data-save-private-group]').forEach(button=>button.onclick=async()=>{
      const eventId=button.dataset.savePrivateGroup;
      const input=root.querySelector(`[data-private-group-id="${eventId}"]`);
      const value=input?.value.trim()||'';
      button.disabled=true;button.textContent='Salvando...';
      const{data:{user}}=await D.auth.getUser();
      const{error}=await D.from('cosplay_event_private').upsert({event_id:eventId,whatsapp_group_url:value||null,updated_at:new Date().toISOString(),updated_by:user?.id||null},{onConflict:'event_id'});
      button.textContent=error?'Erro':'Salvo ✓';
      if(error)console.error('private group save failed',error.message);
      setTimeout(()=>{button.textContent='Salvar';button.disabled=false},1200);
    });
  }

  function tryMount(){
    const root=document.getElementById('eventGroupsList');
    if(!root)return false;
    if(!mounted){
      mounted=true;
      root.dataset.privateSource='1';
      const refresh=document.getElementById('refreshGroupsBtn');
      if(refresh)refresh.onclick=renderPrivateGroups;
    }
    renderPrivateGroups();
    return true;
  }

  const timer=setInterval(()=>{if(tryMount())clearInterval(timer)},300);
  setTimeout(()=>clearInterval(timer),10000);
})();
