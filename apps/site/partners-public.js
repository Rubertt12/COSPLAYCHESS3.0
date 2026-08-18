(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;if(!cfg||!window.supabase)return;
  const db=window.COSPLAYCHESS_DB||window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const previewMode=new URLSearchParams(location.search).get('cmsPreview')==='1';
  let section=null,current={};
  const defaults={kicker:'PARCERIAS',titleMain:'Quem fortalece o',titleAccent:'tabuleiro.',description:'Parceiros, apoiadores e marcas que ajudam o CosplayChess a crescer, alcançar novos eventos e criar experiências cada vez maiores.',ctaText:'Quer apoiar o CosplayChess?',ctaButtonText:'Falar com a equipe',ctaUrl:'https://www.instagram.com/fergorverse/',showSection:true};
  function initials(name=''){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'CC'}
  function ensureSection(){
    if(section)return section;
    section=document.createElement('section');section.className='section shell partners-section';section.id='parcerias';
    section.innerHTML=`<div class="partners-head"><div><span class="kicker" data-partner-field="kicker"></span><h2><span data-partner-field="titleMain"></span> <i data-partner-field="titleAccent"></i></h2></div><p data-partner-field="description"></p></div><div class="partners-marquee" aria-label="Parceiros e apoiadores"><div id="partnersGrid" class="partners-grid"><div class="partners-empty">Carregando parceiros...</div></div></div><div class="partners-cta"><p data-partner-field="ctaText"></p><a class="btn gold" data-partner-field="ctaButtonText" data-partner-link href="#"></a></div>`;
    const finalCta=document.querySelector('.final-cta');const main=document.querySelector('main');
    if(finalCta)finalCta.before(section);else main?.append(section);
    if(previewMode)bindPreviewTargets();
    return section;
  }
  function apply(c={}){
    current={...defaults,...current,...c};ensureSection();
    const set=(f,v)=>{const el=section.querySelector(`[data-partner-field="${f}"]`);if(el&&v!==undefined)el.textContent=v};
    set('kicker',current.kicker);set('titleMain',current.titleMain);set('titleAccent',current.titleAccent);set('description',current.description);set('ctaText',current.ctaText);set('ctaButtonText',current.ctaButtonText);
    const a=section.querySelector('[data-partner-link]');if(a)a.href=current.ctaUrl||defaults.ctaUrl;
    section.hidden=current.showSection===false;
  }
  function card(p,clone=false){const body=`${p.logo_url?`<div class="partner-logo"><img src="${esc(p.logo_url)}" alt="${clone?'':`Logo ${esc(p.name)}`}"></div>`:`<div class="partner-logo">${esc(initials(p.name))}</div>`}<div class="partner-info"><small>${esc(p.category||'Parceiro')}</small><h3>${esc(p.name)}</h3>${p.description?`<p>${esc(p.description)}</p>`:''}</div><span class="partner-arrow" aria-hidden="true">↗</span>`;return p.website_url?`<a class="partner-card" href="${esc(p.website_url)}" target="_blank" rel="noopener noreferrer" ${clone?'aria-hidden="true" tabindex="-1"':''}>${body}</a>`:`<article class="partner-card" ${clone?'aria-hidden="true"':''}>${body}</article>`}
  async function load(){
    const [{data:content},{data:partners,error}]=await Promise.all([
      db.from('cosplay_site_content').select('content').eq('key','partners').eq('published',true).maybeSingle(),
      db.from('cosplay_partners').select('*').eq('published',true).order('sort_order').order('name')
    ]);
    apply(content?.content||{});
    const grid=document.getElementById('partnersGrid');if(!grid)return;
    if(error||!partners?.length){grid.innerHTML='<div class="partners-empty">Novas parcerias serão apresentadas aqui em breve.</div>';return;}
    const repeat=Math.max(1,Math.ceil(5/partners.length));const set=Array.from({length:repeat},()=>partners).flat();
    grid.innerHTML=`<div class="partners-track-group">${set.map(p=>card(p)).join('')}</div><div class="partners-track-group" aria-hidden="true">${set.map(p=>card(p,true)).join('')}</div>`;
  }
  function bindPreviewTargets(){
    section.querySelectorAll('[data-partner-field]').forEach(el=>{el.dataset.cmsField=el.dataset.partnerField;el.style.cursor='pointer'});
    section.addEventListener('click',e=>{const el=e.target.closest('[data-partner-field]');if(!el)return;e.preventDefault();e.stopPropagation();parent.postMessage({type:'cosplaychess-cms-select',page:'partners',field:el.dataset.partnerField},location.origin)},true);
  }
  window.addEventListener('message',e=>{if(e.origin!==location.origin)return;const d=e.data||{};if(d.type==='cosplaychess-cms-preview'&&d.page==='partners')apply(d.content||{})});
  load().then(()=>{if(previewMode)parent.postMessage({type:'cosplaychess-cms-preview-ready',page:'partners'},location.origin)}).catch(()=>{apply({});const g=document.getElementById('partnersGrid');if(g)g.innerHTML='<div class="partners-empty">Não foi possível carregar as parcerias agora.</div>'});
})();
