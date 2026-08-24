(()=>{
  if(window.__COSPLAYCHESS_CONTENT_MANAGER_V8__)return;
  window.__COSPLAYCHESS_CONTENT_MANAGER_V8__=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const client=()=>{try{if(typeof db!=='undefined'&&db)return db;}catch{}return window.COSPLAYCHESS_DB||window.getCosplayChessDb?.();};
  const defaults={
    landing:{banners:[],faqs:[],testimonials:[]},
    global:{instagramUrl:'https://www.instagram.com/fergorverse/',tiktokUrl:'',youtubeUrl:'',facebookUrl:'',discordUrl:'',whatsappUrl:''}
  };
  let state={landing:{...defaults.landing},global:{...defaults.global}};
  let loaded=false,loading=false,saving=false;
  let activeRegistrations=new Map();

  const schemas={
    banners:{title:'Banners',description:'Crie avisos e destaques que aparecem no início da página principal.',singular:'Banner',add:'Adicionar banner',fields:[
      ['title','Título','text','Ex.: Inscrições abertas'],['text','Texto','textarea','Mensagem do banner'],['eventDate','Data do evento','date',''],['imageUrl','Imagem de fundo','url','https://...'],['buttonText','Texto do botão','text','Saiba mais'],['url','Link do botão','url','./cadastro.html']
    ]},
    testimonials:{title:'Depoimentos',description:'Publique relatos de participantes e pessoas que já viveram o CosplayChess.',singular:'Depoimento',add:'Adicionar depoimento',fields:[
      ['name','Nome','text','Nome da pessoa'],['role','Personagem / identificação','text','Ex.: Cosplayer da Rainha'],['quote','Depoimento','textarea','Escreva o relato'],['imageUrl','Foto','url','https://...']
    ]},
    faq:{title:'FAQ',description:'Organize as perguntas frequentes exibidas na página principal.',singular:'Pergunta',add:'Adicionar pergunta',fields:[
      ['question','Pergunta','text','Ex.: Preciso saber jogar xadrez?'],['answer','Resposta','textarea','Digite a resposta completa']
    ]}
  };

  function collectionFor(view){return view==='faq'?'faqs':view;}
  function normalizeItems(value){return Array.isArray(value)?value.map(x=>({id:x.id||uid(),enabled:x.enabled!==false,...x})):[];}
  function setStatus(view,text,type=''){
    const el=$(`#${view} .v8-manager-status`);if(!el)return;
    el.textContent=text;el.className=`v8-manager-status ${type}`.trim();
  }
  function fieldMarkup(view,item,index,[key,label,type,placeholder]){
    const value=item[key]??'';
    const wide=type==='textarea'||key==='imageUrl'||key==='url'?' wide':'';
    if(type==='textarea')return `<label class="v8-field${wide}"><span>${label}</span><textarea data-view="${view}" data-index="${index}" data-field="${key}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`;
    return `<label class="v8-field${wide}"><span>${label}</span><input type="${type}" data-view="${view}" data-index="${index}" data-field="${key}" value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
  }
  function collectionMarkup(view){
    const schema=schemas[view],key=collectionFor(view),items=state.landing[key];
    if(!items.length)return `<div class="v8-empty">Nenhum conteúdo cadastrado ainda. Use “${schema.add}”.</div>`;
    return items.map((item,index)=>`<article class="v8-editor-card" data-item-id="${esc(item.id)}"><div class="v8-editor-card-head"><strong>${schema.singular} ${index+1}</strong><div class="v8-card-tools"><button class="v8-mini" type="button" data-move="up" data-view="${view}" data-index="${index}" aria-label="Mover para cima">↑</button><button class="v8-mini" type="button" data-move="down" data-view="${view}" data-index="${index}" aria-label="Mover para baixo">↓</button><button class="v8-mini v8-danger" type="button" data-remove="${view}" data-index="${index}">Remover</button></div></div><div class="v8-grid">${schema.fields.map(f=>fieldMarkup(view,item,index,f)).join('')}<label class="v8-toggle wide"><input type="checkbox" data-view="${view}" data-index="${index}" data-field="enabled" ${item.enabled!==false?'checked':''}> Publicar este conteúdo no site</label></div></article>`).join('');
  }
  function renderCollectionView(view){
    const root=$(`#${view}`),schema=schemas[view];if(!root)return;
    root.classList.remove('v6-aux-view');root.classList.add('v8-content-manager');root.dataset.contentManager='true';
    root.innerHTML=`<div class="v8-content-head"><div><h2>${schema.title}</h2><p>${schema.description}</p></div><div class="v8-content-actions"><button class="v8-add" type="button" data-add="${view}">＋ ${schema.add}</button><button class="v8-save" type="button" data-save="${view}">Salvar alterações</button></div></div><div class="v8-manager-status">${loaded?'Conteúdo sincronizado com o site.':'Carregando conteúdo...'}</div><div class="v8-editor-list">${collectionMarkup(view)}</div>`;
  }
  function renderSocialView(){
    const root=$('#social');if(!root)return;
    root.classList.remove('v6-aux-view');root.classList.add('v8-content-manager');root.dataset.contentManager='true';
    const fields=[['instagramUrl','Instagram'],['tiktokUrl','TikTok'],['youtubeUrl','YouTube'],['facebookUrl','Facebook'],['discordUrl','Discord'],['whatsappUrl','WhatsApp']];
    root.innerHTML=`<div class="v8-content-head"><div><h2>Redes Sociais</h2><p>Edite os links exibidos no rodapé e nos acessos sociais do site.</p></div><div class="v8-content-actions"><button class="v8-save" type="button" data-save="social">Salvar alterações</button></div></div><div class="v8-manager-status">${loaded?'Conteúdo sincronizado com o site.':'Carregando conteúdo...'}</div><div class="v8-social-grid">${fields.map(([key,label])=>`<label class="v8-field"><span>${label}</span><input type="url" data-social-field="${key}" value="${esc(state.global[key]||'')}" placeholder="https://..."></label>`).join('')}</div>`;
  }
  function renderAll(){Object.keys(schemas).forEach(renderCollectionView);renderSocialView();}
  function installViews(){
    const ready=['banners','testimonials','faq','social'].every(id=>$(`#${id}`));if(!ready)return false;
    const needs=['banners','testimonials','faq','social'].some(id=>$(`#${id}`)?.dataset.contentManager!=='true');
    if(needs){renderAll();setTimeout(loadVacancies,50);}return true;
  }

  async function loadContent(){
    if(loading||loaded)return;const dbClient=client();if(!dbClient)return;
    loading=true;
    try{
      const{data,error}=await dbClient.from('cosplay_site_content').select('key,content').in('key',['landing','global']);
      if(error)throw error;
      const byKey=Object.fromEntries((data||[]).map(row=>[row.key,row.content||{}]));
      state.landing={...defaults.landing,...(byKey.landing||{}),banners:normalizeItems(byKey.landing?.banners),faqs:normalizeItems(byKey.landing?.faqs),testimonials:normalizeItems(byKey.landing?.testimonials)};
      state.global={...defaults.global,...(byKey.global||{})};
      loaded=true;renderAll();
    }catch(error){console.error('[Conteúdo Admin]',error);['banners','testimonials','faq','social'].forEach(v=>setStatus(v,`Não foi possível carregar: ${error.message}`,'error'));}
    finally{loading=false;}
  }
  async function save(view){
    if(saving)return;const dbClient=client();if(!dbClient)return setStatus(view,'Banco de dados indisponível.','error');
    saving=true;$$('[data-save]').forEach(b=>b.disabled=true);setStatus(view,'Salvando...');
    try{
      const{data:{user}}=await dbClient.auth.getUser();
      const now=new Date().toISOString();
      const rows=view==='social'
        ?[{key:'global',content:state.global,published:true,updated_at:now,updated_by:user?.id||null}]
        :[{key:'landing',content:state.landing,published:true,updated_at:now,updated_by:user?.id||null}];
      const{error}=await dbClient.from('cosplay_site_content').upsert(rows,{onConflict:'key'});if(error)throw error;
      setStatus(view,'Salvo. Já está valendo no site público.','success');
    }catch(error){console.error('[Conteúdo Admin]',error);setStatus(view,`Erro ao salvar: ${error.message}`,'error');}
    finally{saving=false;$$('[data-save]').forEach(b=>b.disabled=false);}
  }

  function updateStateFromInput(target){
    if(target.dataset.socialField){state.global[target.dataset.socialField]=target.value;return;}
    const view=target.dataset.view,index=Number(target.dataset.index),field=target.dataset.field;if(!view||!field||Number.isNaN(index))return;
    const item=state.landing[collectionFor(view)]?.[index];if(!item)return;item[field]=target.type==='checkbox'?target.checked:target.value;
  }
  function addItem(view){
    const key=collectionFor(view),base=view==='banners'?{title:'',text:'',eventDate:'',imageUrl:'',buttonText:'Saiba mais',url:'',enabled:true}:view==='faq'?{question:'',answer:'',enabled:true}:{name:'',role:'',quote:'',imageUrl:'',enabled:true};
    state.landing[key].push({id:uid(),...base});renderCollectionView(view);$(`#${view} .v8-editor-card:last-child input, #${view} .v8-editor-card:last-child textarea`)?.focus();
  }
  function removeItem(view,index){state.landing[collectionFor(view)].splice(index,1);renderCollectionView(view);setStatus(view,'Alteração ainda não salva.');}
  function moveItem(view,index,direction){
    const items=state.landing[collectionFor(view)],next=direction==='up'?index-1:index+1;if(next<0||next>=items.length)return;
    [items[index],items[next]]=[items[next],items[index]];renderCollectionView(view);setStatus(view,'Ordem alterada. Salve para publicar.');
  }

  async function loadVacancies(){
    const dbClient=client();if(!dbClient)return;
    try{
      const{data:{session}}=await dbClient.auth.getSession();if(!session)return;
      const rows=[];const batch=1000;
      for(let from=0;;from+=batch){const{data,error}=await dbClient.from('cosplay_registrations').select('event_id,status').neq('status','cancelled').range(from,from+batch-1);if(error)throw error;rows.push(...(data||[]));if(!data||data.length<batch)break;}
      activeRegistrations=new Map();rows.forEach(r=>activeRegistrations.set(r.event_id,(activeRegistrations.get(r.event_id)||0)+1));applyVacancies();
    }catch(error){console.warn('[Vagas por evento]',error);}
  }
  function vacancyData(event){
    const used=activeRegistrations.get(event.id)||0,max=Number(event.max_participants)||0;
    return{used,max,left:max?Math.max(0,max-used):null};
  }
  function badge(event){
    const v=vacancyData(event);if(!v.max)return{signature:`${event.id}:${v.used}:unlimited`,html:`<span class="v8-vacancy-badge unlimited">${v.used} inscrito${v.used===1?'':'s'} <small>sem limite definido</small></span>`};
    return{signature:`${event.id}:${v.used}:${v.max}`,html:`<span class="v8-vacancy-badge ${v.left===0?'full':''}">${v.left===0?'Evento lotado':`${v.left} vaga${v.left===1?'':'s'} restante${v.left===1?'':'s'}`} <small>${v.used}/${v.max} ocupadas</small></span>`};
  }
  function eventList(){try{return Array.isArray(currentEvents)?currentEvents:[]}catch{return[];}}
  function applyVacancies(){
    const events=eventList();if(!events.length)return;
    $$('.admin-event').forEach(card=>{const title=$('h3',card)?.textContent.trim(),event=events.find(e=>(e.title||'').trim()===title);if(!event)return;let line=$('.v8-vacancy-line',card);if(!line){line=document.createElement('div');line.className='v8-vacancy-line';$('.row-actions',card)?.before(line);}const data=badge(event);if(line&&line.dataset.vacancy!==data.signature){line.dataset.vacancy=data.signature;line.innerHTML=data.html;}});
    $$('.v6-event-row').forEach(row=>{const title=$('.v6-event-main b',row)?.textContent.trim(),event=events.find(e=>(e.title||'').trim()===title);if(!event)return;let line=$('.v8-vacancy-line',row);if(!line){line=document.createElement('div');line.className='v8-vacancy-line';$('.v6-event-main',row)?.appendChild(line);}const data=badge(event);if(line&&line.dataset.vacancy!==data.signature){line.dataset.vacancy=data.signature;line.innerHTML=data.html;}});
  }

  document.addEventListener('input',e=>{if(e.target.matches('[data-field],[data-social-field]')){updateStateFromInput(e.target);const view=e.target.dataset.view||'social';setStatus(view,'Alteração ainda não salva.');}});
  document.addEventListener('change',e=>{
    if(e.target.matches('[data-field],[data-social-field]'))updateStateFromInput(e.target);
    if(e.target.matches('select[aria-label="Atualizar status da inscrição"]'))setTimeout(loadVacancies,650);
  });
  document.addEventListener('click',e=>{
    const add=e.target.closest('[data-add]');if(add)return addItem(add.dataset.add);
    const remove=e.target.closest('[data-remove]');if(remove)return removeItem(remove.dataset.remove,Number(remove.dataset.index));
    const move=e.target.closest('[data-move]');if(move)return moveItem(move.dataset.view,Number(move.dataset.index),move.dataset.move);
    const saveButton=e.target.closest('[data-save]');if(saveButton)return save(saveButton.dataset.save);
  });

  const observer=new MutationObserver(()=>{if(installViews()){loadContent();applyVacancies();}});
  const start=()=>{const main=$('.v6-main')||document.body;observer.observe(main,{childList:true,subtree:true});installViews();loadContent();loadVacancies();setInterval(applyVacancies,1200);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
