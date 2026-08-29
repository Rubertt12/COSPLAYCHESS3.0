(() => {
  let lastNavSignature='';

  const ensureCss=(href,id)=>{if(document.getElementById(id))return;const l=document.createElement('link');l.id=id;l.rel='stylesheet';l.href=href;document.head.appendChild(l);};
  const ensureScript=(src,id,flag)=>{if(document.getElementById(id)||(flag&&window[flag]))return;const s=document.createElement('script');s.id=id;s.src=src;s.async=false;s.defer=true;document.head.appendChild(s);};
  ensureCss('./community-photo-experience.css?v=20260829-1','communityPhotoExperienceCss');
  ensureCss('./social-photo-lightbox.css?v=20260829-1','socialPhotoLightboxCss');
  ensureCss('./community-rail-polish.css?v=20260829-1','communityRailPolishCss');
  ensureCss('./community-featured-carousel.css?v=20260829-1','communityFeaturedCarouselCss');
  ensureCss('./community-event-calendar.css?v=20260829-1','communityEventCalendarCss');
  ensureScript('./social-photo-lightbox.js?v=20260829-1','socialPhotoLightboxJs','__COSPLAY_PHOTO_LIGHTBOX__');
  ensureScript('./community-featured-carousel.js?v=20260829-1','communityFeaturedCarouselJs','__COSPLAY_FEATURED_CAROUSEL__');
  ensureScript('./community-settings-save-fix.js?v=20260829-1','communitySettingsSaveFixJs','__COSPLAY_SETTINGS_SAVE_FIX__');
  ensureScript('./community-events-router-fix.js?v=20260829-1','communityEventsRouterFixJs','__COSPLAY_EVENTS_ROUTER_FIX__');
  ensureScript('./community-event-calendar.js?v=20260829-2','communityEventCalendarJs','__COSPLAY_EVENT_CALENDAR__');

  const setLabel=(button,html,key)=>{
    if(!button)return;
    if(button.dataset[key]==='1')return;
    const badge=button.querySelector('b');
    button.innerHTML=html;
    if(badge)button.appendChild(badge);
    button.dataset[key]='1';
  };

  const normalize=()=>{
    const nav=document.querySelector('.community-nav');
    if(nav){
      const signature=[...nav.children].map(el=>`${el.tagName}:${el.dataset.communityView||el.getAttribute('href')||''}`).join('|');
      if(signature!==lastNavSignature){
        lastNavSignature=signature;
        setLabel(nav.querySelector('[data-community-view="feed"]'),'<span>⌂</span>Feed','premiumFeedLabel');
        setLabel(nav.querySelector('[data-community-view="photos"]'),'<span>▧</span>Fotos','premiumPhotosLabel');
        setLabel(nav.querySelector('[data-community-view="discover"]'),'<span>⌕</span>Encontrar pessoas','premiumDiscoverLabel');
        setLabel(nav.querySelector('[data-community-view="messages"]'),'<span>✉</span>Mensagens','premiumMessagesLabel');
        const notifications=nav.querySelector('[data-community-view="notifications"]');
        if(notifications)notifications.style.display='none';
        setLabel(nav.querySelector('[data-community-view="social-settings"]'),'<span>⚙</span>Configurações','premiumSettingsLabel');
        const add=(href,icon,label)=>{
          if(nav.querySelector(`a[href="${href}"]`))return;
          const a=document.createElement('a');
          a.href=href;
          a.innerHTML=`<span>${icon}</span>${label}`;
          nav.appendChild(a);
        };
        add('./passaporte.html','▣','Passaporte');
        add('./conquistas.html','♕','Conquistas');
      }
    }
    const eventLink=document.querySelector('.premium-event-link');
    if(eventLink&&eventLink.getAttribute('href')!=='./index.html#eventos')eventLink.href='./index.html#eventos';
  };

  const run=()=>requestAnimationFrame(normalize);
  run();
  document.addEventListener('DOMContentLoaded',run,{once:true});
  window.addEventListener('load',run,{once:true});
  window.addEventListener('cosplay:social-shell-ready',run);
  setTimeout(run,350);
  setTimeout(run,1200);
  setTimeout(run,2800);
})();