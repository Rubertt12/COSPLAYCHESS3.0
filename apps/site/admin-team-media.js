(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;
  if(!cfg||!window.supabase)return;
  const D=typeof db!=='undefined'?db:window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const bucket='cosplaychess-site-media';

  const style=document.createElement('style');
  style.textContent=`
    .team-photo-upload{display:grid;gap:8px;margin-top:8px}
    .team-photo-upload-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .team-photo-upload-btn{border:1px solid #4a3c43;border-radius:9px;background:#18121c;color:#f0d18c;padding:9px 11px;font-size:11px;font-weight:800;cursor:pointer}
    .team-photo-upload-btn:hover{border-color:#d4aa5c}
    .team-photo-upload-btn:disabled{opacity:.55;cursor:wait}
    .team-photo-upload-hint{font-size:10px;color:#9d939f;line-height:1.45}
    .team-photo-upload-status{font-size:10px;color:#d4aa5c;min-height:15px}
    .team-photo-upload-preview{width:88px;height:88px;border-radius:14px;object-fit:cover;border:1px solid #3e343f;background:#0b0810}
  `;
  document.head.appendChild(style);

  function extension(file){
    const fromName=(file.name.split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(fromName)return fromName;
    const map={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/svg+xml':'svg'};
    return map[file.type]||'bin';
  }

  function decorate(){
    const form=document.getElementById('cmsTeamForm');
    if(!form)return;
    const input=form.querySelector('input[name="photo"]');
    if(!input||input.dataset.teamMediaReady==='1')return;
    input.dataset.teamMediaReady='1';
    input.type='url';
    input.placeholder='Cole uma URL ou escolha uma foto abaixo';
    const label=input.closest('label');
    const title=label?.querySelector('span');
    if(title)title.textContent='Foto';

    const box=document.createElement('div');
    box.className='team-photo-upload';
    const preview=document.createElement('img');
    preview.className='team-photo-upload-preview';
    preview.alt='Prévia da foto';
    preview.hidden=!input.value;
    if(input.value)preview.src=input.value;

    const row=document.createElement('div');
    row.className='team-photo-upload-row';
    const button=document.createElement('button');
    button.type='button';
    button.className='team-photo-upload-btn';
    button.textContent='🖼️ Escolher foto — Drive, galeria ou arquivos';
    const hint=document.createElement('span');
    hint.className='team-photo-upload-hint';
    hint.textContent='JPG, PNG, WebP, GIF ou SVG • até 80 MB';
    const status=document.createElement('div');
    status.className='team-photo-upload-status';
    row.append(button,hint);
    box.append(preview,row,status);
    input.insertAdjacentElement('afterend',box);

    input.addEventListener('input',()=>{
      const url=input.value.trim();
      preview.hidden=!url;
      if(url)preview.src=url;
    });

    button.addEventListener('click',()=>{
      const picker=document.createElement('input');
      picker.type='file';
      picker.accept='image/jpeg,image/png,image/webp,image/gif,image/svg+xml';
      picker.hidden=true;
      document.body.appendChild(picker);
      picker.onchange=async()=>{
        const file=picker.files?.[0];
        picker.remove();
        if(!file)return;
        if(file.size>80*1024*1024){
          status.textContent='A imagem ultrapassa o limite de 80 MB.';
          return;
        }
        try{
          button.disabled=true;
          status.textContent='Enviando foto...';
          const path=`team/${Date.now()}-${crypto.randomUUID()}.${extension(file)}`;
          const {error}=await D.storage.from(bucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
          if(error)throw error;
          const url=D.storage.from(bucket).getPublicUrl(path).data.publicUrl;
          input.value=url;
          input.dispatchEvent(new Event('input',{bubbles:true}));
          input.dispatchEvent(new Event('change',{bubbles:true}));
          preview.src=url;
          preview.hidden=false;
          status.textContent='Foto enviada. Agora clique em “Salvar bio”.';
        }catch(err){
          status.textContent=err.message||'Não foi possível enviar a foto.';
        }finally{
          button.disabled=false;
        }
      };
      picker.click();
    });
  }

  decorate();
  new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});
})();
