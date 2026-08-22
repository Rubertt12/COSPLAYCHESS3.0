(()=>{
  if(window.__cosplayGoogleDriveSessionBridge)return;
  window.__cosplayGoogleDriveSessionBridge=true;

  const KEY='cosplayGoogleDriveOAuthSession';
  const now=()=>Date.now();
  const read=()=>{
    try{
      const s=JSON.parse(sessionStorage.getItem(KEY)||'null');
      if(!s?.access_token||!s?.expires_at||s.expires_at<=now()+15000){
        sessionStorage.removeItem(KEY);
        return null;
      }
      return s;
    }catch{ return null; }
  };
  const save=r=>{
    if(!r?.access_token)return;
    const ttl=Math.max(60,Number(r.expires_in)||3600);
    sessionStorage.setItem(KEY,JSON.stringify({
      access_token:r.access_token,
      expires_at:now()+ttl*1000
    }));
  };
  const clear=()=>sessionStorage.removeItem(KEY);

  function patchGIS(){
    const oauth=window.google?.accounts?.oauth2;
    if(!oauth||oauth.__cosplaySessionPatched)return false;
    const original=oauth.initTokenClient.bind(oauth);
    oauth.initTokenClient=function(options={}){
      const originalCallback=options.callback;
      const cached=read();
      let restored=false;
      const client=original({
        ...options,
        callback:r=>{
          if(r?.access_token)save(r);
          return originalCallback?.(r);
        }
      });
      const originalRequest=client.requestAccessToken?.bind(client);
      if(originalRequest){
        client.requestAccessToken=function(requestOptions={}){
          const active=read();
          if(active&&!restored){
            restored=true;
            queueMicrotask(()=>originalCallback?.({
              access_token:active.access_token,
              expires_in:Math.max(1,Math.floor((active.expires_at-now())/1000)),
              token_type:'Bearer',
              scope:options.scope||''
            }));
            return;
          }
          return originalRequest(requestOptions);
        };
      }
      return client;
    };
    Object.defineProperty(oauth,'__cosplaySessionPatched',{value:true});
    return true;
  }

  // GIS is loaded lazily by admin-google-drive.js. Patch it before that script's
  // own load handler continues, so a cached token can be replayed safely.
  const head=document.head;
  const append=head.appendChild.bind(head);
  head.appendChild=function(node){
    if(node?.tagName==='SCRIPT'&&String(node.src||'').includes('accounts.google.com/gsi/client')){
      node.addEventListener('load',patchGIS,{once:true});
    }
    return append(node);
  };
  patchGIS();

  function restoreWhenReady(){
    if(!read())return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const btn=document.querySelector('#gdConnect');
      if(btn){
        clearInterval(timer);
        btn.click();
      }else if(tries>80){
        clearInterval(timer);
      }
    },100);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#gdDisconnect'))clear();
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restoreWhenReady,{once:true});
  else restoreWhenReady();
})();
