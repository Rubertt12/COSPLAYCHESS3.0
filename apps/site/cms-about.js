(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;
  const db=window.COSPLAYCHESS_DB||window.supabase?.createClient(cfg?.supabaseUrl,cfg?.supabaseKey);
  const tab=document.querySelector('[data-page="about"]');
  const editor=document.getElementById('cmsEditor');
  const frame=document.getElementById('cmsFrame');
  const saveBtn=document.getElementById('cmsSave');
  const discardBtn=document.getElementById('cmsDiscard');
  const statusEl=document.getElementById('cmsStatus');
  const search=document.getElementById('cmsSearch');
  const previewTitle=document.getElementById('cmsPreviewTitle');
  const openReal=document.getElementById('cmsOpenReal');
  if(!cfg||!db||!tab||!editor||!frame||!saveBtn)return;

  const fields=[
    ['Hero','Topo',[
      ['pageTitle','Título da aba'],['heroKicker','Chamada'],['heroTitleMain','Título principal'],['heroTitleAccent','Destaque'],['heroDescription','Descrição','textarea'],['heroPrimaryText','Botão principal'],['heroSecondaryText','Botão secundário']
    ]],
    ['História','Como tudo começou',[
      ['historyKicker','Chamada'],['historyTitleMain','Título'],['historyTitleAccent','Destaque'],['historyDescription','Descrição','textarea'],['story1','História — parágrafo 1','textarea'],['story2','História — parágrafo 2','textarea'],['story3','História — parágrafo 3','textarea'],['conceptLabel','Conceito — chamada'],['conceptQuote','Conceito — frase','textarea']
    ]],
    ['Pilares','Quatro partes da experiência',[
      ['pillarsKicker','Chamada'],['pillarsTitleMain','Título'],['pillarsTitleAccent','Destaque'],['pillarsDescription','Descrição','textarea'],
      ['pillar1Title','Pilar 1 — título'],['pillar1Text','Pilar 1 — texto','textarea'],['pillar2Title','Pilar 2 — título'],['pillar2Text','Pilar 2 — texto','textarea'],['pillar3Title','Pilar 3 — título'],['pillar3Text','Pilar 3 — texto','textarea'],['pillar4Title','Pilar 4 — título'],['pillar4Text','Pilar 4 — texto','textarea']
    ]],
    ['Pessoas','Equipe do projeto',[
      ['teamKicker','Chamada'],['teamTitleMain','Título'],['teamTitleAccent','Destaque'],['teamDescription','Descrição','textarea'],['teamNote','Observação da equipe','textarea']
    ]],
    ['Final','Chamada final',[
      ['finalKicker','Chamada'],['finalTitleMain','Título'],['finalTitleAccent','Destaque'],['finalPrimaryText','Botão principal'],['finalSecondaryText','Botão secundário'],['footerText','Texto do rodapé']
    ]]
  ];

  const defaults={
    pageTitle:'Sobre — CosplayChess',heroKicker:'SOBRE • ORIGEM • CRIAÇÃO',heroTitleMain:'Antes de ser partida,',heroTitleAccent:'foi uma ideia.',heroDescription:'O CosplayChess nasceu para transformar o xadrez em experiência ao vivo: pessoas reais assumem o papel das peças, personagens ganham lugar no tabuleiro e cada movimento vira parte de um espetáculo construído junto com o público.',heroPrimaryText:'Conhecer a história',heroSecondaryText:'Quem faz acontecer',
    historyKicker:'COMO TUDO COMEÇOU',historyTitleMain:'Da ideia ao',historyTitleAccent:'tabuleiro vivo.',historyDescription:'O projeto combina xadrez, cosplay, performance e tecnologia em uma mesma experiência. Em vez de peças tradicionais, cosplayers representam o elenco da partida, enquanto a organização conduz formação, movimentação, trilha, confrontos e apresentação para o público.',story1:'A proposta do CosplayChess surgiu da vontade de criar algo que não fosse apenas uma partida de xadrez nem apenas uma apresentação de cosplay. O objetivo passou a ser unir os dois mundos em um formato em que cada participante realmente faça parte da narrativa.',story2:'Com o desenvolvimento do projeto, a experiência ganhou uma camada digital: fichas de inscrição, organização de elenco, fotos e personagens, controle da partida, histórico de eventos, ranking, conquistas e integração com a versão utilizada pela produção durante o espetáculo.',story3:'O resultado é um projeto que pode evoluir a cada evento. Cada partida deixa registros, campeões, personagens, histórias e momentos que passam a fazer parte do universo Fergorverse.',conceptLabel:'O CONCEITO',conceptQuote:'O tabuleiro não é só cenário. Cada casa pode virar palco para uma nova história.',
    pillarsKicker:'O QUE MOVE O PROJETO',pillarsTitleMain:'Quatro partes de uma',pillarsTitleAccent:'mesma experiência.',pillarsDescription:'O CosplayChess foi pensado para funcionar como espetáculo, jogo e projeto de comunidade ao mesmo tempo.',pillar1Title:'Cosplay',pillar1Text:'Os personagens deixam de ser espectadores e se tornam as próprias peças da partida.',pillar2Title:'Xadrez',pillar2Text:'Movimentos, estratégia e confrontos dão estrutura ao espetáculo e sentido a cada posição no tabuleiro.',pillar3Title:'Palco',pillar3Text:'Produção, trilha e apresentação transformam a partida em algo feito para ser acompanhado ao vivo.',pillar4Title:'Tecnologia',pillar4Text:'O sistema organiza elenco, eventos, fotos, resultados, conquistas e a operação digital da experiência.',
    teamKicker:'CRIADORES • EQUIPE • COLABORADORES',teamTitleMain:'As pessoas por trás do',teamTitleAccent:'tabuleiro.',teamDescription:'O CosplayChess é construído por quem idealiza, organiza, produz, desenvolve e mantém o projeto em movimento.',teamNote:'Os integrantes exibidos aqui são administrados pela equipe do projeto e aparecem automaticamente quando estiverem publicados.',
    finalKicker:'A HISTÓRIA CONTINUA',finalTitleMain:'O próximo capítulo pode ter',finalTitleAccent:'você no tabuleiro.',finalPrimaryText:'Faça parte do Espetáculo!',finalSecondaryText:'Explorar o Universo',footerText:'Fergorverse • CosplayChess'
  };

  let state=null,saved=null,dirty=false,active=false,sendTimer=null;
  const E=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=v=>JSON.parse(JSON.stringify(v||{}));
  function status(text,kind='live'){statusEl.className=`cms-status ${kind}`;const b=statusEl.querySelector('b');if(b)b.textContent=text}
  function fieldHtml([name,label,type='text']){const v=state?.[name]??'';return type==='textarea'?`<label class="cms-field" data-field="${name}"><span>${E(label)}</span><textarea name="${name}" rows="3">${E(v)}</textarea></label>`:`<label class="cms-field" data-field="${name}"><span>${E(label)}</span><input type="${type}" name="${name}" value="${E(v)}"></label>`}
  function render(){editor.innerHTML=fields.map(([title,meta,list],i)=>`<details class="cms-group" ${i===0?'open':''}><summary><span>${E(title)}</span><small>${E(meta)}</small></summary><div class="cms-fields">${list.map(fieldHtml).join('')}</div></details>`).join('');editor.querySelectorAll('[name]').forEach(el=>el.addEventListener('input',()=>{state[el.name]=el.value;dirty=true;status('Alterações ainda não publicadas','dirty');send(el.name)}));applySearch()}
  function applySearch(){if(!active)return;const term=search.value.trim().toLowerCase();editor.querySelectorAll('.cms-group').forEach(g=>{let hit=!term;g.querySelectorAll('.cms-field').forEach(f=>{const yes=!term||f.textContent.toLowerCase().includes(term)||f.querySelector('input,textarea')?.name?.toLowerCase().includes(term);f.hidden=!yes;if(yes)hit=true});g.hidden=!hit;if(term&&hit)g.open=true})}
  function send(focus=''){clearTimeout(sendTimer);sendTimer=setTimeout(()=>frame.contentWindow?.postMessage({type:'cosplaychess-cms-preview',page:'about',content:state,focus},location.origin),35)}
  async function activate(){active=true;document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b===tab));previewTitle.textContent='Sobre';openReal.href='./sobre.html';const {data}=await db.from('cosplay_site_content').select('content').eq('key','about').maybeSingle();const {data:universe}=await db.from('cosplay_site_content').select('content').eq('key','universe').eq('published',true).maybeSingle();state={...defaults,...(data?.content||{})};const u=universe?.content||{};['teamKicker','teamTitleMain','teamTitleAccent','teamDescription','footerText'].forEach(k=>{if(!(data?.content||{})[k]&&u[k])state[k]=u[k]});saved=clone(state);dirty=false;search.value='';render();saveBtn.onclick=save;discardBtn.onclick=discard;frame.src='./sobre.html?cmsPreview=1';status('Prévia conectando...','live');setTimeout(()=>send(),500)}
  async function save(){saveBtn.disabled=true;status('Publicando...','dirty');try{const {data:{user}}=await db.auth.getUser();const {error}=await db.from('cosplay_site_content').upsert({key:'about',content:clone(state),published:true,updated_at:new Date().toISOString(),updated_by:user?.id||null},{onConflict:'key'});if(error)throw error;saved=clone(state);dirty=false;status('Publicado com sucesso.','live')}catch(e){status(e.message||String(e),'error')}finally{saveBtn.disabled=false}}
  function discard(){state=clone(saved);dirty=false;render();send();status('Alterações descartadas.','live')}
  function selectField(name){const el=editor.querySelector(`[data-field="${CSS.escape(name)}"]`);if(!el)return;el.closest('details').open=true;editor.querySelectorAll('.cms-field.selected').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');el.scrollIntoView({behavior:'smooth',block:'center'});el.querySelector('input,textarea')?.focus({preventScroll:true})}

  tab.addEventListener('click',activate);
  search.addEventListener('input',()=>{if(active)applySearch()});
  document.querySelectorAll('[data-page]:not([data-page="about"])').forEach(b=>b.addEventListener('click',()=>{active=false}));
  frame.addEventListener('load',()=>{if(active){setTimeout(()=>send(),180);setTimeout(()=>send(),650)}});
  window.addEventListener('message',e=>{if(e.origin!==location.origin||!active)return;const d=e.data||{};if(d.type==='cosplaychess-cms-preview-ready'&&d.page==='about')send();if(d.type==='cosplaychess-cms-select'&&d.page==='about'&&d.field)selectField(d.field);if(d.type==='cosplaychess-cms-inline-change'&&d.page==='about'&&d.field){state[d.field]=d.value;const input=editor.querySelector(`[name="${CSS.escape(d.field)}"]`);if(input)input.value=d.value;dirty=true;status('Alterações ainda não publicadas','dirty')}});
})();
