(()=>{
  if(window.__COSPLAYCHESS_ADMIN_BANNER_NAV_FIX__)return;
  window.__COSPLAYCHESS_ADMIN_BANNER_NAV_FIX__=true;

  const findBannerLink=()=>[...document.querySelectorAll('.v6-nav a')].find(a=>{
    const text=(a.textContent||'').trim().toLowerCase();
    return text.includes('banners')||a.getAttribute('href')==='#banners'||/cms\.html\?section=banners/i.test(a.getAttribute('href')||'');
  });

  const repair=()=>{
    const link=findBannerLink();
    if(!link)return;
    if(link.getAttribute('href')!=='#banners')link.setAttribute('href','#banners');
    link.removeAttribute('target');
    link.removeAttribute('rel');
  };

  document.addEventListener('click',event=>{
    const link=event.target.closest('.v6-nav a');
    if(!link)return;
    const text=(link.textContent||'').trim().toLowerCase();
    const href=link.getAttribute('href')||'';
    if(!text.includes('banners')&&href!=='#banners'&&!/cms\.html\?section=banners/i.test(href))return;

    event.preventDefault();
    event.stopImmediatePropagation();
    link.setAttribute('href','#banners');
    if(location.hash!=='#banners')location.hash='banners';
    else window.dispatchEvent(new HashChangeEvent('hashchange'));
  },true);

  const observer=new MutationObserver(repair);
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
  repair();
  setTimeout(repair,150);
  setTimeout(repair,500);
  setTimeout(repair,1300);
})();
