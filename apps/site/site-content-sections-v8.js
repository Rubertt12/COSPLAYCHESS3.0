(()=>{
  if(window.__COSPLAYCHESS_PUBLIC_CONTENT_V8__)return;
  window.__COSPLAYCHESS_PUBLIC_CONTENT_V8__=true;
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getDb=()=>window.COSPLAYCHESS_DB||window.getCosplayChessDb?.()||window.supabase?.createClient?.(window.COSPLAYCHESS_CONFIG?.supabaseUrl,window.COSPLAYCHESS_CONFIG?.supabaseKey);
  const enabled=value=>Array.isArray(value)?value.filter(item=>item&&item.enabled!==false):[];
  const safeUrl=(value,fallback='#')=>{const url=String(value||'').trim();if(!url)return fallback;if(url.startsWith('#')||url.startsWith('./')||url.startsWith('../')||(url.startsWith('/')&&!url.startsWith('//')))return url;try{const parsed=new URL(url,location.origin);return ['http:','https:'].includes(parsed.protocol)?url:fallback;}catch{return fallback;}};
  const safeImage=value=>{const url=safeUrl(value,'');return url?`url('${url.replace(/['"\\]/g,'')}')`:'none';};

  function renderBanners(items){
    const banners=enabled(items).filter(item=>item.title||item.text||item.imageUrl);if(!banners.length)return;
    const header=$('header.topbar'),main=$('main');if(!main||$('#ccAnnouncements'))return;
    const wrap=document.createElement('section');wrap.id='ccAnnouncements';wrap.className='cc-announcements shell';
    wrap.innerHTML=`<article class="cc-banner"><div class="cc-banner-body"><span class="cc-banner-kicker">DESTAQUE COSPLAYCHESS</span><h2></h2><p></p><a class="btn gold" hidden></a></div>${banners.length>1?'<div class="cc-banner-nav"><button type="button" data-banner-prev aria-label="Banner anterior">‹</button><button type="button" data-banner-next aria-label="Próximo banner">›</button></div>':''}</article>`;
    main.insertBefore(wrap,main.firstChild);let index=0,timer;
    const show=next=>{index=(next+banners.length)%banners.length;const item=banners[index],card=$('.cc-banner',wrap),title=$('h2',card),text=$('p',card),link=$('a',card);card.style.setProperty('--cc-banner-image',safeImage(item.imageUrl));title.textContent=item.title||'';title.hidden=!item.title;text.textContent=item.text||'';text.hidden=!item.text;const href=safeUrl(item.url,'');link.hidden=!href||!item.buttonText;if(!link.hidden){link.href=href;link.textContent=item.buttonText;}if(banners.length>1){clearInterval(timer);timer=setInterval(()=>show(index+1),7000);}};
    wrap.addEventListener('click',event=>{if(event.target.closest('[data-banner-prev]'))show(index-1);if(event.target.closest('[data-banner-next]'))show(index+1);});show(0);
  }
  function sectionIntro(kicker,titleMain,titleAccent){return `<div class="cc-section-intro"><span class="kicker">${esc(kicker)}</span><h2>${esc(titleMain)} <i>${esc(titleAccent)}</i></h2></div>`;}
  function renderTestimonials(items){
    const testimonials=enabled(items).filter(item=>item.quote);if(!testimonials.length||$('#ccTestimonials'))return;
    const section=document.createElement('section');section.id='ccTestimonials';section.className='section shell cc-community-section';
    section.innerHTML=`${sectionIntro('VOZES DO TABULEIRO','Quem já viveu','o espetáculo.')}<div class="cc-testimonial-grid">${testimonials.map(item=>{const image=safeUrl(item.imageUrl,'');return `<article class="cc-testimonial"><p>“${esc(item.quote)}”</p><div class="cc-testimonial-person">${image?`<img src="${esc(image)}" alt="Foto de ${esc(item.name||'participante')}" loading="lazy">`:`<span class="cc-testimonial-avatar">${esc((item.name||'?').charAt(0).toUpperCase())}</span>`}<div><b>${esc(item.name||'Participante')}</b><span>${esc(item.role||'CosplayChess')}</span></div></div></article>`;}).join('')}</div>`;
    insertBeforeFinal(section);
  }
  function renderFaq(items){
    const faqs=enabled(items).filter(item=>item.question&&item.answer);if(!faqs.length||$('#ccFaq'))return;
    const section=document.createElement('section');section.id='ccFaq';section.className='section shell cc-community-section';
    section.innerHTML=`${sectionIntro('PERGUNTAS FREQUENTES','Dúvidas antes de','entrar no tabuleiro?')}<div class="cc-faq-list">${faqs.map((item,index)=>`<details class="cc-faq" ${index===0?'open':''}><summary>${esc(item.question)}</summary><p>${esc(item.answer)}</p></details>`).join('')}</div>`;
    insertBeforeFinal(section);
  }
  function insertBeforeFinal(section){const final=$('.final-cta'),main=$('main');if(final)final.before(section);else main?.appendChild(section);}
  function renderSocial(content){
    const socials=[['Instagram',content.instagramUrl],['TikTok',content.tiktokUrl],['YouTube',content.youtubeUrl],['Facebook',content.facebookUrl],['Discord',content.discordUrl],['WhatsApp',content.whatsappUrl]].filter(([,url])=>safeUrl(url,'') );
    if(!socials.length)return;
    const brand=$('.site-footer .footer-brand');if(brand&&!$('.cc-social-links',brand)){const nav=document.createElement('nav');nav.className='cc-social-links';nav.setAttribute('aria-label','Redes sociais');nav.innerHTML=socials.map(([label,url])=>`<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`).join('');brand.appendChild(nav);}
    if(content.instagramUrl)document.querySelectorAll('[data-fergorverse-instagram],a[href*="instagram.com/fergorverse"]').forEach(link=>link.href=safeUrl(content.instagramUrl));
  }
  async function init(){
    const db=getDb();if(!db)return;
    try{
      const{data,error}=await db.from('cosplay_site_content').select('key,content').in('key',['landing','global']).eq('published',true);if(error)throw error;
      const content=Object.fromEntries((data||[]).map(row=>[row.key,row.content||{}]));
      if($('#eventsGrid')){renderBanners(content.landing?.banners);renderTestimonials(content.landing?.testimonials);renderFaq(content.landing?.faqs);}renderSocial(content.global||{});
    }catch(error){console.warn('[Conteúdo público]',error);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
