(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  function install(){
    const panel=$('#partnersAdminPanel'),main=$('.v6-main'),nav=$('.v6-nav');
    if(!panel||!main||!nav)return false;
    if(panel.dataset.layoutFixed==='1')return true;
    panel.dataset.layoutFixed='1';
    panel.classList.add('v6-view','v6-management');
    panel.dataset.view='partners';
    panel.hidden=true;
    main.appendChild(panel);

    let link=$('.v6-nav a[data-partners-admin]');
    if(!link){
      link=document.createElement('a');
      link.href='#partners';
      link.dataset.partnersAdmin='1';
      link.innerHTML='<i>◇</i><span>Parcerias</span>';
      const systemTitle=$$('.v6-nav-title').find(x=>x.textContent.trim()==='SISTEMA');
      nav.insertBefore(link,systemTitle||null);
    }

    const openPartners=e=>{
      e?.preventDefault();e?.stopPropagation();e?.stopImmediatePropagation?.();
      $$('.v6-view').forEach(v=>{v.hidden=v!==panel;v.classList.toggle('is-active',v===panel);});
      $$('.v6-nav a').forEach(a=>a.classList.toggle('active',a===link));
      document.body.dataset.adminView='partners';
      history.replaceState({},'','#partners');
      panel.scrollTop=0;
    };
    link.addEventListener('click',openPartners,true);

    window.addEventListener('hashchange',()=>{if(location.hash==='#partners')openPartners();});
    if(location.hash==='#partners')setTimeout(openPartners,0);
    return true;
  }
  const obs=new MutationObserver(()=>{if(install())obs.disconnect();});
  obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(install,200);setTimeout(install,700);setTimeout(install,1500);
})();