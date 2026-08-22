(()=>{
  if(window.__cosplayAnonymousVisitTracked)return;
  window.__cosplayAnonymousVisitTracked=true;

  const db=window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();
  if(!db)return;

  const page=location.pathname.split('/').pop()||'index.html';
  if(['admin.html','cms.html','resultados-admin.html'].includes(page))return;
  if(new URLSearchParams(location.search).get('cmsPreview')==='1')return;
  if(navigator.webdriver)return;

  const storageKey='cosplayAnonymousVisitorIdV1';
  const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function createUuid(){
    if(typeof crypto?.randomUUID==='function')return crypto.randomUUID();
    if(typeof crypto?.getRandomValues!=='function')return null;
    const bytes=new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6]=(bytes[6]&15)|64;
    bytes[8]=(bytes[8]&63)|128;
    const hex=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }

  function getVisitorId(){
    try{
      const saved=localStorage.getItem(storageKey);
      if(saved&&uuidPattern.test(saved))return saved;
      const created=createUuid();
      if(!created)return null;
      localStorage.setItem(storageKey,created);
      return created;
    }catch{
      return null;
    }
  }

  async function send(){
    const visitorId=getVisitorId();
    if(!visitorId)return;
    try{
      await db.rpc('register_cosplay_anonymous_visit',{p_visitor_id:visitorId});
    }catch{}
  }

  if(document.visibilityState==='visible')setTimeout(send,650);
  else document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')send();
  },{once:true});
})();