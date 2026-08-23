(()=>{
  const DEFAULT_CROP={x:50,y:50,zoom:1};
  const clamp=(value,min,max,fallback)=>{
    const number=Number(value);
    return Number.isFinite(number)?Math.min(max,Math.max(min,number)):fallback;
  };
  const safe=(value='')=>String(value).replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function cropFromRegistration(row={}){
    const extra=row.extra_fields&&typeof row.extra_fields==='object'?row.extra_fields:{};
    const stored=extra.photo_crop&&typeof extra.photo_crop==='object'
      ?extra.photo_crop
      :(extra.photoCrop&&typeof extra.photoCrop==='object'?extra.photoCrop:{});
    return {
      x:clamp(stored.x,0,100,DEFAULT_CROP.x),
      y:clamp(stored.y,0,100,DEFAULT_CROP.y),
      zoom:clamp(stored.zoom,1,3,DEFAULT_CROP.zoom)
    };
  }

  function imageStyle(row){
    const crop=cropFromRegistration(row);
    return `object-position:${crop.x}% ${crop.y}%;transform:scale(${crop.zoom});transform-origin:${crop.x}% ${crop.y}%`;
  }

  window.registrationPhotoCrop=cropFromRegistration;
  window.registrationPhotoImageStyle=imageStyle;
  window.registrationPhotoMarkup=row=>{
    if(!row?.character_photo_url)return '<div class="avatar registration-photo-empty" aria-hidden="true">♟</div>';
    const label=safe(row.character_name||row.full_name||'inscrito');
    return `<button type="button" class="avatar registration-photo-avatar" onclick="openRegistrationPhotoEditor('${safe(row.id)}')" title="Ajustar posição da foto" aria-label="Ajustar foto de ${label}"><img src="${safe(row.character_photo_url)}" alt="" loading="lazy" draggable="false" style="${imageStyle(row)}"><span class="registration-photo-avatar-hint" aria-hidden="true">✎</span></button>`;
  };
  window.registrationPhotoEditButton=row=>row?.character_photo_url
    ?`<button type="button" class="registration-photo-edit-btn" onclick="openRegistrationPhotoEditor('${safe(row.id)}')">✎ Ajustar foto</button>`
    :'';

  let activeRegistration=null;
  let pendingCrop={...DEFAULT_CROP};
  let dragState=null;

  function ensureModal(){
    if(document.getElementById('registrationPhotoModal'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <div id="registrationPhotoModal" class="modal registration-photo-modal" hidden>
        <div class="registration-photo-modal-card" role="dialog" aria-modal="true" aria-labelledby="registrationPhotoTitle">
          <button type="button" class="modal-close registration-photo-close" aria-label="Fechar">×</button>
          <span class="kicker">ENQUADRAMENTO</span>
          <h2 id="registrationPhotoTitle">Ajustar foto</h2>
          <p class="registration-photo-description">Arraste a foto para colocar o rosto no lugar certo. Se precisar, use os controles de posição e zoom.</p>
          <form id="registrationPhotoForm">
            <div class="registration-photo-editor-grid">
              <div>
                <div id="registrationPhotoPreview" class="registration-photo-preview" title="Arraste para reposicionar">
                  <img id="registrationPhotoPreviewImage" alt="Prévia do enquadramento" draggable="false">
                  <span>Arraste para reposicionar</span>
                </div>
                <small class="registration-photo-original-note">A imagem original não será cortada nem alterada.</small>
              </div>
              <div class="registration-photo-controls">
                <label>
                  <span>Posição horizontal <b id="registrationPhotoXValue">50%</b></span>
                  <input id="registrationPhotoX" type="range" min="0" max="100" step="1" value="50">
                </label>
                <label>
                  <span>Posição vertical <b id="registrationPhotoYValue">50%</b></span>
                  <input id="registrationPhotoY" type="range" min="0" max="100" step="1" value="50">
                </label>
                <label>
                  <span>Zoom <b id="registrationPhotoZoomValue">1.00×</b></span>
                  <input id="registrationPhotoZoom" type="range" min="1" max="3" step="0.01" value="1">
                </label>
                <div class="registration-photo-actions">
                  <button id="registrationPhotoReset" type="button" class="mini-btn">Centralizar</button>
                  <button id="registrationPhotoSave" type="submit" class="v5-btn gold">Salvar enquadramento</button>
                </div>
                <div id="registrationPhotoStatus" class="form-status" aria-live="polite"></div>
              </div>
            </div>
          </form>
        </div>
      </div>`);

    const modal=document.getElementById('registrationPhotoModal');
    const preview=document.getElementById('registrationPhotoPreview');
    const close=()=>{
      modal.hidden=true;
      activeRegistration=null;
      dragState=null;
    };
    modal.querySelector('.registration-photo-close').onclick=close;
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden)close();});

    ['registrationPhotoX','registrationPhotoY','registrationPhotoZoom'].forEach(id=>{
      document.getElementById(id).addEventListener('input',readControls);
    });
    document.getElementById('registrationPhotoReset').onclick=()=>{
      pendingCrop={...DEFAULT_CROP};
      syncControls();
    };

    preview.addEventListener('pointerdown',event=>{
      if(!activeRegistration)return;
      preview.setPointerCapture?.(event.pointerId);
      dragState={pointerId:event.pointerId,x:event.clientX,y:event.clientY,crop:{...pendingCrop}};
      preview.classList.add('dragging');
    });
    preview.addEventListener('pointermove',event=>{
      if(!dragState||dragState.pointerId!==event.pointerId)return;
      const rect=preview.getBoundingClientRect();
      const factor=Math.max(1,pendingCrop.zoom);
      pendingCrop.x=clamp(dragState.crop.x-((event.clientX-dragState.x)/Math.max(1,rect.width))*100/factor,0,100,50);
      pendingCrop.y=clamp(dragState.crop.y-((event.clientY-dragState.y)/Math.max(1,rect.height))*100/factor,0,100,50);
      syncControls();
    });
    const finishDrag=event=>{
      if(dragState&&dragState.pointerId===event.pointerId){
        dragState=null;
        preview.classList.remove('dragging');
      }
    };
    preview.addEventListener('pointerup',finishDrag);
    preview.addEventListener('pointercancel',finishDrag);

    document.getElementById('registrationPhotoForm').onsubmit=saveCrop;
  }

  function readControls(){
    pendingCrop={
      x:clamp(document.getElementById('registrationPhotoX').value,0,100,50),
      y:clamp(document.getElementById('registrationPhotoY').value,0,100,50),
      zoom:clamp(document.getElementById('registrationPhotoZoom').value,1,3,1)
    };
    updatePreview();
  }

  function syncControls(){
    document.getElementById('registrationPhotoX').value=String(pendingCrop.x);
    document.getElementById('registrationPhotoY').value=String(pendingCrop.y);
    document.getElementById('registrationPhotoZoom').value=String(pendingCrop.zoom);
    updatePreview();
  }

  function updatePreview(){
    const image=document.getElementById('registrationPhotoPreviewImage');
    if(!image)return;
    image.style.objectPosition=`${pendingCrop.x}% ${pendingCrop.y}%`;
    image.style.transform=`scale(${pendingCrop.zoom})`;
    image.style.transformOrigin=`${pendingCrop.x}% ${pendingCrop.y}%`;
    document.getElementById('registrationPhotoXValue').textContent=`${Math.round(pendingCrop.x)}%`;
    document.getElementById('registrationPhotoYValue').textContent=`${Math.round(pendingCrop.y)}%`;
    document.getElementById('registrationPhotoZoomValue').textContent=`${pendingCrop.zoom.toFixed(2)}×`;
  }

  async function saveCrop(event){
    event.preventDefault();
    if(!activeRegistration)return;
    const saveButton=document.getElementById('registrationPhotoSave');
    const status=document.getElementById('registrationPhotoStatus');
    const extra=activeRegistration.extra_fields&&typeof activeRegistration.extra_fields==='object'
      ?activeRegistration.extra_fields:{};
    const photoCrop={
      x:Number(pendingCrop.x.toFixed(2)),
      y:Number(pendingCrop.y.toFixed(2)),
      zoom:Number(pendingCrop.zoom.toFixed(2))
    };
    saveButton.disabled=true;
    status.className='form-status';
    status.textContent='Salvando enquadramento...';
    try{
      const client=window.COSPLAYCHESS_DB;
      if(!client)throw new Error('Conexão com o banco não encontrada. Recarregue a página.');
      const {data,error}=await client.from('cosplay_registrations')
        .update({extra_fields:{...extra,photo_crop:photoCrop},updated_at:new Date().toISOString()})
        .eq('id',activeRegistration.id)
        .select('id,extra_fields,updated_at')
        .single();
      if(error)throw error;
      activeRegistration.extra_fields=data.extra_fields;
      activeRegistration.updated_at=data.updated_at;
      status.className='form-status success';
      status.textContent='Foto ajustada com sucesso.';
      if(typeof window.renderRegistrations==='function')window.renderRegistrations();
      setTimeout(()=>{document.getElementById('registrationPhotoModal').hidden=true;activeRegistration=null;},450);
    }catch(error){
      status.className='form-status error';
      status.textContent=error?.message||'Não foi possível salvar o enquadramento.';
    }finally{
      saveButton.disabled=false;
    }
  }

  window.openRegistrationPhotoEditor=id=>{
    ensureModal();
    const rows=typeof registrations!=='undefined'&&Array.isArray(registrations)?registrations:[];
    activeRegistration=rows.find(row=>String(row.id)===String(id))||null;
    if(!activeRegistration?.character_photo_url){
      activeRegistration=null;
      alert('Esse inscrito ainda não possui uma foto para ajustar.');
      return;
    }
    pendingCrop=cropFromRegistration(activeRegistration);
    const modal=document.getElementById('registrationPhotoModal');
    const image=document.getElementById('registrationPhotoPreviewImage');
    document.getElementById('registrationPhotoTitle').textContent=`Ajustar foto — ${activeRegistration.character_name||activeRegistration.full_name||'Inscrito'}`;
    document.getElementById('registrationPhotoStatus').className='form-status';
    document.getElementById('registrationPhotoStatus').textContent='';
    image.src=activeRegistration.character_photo_url;
    image.alt=`Prévia da foto de ${activeRegistration.character_name||activeRegistration.full_name||'inscrito'}`;
    syncControls();
    modal.hidden=false;
    setTimeout(()=>document.getElementById('registrationPhotoX')?.focus(),30);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureModal,{once:true});
  else ensureModal();
})();
