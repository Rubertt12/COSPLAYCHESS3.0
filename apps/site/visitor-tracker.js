(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;
  if(!cfg?.functionsBase)return;
  const page=location.pathname.split('/').pop()||'index.html';
  if(['admin.html','cms.html','resultados-admin.html'].includes(page))return;
  if(new URLSearchParams(location.search).get('cmsPreview')==='1')return;
  if(navigator.webdriver)return;
  const send=()=>fetch(`${cfg.functionsBase}/cosplaychess-track-visitor`,{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':cfg.supabaseKey},
    body:JSON.stringify({path:location.pathname}),
    keepalive:true,
    cache:'no-store',
    credentials:'omit'
  }).catch(()=>{});
  if(document.visibilityState==='visible')setTimeout(send,800);
  else document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')send();},{once:true});
})();