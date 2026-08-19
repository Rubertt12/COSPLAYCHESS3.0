(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;
  const editor=document.getElementById('cmsEditor');
  const frame=document.getElementById('cmsFrame');
  const saveMain=document.getElementById('cmsSave');
  const discardMain=document.getElementById('cmsDiscard');
  if(!cfg||!editor||!frame||!window.supabase)return;

  const db=typeof window.getCosplayChessDb==='function'
    ? window.getCosplayChessDb()
    : (window.COSPLAYCHESS_DB||window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey));
  const E=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=v=>JSON.parse(JSON.stringify(v||[]));
  const areas=[['hero','Hero — topo da página'],['universe','História Viva / Universo'],['final','CTA final — rodapé da landing']];
  const presets=[['gold','Dourado'],['dark','Escuro'],['outline','Contorno'],['instagram','Instagram'],['custom','Personalizado']];
  const sizes=[['small','Pequeno'],['medium','Médio'],['large','Grande']];
  const icons=[['none','Sem ícone'],['instagram','Instagram'],['arrow','Seta ↗'],['chess','Xadrez ♟'],['star','Estrela ★'],['custom','Emoji / texto personalizado']];
  let buttons=[],savedButtons=[],loaded=false,dirty=false,renderLock=false;

  function isLanding(){return !!document.querySelector('.cms-page-tabs [data-page="landing"].active');}
  function rid(){return 'btn_'+Math.random().toString(36).slice(2,10);}
  function opt(list,value){return list.map(([v,l])=>`<option value="${E(v)}" ${v===value?'selected':''}>${E(l)}</option>`).join('');}
  function defaults(c={}){
    return [
      {id:rid(),area:'hero',label:c.heroPrimaryText||'Ver próximos eventos',url:c.heroPrimaryUrl||'#eventos',preset:'gold',size:'large',icon:'none',customIcon:'',background:'',textColor:'',borderColor:'',radius:10,fullWidth:false,newTab:false,enabled:true},
      {id:rid(),area:'hero',label:c.heroSecondaryText||'Entrar no tabuleiro',url:c.heroSecondaryUrl||'./cadastro.html',preset:'dark',size:'large',icon:'none',customIcon:'',background:'',textColor:'',borderColor:'',radius:10,fullWidth:false,newTab:false,enabled:true},
      {id:rid(),area:'universe',label:c.universeCtaText||'Conheça o universo Fergorverse',url:'./universo.html',preset:'gold',size:'large',icon:'none',customIcon:'',background:'',textColor:'',borderColor:'',radius:10,fullWidth:false,newTab:false,enabled:true},
      {id:rid(),area:'universe',label:c.instagramText||'Siga o @fergorverse',url:c.instagramUrl||'https://www.instagram.com/fergorverse/',preset:'instagram',size:'large',icon:'instagram',customIcon:'',background:'',textColor:'#ffffff',borderColor:'',radius:16,fullWidth:false,newTab:true,enabled:true},
      {id:rid(),area:'final',label:c.finalCtaText||'Faça parte do Espetáculo!',url:'./cadastro.html',preset:'gold',size:'large',icon:'none',customIcon:'',background:'',textColor:'',borderColor:'',radius:10,fullWidth:false,newTab:false,enabled:true}
    ];
  }
  function normalise(b={}){
    return {
      id:b.id||rid(),
      area:areas.some(x=>x[0]===b.area)?b.area:'universe',
      label:String(b.label||'Novo botão'),
      url:String(b.url||'#'),
      preset:presets.some(x=>x[0]===b.preset)?b.preset:'custom',
      size:sizes.some(x=>x[0]===b.size)?b.size:'medium',
      icon:icons.some(x=>x[0]===b.icon)?b.icon:'none',
      customIcon:String(b.customIcon||''),
      background:String(b.background||''),
      textColor:String(b.textColor||''),
      borderColor:String(b.borderColor||''),
      radius:Number.isFinite(Number(b.radius))?Number(b.radius):12,
      fullWidth:!!b.fullWidth,
      newTab:!!b.newTab,
      enabled:b.enabled!==false
    };
  }

  function injectStyles(){
    if(document.getElementById('cmsButtonManagerStyles'))return;
    const st=document.createElement('style');st.id='cmsButtonManagerStyles';st.textContent=`
      #cmsButtonsGroup .cms-fields{gap:12px}
      .cms-button-manager-head{display:flex;gap:7px;flex-wrap:wrap}
      .cms-button-manager-head .cms-btn{flex:1 1 140px}
      .cms-button-list{display:grid;gap:9px}
      .cms-button-card{border:1px solid #3a303a;border-radius:11px;padding:10px;background:linear-gradient(160deg,#0d0a10,#0a080d)}
      .cms-button-card.is-hidden{opacity:.58}
      .cms-button-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}
      .cms-button-card-top>div:first-child{display:grid;gap:2px;min-width:0}
      .cms-button-card-top b{font-size:10px;color:#f1e7dc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .cms-button-card-top small{font-size:8px;color:#887d8b;text-transform:uppercase;letter-spacing:.8px}
      .cms-button-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .cms-button-grid .wide{grid-column:1/-1}
      .cms-button-card .cms-mini-actions{flex-wrap:wrap;justify-content:flex-end}
      .cms-button-card input[type=number]{appearance:textfield}
      .cms-button-help{font-size:8px;color:#786f7b;line-height:1.5;margin-top:-3px}
      .cms-button-status{font-size:9px;min-height:15px;color:#d4aa5c}
      @media(max-width:480px){.cms-button-grid{grid-template-columns:1fr}.cms-button-grid .wide{grid-column:auto}.cms-button-card-top{align-items:flex-start;flex-direction:column}.cms-button-card .cms-mini-actions{justify-content:flex-start}}
    `;document.head.appendChild(st);
  }

  function card(b,i){
    const areaName=areas.find(x=>x[0]===b.area)?.[1]||'Botão';
    return `<article class="cms-button-card cms-dynamic-card ${b.enabled===false?'is-hidden':''}" data-button-index="${i}">
      <div class="cms-button-card-top"><div><b>${E(b.label||'Novo botão')}</b><small>${E(areaName)}</small></div><div class="cms-mini-actions"><button type="button" data-bup="${i}" ${i===0?'disabled':''}>↑</button><button type="button" data-bdown="${i}" ${i===buttons.length-1?'disabled':''}>↓</button><button type="button" data-bdup="${i}">Duplicar</button><button class="danger" type="button" data-bremove="${i}">Excluir</button></div></div>
      <div class="cms-button-grid">
        <label class="cms-field"><span>Texto do botão</span><input data-bprop="label" data-index="${i}" value="${E(b.label)}"></label>
        <label class="cms-field"><span>Onde aparece</span><select data-bprop="area" data-index="${i}">${opt(areas,b.area)}</select></label>
        <label class="cms-field wide"><span>Link / URL</span><input type="url" data-bprop="url" data-index="${i}" value="${E(b.url)}" placeholder="https://... ou ./pagina.html"></label>
        <label class="cms-field"><span>Estilo</span><select data-bprop="preset" data-index="${i}">${opt(presets,b.preset)}</select></label>
        <label class="cms-field"><span>Tamanho</span><select data-bprop="size" data-index="${i}">${opt(sizes,b.size)}</select></label>
        <label class="cms-field"><span>Ícone</span><select data-bprop="icon" data-index="${i}">${opt(icons,b.icon)}</select></label>
        <label class="cms-field"><span>Emoji / ícone personalizado</span><input data-bprop="customIcon" data-index="${i}" value="${E(b.customIcon)}" maxlength="4" placeholder="✨"></label>
        <label class="cms-field wide"><span>Fundo / gradiente personalizado</span><input data-bprop="background" data-index="${i}" value="${E(b.background)}" placeholder="#833ab4 ou linear-gradient(...)"></label>
        <div class="cms-button-help wide">Deixe as cores vazias para usar o preset escolhido. O fundo personalizado aceita cor ou linear-gradient.</div>
        <label class="cms-field"><span>Cor do texto</span><input data-bprop="textColor" data-index="${i}" value="${E(b.textColor)}" placeholder="#ffffff"></label>
        <label class="cms-field"><span>Cor da borda</span><input data-bprop="borderColor" data-index="${i}" value="${E(b.borderColor)}" placeholder="#ffffff"></label>
        <label class="cms-field"><span>Arredondamento (px)</span><input type="number" min="0" max="40" data-bprop="radius" data-index="${i}" value="${Number(b.radius||0)}"></label>
        <label class="cms-check"><input type="checkbox" data-bprop="fullWidth" data-index="${i}" ${b.fullWidth?'checked':''}><span>Largura total</span></label>
        <label class="cms-check"><input type="checkbox" data-bprop="newTab" data-index="${i}" ${b.newTab?'checked':''}><span>Abrir em nova aba</span></label>
        <label class="cms-check"><input type="checkbox" data-bprop="enabled" data-index="${i}" ${b.enabled!==false?'checked':''}><span>Botão visível</span></label>
      </div>
    </article>`;
  }

  function groupHtml(){return `<details class="cms-group" id="cmsButtonsGroup" data-group="Botões da landing" open><summary><span>Botões da Landing</span><small>Adicionar • remover • estilizar</small></summary><div class="cms-fields"><p class="cms-note">Controle todos os CTAs da landing sem alterar código. Você pode mover, ocultar, mudar links, cores, tamanho e ícones.</p><div class="cms-button-manager-head"><button id="cmsAddButton" class="cms-btn primary" type="button">+ Adicionar botão</button><button id="cmsSaveButtons" class="cms-btn ghost" type="button">Salvar botões agora</button></div><div id="cmsButtonStatus" class="cms-button-status">${dirty?'Alterações de botões ainda não publicadas.':'Botões sincronizados.'}</div><div class="cms-button-list">${buttons.length?buttons.map(card).join(''):'<div class="cms-empty">Nenhum botão. Clique em “Adicionar botão”.</div>'}</div></div></details>`;}

  function renderGroup(){
    if(renderLock||!loaded||!isLanding())return;
    renderLock=true;injectStyles();
    document.getElementById('cmsButtonsGroup')?.remove();
    editor.insertAdjacentHTML('beforeend',groupHtml());
    bindGroup();renderLock=false;
  }
  function setDirty(){dirty=true;const s=document.getElementById('cmsButtonStatus');if(s)s.textContent='Alterações de botões ainda não publicadas.';sendPreview();}
  function updateCardHeading(i){const cardEl=editor.querySelector(`[data-button-index="${i}"]`);if(!cardEl)return;const b=buttons[i];const title=cardEl.querySelector('.cms-button-card-top b');const sub=cardEl.querySelector('.cms-button-card-top small');if(title)title.textContent=b?.label||'Novo botão';if(sub)sub.textContent=areas.find(x=>x[0]===b?.area)?.[1]||'Botão';cardEl.classList.toggle('is-hidden',b?.enabled===false);}
  function bindGroup(){
    const add=document.getElementById('cmsAddButton');if(add)add.onclick=()=>{buttons.push(normalise({area:'universe',label:'Novo botão',url:'#',preset:'gold',size:'medium',icon:'none',radius:12,enabled:true}));setDirty();renderGroup();};
    const save=document.getElementById('cmsSaveButtons');if(save)save.onclick=()=>persist(false);
    editor.querySelectorAll('[data-bprop]').forEach(el=>{const fn=()=>{const i=Number(el.dataset.index),b=buttons[i];if(!b)return;const p=el.dataset.bprop;if(['fullWidth','newTab','enabled'].includes(p))b[p]=el.checked;else if(p==='radius')b[p]=Number(el.value||0);else b[p]=el.value;setDirty();updateCardHeading(i);};el.addEventListener('input',fn);el.addEventListener('change',fn)});
    editor.querySelectorAll('[data-bremove]').forEach(el=>el.onclick=()=>{buttons.splice(Number(el.dataset.bremove),1);setDirty();renderGroup();});
    editor.querySelectorAll('[data-bdup]').forEach(el=>el.onclick=()=>{const i=Number(el.dataset.bdup);buttons.splice(i+1,0,{...clone([buttons[i]])[0],id:rid(),label:(buttons[i]?.label||'Botão')+' — cópia'});setDirty();renderGroup();});
    editor.querySelectorAll('[data-bup]').forEach(el=>el.onclick=()=>move(Number(el.dataset.bup),-1));
    editor.querySelectorAll('[data-bdown]').forEach(el=>el.onclick=()=>move(Number(el.dataset.bdown),1));
  }
  function move(i,d){const j=i+d;if(j<0||j>=buttons.length)return;[buttons[i],buttons[j]]=[buttons[j],buttons[i]];setDirty();renderGroup();}

  function sendPreview(){
    const apply=()=>{try{frame.contentWindow?.COSPLAYCHESS_RENDER_BUTTONS?.(clone(buttons));}catch{}};
    apply();setTimeout(apply,80);setTimeout(apply,280);
  }

  async function readLanding(){
    const {data,error}=await db.from('cosplay_site_content').select('content').eq('key','landing').maybeSingle();
    if(error)throw error;return data?.content||{};
  }
  async function load(){
    try{const c=await readLanding();buttons=(Array.isArray(c.buttons)?c.buttons:defaults(c)).map(normalise);savedButtons=clone(buttons);loaded=true;renderGroup();sendPreview();}
    catch(e){console.error('[CMS botões] Falha ao carregar:',e);}
  }
  async function persist(silent=false){
    if(!loaded)return;
    const btn=document.getElementById('cmsSaveButtons');if(btn)btn.disabled=true;
    const status=document.getElementById('cmsButtonStatus');if(status&&!silent)status.textContent='Publicando botões...';
    try{
      const current=await readLanding();const {data:{user}}=await db.auth.getUser();
      const content={...current,buttons:clone(buttons)};
      const {error}=await db.from('cosplay_site_content').upsert({key:'landing',content,published:true,updated_at:new Date().toISOString(),updated_by:user?.id||null},{onConflict:'key'});
      if(error)throw error;savedButtons=clone(buttons);dirty=false;if(status)status.textContent='Botões publicados com sucesso.';
    }catch(e){if(status)status.textContent=e.message||String(e);console.error('[CMS botões] Falha ao salvar:',e);}
    finally{if(btn)btn.disabled=false;}
  }

  function waitForMainSaveThenPersist(){
    const started=Date.now();
    const check=()=>{if(saveMain.disabled&&Date.now()-started<12000){setTimeout(check,120);return;}if(Date.now()-started<80){setTimeout(check,120);return;}persist(true);};
    setTimeout(check,0);
  }
  saveMain?.addEventListener('click',()=>{if(isLanding())waitForMainSaveThenPersist();},true);
  discardMain?.addEventListener('click',()=>{if(!isLanding())return;setTimeout(()=>{buttons=clone(savedButtons);dirty=false;renderGroup();sendPreview();},60);},true);
  frame.addEventListener('load',()=>{if(isLanding())setTimeout(sendPreview,450);});

  let mutationQueued=false;
  new MutationObserver(()=>{
    if(mutationQueued||renderLock)return;mutationQueued=true;
    requestAnimationFrame(()=>{mutationQueued=false;if(isLanding()&&!document.getElementById('cmsButtonsGroup'))renderGroup();});
  }).observe(editor,{childList:true});
  document.querySelectorAll('.cms-page-tabs [data-page]').forEach(tab=>tab.addEventListener('click',()=>setTimeout(()=>{if(isLanding())renderGroup();},80)));

  load();
})();