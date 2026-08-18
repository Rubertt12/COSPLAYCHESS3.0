(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;
  if(!cfg||!window.supabase)return;
  const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const q=s=>document.querySelector(s);
  function setText(sel,val){if(val===undefined||val===null||val==='')return;const el=q(sel);if(el)el.textContent=val;}
  function setSplit(sel,main,accent){const el=q(sel);if(!el)return;const i=el.querySelector('i');if(main!==undefined&&main!==null&&main!==''){let n=[...el.childNodes].find(x=>x.nodeType===Node.TEXT_NODE&&x.textContent.trim());if(n)n.nodeValue=`${main} `;}if(i&&accent!==undefined&&accent!==null&&accent!=='')i.textContent=accent;}
  async function init(){
    const {data}=await db.from('cosplay_site_content').select('content').eq('key','universe').eq('published',true).maybeSingle();
    const c=data?.content||{};
    // Reaproveita somente os textos de equipe já publicados pelo admin.
    setText('#pessoas .about-section-head .kicker',c.teamKicker);
    setSplit('#pessoas .about-section-head h2',c.teamTitleMain,c.teamTitleAccent);
    setText('#pessoas .about-section-head>p',c.teamDescription);
    setText('.footer>p',c.footerText);
  }
  init().catch(()=>{});
})();
