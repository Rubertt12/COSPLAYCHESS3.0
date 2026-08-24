(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;
  const db=window.COSPLAYCHESS_DB||window.getCosplayChessDb?.()||window.supabase?.createClient?.(cfg?.supabaseUrl,cfg?.supabaseKey);
  const tab=document.querySelector('[data-page="universe"]');
  const editor=document.getElementById('cmsEditor');
  const frame=document.getElementById('cmsFrame');
  if(!cfg||!db||!tab||!editor)return;
  const bucket='cosplaychess-site-media';
  let team=[];
  let busy=false;

  const E=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isUniverse=()=>tab.classList.contains('active');
  const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ext=file=>((file.name.split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,''))||({"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type]||'jpg');

  function installStyles(){
    if(document.getElementById('cmsTeamManagerStyles'))return;
    const s=document.createElement('style');s.id='cmsTeamManagerStyles';s.textContent=`
      .cms-team-manager .cms-fields{gap:12px}.cms-team-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:4px}.cms-team-toolbar p{margin:0;color:#8f8792;font-size:10px;line-height:1.45}.cms-team-list{display:grid;gap:12px}.cms-team-card{border:1px solid rgba(255,255,255,.08);border-radius:14px;background:#09121f;padding:12px;display:grid;gap:10px}.cms-team-card-head{display:flex;gap:10px;align-items:center}.cms-team-previews{display:flex;gap:7px}.cms-team-thumb{width:54px;height:54px;border-radius:10px;border:1px solid #304258;background:#0b1522 center/cover no-repeat;display:grid;place-items:center;color:#74859a;font-size:8px;text-align:center;overflow:hidden}.cms-team-thumb.mascot{width:42px}.cms-team-card-head>div:last-child{min-width:0}.cms-team-card-head b{display:block;color:#fff;font-size:13px}.cms-team-card-head small{display:block;color:#738198;font-size:9px;margin-top:2px}.cms-team-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cms-team-grid .wide{grid-column:1/-1}.cms-team-card input,.cms-team-card textarea{width:100%;box-sizing:border-box;background:#06101b;color:#eef3fb;border:1px solid #2b3c51;border-radius:9px;padding:9px 10px;outline:none}.cms-team-card textarea{min-height:82px;resize:vertical}.cms-team-label{display:grid;gap:5px}.cms-team-label>span{font-size:8px;text-transform:uppercase;letter-spacing:.8px;color:#7e8ea2;font-weight:800}.cms-team-media{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:end}.cms-team-upload{border:1px solid #4a3c43;background:#18121c;color:#f0d18c;border-radius:9px;padding:9px 10px;font-size:9px;font-weight:800;cursor:pointer;white-space:nowrap}.cms-team-actions{display:flex;gap:7px;align-items:center;justify-content:space-between;flex-wrap:wrap}.cms-team-actions-left,.cms-team-actions-right{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.cms-team-check{display:flex;gap:6px;align-items:center;color:#aab5c3;font-size:9px}.cms-team-check input{width:auto}.cms-team-order{width:72px!important}.cms-team-mini{border:1px solid #31445c;background:#0b1725;color:#dce8f7;border-radius:8px;padding:7px 9px;cursor:pointer;font-size:9px}.cms-team-mini.save{border-color:#7d6125;color:#f4cf77}.cms-team-mini.danger{border-color:#66313a;color:#ff9ca9}.cms-team-status{font-size:9px;color:#86a0b8;min-height:12px}.cms-team-status.ok{color:#78d6a6}.cms-team-status.error{color:#ff9ca9}.cms-team-empty{padding:14px;text-align:center;border:1px dashed #2f4054;border-radius:10px;color:#7d8b9d;font-size:10px}@media(max-width:760px){.cms-team-grid{grid-template-columns:1fr}.cms-team-grid .wide{grid-column:auto}.cms-team-media{grid-template-columns:1fr}.cms-team-upload{width:100%}.cms-team-actions{align-items:stretch}.cms-team-actions-left,.cms-team-actions-right{width:100%}.cms-team-actions-right>*{flex:1}}
    `;document.head.appendChild(s);
  }

  function reloadPreview(){
    if(!frame)return;
    const src=frame.getAttribute('src')||frame.src;
    if(src)frame.src=src;
  }

  async function load(){
    const {data,error}=await db.from('cosplay_team_members').select('*').order('sort_order');
    if(error)throw error;
    team=data||[];
  }

  function group(){return editor.querySelector('[data-cms-team-manager]')}
  function placeGroup(el){
    const groups=[...editor.querySelectorAll(':scope > .cms-group')];
    const equipe=groups.find(g=>g.querySelector('summary span')?.textContent.trim()==='Equipe');
    if(equipe)equipe.insertAdjacentElement('afterend',el);else editor.appendChild(el);
  }

  function previewStyle(url){return url?`background-image:url('${E(url)}')`:''}
  function card(m){return `<article class="cms-team-card" data-team-id="${E(m.id)}">
    <div class="cms-team-card-head"><div class="cms-team-previews"><div class="cms-team-thumb" data-photo-preview style="${previewStyle(m.photo_url)}">${m.photo_url?'':'FOTO'}</div><div class="cms-team-thumb mascot" data-mascot-preview style="${previewStyle(m.mascot_url)}">${m.mascot_url?'':'BONECO'}</div></div><div><b>${E(m.name||'Nova pessoa')}</b><small>${E(m.role||'Fergorverse')}</small></div></div>
    <div class="cms-team-grid">
      <label class="cms-team-label"><span>Nome</span><input data-team-field="name" value="${E(m.name||'')}"></label>
      <label class="cms-team-label"><span>Função</span><input data-team-field="role" value="${E(m.role||'')}"></label>
      <label class="cms-team-label wide"><span>Bio</span><textarea data-team-field="bio">${E(m.bio||'')}</textarea></label>
      <label class="cms-team-label wide"><span>Foto real</span><div class="cms-team-media"><input data-team-field="photo_url" data-media-upload-ready="1" type="url" value="${E(m.photo_url||'')}" placeholder="URL da foto"><button class="cms-team-upload" type="button" data-upload="photo_url">🖼️ Escolher foto</button></div></label>
      <label class="cms-team-label wide"><span>Bonequinho / personagem</span><div class="cms-team-media"><input data-team-field="mascot_url" data-media-upload-ready="1" type="url" value="${E(m.mascot_url||'')}" placeholder="Imagem do bonequinho que aparece à direita"><button class="cms-team-upload" type="button" data-upload="mascot_url">🎭 Escolher bonequinho</button></div></label>
    </div>
    <div class="cms-team-actions"><div class="cms-team-actions-left"><label class="cms-team-check"><input type="checkbox" data-team-field="published" ${m.published?'checked':''}> Publicado</label><label class="cms-team-label"><span>Ordem</span><input class="cms-team-order" type="number" data-team-field="sort_order" value="${Number(m.sort_order)||0}"></label><button class="cms-team-mini" type="button" data-move="-1">↑</button><button class="cms-team-mini" type="button" data-move="1">↓</button></div><div class="cms-team-actions-right"><button class="cms-team-mini save" type="button" data-save>Salvar card</button><button class="cms-team-mini danger" type="button" data-delete>Excluir</button></div></div>
    <div class="cms-team-status" data-row-status></div>
  </article>`}

  function render(){
    if(!isUniverse())return;
    let el=group();if(!el){el=document.createElement('details');el.className='cms-group cms-team-manager';el.dataset.cmsTeamManager='1';el.open=true;placeGroup(el)}
    el.innerHTML=`<summary><span>Cards da equipe</span><small>${team.length} integrante${team.length===1?'':'s'} • adicionar, remover e editar</small></summary><div class="cms-fields"><div class="cms-team-toolbar"><p>Gerencie os cards que aparecem em “Nosso time”. A foto pequena e o bonequinho são imagens independentes.</p><button class="cms-btn primary" type="button" data-add-team>+ Adicionar card</button></div><div class="cms-team-list">${team.length?team.map(card).join(''):'<div class="cms-team-empty">Nenhum integrante cadastrado.</div>'}</div></div>`;
    bind(el);
  }

  function rowValues(row){
    const get=f=>row.querySelector(`[data-team-field="${f}"]`);
    return {name:get('name').value.trim()||'Nova pessoa',role:get('role').value.trim(),bio:get('bio').value.trim(),photo_url:get('photo_url').value.trim()||null,mascot_url:get('mascot_url').value.trim()||null,published:get('published').checked,sort_order:Number(get('sort_order').value)||0,updated_at:new Date().toISOString()};
  }
  function rowStatus(row,text,type=''){const el=row.querySelector('[data-row-status]');if(!el)return;el.className=`cms-team-status ${type}`;el.textContent=text}

  async function saveRow(row){
    const id=row.dataset.teamId,payload=rowValues(row);rowStatus(row,'Salvando...');
    const {error}=await db.from('cosplay_team_members').update(payload).eq('id',id);
    if(error){rowStatus(row,error.message,'error');return}
    Object.assign(team.find(x=>x.id===id)||{},payload);rowStatus(row,'Card salvo e publicado na equipe.','ok');reloadPreview();
  }

  async function removeRow(row){
    const member=team.find(x=>x.id===row.dataset.teamId);if(!confirm(`Excluir ${member?.name||'esta pessoa'} da equipe?`))return;
    const {error}=await db.from('cosplay_team_members').delete().eq('id',row.dataset.teamId);if(error){rowStatus(row,error.message,'error');return}
    team=team.filter(x=>x.id!==row.dataset.teamId);render();reloadPreview();
  }

  async function moveRow(row,delta){
    const id=row.dataset.teamId,index=team.findIndex(x=>x.id===id),target=index+Number(delta);if(index<0||target<0||target>=team.length)return;
    const a=team[index],b=team[target],ao=Number(a.sort_order)||index*10,bo=Number(b.sort_order)||target*10;
    const updates=[db.from('cosplay_team_members').update({sort_order:bo,updated_at:new Date().toISOString()}).eq('id',a.id),db.from('cosplay_team_members').update({sort_order:ao,updated_at:new Date().toISOString()}).eq('id',b.id)];
    const res=await Promise.all(updates);if(res.some(x=>x.error)){rowStatus(row,'Não foi possível alterar a ordem.','error');return}
    await load();render();reloadPreview();
  }

  async function upload(row,field){
    if(busy)return;
    const picker=document.createElement('input');picker.type='file';picker.accept='image/jpeg,image/png,image/webp,image/gif';picker.hidden=true;document.body.appendChild(picker);
    picker.onchange=async()=>{const file=picker.files?.[0];picker.remove();if(!file)return;if(file.size>20*1024*1024){rowStatus(row,'Imagem acima de 20 MB.','error');return}
      const btn=row.querySelector(`[data-upload="${field}"]`);try{busy=true;btn.disabled=true;rowStatus(row,'Enviando imagem...');const path=`team/${row.dataset.teamId}/${field}-${Date.now()}-${uid()}.${ext(file)}`;const {error}=await db.storage.from(bucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});if(error)throw error;const url=db.storage.from(bucket).getPublicUrl(path).data.publicUrl;const input=row.querySelector(`[data-team-field="${field}"]`);input.value=url;const prev=row.querySelector(field==='photo_url'?'[data-photo-preview]':'[data-mascot-preview]');prev.style.backgroundImage=`url('${url}')`;prev.textContent='';rowStatus(row,'Imagem enviada. Clique em “Salvar card”.','ok')}catch(e){rowStatus(row,e.message||'Falha no upload.','error')}finally{busy=false;btn.disabled=false}};picker.click();
  }

  async function add(){
    const order=(team.at(-1)?.sort_order||0)+10;
    const {data,error}=await db.from('cosplay_team_members').insert({name:'Nova pessoa',role:'Fergorverse',bio:'',sort_order:order,published:false,mascot_url:null}).select().single();
    if(error){alert(error.message);return}team.push(data);render();setTimeout(()=>group()?.scrollIntoView({behavior:'smooth',block:'center'}),80);reloadPreview();
  }

  function bind(el){
    el.querySelector('[data-add-team]')?.addEventListener('click',add);
    el.querySelectorAll('[data-team-id]').forEach(row=>{
      row.querySelector('[data-save]')?.addEventListener('click',()=>saveRow(row));
      row.querySelector('[data-delete]')?.addEventListener('click',()=>removeRow(row));
      row.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>moveRow(row,b.dataset.move)));
      row.querySelectorAll('[data-upload]').forEach(b=>b.addEventListener('click',()=>upload(row,b.dataset.upload)));
      row.querySelectorAll('[data-team-field="name"],[data-team-field="role"]').forEach(input=>input.addEventListener('input',()=>{const head=row.querySelector('.cms-team-card-head>div:last-child');if(head){head.querySelector('b').textContent=row.querySelector('[data-team-field="name"]').value||'Nova pessoa';head.querySelector('small').textContent=row.querySelector('[data-team-field="role"]').value||'Fergorverse'}}));
    });
  }

  async function activate(){if(!isUniverse())return;try{await load();render()}catch(e){console.error(e)}}
  installStyles();
  tab.addEventListener('click',()=>setTimeout(activate,120));
  new MutationObserver(()=>{if(isUniverse()&&!group())setTimeout(()=>{if(isUniverse())render()},30)}).observe(editor,{childList:true});
  if(isUniverse())setTimeout(activate,300);
})();
