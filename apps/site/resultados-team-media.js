(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;
  if(!cfg||!window.supabase)return;

  const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const bucket='cosplaychess-site-media';

  const style=document.createElement('style');
  style.id='resultadosTeamMediaStyles';
  style.textContent=`
    .team-inline-photo-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:-2px 0 2px}
    .team-inline-photo-btn{appearance:none;border:1px solid #4a3c43;border-radius:9px;background:#18121c;color:#f0d18c;padding:8px 11px;font:800 10px/1.2 inherit;cursor:pointer;white-space:normal;text-align:center}
    .team-inline-photo-btn:hover{border-color:#d4aa5c}
    .team-inline-photo-btn:disabled{opacity:.55;cursor:wait}
    .team-inline-photo-status{font-size:9px;line-height:1.35;color:#a89eaa;min-height:12px}
    .team-inline-photo-status.ok{color:#d4aa5c}
    .team-inline-photo-status.error{color:#ff9f9f}
    @media(max-width:760px){.team-inline-photo-tools{display:grid;grid-template-columns:1fr}.team-inline-photo-btn{width:100%;padding:10px 12px}.team-inline-photo-status{font-size:10px}}
  `;
  if(!document.getElementById(style.id))document.head.appendChild(style);

  function extension(file){
    const fromName=(file.name.split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(fromName)return fromName;
    const map={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/svg+xml':'svg'};
    return map[file.type]||'bin';
  }

  function uid(){
    return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function uploadPhoto(input,button,status,file){
    if(!file)return;
    if(!/^image\/(jpeg|png|webp|gif|svg\+xml)$/i.test(file.type||'')){
      status.className='team-inline-photo-status error';
      status.textContent='Formato não aceito. Use JPG, PNG, WebP, GIF ou SVG.';
      return;
    }
    if(file.size>80*1024*1024){
      status.className='team-inline-photo-status error';
      status.textContent='A imagem ultrapassa o limite de 80 MB.';
      return;
    }

    try{
      button.disabled=true;
      status.className='team-inline-photo-status';
      status.textContent='Enviando foto...';
      const row=input.closest('[data-team-id]');
      const personId=(row?.dataset.teamId||'pessoa').replace(/[^a-z0-9_-]/gi,'-');
      const path=`team/${personId}/${Date.now()}-${uid()}.${extension(file)}`;
      const {error}=await db.storage.from(bucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
      if(error)throw error;
      const url=db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      input.value=url;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
      status.className='team-inline-photo-status ok';
      status.textContent='Foto enviada. Agora toque em “Salvar” nesta pessoa.';
    }catch(err){
      status.className='team-inline-photo-status error';
      status.textContent=err?.message||'Não foi possível enviar a foto.';
    }finally{
      button.disabled=false;
    }
  }

  function decorateInput(input){
    if(!(input instanceof HTMLInputElement)||input.dataset.inlineTeamMedia==='1')return;
    input.dataset.inlineTeamMedia='1';
    input.placeholder='URL da foto (opcional) — ou escolha uma foto abaixo';

    const tools=document.createElement('div');
    tools.className='team-inline-photo-tools';
    tools.dataset.teamPhotoTools='1';

    const button=document.createElement('button');
    button.type='button';
    button.className='team-inline-photo-btn';
    button.textContent='🖼️ Escolher foto — Drive, galeria ou arquivos';

    const status=document.createElement('span');
    status.className='team-inline-photo-status';
    status.textContent='Você também pode continuar colando um link acima.';

    button.addEventListener('click',()=>{
      const picker=document.createElement('input');
      picker.type='file';
      picker.accept='image/jpeg,image/png,image/webp,image/gif,image/svg+xml';
      picker.hidden=true;
      document.body.appendChild(picker);
      picker.addEventListener('change',async()=>{
        const file=picker.files?.[0];
        picker.remove();
        await uploadPhoto(input,button,status,file);
      },{once:true});
      picker.click();
    });

    tools.append(button,status);
    input.insertAdjacentElement('afterend',tools);
  }

  function decorate(){
    document.querySelectorAll('#teamEditor .team-editor-row input[data-field="photo_url"]').forEach(decorateInput);
  }

  decorate();
  const root=document.getElementById('teamEditor')||document.body;
  new MutationObserver(decorate).observe(root,{childList:true,subtree:true});
})();
