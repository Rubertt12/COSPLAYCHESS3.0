(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;
  const db=window.COSPLAYCHESS_DB||window.supabase?.createClient(cfg?.supabaseUrl,cfg?.supabaseKey);
  if(!cfg||!db)return;
  const previewMode=new URLSearchParams(location.search).get('cmsPreview')==='1';
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  let current={};

  function setText(sel,val){if(val===undefined||val===null)return;const el=q(sel);if(el)el.textContent=val}
  function setSplit(sel,main,accent){const el=q(sel);if(!el)return;const i=el.querySelector('i');if(main!==undefined&&main!==null){let n=[...el.childNodes].find(x=>x.nodeType===Node.TEXT_NODE&&x.textContent.trim());if(n)n.nodeValue=`${main} `}if(i&&accent!==undefined&&accent!==null)i.textContent=accent}
  function setButton(sel,val){if(val===undefined||val===null)return;const el=q(sel);if(el)el.textContent=val}

  function apply(c={}){
    current={...current,...c};
    if(current.pageTitle)document.title=current.pageTitle;
    setText('.about-hero .kicker',current.heroKicker);
    setSplit('.about-hero h1',current.heroTitleMain,current.heroTitleAccent);
    setText('.about-hero p',current.heroDescription);
    setButton('.about-hero .community-nav a:nth-child(1)',current.heroPrimaryText);
    setButton('.about-hero .community-nav a:nth-child(2)',current.heroSecondaryText);

    setText('#historia .about-section-head .kicker',current.historyKicker);
    setSplit('#historia .about-section-head h2',current.historyTitleMain,current.historyTitleAccent);
    setText('#historia .about-section-head>p',current.historyDescription);
    const story=qa('#historia .story-copy p');
    if(story[0]&&current.story1!==undefined)story[0].textContent=current.story1;
    if(story[1]&&current.story2!==undefined)story[1].textContent=current.story2;
    if(story[2]&&current.story3!==undefined)story[2].textContent=current.story3;
    setText('#historia .story-quote small',current.conceptLabel);
    setText('#historia .story-quote blockquote',current.conceptQuote);

    const sections=qa('.about-section');
    const pillars=sections[1];
    if(pillars){
      const head=pillars.querySelector('.about-section-head');
      if(head){
        const k=head.querySelector('.kicker');if(k&&current.pillarsKicker!==undefined)k.textContent=current.pillarsKicker;
        const h=head.querySelector('h2');if(h)setSplitElement(h,current.pillarsTitleMain,current.pillarsTitleAccent);
        const p=head.querySelector(':scope>p');if(p&&current.pillarsDescription!==undefined)p.textContent=current.pillarsDescription;
      }
      const cards=[...pillars.querySelectorAll('.about-pillar')];
      [[current.pillar1Title,current.pillar1Text],[current.pillar2Title,current.pillar2Text],[current.pillar3Title,current.pillar3Text],[current.pillar4Title,current.pillar4Text]].forEach((pair,i)=>{const card=cards[i];if(!card)return;const b=card.querySelector('b'),p=card.querySelector('p');if(b&&pair[0]!==undefined)b.textContent=pair[0];if(p&&pair[1]!==undefined)p.textContent=pair[1]});
    }

    setText('#pessoas .about-section-head .kicker',current.teamKicker);
    setSplit('#pessoas .about-section-head h2',current.teamTitleMain,current.teamTitleAccent);
    setText('#pessoas .about-section-head>p',current.teamDescription);
    setText('#pessoas .about-team-note',current.teamNote);

    const finalSection=sections[3];
    if(finalSection){
      setText('.about-cta .kicker',current.finalKicker);
      setSplit('.about-cta h3',current.finalTitleMain,current.finalTitleAccent);
      setButton('.about-cta-actions a:nth-child(1)',current.finalPrimaryText);
      setButton('.about-cta-actions a:nth-child(2)',current.finalSecondaryText);
    }
    setText('.footer>p',current.footerText);
    if(previewMode)bindPreviewTargets();
  }

  function setSplitElement(el,main,accent){if(!el)return;const i=el.querySelector('i');if(main!==undefined){let n=[...el.childNodes].find(x=>x.nodeType===Node.TEXT_NODE&&x.textContent.trim());if(n)n.nodeValue=`${main} `}if(i&&accent!==undefined)i.textContent=accent}

  const targets=[
    ['.about-hero .kicker','heroKicker'],['.about-hero h1','heroTitleMain'],['.about-hero h1 i','heroTitleAccent'],['.about-hero p','heroDescription'],['.about-hero .community-nav a:nth-child(1)','heroPrimaryText'],['.about-hero .community-nav a:nth-child(2)','heroSecondaryText'],
    ['#historia .about-section-head .kicker','historyKicker'],['#historia .about-section-head h2','historyTitleMain'],['#historia .about-section-head h2 i','historyTitleAccent'],['#historia .about-section-head>p','historyDescription'],['#historia .story-copy p:nth-child(1)','story1'],['#historia .story-copy p:nth-child(2)','story2'],['#historia .story-copy p:nth-child(3)','story3'],['#historia .story-quote small','conceptLabel'],['#historia .story-quote blockquote','conceptQuote'],
    ['.about-section:nth-of-type(3) .about-section-head .kicker','pillarsKicker'],['.about-section:nth-of-type(3) .about-section-head h2','pillarsTitleMain'],['.about-section:nth-of-type(3) .about-section-head h2 i','pillarsTitleAccent'],['.about-section:nth-of-type(3) .about-section-head>p','pillarsDescription'],
    ['.about-pillar:nth-child(1) b','pillar1Title'],['.about-pillar:nth-child(1) p','pillar1Text'],['.about-pillar:nth-child(2) b','pillar2Title'],['.about-pillar:nth-child(2) p','pillar2Text'],['.about-pillar:nth-child(3) b','pillar3Title'],['.about-pillar:nth-child(3) p','pillar3Text'],['.about-pillar:nth-child(4) b','pillar4Title'],['.about-pillar:nth-child(4) p','pillar4Text'],
    ['#pessoas .about-section-head .kicker','teamKicker'],['#pessoas .about-section-head h2','teamTitleMain'],['#pessoas .about-section-head h2 i','teamTitleAccent'],['#pessoas .about-section-head>p','teamDescription'],['#pessoas .about-team-note','teamNote'],
    ['.about-cta .kicker','finalKicker'],['.about-cta h3','finalTitleMain'],['.about-cta h3 i','finalTitleAccent'],['.about-cta-actions a:nth-child(1)','finalPrimaryText'],['.about-cta-actions a:nth-child(2)','finalSecondaryText'],['.footer>p','footerText']
  ];
  let bound=false;
  function bindPreviewTargets(){
    if(bound)return;bound=true;
    targets.forEach(([sel,field])=>{const el=q(sel);if(!el)return;el.dataset.cmsField=field;el.style.cursor='pointer'});
    document.addEventListener('click',e=>{const el=e.target.closest?.('[data-cms-field]');if(!el)return;e.preventDefault();e.stopPropagation();parent.postMessage({type:'cosplaychess-cms-select',page:'about',field:el.dataset.cmsField},location.origin)},true);
    document.addEventListener('dblclick',e=>{const el=e.target.closest?.('[data-cms-field]');if(!el||el.tagName==='IMG'||el.children.length)return;e.preventDefault();e.stopPropagation();el.contentEditable='true';el.focus();const field=el.dataset.cmsField;const send=()=>parent.postMessage({type:'cosplaychess-cms-inline-change',page:'about',field,value:el.textContent},location.origin);el.addEventListener('input',send);el.addEventListener('blur',()=>{send();el.removeAttribute('contenteditable')},{once:true})},true);
  }

  async function init(){
    const [{data:about},{data:universe}]=await Promise.all([
      db.from('cosplay_site_content').select('content').eq('key','about').eq('published',true).maybeSingle(),
      db.from('cosplay_site_content').select('content').eq('key','universe').eq('published',true).maybeSingle()
    ]);
    const a=about?.content||{};
    const u=universe?.content||{};
    const merged={...a};
    ['teamKicker','teamTitleMain','teamTitleAccent','teamDescription','footerText'].forEach(k=>{if(merged[k]===undefined&&u[k]!==undefined)merged[k]=u[k]});
    apply(merged);
    if(previewMode){
      parent.postMessage({type:'cosplaychess-cms-preview-ready',page:'about'},location.origin);
      window.addEventListener('message',e=>{if(e.origin!==location.origin)return;const d=e.data||{};if(d.type==='cosplaychess-cms-preview'&&d.page==='about')apply(d.content||{})});
    }
  }
  init().catch(()=>{});
})();
