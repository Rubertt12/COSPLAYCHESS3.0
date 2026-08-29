(() => {
  const normalize=()=>{
    const nav=document.querySelector('.community-nav');
    if(nav){
      const feed=nav.querySelector('[data-community-view="feed"]');if(feed)feed.innerHTML='<span>⌂</span>Feed';
      const photos=nav.querySelector('[data-community-view="photos"]');if(photos)photos.innerHTML='<span>▧</span>Fotos';
      const discover=nav.querySelector('[data-community-view="discover"]');if(discover)discover.innerHTML='<span>⌕</span>Encontrar pessoas';
      const messages=nav.querySelector('[data-community-view="messages"]');if(messages&&!messages.dataset.premiumLabel){messages.dataset.premiumLabel='1';const badge=messages.querySelector('b');messages.innerHTML='<span>✉</span>Mensagens';if(badge)messages.appendChild(badge);}
      const notifications=nav.querySelector('[data-community-view="notifications"]');if(notifications)notifications.style.display='none';
      const settings=nav.querySelector('[data-community-view="social-settings"]');if(settings)settings.innerHTML='<span>⚙</span>Configurações';
      const add=(href,icon,label)=>{if(nav.querySelector(`a[href="${href}"]`))return;const a=document.createElement('a');a.href=href;a.innerHTML=`<span>${icon}</span>${label}`;nav.appendChild(a);};
      add('./passaporte.html','▣','Passaporte');add('./conquistas.html','♕','Conquistas');
    }
    const eventLink=document.querySelector('.premium-event-link');if(eventLink)eventLink.href='./index.html#eventos';
  };
  normalize();
  const observer=new MutationObserver(normalize);observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),12000);
})();