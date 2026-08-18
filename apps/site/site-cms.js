(() => {
  const config = window.COSPLAYCHESS_CONFIG;
  if (!config || !window.supabase) return;
  const cmsDb = typeof db !== 'undefined' ? db : window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  const setText = (s, value) => { const el=q(s); if(el && value !== undefined) el.textContent=value; };
  const setHtmlTitle = (s, main, accent, br=true) => { const el=q(s); if(!el) return; el.innerHTML=`${esc(main||'')}${br?'<br>':' '}<i>${esc(accent||'')}</i>`; };
  const setLink = (s, text, href) => { const el=q(s); if(!el) return; if(text!==undefined) el.textContent=text; if(href) el.href=href; };
  const setVisible = (s, visible) => { const el=q(s); if(el && typeof visible==='boolean') el.hidden=!visible; };
  async function getContent(key){ const {data,error}=await cmsDb.from('cosplay_site_content').select('content').eq('key',key).eq('published',true).maybeSingle(); return error?null:(data?.content||null); }
  function applyBrand(c){ if(c.faviconUrl){const icon=q('link[rel="icon"]');if(icon)icon.href=c.faviconUrl} if(c.brandImageUrl)qa('.brand img').forEach(img=>img.src=c.brandImageUrl); }
  function applyHeroStats(c){
    const items=qa('.hero-meta > div');
    const values=[[c.heroStat1Value,c.heroStat1Label],[c.heroStat2Value,c.heroStat2Label],[c.heroStat3Value,c.heroStat3Label]];
    values.forEach((pair,i)=>{const item=items[i];if(!item)return;const b=item.querySelector('b'),span=item.querySelector('span');if(b&&pair[0]!==undefined)b.textContent=pair[0];if(span&&pair[1]!==undefined)span.textContent=pair[1]});
  }
  function applyLanding(c){
    if(!c)return; applyBrand(c);
    setText('.hero-copy .kicker',c.heroKicker);setHtmlTitle('.hero-copy h1',c.heroTitleMain,c.heroTitleAccent,true);setText('.hero-copy > p',c.heroDescription);setLink('.hero-actions a:nth-child(1)',c.heroPrimaryText,c.heroPrimaryUrl);setLink('.hero-actions a:nth-child(2)',c.heroSecondaryText,c.heroSecondaryUrl);if(c.heroImageUrl){const img=q('.hero-art > img');if(img)img.src=c.heroImageUrl}applyHeroStats(c);
    setText('#eventos .section-head .kicker',c.eventsKicker);setHtmlTitle('#eventos .section-head h2',c.eventsTitleMain,c.eventsTitleAccent,false);
    setText('#experiencia .experience-grid > div:first-child .kicker',c.experienceKicker);setHtmlTitle('#experiencia .experience-grid > div:first-child h2',c.experienceTitleMain,c.experienceTitleAccent,false);setText('#experiencia .experience-grid > div:first-child > p',c.experienceDescription);
    const cards=qa('#experiencia .feature-grid article');[[c.feature1Title,c.feature1Text],[c.feature2Title,c.feature2Text],[c.feature3Title,c.feature3Text],[c.feature4Title,c.feature4Text]].forEach((x,i)=>{if(!cards[i])return;const h=cards[i].querySelector('h3'),p=cards[i].querySelector('p');if(h&&x[0]!==undefined)h.textContent=x[0];if(p&&x[1]!==undefined)p.textContent=x[1]});
    setText('#galeria .section-head .kicker',c.galleryKicker);setHtmlTitle('#galeria .section-head h2',c.galleryTitleMain,c.galleryTitleAccent,false);
    setText('#universo .universe-intro .kicker',c.universeKicker);setHtmlTitle('#universo .universe-intro h2',c.universeTitleMain,c.universeTitleAccent,false);setText('#universo .universe-intro > p',c.universeDescription);setText('#universo .community-nav .btn.gold',c.universeCtaText);
    if(c.instagramUrl)qa('[data-fergorverse-instagram],a[href*="instagram.com/fergorverse"]').forEach(a=>a.href=c.instagramUrl);
    if(c.instagramText){
      qa('[data-fergorverse-instagram]').forEach(button=>{
        const label=button.querySelector('span');
        if(label) label.textContent=c.instagramText;
        else if(!button.querySelector('svg')) button.textContent=c.instagramText;
      });
    }
    setText('.final-cta .kicker',c.finalKicker);setHtmlTitle('.final-cta h2',c.finalTitleMain,c.finalTitleAccent,true);setText('.final-cta .btn.gold',c.finalCtaText);setText('.footer > p',c.footerText);
    setVisible('#eventos',c.showEvents);setVisible('#experiencia',c.showExperience);setVisible('#galeria',c.showGallery);setVisible('#universo',c.showUniverse);setVisible('.final-cta',c.showFinalCta);
  }
  function applyRegistration(c){ if(!c)return;if(c.pageTitle)document.title=c.pageTitle;setText('.register-aside .kicker',c.asideKicker);setHtmlTitle('.register-aside h1',c.asideTitleMain,c.asideTitleAccent,true);setText('.register-aside > p',c.asideDescription);setText('.form-card .section-head .kicker',c.formKicker);setHtmlTitle('.form-card .section-head h2',c.formTitleMain,c.formTitleAccent,false);const m=q('[data-registration-music]');if(m&&typeof c.showMusicFields==='boolean')m.hidden=!c.showMusicFields;setText('[data-music-name-label]',c.musicNameLabel);setText('[data-music-url-label]',c.musicUrlLabel);setText('[data-music-url-help]',c.musicUrlHelp); }
  async function init(){const registration=Boolean(document.getElementById('signupForm'));const c=await getContent(registration?'registration':'landing');registration?applyRegistration(c):applyLanding(c)}
  init().catch(()=>{});
})();