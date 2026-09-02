(()=>{
  if(window.__COSPLAYCHESS_BANNER_UPLOAD__)return;
  window.__COSPLAYCHESS_BANNER_UPLOAD__=true;

  const bucket='cosplaychess-site-media';
  let savedPositions=null;

  const clamp=value=>Math.max(0,Math.min(100,Math.round(Number(value)||0)));

  const style=document.createElement('style');
  style.textContent=`
    .v8-banner-media{display:grid;gap:10px}
    .v8-banner-preview-wrap{position:relative;overflow:hidden;min-height:150px;border:1px solid rgba(148,163,184,.2);border-radius:14px;background:linear-gradient(135deg,#0b1522,#111827);touch-action:none;user-select:none}
    .v8-banner-preview{display:block;width:100%;height:clamp(150px,24vw,240px);object-fit:cover;object-position:50% 50%;pointer-events:none;user-select:none}
    .v8-banner-placeholder{display:grid;place-items:center;min-height:150px;padding:22px;text-align:center;color:#78879a;font-size:12px}
    .v8-banner-preview-wrap.is-positioning{cursor:grab;outline:2px solid rgba(139,92,246,.78);outline-offset:-2px}
    .v8-banner-preview-wrap.is-positioning:after{content:'✥ Arraste a imagem para posicionar';position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:4;padding:8px 12px;border-radius:999px;background:rgba(8,13,24,.86);border:1px solid rgba(167,139,250,.48);color:#fff;font-size:10px;font-weight:900;white-space:nowrap;pointer-events:none;box-shadow:0 10px 28px rgba(0,0,0,.28)}
    .v8-banner-preview-wrap.is-dragging{cursor:grabbing}
    .v8-banner-upload-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
    .v8-banner-upload-btn,.v8-banner-remove-btn,.v8-banner-position-btn,.v8-banner-center-btn{min-height:42px;padding:0 14px;border-radius:11px;font:inherit;font-size:12px;font-weight:900;cursor:pointer;transition:.18s ease}
    .v8-banner-upload-btn{border:1px solid rgba(139,92,246,.46);background:linear-gradient(135deg,rgba(124,58,237,.28),rgba(91,33,182,.2));color:#f4efff}
    .v8-banner-position-btn{border:1px solid rgba(56,189,248,.34);background:rgba(14,116,144,.14);color:#bae6fd}
    .v8-banner-center-btn{border:1px solid rgba(148,163,184,.26);background:rgba(51,65,85,.22);color:#d8e0ea}
    .v8-banner-remove-btn{border:1px solid rgba(244,63,94,.3);background:rgba(159,18,57,.13);color:#fda4af}
    .v8-banner-upload-btn:hover,.v8-banner-remove-btn:hover,.v8-banner-position-btn:hover,.v8-banner-center-btn:hover{transform:translateY(-1px)}
    .v8-banner-upload-btn:disabled,.v8-banner-remove-btn:disabled,.v8-banner-position-btn:disabled,.v8-banner-center-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
    .v8-banner-position-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 12px;border:1px solid rgba(148,163,184,.14);border-radius:11px;background:rgba(15,23,42,.34)}
    .v8-banner-position-copy{display:grid;gap:2px;min-width:190px}.v8-banner-position-copy b{font-size:11px;color:#dce7f5}.v8-banner-position-copy small{font-size:10px;color:#8291a4}
    .v8-banner-position-actions{display:flex;gap:7px;flex-wrap:wrap}
    .v8-banner-upload-hint,.v8-banner-upload-status{font-size:11px;line-height:1.45}
    .v8-banner-upload-hint{color:#7f8da0}.v8-banner-upload-status{min-height:16px;color:#c4b5fd}
    .v8-banner-upload-status.error{color:#fb7185}.v8-banner-upload-status.success{color:#55d69e}
    @media(max-width:760px){.v8-banner-upload-btn,.v8-banner-remove-btn,.v8-banner-position-btn,.v8-banner-center-btn{min-height:46px;flex:1}.v8-banner-position-copy,.v8-banner-position-actions{width:100%}.v8-banner-preview-wrap.is-positioning:after{max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis}}
  `;
  document.head.appendChild(style);

  function client(){
    try{if(typeof db!=='undefined'&&db)return db;}catch{}
    return window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();
  }

  async function loadSavedPositions(){
    if(savedPositions)return savedPositions;
    savedPositions=new Map();
    try{
      const dbClient=client();if(!dbClient)return savedPositions;
      const {data,error}=await dbClient.from('cosplay_site_content').select('content').eq('key','landing').maybeSingle();
      if(error)throw error;
      const banners=Array.isArray(data?.content?.banners)?data.content.banners:[];
      banners.forEach(item=>savedPositions.set(String(item.id||''),{x:clamp(item.imagePositionX??50),y:clamp(item.imagePositionY??50)}));
    }catch(error){console.warn('[Banner Position]',error);}
    return savedPositions;
  }

  function extension(file){
    const fromName=(file.name.split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(fromName)return fromName;
    const map={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
    return map[file.type]||'bin';
  }

  function safeId(){return crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;}

  function emit(input){
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function ensurePositionInputs(imageInput,card,position){
    const index=imageInput.dataset.index||'0';
    let x=card.querySelector('input[data-field="imagePositionX"]');
    let y=card.querySelector('input[data-field="imagePositionY"]');
    if(!x){
      x=document.createElement('input');x.type='hidden';x.dataset.view='banners';x.dataset.index=index;x.dataset.field='imagePositionX';card.appendChild(x);
    }
    if(!y){
      y=document.createElement('input');y.type='hidden';y.dataset.view='banners';y.dataset.index=index;y.dataset.field='imagePositionY';card.appendChild(y);
    }
    x.dataset.index=index;y.dataset.index=index;
    if(!x.value)x.value=String(position?.x??50);
    if(!y.value)y.value=String(position?.y??50);
    return{x,y};
  }

  function positionOf(box){return{x:clamp(box.dataset.positionX??50),y:clamp(box.dataset.positionY??50)};}

  function paintPosition(box,x,y,commit=false){
    x=clamp(x);y=clamp(y);
    box.dataset.positionX=String(x);box.dataset.positionY=String(y);
    const preview=box.querySelector('.v8-banner-preview');
    if(preview)preview.style.objectPosition=`${x}% ${y}%`;
    const readout=box.querySelector('.v8-banner-position-readout');
    if(readout)readout.textContent=`Horizontal ${x}% · Vertical ${y}%`;
    if(commit){
      const inputX=box._positionInputs?.x,inputY=box._positionInputs?.y;
      if(inputX){inputX.value=String(x);emit(inputX);}
      if(inputY){inputY.value=String(y);emit(inputY);}
      const status=box.querySelector('.v8-banner-upload-status');
      if(status){status.className='v8-banner-upload-status';status.textContent='Posição ajustada. Clique em “Salvar alterações” para publicar.';}
    }
  }

  function setVisual(box,url){
    const preview=box.querySelector('.v8-banner-preview');
    const placeholder=box.querySelector('.v8-banner-placeholder');
    const remove=box.querySelector('.v8-banner-remove-btn');
    const position=box.querySelector('.v8-banner-position-btn');
    const center=box.querySelector('.v8-banner-center-btn');
    const has=Boolean(url);
    preview.hidden=!has;placeholder.hidden=has;remove.hidden=!has;
    if(position)position.disabled=!has;if(center)center.disabled=!has;
    if(has){preview.src=url;const p=positionOf(box);preview.style.objectPosition=`${p.x}% ${p.y}%`;}
    else{preview.removeAttribute('src');box.classList.remove('is-positioning','is-dragging');box.dataset.positioning='0';}
  }

  function bindPositioning(box){
    const wrap=box.querySelector('.v8-banner-preview-wrap');
    const button=box.querySelector('.v8-banner-position-btn');
    const center=box.querySelector('.v8-banner-center-btn');
    let drag=null;

    const setMode=enabled=>{
      box.dataset.positioning=enabled?'1':'0';wrap.classList.toggle('is-positioning',enabled);
      if(button)button.textContent=enabled?'✓ Finalizar posição':'✥ Reposicionar imagem';
      const status=box.querySelector('.v8-banner-upload-status');
      if(status&&enabled){status.className='v8-banner-upload-status';status.textContent='Arraste a imagem dentro da prévia.';}
    };

    button?.addEventListener('click',()=>{
      if(button.disabled)return;
      setMode(box.dataset.positioning!=='1');
    });
    center?.addEventListener('click',()=>{
      if(center.disabled)return;
      paintPosition(box,50,50,true);setMode(false);
    });

    wrap.addEventListener('pointerdown',event=>{
      if(box.dataset.positioning!=='1'||box.querySelector('.v8-banner-preview')?.hidden)return;
      event.preventDefault();
      const p=positionOf(box),rect=wrap.getBoundingClientRect();
      drag={id:event.pointerId,startClientX:event.clientX,startClientY:event.clientY,startX:p.x,startY:p.y,width:Math.max(rect.width,1),height:Math.max(rect.height,1)};
      wrap.classList.add('is-dragging');
      try{wrap.setPointerCapture(event.pointerId);}catch{}
    });
    wrap.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      event.preventDefault();
      const dx=event.clientX-drag.startClientX,dy=event.clientY-drag.startClientY;
      paintPosition(box,drag.startX-(dx/drag.width)*100,drag.startY-(dy/drag.height)*100,false);
    });
    const finish=event=>{
      if(!drag||event.pointerId!==drag.id)return;
      const p=positionOf(box);drag=null;wrap.classList.remove('is-dragging');
      try{wrap.releasePointerCapture(event.pointerId);}catch{}
      paintPosition(box,p.x,p.y,true);
    };
    wrap.addEventListener('pointerup',finish);wrap.addEventListener('pointercancel',finish);
  }

  async function upload(input,file,box){
    const dbClient=client();
    const button=box.querySelector('.v8-banner-upload-btn');
    const remove=box.querySelector('.v8-banner-remove-btn');
    const status=box.querySelector('.v8-banner-upload-status');

    status.className='v8-banner-upload-status';
    if(!dbClient){status.classList.add('error');status.textContent='Armazenamento indisponível. Recarregue o painel e tente novamente.';return;}
    if(!file.type.startsWith('image/')){status.classList.add('error');status.textContent='Escolha um arquivo de imagem.';return;}
    if(file.size>80*1024*1024){status.classList.add('error');status.textContent='A imagem ultrapassa o limite de 80 MB.';return;}

    button.disabled=true;remove.disabled=true;status.textContent='Enviando imagem...';
    try{
      const path=`banners/${Date.now()}-${safeId()}.${extension(file)}`;
      const {error}=await dbClient.storage.from(bucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
      if(error)throw error;
      const url=dbClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      input.value=url;emit(input);
      paintPosition(box,50,50,true);setVisual(box,url);
      box.dataset.positioning='1';box.querySelector('.v8-banner-preview-wrap')?.classList.add('is-positioning');
      const posButton=box.querySelector('.v8-banner-position-btn');if(posButton)posButton.textContent='✓ Finalizar posição';
      status.classList.add('success');status.textContent='Imagem enviada. Arraste a prévia para escolher o enquadramento e depois salve as alterações.';
    }catch(error){
      console.error('[Banner Upload]',error);status.classList.add('error');status.textContent=error?.message||'Não foi possível enviar a imagem.';
    }finally{button.disabled=false;remove.disabled=false;}
  }

  async function decorate(){
    const map=await loadSavedPositions();
    document.querySelectorAll('#banners input[data-field="imageUrl"]').forEach(input=>{
      if(input.dataset.bannerUploadReady==='1')return;
      input.dataset.bannerUploadReady='1';input.type='hidden';
      const label=input.closest('.v8-field')||input.closest('label');if(!label)return;
      const card=input.closest('.v8-editor-card');if(!card)return;
      const title=label.querySelector(':scope > span');if(title)title.textContent='Imagem do banner';
      const saved=map.get(String(card.dataset.itemId||''))||{x:50,y:50};

      const box=document.createElement('div');box.className='v8-banner-media';box.dataset.positionX=String(saved.x);box.dataset.positionY=String(saved.y);
      box.innerHTML=`
        <div class="v8-banner-preview-wrap">
          <img class="v8-banner-preview" alt="Prévia da imagem do banner">
          <div class="v8-banner-placeholder">Nenhuma imagem selecionada</div>
        </div>
        <div class="v8-banner-position-row">
          <div class="v8-banner-position-copy"><b>Enquadramento do banner</b><small class="v8-banner-position-readout">Horizontal ${saved.x}% · Vertical ${saved.y}%</small></div>
          <div class="v8-banner-position-actions"><button type="button" class="v8-banner-position-btn">✥ Reposicionar imagem</button><button type="button" class="v8-banner-center-btn">Centralizar</button></div>
        </div>
        <div class="v8-banner-upload-actions">
          <button type="button" class="v8-banner-upload-btn">🖼️ Escolher imagem do computador</button>
          <button type="button" class="v8-banner-remove-btn">Remover imagem</button>
        </div>
        <div class="v8-banner-upload-hint">JPG, PNG, WebP ou GIF • até 80 MB. Use “Reposicionar imagem” e arraste a prévia para escolher o corte exibido no site.</div>
        <div class="v8-banner-upload-status" aria-live="polite"></div>`;
      input.insertAdjacentElement('afterend',box);
      box._positionInputs=ensurePositionInputs(input,card,saved);
      paintPosition(box,saved.x,saved.y,false);setVisual(box,input.value.trim());bindPositioning(box);

      box.querySelector('.v8-banner-upload-btn').addEventListener('click',()=>{
        const picker=document.createElement('input');picker.type='file';picker.accept='image/jpeg,image/png,image/webp,image/gif';picker.hidden=true;document.body.appendChild(picker);
        picker.addEventListener('change',async()=>{const file=picker.files?.[0];picker.remove();if(file)await upload(input,file,box);},{once:true});picker.click();
      });

      box.querySelector('.v8-banner-remove-btn').addEventListener('click',()=>{
        input.value='';emit(input);paintPosition(box,50,50,true);setVisual(box,'');
        const status=box.querySelector('.v8-banner-upload-status');status.className='v8-banner-upload-status';status.textContent='Imagem removida. Clique em “Salvar alterações” para confirmar.';
      });
    });
  }

  decorate();
  const observer=new MutationObserver(()=>decorate());observer.observe(document.body,{childList:true,subtree:true});
})();