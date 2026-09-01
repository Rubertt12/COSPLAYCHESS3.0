(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;
  if(!cfg||!window.supabase)return;
  const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials=(name='')=>name.trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'♟';
  const fmtDate=v=>{try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:cfg.timezone}).format(new Date(v));}catch{return'';}};
  const empty=(text)=>`<div class="empty-card">${esc(text)}</div>`;
  const photo=(url,name,cls='member-photo')=>url?`<div class="${cls}" style="background-image:url('${esc(url)}')"></div>`:`<div class="${cls} member-initials">${esc(initials(name))}</div>`;

  const iconSvg={
    hall:`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 18h24v7c0 9-5.7 15.2-12 18-6.3-2.8-12-9-12-18v-7Z"/><path d="M15 18 19 8l5 7 5-7 4 10"/><path d="M19 28h10M17 34h14"/></svg>`,
    ranking:`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 39h22M17 33h14M19 28h10M16 15h16l-3 13H19l-3-13Z"/><path d="M19 15V9h4v6M25 15V9h4v6M16 9h4M28 9h4"/></svg>`,
    achievements:`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M16 9h16v7c0 7-3.7 12-8 14-4.3-2-8-7-8-14V9Z"/><path d="M16 12H9v5c0 5 3 8 8 8M32 12h7v5c0 5-3 8-8 8M24 30v7M18 42h12M20 37h8"/></svg>`
  };

  function installCommunityDecor(){
    if(document.getElementById('communityDecorStyles'))return;
    const style=document.createElement('style');
    style.id='communityDecorStyles';
    style.textContent=`
      .home-universe-card .universe-link .icon{width:42px;height:42px;display:grid;place-items:center;color:var(--gold2);border:1px solid rgba(224,190,119,.24);border-radius:12px;background:linear-gradient(145deg,rgba(92,28,54,.3),rgba(11,10,15,.94));box-shadow:0 10px 26px rgba(0,0,0,.24)}
      .home-universe-card .universe-link .icon svg{width:27px;height:27px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .duelist.winner{position:relative}
      .champion-photo-wrap{position:relative;display:inline-block;margin:38px auto 12px}
      .duelist.winner .duelist-photo{position:relative;overflow:hidden}
      .duelist.winner .champion-helmet{position:absolute;z-index:6;left:50%;top:-42px;transform:translateX(-50%);width:66px;height:44px;pointer-events:none;filter:drop-shadow(0 7px 10px rgba(0,0,0,.65)) drop-shadow(0 0 10px rgba(224,190,119,.22))}
      .duelist.winner .champion-helmet svg{width:100%;height:100%;overflow:visible}
      .duelist.winner .champion-helmet .helmet-fill{fill:url(#championHelmetGold);stroke:#f0cf83;stroke-width:1.35}
      .duelist.winner .champion-helmet .helmet-dark{fill:#5b3918;stroke:#d6a453;stroke-width:1.1}
      .duelist.winner .champion-helmet .helmet-line{fill:none;stroke:#fff0b3;stroke-width:1.25;stroke-linecap:round;opacity:.78}
      .duelist.winner .champion-helmet:after{content:"CAMPEÃO";position:absolute;left:50%;top:-11px;transform:translateX(-50%);padding:3px 7px;border:1px solid rgba(238,199,116,.48);border-radius:999px;background:#120d10;color:#efcd80;font-size:6px;font-weight:900;letter-spacing:1.25px;white-space:nowrap}
      @media(max-width:700px){.champion-photo-wrap{margin-top:34px}.duelist.winner .champion-helmet{top:-38px;width:60px;height:40px}}
    `;
    document.head.appendChild(style);

    document.querySelectorAll('.home-universe-card .universe-link').forEach(link=>{
      const icon=link.querySelector('.icon');if(!icon)return;
      const href=link.getAttribute('href')||'';
      if(href.includes('hall-da-fama'))icon.innerHTML=iconSvg.hall;
      else if(href.includes('ranking'))icon.innerHTML=iconSvg.ranking;
      else if(href.includes('conquistas'))icon.innerHTML=iconSvg.achievements;
    });
  }

  function championHelmet(){
    return `<span class="champion-helmet" aria-hidden="true"><svg viewBox="0 0 100 66"><defs><linearGradient id="championHelmetGold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0a8"/><stop offset=".28" stop-color="#d9a84f"/><stop offset=".64" stop-color="#8c551d"/><stop offset="1" stop-color="#edc873"/></linearGradient></defs><path class="helmet-fill" d="M17 42c1-17 10-29 25-34l8-5 8 5c15 5 24 17 25 34l-10 8H27l-10-8Z"/><path class="helmet-dark" d="M27 50h46l-7 10H34l-7-10Z"/><path class="helmet-dark" d="M46 8h8v34h-8z"/><path class="helmet-line" d="M25 38c5-11 12-18 21-21M75 38c-5-11-12-18-21-21M30 45h40"/><path class="helmet-fill" d="m19 29-9 7 8 7M81 29l9 7-8 7"/></svg></span>`;
  }

  async function loadTeam(){
    const roots=[...document.querySelectorAll('[data-team-grid]')];
    if(!roots.length)return;
    const {data,error}=await db.from('cosplay_team_members').select('*').eq('published',true).order('sort_order');
    roots.forEach(root=>{
      if(error||!data?.length){root.innerHTML=empty('A equipe Fergorverse será apresentada aqui em breve.');return;}
      root.innerHTML=data.map(m=>`<article class="member-card"><div class="member-head">${photo(m.photo_url,m.name)}<div><small>${esc(m.role||'Fergorverse')}</small><h3>${esc(m.name)}</h3></div></div><p>${esc(m.bio||'')}</p></article>`).join('');
    });
  }

  async function loadChampions(){
    const root=document.getElementById('championsGrid');
    if(!root)return;
    const {data,error}=await db.from('cosplay_matches').select('*,cosplay_events(title,start_at,venue,city)').eq('published',true).order('played_at',{ascending:false});
    if(error||!data?.length){root.innerHTML=empty('Nenhum resultado oficial publicado ainda. Quando a primeira partida entrar para a história, ela aparece aqui.');return;}
    root.innerHTML=data.map(m=>`<article class="champion-card"><div class="champion-top"><div><small>${esc(m.cosplay_events?.title||'CosplayChess')}</small><div>${esc(m.match_label||'Partida')}</div></div><span>${fmtDate(m.played_at)}</span></div><div class="duel"><div class="duelist winner"><div class="champion-photo-wrap">${photo(m.winner_photo_url,m.winner_character,'duelist-photo')}${m.winner_photo_url?championHelmet():''}</div><em>Vencedor</em><b>${esc(m.winner_character)}</b><span>${esc(m.winner_cosplayer)}</span></div><div class="versus">VS</div><div class="duelist">${photo(m.opponent_photo_url,m.opponent_character||m.opponent_cosplayer,'duelist-photo')}<em>Contra</em><b>${esc(m.opponent_character||'Adversário')}</b><span>${esc(m.opponent_cosplayer||'')}</span></div></div>${m.notes?`<div class="champion-notes">${esc(m.notes)}</div>`:''}</article>`).join('');
    root.querySelectorAll('.champion-photo-wrap').forEach(w=>{const p=w.querySelector('.duelist-photo');if(p)p.style.margin='0';});
  }

  let rankingRows=[];
  let rankingMode='kills';
  function aggregateRanking(rows){
    const map=new Map();
    for(const r of rows||[]){
      const key=(r.cosplayer_name||'').trim().toLocaleLowerCase('pt-BR');
      if(!key)continue;
      if(!map.has(key))map.set(key,{name:r.cosplayer_name,characters:new Map(),matches:new Set(),kills:0,deaths:0,survivals:0,wins:0,photo:r.photo_url||''});
      const p=map.get(key);p.matches.add(r.match_id);p.kills+=Number(r.kills)||0;p.deaths+=r.died?1:0;p.survivals+=r.survived?1:0;p.wins+=r.winner?1:0;if(!p.photo&&r.photo_url)p.photo=r.photo_url;
      const ch=r.character_name||'Personagem';p.characters.set(ch,(p.characters.get(ch)||0)+1);
    }
    return [...map.values()].map(p=>({...p,matches:p.matches.size,character:[...p.characters.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||''}));
  }
  const labels={kills:'capturas',matches:'partidas',deaths:'mortes',survivals:'sobrevivências',wins:'vitórias'};
  function sortRanking(mode){
    rankingMode=mode;
    document.querySelectorAll('.rank-filter').forEach(b=>b.classList.toggle('active',b.dataset.rank===mode));
    const sorted=[...rankingRows].sort((a,b)=>(b[mode]-a[mode])||(b.kills-a.kills)||(b.survivals-a.survivals)||(a.name||'').localeCompare(b.name||''));
    const root=document.getElementById('rankingTable');
    if(!root)return;
    if(!sorted.length){root.innerHTML=empty('O ranking começa a contar assim que os resultados oficiais forem registrados.');return;}
    root.innerHTML=`<div class="ranking-row header"><div>#</div><div>Cosplayer</div><div>Capturas</div><div>Partidas</div><div>Mortes</div><div>Sobreviveu</div><div>Vitórias</div></div>`+sorted.map((p,i)=>`<div class="ranking-row"><div class="ranking-pos">${String(i+1).padStart(2,'0')}</div><div class="rank-person">${p.photo?`<div class="rank-avatar" style="background-image:url('${esc(p.photo)}')"></div>`:`<div class="rank-avatar">${esc(initials(p.name))}</div>`}<div><b>${esc(p.name)}</b><span>${esc(p.character)}</span></div></div><div class="rank-stat"><b>${p.kills}</b><span>Capturas</span></div><div class="rank-stat"><b>${p.matches}</b><span>Partidas</span></div><div class="rank-stat"><b>${p.deaths}</b><span>Mortes</span></div><div class="rank-stat"><b>${p.survivals}</b><span>Sobreviveu</span></div><div class="rank-stat"><b>${p.wins}</b><span>Vitórias</span></div></div>`).join('');
    const title=document.getElementById('rankingModeTitle');if(title)title.textContent=`Ordenado por ${labels[mode]}`;
  }
  function renderHighlights(){
    const root=document.getElementById('rankingHighlights');if(!root)return;
    if(!rankingRows.length){root.innerHTML='';return;}
    const metrics=[['kills','Mais capturas','⚔️'],['matches','Mais partidas','♟️'],['deaths','Mais mortes','💀'],['survivals','Mais sobrevivências','🛡️'],['wins','Mais vitórias','🏆']];
    root.innerHTML=metrics.map(([key,label,icon])=>{const top=[...rankingRows].sort((a,b)=>b[key]-a[key])[0];return `<article class="rank-highlight"><span>${icon} ${label}</span><b>${esc(top?.name||'—')}</b><small>${top?.[key]||0} ${labels[key]}</small></article>`}).join('');
  }
  async function loadRanking(){
    if(!document.getElementById('rankingTable')&&!document.getElementById('rankingHighlights'))return;
    const {data,error}=await db.from('cosplay_match_players').select('match_id,cosplayer_name,character_name,kills,died,survived,winner,photo_url,cosplay_matches!inner(published)').eq('cosplay_matches.published',true);
    rankingRows=error?[]:aggregateRanking(data||[]);renderHighlights();sortRanking(rankingMode);
    document.querySelectorAll('.rank-filter').forEach(btn=>btn.addEventListener('click',()=>sortRanking(btn.dataset.rank)));
  }

  async function loadAchievements(){
    const root=document.getElementById('achievementsGrid');
    const feed=document.getElementById('awardsFeed');
    if(!root&&!feed)return;
    const [{data:achievements,error:aErr},{data:awards,error:wErr}]=await Promise.all([
      db.from('cosplay_achievements').select('*').eq('published',true).order('sort_order'),
      db.from('cosplay_cosplayer_achievements').select('*,cosplay_achievements(title,icon,tier),cosplay_events(title)').order('awarded_at',{ascending:false})
    ]);
    const counts=new Map();for(const a of awards||[])counts.set(a.achievement_id,(counts.get(a.achievement_id)||0)+1);
    if(root)root.innerHTML=aErr||!achievements?.length?empty('As conquistas serão reveladas em breve.'):achievements.map(a=>`<article class="achievement-card"><span class="award-count">${counts.get(a.id)||0} desbloqueio(s)</span><div class="achievement-icon">${esc(a.icon)}</div><span class="achievement-tier">${esc(a.tier)}</span><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p><small>${esc(a.criteria_text)}</small></article>`).join('');
    if(feed)feed.innerHTML=wErr||!awards?.length?empty('Ainda não há troféus desbloqueados. A história está só começando.'):awards.slice(0,18).map(a=>`<article class="award-item"><b>${esc(a.cosplay_achievements?.icon||'🏆')} ${esc(a.cosplay_achievements?.title||'Conquista')}</b><span>${esc(a.cosplayer_name)}${a.character_name?` • ${esc(a.character_name)}`:''}</span><small>${esc(a.cosplay_events?.title||'CosplayChess')} • ${fmtDate(a.awarded_at)}</small></article>`).join('');
  }

  installCommunityDecor();loadTeam();loadChampions();loadRanking();loadAchievements();
})();