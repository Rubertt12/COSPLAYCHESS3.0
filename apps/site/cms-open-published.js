(()=>{
  const openReal=document.getElementById('cmsOpenReal');
  const saveBtn=document.getElementById('cmsSave');
  const statusEl=document.getElementById('cmsStatus');
  if(!openReal||!saveBtn||!statusEl)return;

  let opening=false;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const statusText=()=>String(statusEl.textContent||'').trim();
  const hasPendingChanges=()=>statusEl.classList.contains('dirty')||/não publicadas|pendentes|publicando/i.test(statusText());

  async function saveBeforeOpen(){
    if(!hasPendingChanges())return;
    const before=statusText();
    saveBtn.click();
    const started=Date.now();
    while(Date.now()-started<12000){
      await sleep(100);
      const text=statusText();
      if(statusEl.classList.contains('error'))throw new Error(text||'Falha ao publicar as alterações.');
      if(!saveBtn.disabled&&(/publicado com sucesso/i.test(text)||/página salva/i.test(text)))return;
      if(!saveBtn.disabled&&text!==before&&!hasPendingChanges())return;
    }
    throw new Error('O CMS não confirmou a publicação. Tente novamente.');
  }

  function publishedUrl(){
    const url=new URL(openReal.getAttribute('href')||'./index.html',location.href);
    url.searchParams.set('_cms',Date.now().toString());
    return url.href;
  }

  openReal.addEventListener('click',async event=>{
    event.preventDefault();
    if(opening)return;
    opening=true;
    const popup=window.open('about:blank','_blank');
    const oldText=openReal.textContent;
    try{
      openReal.textContent=hasPendingChanges()?'Salvando e abrindo…':'Abrindo…';
      await saveBeforeOpen();
      const url=publishedUrl();
      if(popup)popup.location.replace(url);else location.href=url;
    }catch(error){
      if(popup)popup.close();
      statusEl.className='cms-status error';
      const label=statusEl.querySelector('b');
      if(label)label.textContent=error?.message||String(error);
    }finally{
      openReal.textContent=oldText;
      opening=false;
    }
  },true);
})();