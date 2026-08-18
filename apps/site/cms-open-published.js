(()=>{
  const openReal=document.getElementById('cmsOpenReal');
  const saveBtn=document.getElementById('cmsSave');
  const statusEl=document.getElementById('cmsStatus');
  const editor=document.getElementById('cmsEditor');
  const cfg=window.COSPLAYCHESS_CONFIG;
  const db=window.COSPLAYCHESS_DB||window.supabase?.createClient(cfg?.supabaseUrl,cfg?.supabaseKey);
  if(!openReal||!saveBtn||!statusEl||!editor||!cfg||!db)return;

  let opening=false,guardSaving=false;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const statusText=()=>String(statusEl.textContent||'').trim();
  const activePage=()=>document.querySelector('.cms-page-tabs [data-page].active')?.dataset.page||'landing';

  function setStatus(text,kind='live'){
    statusEl.className=`cms-status ${kind}`;
    const label=statusEl.querySelector('b');
    if(label)label.textContent=text;
  }

  function collectVisibleFields(){
    const patch={};
    editor.querySelectorAll('[name]').forEach(el=>{
      if(!el.name)return;
      patch[el.name]=el.type==='checkbox'?el.checked:el.value;
    });
    return patch;
  }

  async function persistVisibleFields(){
    if(guardSaving)return;
    guardSaving=true;
    try{
      const key=activePage();
      const [{data:row,error:readError},{data:{user}}]=await Promise.all([
        db.from('cosplay_site_content').select('content').eq('key',key).maybeSingle(),
        db.auth.getUser()
      ]);
      if(readError)throw readError;
      const content={...(row?.content||{}),...collectVisibleFields()};
      const {error}=await db.from('cosplay_site_content').upsert({
        key,
        content,
        published:true,
        updated_at:new Date().toISOString(),
        updated_by:user?.id||null
      },{onConflict:'key'});
      if(error)throw error;
      const {data:verify,error:verifyError}=await db.from('cosplay_site_content').select('content,published').eq('key',key).maybeSingle();
      if(verifyError)throw verifyError;
      const visible=collectVisibleFields();
      const mismatch=Object.entries(visible).find(([name,value])=>String(verify?.content?.[name]??'')!==String(value??''));
      if(mismatch)throw new Error(`O campo ${mismatch[0]} não foi confirmado no banco.`);
      if(!verify?.published)throw new Error('A página não ficou marcada como publicada.');
      return true;
    }finally{
      guardSaving=false;
    }
  }

  async function waitNativeSave(){
    const started=Date.now();
    while(saveBtn.disabled&&Date.now()-started<12000)await sleep(100);
    if(statusEl.classList.contains('error'))throw new Error(statusText()||'Falha ao publicar as alterações.');
  }

  async function saveAndConfirm(){
    saveBtn.click();
    await waitNativeSave();
    setStatus('Confirmando conteúdo publicado…','dirty');
    await persistVisibleFields();
    setStatus('Publicado e confirmado no banco.','live');
  }

  function publishedUrl(){
    const url=new URL(openReal.getAttribute('href')||'./index.html',location.href);
    url.searchParams.set('_cms',Date.now().toString());
    return url.href;
  }

  saveBtn.addEventListener('click',()=>{
    if(guardSaving||opening)return;
    setTimeout(async()=>{
      try{
        await waitNativeSave();
        await persistVisibleFields();
        setStatus('Publicado e confirmado no banco.','live');
      }catch(error){
        setStatus(error?.message||String(error),'error');
      }
    },0);
  });

  openReal.addEventListener('click',async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    if(opening)return;
    opening=true;
    const popup=window.open('about:blank','_blank');
    const oldText=openReal.textContent;
    try{
      openReal.textContent='Salvando, confirmando e abrindo…';
      await saveAndConfirm();
      const url=publishedUrl();
      if(popup)popup.location.replace(url);else location.href=url;
    }catch(error){
      if(popup)popup.close();
      setStatus(error?.message||String(error),'error');
    }finally{
      openReal.textContent=oldText;
      opening=false;
    }
  },true);
})();