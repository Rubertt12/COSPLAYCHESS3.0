(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('cmsPreview') !== '1') return;

  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const setText = (s, v) => { const el=q(s); if(el && v !== undefined) el.textContent=v; };
  const setTitle = (s, main, accent, br=true) => { const el=q(s); if(!el) return; el.innerHTML=`${esc(main||'')}${br?'<br>':' '}<i>${esc(accent||'')}</i>`; };
  const setLink = (s, text, href) => { const el=q(s); if(!el) return; if(text!==undefined) el.textContent=text; if(href) el.href=href; };
  const setVisible = (s, visible) => { const el=q(s); if(el && typeof visible==='boolean') el.hidden=!visible; };

  function applyBrand(c){
    if(c.faviconUrl){ const icon=q('link[rel="icon"]'); if(icon) icon.href=c.faviconUrl; }
    if(c.brandImageUrl) qa('.brand img').forEach(img=>img.src=c.brandImageUrl);
  }

  function applyLanding(c){
    if(!c) return;
    applyBrand(c);
    setText('.hero-copy .kicker',c.heroKicker);
    setTitle('.hero-copy h1',c.heroTitleMain,c.heroTitleAccent,true);
    setText('.hero-copy > p',c.heroDescription);
    setLink('.hero-actions a:nth-child(1)',c.heroPrimaryText,c.heroPrimaryUrl);
    setLink('.hero-actions a:nth-child(2)',c.heroSecondaryText,c.heroSecondaryUrl);
    if(c.heroImageUrl){ const img=q('.hero-art > img'); if(img) img.src=c.heroImageUrl; }
    setText('#eventos .section-head .kicker',c.eventsKicker);
    setTitle('#eventos .section-head h2',c.eventsTitleMain,c.eventsTitleAccent,false);
    setText('#experiencia .experience-grid > div:first-child .kicker',c.experienceKicker);
    setTitle('#experiencia .experience-grid > div:first-child h2',c.experienceTitleMain,c.experienceTitleAccent,false);
    setText('#experiencia .experience-grid > div:first-child > p',c.experienceDescription);
    const cards=qa('#experiencia .feature-grid article');
    [[c.feature1Title,c.feature1Text],[c.feature2Title,c.feature2Text],[c.feature3Title,c.feature3Text],[c.feature4Title,c.feature4Text]].forEach((x,i)=>{
      if(!cards[i]) return;
      const h=cards[i].querySelector('h3'), p=cards[i].querySelector('p');
      if(h && x[0]!==undefined) h.textContent=x[0];
      if(p && x[1]!==undefined) p.textContent=x[1];
    });
    setText('#galeria .section-head .kicker',c.galleryKicker);
    setTitle('#galeria .section-head h2',c.galleryTitleMain,c.galleryTitleAccent,false);
    setText('#universo .universe-intro .kicker',c.universeKicker);
    setTitle('#universo .universe-intro h2',c.universeTitleMain,c.universeTitleAccent,false);
    setText('#universo .universe-intro > p',c.universeDescription);
    setText('#universo .community-nav .btn.gold',c.universeCtaText);
    if(c.instagramUrl) qa('[data-fergorverse-instagram],a[href*="instagram.com/fergorverse"]').forEach(a=>a.href=c.instagramUrl);
    if(c.instagramText){ const b=q('#universo [data-fergorverse-instagram]'); if(b) b.textContent=`📸 ${c.instagramText}`; }
    setText('.final-cta .kicker',c.finalKicker);
    setTitle('.final-cta h2',c.finalTitleMain,c.finalTitleAccent,true);
    setText('.final-cta .btn.gold',c.finalCtaText);
    setText('.footer > p',c.footerText);
    setVisible('#eventos',c.showEvents);
    setVisible('#experiencia',c.showExperience);
    setVisible('#galeria',c.showGallery);
    setVisible('#universo',c.showUniverse);
    setVisible('.final-cta',c.showFinalCta);
  }

  function applyRegistration(c){
    if(!c) return;
    if(c.pageTitle) document.title=c.pageTitle;
    setText('.register-aside .kicker',c.asideKicker);
    setTitle('.register-aside h1',c.asideTitleMain,c.asideTitleAccent,true);
    setText('.register-aside > p',c.asideDescription);
    setText('.form-card .section-head .kicker',c.formKicker);
    setTitle('.form-card .section-head h2',c.formTitleMain,c.formTitleAccent,false);
    const m=q('[data-registration-music]');
    if(m && typeof c.showMusicFields==='boolean') m.hidden=!c.showMusicFields;
    setText('[data-music-name-label]',c.musicNameLabel);
    setText('[data-music-url-label]',c.musicUrlLabel);
    setText('[data-music-url-help]',c.musicUrlHelp);
  }

  const fieldTarget = {
    heroKicker:'.hero',heroTitleMain:'.hero',heroTitleAccent:'.hero',heroDescription:'.hero',heroPrimaryText:'.hero',heroPrimaryUrl:'.hero',heroSecondaryText:'.hero',heroSecondaryUrl:'.hero',heroImageUrl:'.hero',brandImageUrl:'.topbar',faviconUrl:'.topbar',
    eventsKicker:'#eventos',eventsTitleMain:'#eventos',eventsTitleAccent:'#eventos',
    experienceKicker:'#experiencia',experienceTitleMain:'#experiencia',experienceTitleAccent:'#experiencia',experienceDescription:'#experiencia',feature1Title:'#experiencia',feature1Text:'#experiencia',feature2Title:'#experiencia',feature2Text:'#experiencia',feature3Title:'#experiencia',feature3Text:'#experiencia',feature4Title:'#experiencia',feature4Text:'#experiencia',
    galleryKicker:'#galeria',galleryTitleMain:'#galeria',galleryTitleAccent:'#galeria',
    universeKicker:'#universo',universeTitleMain:'#universo',universeTitleAccent:'#universo',universeDescription:'#universo',universeCtaText:'#universo',instagramUrl:'#universo',instagramText:'#universo',
    finalKicker:'.final-cta',finalTitleMain:'.final-cta',finalTitleAccent:'.final-cta',finalCtaText:'.final-cta',footerText:'.footer',
    asideKicker:'.register-aside',asideTitleMain:'.register-aside',asideTitleAccent:'.register-aside',asideDescription:'.register-aside',formKicker:'.form-card',formTitleMain:'.form-card',formTitleAccent:'.form-card',musicNameLabel:'[data-registration-music]',musicUrlLabel:'[data-registration-music]',musicUrlHelp:'[data-registration-music]',showMusicFields:'[data-registration-music]'
  };

  const style=document.createElement('style');
  style.textContent='.cms-preview-highlight{outline:2px solid #d4aa5c!important;outline-offset:6px!important;box-shadow:0 0 0 8px rgba(212,170,92,.12)!important;transition:outline-color .2s,box-shadow .2s}';
  document.head.appendChild(style);
  let highlighted=null, highlightTimer=null;
  function focusField(name){
    const selector=fieldTarget[name]; if(!selector) return;
    const el=q(selector); if(!el) return;
    if(highlighted) highlighted.classList.remove('cms-preview-highlight');
    highlighted=el; el.classList.add('cms-preview-highlight');
    el.scrollIntoView({behavior:'smooth',block:'center'});
    clearTimeout(highlightTimer);
    highlightTimer=setTimeout(()=>{el.classList.remove('cms-preview-highlight');if(highlighted===el)highlighted=null;},1300);
  }

  window.addEventListener('message',(event)=>{
    if(event.origin!==location.origin) return;
    const data=event.data||{};
    if(data.type!=='cosplaychess-cms-preview') return;
    if(data.page==='registration') applyRegistration(data.content||{}); else applyLanding(data.content||{});
    if(data.focus) focusField(data.focus);
  });

  const page=document.getElementById('signupForm')?'registration':'landing';
  const ready=()=>parent.postMessage({type:'cosplaychess-cms-preview-ready',page},location.origin);
  ready(); setTimeout(ready,650); setTimeout(ready,1500);
})();