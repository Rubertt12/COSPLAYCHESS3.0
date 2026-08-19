(() => {
  if (window.__COSPLAYCHESS_SITE_CMS_BOOTED__) return;
  window.__COSPLAYCHESS_SITE_CMS_BOOTED__ = true;

  const config = window.COSPLAYCHESS_CONFIG;
  if (!config) return;

  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  const setText = (s, value) => { const el=q(s); if(el && value !== undefined && value !== null) el.textContent=value; };
  const setHtmlTitle = (s, main, accent, br=true) => { const el=q(s); if(!el) return; el.innerHTML=`${esc(main||'')}${br?'<br>':' '}<i>${esc(accent||'')}</i>`; };
  const setLink = (s, text, href) => { const el=q(s); if(!el) return; if(text!==undefined && text!==null) el.textContent=text; if(href) el.href=href; };
  const setVisible = (s, visible) => { const el=q(s); if(el && typeof visible==='boolean') el.hidden=!visible; };

  function getDb(){
    if (typeof window.getCosplayChessDb === 'function') return window.getCosplayChessDb();
    if (window.COSPLAYCHESS_DB) return window.COSPLAYCHESS_DB;
    if (window.supabase?.createClient) return window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    return null;
  }

  async function getPublishedContent(key){
    try{
      const db=getDb();
      if(!db) throw new Error('Cliente Supabase indisponível');
      const {data,error}=await db
        .from('cosplay_site_content')
        .select('content,updated_at')
        .eq('key',key)
        .eq('published',true)
        .maybeSingle();
      if(error) throw error;
      return data?.content || null;
    }catch(error){
      console.error('[CosplayChess CMS] Falha ao carregar conteúdo publicado:',error);
      return null;
    }
  }

  function applyBrand(c){
    if(c.faviconUrl){const icon=q('link[rel="icon"]');if(icon)icon.href=c.faviconUrl;}
    if(c.brandImageUrl)qa('.brand img').forEach(img=>img.src=c.brandImageUrl);
  }

  function applyHeroStats(c){
    const items=qa('.hero-meta > div');
    const values=[[c.heroStat1Value,c.heroStat1Label],[c.heroStat2Value,c.heroStat2Label],[c.heroStat3Value,c.heroStat3Label]];
    values.forEach((pair,i)=>{
      const item=items[i];if(!item)return;
      const b=item.querySelector('b'),span=item.querySelector('span');
      if(b&&pair[0]!==undefined)b.textContent=pair[0];
      if(span&&pair[1]!==undefined)span.textContent=pair[1];
    });
  }

  function applyInstagramText(text){
    if(text===undefined || text===null) return;
    qa('[data-fergorverse-instagram]').forEach(button=>{
      let label=button.querySelector('.instagram-cms-label,[data-instagram-label]');
      if(!label){
        label=[...button.children].find(el=>el.tagName==='SPAN' && !el.classList.contains('instagram-cms-icon')) || null;
      }
      if(!label && !button.querySelector('svg')){
        label=document.createElement('span');
        label.dataset.instagramLabel='true';
        button.appendChild(label);
      }
      if(label) label.textContent=text;
    });
  }

  const BUTTON_STYLE_ID='cosplayCmsButtonStylesV1';
  const BUTTON_PRESETS={
    gold:{background:'linear-gradient(135deg,#b68135,#e0b867)',color:'#130d0b',border:'#efc978'},
    dark:{background:'rgba(255,255,255,.035)',color:'#f4efe8',border:'rgba(224,190,119,.24)'},
    outline:{background:'transparent',color:'#f0d18c',border:'rgba(240,209,140,.62)'},
    instagram:{background:'linear-gradient(135deg,#833ab4 0%,#c13584 34%,#e1306c 62%,#f77737 100%)',color:'#ffffff',border:'rgba(255,255,255,.22)'},
    custom:{background:'#16141b',color:'#f4efe8',border:'rgba(224,190,119,.24)'}
  };
  const INSTAGRAM_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle class="dot" cx="17.5" cy="6.5" r="1.2"></circle></svg>';

  function injectButtonStyles(){
    if(document.getElementById(BUTTON_STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=BUTTON_STYLE_ID;
    style.textContent=`
      .cms-button-zone{display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important}
      .final-cta .cms-button-zone{justify-content:flex-end}
      .cms-site-button{--cms-btn-bg:#16141b;--cms-btn-color:#f4efe8;--cms-btn-border:rgba(224,190,119,.24);min-width:0;border:1px solid var(--cms-btn-border)!important;border-radius:12px;padding:0 16px;min-height:46px;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:9px;background:var(--cms-btn-bg)!important;color:var(--cms-btn-color)!important;text-decoration:none!important;font-family:Inter,Segoe UI,Arial,sans-serif!important;font-size:11px!important;font-weight:900!important;letter-spacing:.45px!important;line-height:1.15!important;white-space:nowrap!important;box-shadow:0 10px 26px rgba(0,0,0,.18);transition:transform .18s ease,filter .18s ease,box-shadow .18s ease;overflow:hidden;isolation:isolate;position:relative}
      .cms-site-button:hover{transform:translateY(-2px);filter:brightness(1.07);box-shadow:0 14px 32px rgba(0,0,0,.25)}
      .cms-site-button[data-size="small"]{min-height:38px;padding:0 12px;font-size:10px!important}
      .cms-site-button[data-size="medium"]{min-height:46px;padding:0 16px;font-size:11px!important}
      .cms-site-button[data-size="large"]{min-height:56px;padding:0 20px;font-size:12px!important}
      .cms-site-button.is-full{width:100%!important}
      .cms-site-button__icon{display:inline-grid;place-items:center;flex:0 0 auto;min-width:22px;font-size:20px;line-height:1;color:inherit}
      .cms-site-button[data-size="large"] .cms-site-button__icon{font-size:23px;min-width:26px}
      .cms-site-button__icon svg{width:22px;height:22px;display:block;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .cms-site-button__icon svg .dot{fill:currentColor;stroke:none}
      .cms-site-button__label{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:640px){.cms-button-zone{width:100%}.cms-site-button{max-width:100%}.final-cta .cms-button-zone{justify-content:stretch}.cms-site-button.is-full-mobile{width:100%!important}.hero-actions.cms-button-zone,.community-nav.cms-button-zone{display:grid!important;grid-template-columns:1fr!important}.hero-actions.cms-button-zone .cms-site-button,.community-nav.cms-button-zone .cms-site-button{width:100%!important}}
      @media(prefers-reduced-motion:reduce){.cms-site-button{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function safeHref(value){
    const href=String(value||'').trim();
    if(!href) return '#';
    if(href.startsWith('#')||href.startsWith('./')||href.startsWith('../')||href.startsWith('/')) return href;
    if(/^(https?:|mailto:|tel:)/i.test(href)) return href;
    return '#';
  }
  function safePaint(value,gradient=true){
    const s=String(value||'').trim();
    if(!s||/[;{}]/.test(s)||/url\s*\(/i.test(s)) return '';
    if(/^#[0-9a-f]{3,8}$/i.test(s)) return s;
    if(/^(rgb|rgba|hsl|hsla)\([0-9.,%\s+-]+\)$/i.test(s)) return s;
    if(gradient && /^linear-gradient\([#0-9a-z(),.%\s+-]+\)$/i.test(s)) return s;
    return '';
  }
  function clampRadius(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(40,n)):12;}

  function buildButtonIcon(icon,customIcon){
    const type=String(icon||'none');
    if(type==='none') return null;
    const span=document.createElement('span');
    span.className='cms-site-button__icon';
    span.setAttribute('aria-hidden','true');
    if(type==='instagram') span.innerHTML=INSTAGRAM_ICON;
    else if(type==='arrow') span.textContent='↗';
    else if(type==='chess') span.textContent='♟';
    else if(type==='star') span.textContent='★';
    else span.textContent=String(customIcon||'').slice(0,4) || '•';
    return span;
  }

  function buildCmsButton(item){
    const a=document.createElement('a');
    a.className='cms-site-button';
    a.dataset.size=['small','medium','large'].includes(item?.size)?item.size:'medium';
    a.href=safeHref(item?.url);
    if(item?.newTab){a.target='_blank';a.rel='noopener noreferrer';}
    if(item?.fullWidth) a.classList.add('is-full');
    const preset=BUTTON_PRESETS[item?.preset]||BUTTON_PRESETS.custom;
    const customBg=safePaint(item?.background,true);
    const customColor=safePaint(item?.textColor,false);
    const customBorder=safePaint(item?.borderColor,false);
    a.style.setProperty('--cms-btn-bg',customBg||preset.background);
    a.style.setProperty('--cms-btn-color',customColor||preset.color);
    a.style.setProperty('--cms-btn-border',customBorder||preset.border);
    a.style.borderRadius=`${clampRadius(item?.radius)}px`;
    const icon=buildButtonIcon(item?.icon,item?.customIcon);
    if(icon) a.appendChild(icon);
    const label=document.createElement('span');
    label.className='cms-site-button__label';
    label.textContent=String(item?.label||'Botão').trim()||'Botão';
    a.appendChild(label);
    return a;
  }

  function renderCmsButtons(buttons){
    if(!Array.isArray(buttons)) return;
    injectButtonStyles();
    const active=buttons.filter(item=>item && item.enabled!==false);
    const zones={hero:q('.hero-actions'),universe:q('#universo .community-nav')};
    for(const [area,zone] of Object.entries(zones)){
      if(!zone) continue;
      zone.classList.add('cms-button-zone');
      zone.replaceChildren(...active.filter(item=>item.area===area).map(buildCmsButton));
    }
    const final=q('.final-cta');
    if(final){
      qa('.final-cta > a.btn').forEach(a=>a.hidden=true);
      let zone=final.querySelector(':scope > [data-cms-final-buttons]');
      if(!zone){zone=document.createElement('div');zone.dataset.cmsFinalButtons='true';zone.className='cms-button-zone';final.appendChild(zone);}
      zone.replaceChildren(...active.filter(item=>item.area==='final').map(buildCmsButton));
    }
  }
  window.COSPLAYCHESS_RENDER_BUTTONS=renderCmsButtons;

  function applyLanding(c){
    if(!c)return;
    document.documentElement.dataset.cmsPublished='true';
    applyBrand(c);
    setText('.hero-copy .kicker',c.heroKicker);
    setHtmlTitle('.hero-copy h1',c.heroTitleMain,c.heroTitleAccent,true);
    setText('.hero-copy > p',c.heroDescription);
    setLink('.hero-actions a:nth-child(1)',c.heroPrimaryText,c.heroPrimaryUrl);
    setLink('.hero-actions a:nth-child(2)',c.heroSecondaryText,c.heroSecondaryUrl);
    if(c.heroImageUrl){const img=q('.hero-art > img');if(img)img.src=c.heroImageUrl;}
    applyHeroStats(c);
    setText('#eventos .section-head .kicker',c.eventsKicker);
    setHtmlTitle('#eventos .section-head h2',c.eventsTitleMain,c.eventsTitleAccent,false);
    setText('#experiencia .experience-grid > div:first-child .kicker',c.experienceKicker);
    setHtmlTitle('#experiencia .experience-grid > div:first-child h2',c.experienceTitleMain,c.experienceTitleAccent,false);
    setText('#experiencia .experience-grid > div:first-child > p',c.experienceDescription);
    const cards=qa('#experiencia .feature-grid article');
    [[c.feature1Title,c.feature1Text],[c.feature2Title,c.feature2Text],[c.feature3Title,c.feature3Text],[c.feature4Title,c.feature4Text]].forEach((x,i)=>{
      if(!cards[i])return;
      const h=cards[i].querySelector('h3'),p=cards[i].querySelector('p');
      if(h&&x[0]!==undefined)h.textContent=x[0];
      if(p&&x[1]!==undefined)p.textContent=x[1];
    });
    setText('#galeria .section-head .kicker',c.galleryKicker);
    setHtmlTitle('#galeria .section-head h2',c.galleryTitleMain,c.galleryTitleAccent,false);
    setText('#universo .universe-intro .kicker',c.universeKicker);
    setHtmlTitle('#universo .universe-intro h2',c.universeTitleMain,c.universeTitleAccent,false);
    setText('#universo .universe-intro > p',c.universeDescription);
    setText('#universo .community-nav .btn.gold',c.universeCtaText);
    if(c.instagramUrl)qa('[data-fergorverse-instagram],a[href*="instagram.com/fergorverse"]').forEach(a=>a.href=c.instagramUrl);
    applyInstagramText(c.instagramText);
    setText('.final-cta .kicker',c.finalKicker);
    setHtmlTitle('.final-cta h2',c.finalTitleMain,c.finalTitleAccent,true);
    setText('.final-cta .btn.gold',c.finalCtaText);
    setText('.footer > p',c.footerText);
    setVisible('#eventos',c.showEvents);
    setVisible('#experiencia',c.showExperience);
    setVisible('#galeria',c.showGallery);
    setVisible('#universo',c.showUniverse);
    setVisible('.final-cta',c.showFinalCta);
    renderCmsButtons(c.buttons);
  }

  function applyRegistration(c){
    if(!c)return;
    document.documentElement.dataset.cmsPublished='true';
    if(c.pageTitle)document.title=c.pageTitle;
    setText('.register-aside .kicker',c.asideKicker);
    setHtmlTitle('.register-aside h1',c.asideTitleMain,c.asideTitleAccent,true);
    setText('.register-aside > p',c.asideDescription);
    setText('.form-card .section-head .kicker',c.formKicker);
    setHtmlTitle('.form-card .section-head h2',c.formTitleMain,c.formTitleAccent,false);
    const m=q('[data-registration-music]');
    if(m&&typeof c.showMusicFields==='boolean')m.hidden=!c.showMusicFields;
    setText('[data-music-name-label]',c.musicNameLabel);
    setText('[data-music-url-label]',c.musicUrlLabel);
    setText('[data-music-url-help]',c.musicUrlHelp);
  }

  async function init(){
    const registration=Boolean(document.getElementById('signupForm'));
    const key=registration?'registration':'landing';
    const content=await getPublishedContent(key);
    if(!content){
      document.documentElement.dataset.cmsPublished='false';
      return;
    }
    window.__COSPLAYCHESS_PUBLISHED_CMS__={key,content,apply:null};
    const apply=()=>registration?applyRegistration(content):applyLanding(content);
    window.__COSPLAYCHESS_PUBLISHED_CMS__.apply=apply;
    apply();
    requestAnimationFrame(apply);
    setTimeout(apply,250);
    setTimeout(apply,1000);
    window.dispatchEvent(new CustomEvent('cosplaychess:cms-applied',{detail:{key}}));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>init().catch(console.error),{once:true});
  else init().catch(console.error);
})();