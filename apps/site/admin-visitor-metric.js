(()=>{
  const $=(selector,root=document)=>root.querySelector(selector);
  const db=window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();
  if(!db)return;

  let inFlight=null;
  let lastLoadedAt=0;

  function ensureCard(){
    const metrics=$('.v6-metrics');
    if(!metrics)return null;
    let card=$('#statVisitorsCard');
    if(card)return card;
    card=document.createElement('article');
    card.className='v6-metric';
    card.id='statVisitorsCard';
    card.innerHTML='<div class="v6-metric-icon blue">◎</div><div><span>VISITANTES ÚNICOS</span><b id="statVisitors">—</b><small id="statVisitorVisits" class="info">— acessos totais</small></div>';
    metrics.appendChild(card);
    return card;
  }

  function format(value){
    return Number(value||0).toLocaleString('pt-BR');
  }

  async function load(force=false){
    ensureCard();
    const uniqueOut=$('#statVisitors');
    const visitsOut=$('#statVisitorVisits');
    if(!uniqueOut||!visitsOut)return;
    if(inFlight)return inFlight;
    if(!force&&Date.now()-lastLoadedAt<15000)return;

    uniqueOut.textContent='…';
    visitsOut.textContent='carregando acessos…';

    inFlight=(async()=>{
      const {data,error}=await db.rpc('cosplay_site_visitor_summary');
      lastLoadedAt=Date.now();
      if(error){
        uniqueOut.textContent='—';
        uniqueOut.title=error.message;
        visitsOut.textContent='contador indisponível';
        return;
      }
      uniqueOut.removeAttribute('title');
      uniqueOut.textContent=format(data?.unique_visitors);
      visitsOut.textContent=`${format(data?.total_visits)} acessos totais`;
    })().catch(()=>{
      uniqueOut.textContent='—';
      visitsOut.textContent='contador indisponível';
    }).finally(()=>{inFlight=null;});

    return inFlight;
  }

  db.auth.getSession().then(({data})=>{
    if(data.session)setTimeout(()=>load(true),250);
  });
  db.auth.onAuthStateChange((_event,session)=>{
    if(session)setTimeout(()=>load(true),250);
  });

  const dash=$('#dashboardPanel');
  if(dash)new MutationObserver(()=>{
    if(!dash.hidden)setTimeout(()=>load(),200);
  }).observe(dash,{attributes:true,attributeFilter:['hidden']});
})();