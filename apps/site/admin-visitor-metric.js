(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const db=window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();
  if(!db)return;
  function ensureCard(){
    const metrics=$('.v6-metrics');if(!metrics)return null;
    let card=$('#statVisitorsCard');
    if(card)return card;
    card=document.createElement('article');card.className='v6-metric';card.id='statVisitorsCard';
    card.innerHTML='<div class="v6-metric-icon blue">◎</div><div><span>VISITANTES ÚNICOS</span><b id="statVisitors">—</b><small class="info">IPs únicos contabilizados</small></div>';
    metrics.appendChild(card);
    return card;
  }
  async function load(){
    ensureCard();const out=$('#statVisitors');if(!out)return;
    out.textContent='…';
    const {data,error}=await db.rpc('cosplay_unique_visitor_count');
    if(error){out.textContent='—';out.title=error.message;return;}
    out.textContent=Number(data||0).toLocaleString('pt-BR');
  }
  db.auth.getSession().then(({data})=>{if(data.session)setTimeout(load,250);});
  db.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(load,250);});
  const dash=$('#dashboardPanel');if(dash)new MutationObserver(()=>{if(!dash.hidden)setTimeout(load,200);}).observe(dash,{attributes:true,attributeFilter:['hidden']});
})();