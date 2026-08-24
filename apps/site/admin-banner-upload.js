(()=>{
  if(window.__COSPLAYCHESS_BANNER_UPLOAD__)return;
  window.__COSPLAYCHESS_BANNER_UPLOAD__=true;

  const bucket='cosplaychess-site-media';

  const style=document.createElement('style');
  style.textContent=`
    .v8-banner-media{display:grid;gap:10px}
    .v8-banner-preview-wrap{position:relative;overflow:hidden;min-height:150px;border:1px solid rgba(148,163,184,.2);border-radius:14px;background:linear-gradient(135deg,#0b1522,#111827)}
    .v8-banner-preview{display:block;width:100%;height:clamp(150px,24vw,240px);object-fit:cover}
    .v8-banner-placeholder{display:grid;place-items:center;min-height:150px;padding:22px;text-align:center;color:#78879a;font-size:12px}
    .v8-banner-upload-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
    .v8-banner-upload-btn,.v8-banner-remove-btn{min-height:42px;padding:0 14px;border-radius:11px;font:inherit;font-size:12px;font-weight:900;cursor:pointer;transition:.18s ease}
    .v8-banner-upload-btn{border:1px solid rgba(139,92,246,.46);background:linear-gradient(135deg,rgba(124,58,237,.28),rgba(91,33,182,.2));color:#f4efff}
    .v8-banner-remove-btn{border:1px solid rgba(244,63,94,.3);background:rgba(159,18,57,.13);color:#fda4af}
    .v8-banner-upload-btn:hover,.v8-banner-remove-btn:hover{transform:translateY(-1px)}
    .v8-banner-upload-btn:disabled,.v8-banner-remove-btn:disabled{opacity:.55;cursor:wait;transform:none}
    .v8-banner-upload-hint,.v8-banner-upload-status{font-size:11px;line-height:1.45}
    .v8-banner-upload-hint{color:#7f8da0}.v8-banner-upload-status{min-height:16px;color:#c4b5fd}
    .v8-banner-upload-status.error{color:#fb7185}.v8-banner-upload-status.success{color:#55d69e}
    @media(max-width:760px){.v8-banner-upload-btn,.v8-banner-remove-btn{min-height:46px;flex:1}}
  `;
  document.head.appendChild(style);

  function client(){
    try{
      if(typeof db!=='undefined'&&db)return db;
    }catch{}
    return window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();
  }

  function extension(file){
    const fromName=(file.name.split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(fromName)return fromName;
    const map={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
    return map[file.type]||'bin';
  }

  function safeId(){
    return crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function emit(input){
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function setVisual(box,url){
    const preview=box.querySelector('.v8-banner-preview');
    const placeholder=box.querySelector('.v8-banner-placeholder');
    const remove=box.querySelector('.v8-banner-remove-btn');
    const has=Boolean(url);
    preview.hidden=!has;
    placeholder.hidden=has;
    remove.hidden=!has;
    if(has)preview.src=url;
    else preview.removeAttribute('src');
  }

  async function upload(input,file,box){
    const dbClient=client();
    const button=box.querySelector('.v8-banner-upload-btn');
    const remove=box.querySelector('.v8-banner-remove-btn');
    const status=box.querySelector('.v8-banner-upload-status');

    status.className='v8-banner-upload-status';
    if(!dbClient){
      status.classList.add('error');
      status.textContent='Armazenamento indisponível. Recarregue o painel e tente novamente.';
      return;
    }
    if(!file.type.startsWith('image/')){
      status.classList.add('error');
      status.textContent='Escolha um arquivo de imagem.';
      return;
    }
    if(file.size>80*1024*1024){
      status.classList.add('error');
      status.textContent='A imagem ultrapassa o limite de 80 MB.';
      return;
    }

    button.disabled=true;
    remove.disabled=true;
    status.textContent='Enviando imagem...';

    try{
      const path=`banners/${Date.now()}-${safeId()}.${extension(file)}`;
      const {error}=await dbClient.storage.from(bucket).upload(path,file,{
        cacheControl:'3600',
        upsert:false,
        contentType:file.type||undefined
      });
      if(error)throw error;

      const url=dbClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      input.value=url;
      emit(input);
      setVisual(box,url);
      status.classList.add('success');
      status.textContent='Imagem enviada. Clique em “Salvar alterações” para publicar.';
    }catch(error){
      console.error('[Banner Upload]',error);
      status.classList.add('error');
      status.textContent=error?.message||'Não foi possível enviar a imagem.';
    }finally{
      button.disabled=false;
      remove.disabled=false;
    }
  }

  function decorate(){
    document.querySelectorAll('#banners input[data-field="imageUrl"]').forEach(input=>{
      if(input.dataset.bannerUploadReady==='1')return;
      input.dataset.bannerUploadReady='1';
      input.type='hidden';

      const label=input.closest('.v8-field')||input.closest('label');
      if(!label)return;

      const title=label.querySelector(':scope > span');
      if(title)title.textContent='Imagem do banner';

      const box=document.createElement('div');
      box.className='v8-banner-media';
      box.innerHTML=`
        <div class="v8-banner-preview-wrap">
          <img class="v8-banner-preview" alt="Prévia da imagem do banner">
          <div class="v8-banner-placeholder">Nenhuma imagem selecionada</div>
        </div>
        <div class="v8-banner-upload-actions">
          <button type="button" class="v8-banner-upload-btn">🖼️ Escolher imagem do computador</button>
          <button type="button" class="v8-banner-remove-btn">Remover imagem</button>
        </div>
        <div class="v8-banner-upload-hint">JPG, PNG, WebP ou GIF • até 80 MB</div>
        <div class="v8-banner-upload-status" aria-live="polite"></div>
      `;
      input.insertAdjacentElement('afterend',box);
      setVisual(box,input.value.trim());

      box.querySelector('.v8-banner-upload-btn').addEventListener('click',()=>{
        const picker=document.createElement('input');
        picker.type='file';
        picker.accept='image/jpeg,image/png,image/webp,image/gif';
        picker.hidden=true;
        document.body.appendChild(picker);
        picker.addEventListener('change',async()=>{
          const file=picker.files?.[0];
          picker.remove();
          if(file)await upload(input,file,box);
        },{once:true});
        picker.click();
      });

      box.querySelector('.v8-banner-remove-btn').addEventListener('click',()=>{
        input.value='';
        emit(input);
        setVisual(box,'');
        const status=box.querySelector('.v8-banner-upload-status');
        status.className='v8-banner-upload-status';
        status.textContent='Imagem removida. Clique em “Salvar alterações” para confirmar.';
      });
    });
  }

  decorate();
  const observer=new MutationObserver(decorate);
  observer.observe(document.body,{childList:true,subtree:true});
})();