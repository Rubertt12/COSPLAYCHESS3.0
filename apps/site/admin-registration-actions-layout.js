(()=>{
  const ROOT_ID='registrationsList';
  let frame=0;

  function buttonKind(button){
    if(!button)return '';
    if(button.classList.contains('registration-photo-upload-btn'))return 'photo-upload';
    if(button.classList.contains('registration-photo-edit-btn'))return 'photo';
    if(button.classList.contains('privacy-reveal-btn'))return 'contact';
    if(button.classList.contains('registration-edit-btn'))return 'edit';
    if(button.classList.contains('registration-delete-btn'))return 'delete';
    const text=(button.textContent||'').replace(/[×✕✖✎▣]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
    if(/^trocar foto|^adicionar foto/.test(text))return 'photo-upload';
    if(/^ajustar foto/.test(text))return 'photo';
    if(/^ver contato|^ocultar contato/.test(text))return 'contact';
    if(/^editar(?:\s|$)/.test(text))return 'edit';
    if(/^excluir(?:\s|$)/.test(text))return 'delete';
    return '';
  }

  function ensureBar(row){
    let bar=row.querySelector(':scope > .registration-actions-bar');
    if(bar)return bar;
    bar=document.createElement('div');
    bar.className='registration-actions-bar';
    bar.innerHTML='<div class="registration-actions-status"></div><div class="registration-actions-buttons"></div>';
    row.appendChild(bar);
    return bar;
  }

  function sameOrder(container,desired){
    const current=[...container.children].filter(node=>desired.includes(node));
    return current.length===desired.length&&desired.every((node,index)=>current[index]===node);
  }

  function organizeRow(row){
    if(!row)return false;
    const status=row.querySelector('select[onchange*="updateRegistrationStatus"]');
    const actionButtons=[...row.querySelectorAll('button')]
      .map(button=>({button,kind:buttonKind(button)}))
      .filter(item=>item.kind);

    if(!status&&!actionButtons.length)return false;

    const bar=ensureBar(row);
    const statusBox=bar.querySelector('.registration-actions-status');
    const buttonsBox=bar.querySelector('.registration-actions-buttons');
    let changed=false;

    if(status&&status.parentElement!==statusBox){
      statusBox.appendChild(status);
      changed=true;
    }

    const priority={'photo-upload':5,photo:10,contact:20,edit:30,delete:40};
    actionButtons.sort((a,b)=>(priority[a.kind]||99)-(priority[b.kind]||99));
    const desired=actionButtons.map(item=>item.button);

    actionButtons.forEach(({button,kind})=>{
      button.classList.add('registration-card-action',`registration-card-action-${kind}`);
    });

    if(desired.some(button=>button.parentElement!==buttonsBox)||!sameOrder(buttonsBox,desired)){
      desired.forEach(button=>buttonsBox.appendChild(button));
      changed=true;
    }

    const shouldHide=!status&&!actionButtons.length;
    if(bar.hidden!==shouldHide)bar.hidden=shouldHide;
    return changed;
  }

  function organize(){
    const root=document.getElementById(ROOT_ID);
    if(!root)return;
    root.querySelectorAll('.registration-row').forEach(organizeRow);
  }

  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      organize();
    });
  }

  function boot(){
    const root=document.getElementById(ROOT_ID);
    if(!root)return;
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    organize();
    setTimeout(organize,200);
    setTimeout(organize,700);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

(()=>{
  if(window.__COSPLAYCHESS_MANUAL_REGISTRATION_LOADER__)return;
  window.__COSPLAYCHESS_MANUAL_REGISTRATION_LOADER__=true;
  if(!document.querySelector('link[data-manual-registration]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./admin-registration-manual.css?v=20260824-manual3';
    link.dataset.manualRegistration='true';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-manual-registration]')){
    const script=document.createElement('script');
    script.src='./admin-registration-manual.js?v=20260824-manual3';
    script.async=false;
    script.dataset.manualRegistration='true';
    document.body.appendChild(script);
  }
})();
