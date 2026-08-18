(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;if(!cfg||!window.supabase)return;
  const db=window.COSPLAYCHESS_DB||window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const fields=[['kicker','Chamada'],['titleMain','Título principal'],['titleAccent','Destaque do título'],['description','Descrição','textarea'],['ctaText','Texto da chamada','textarea'],['ctaButtonText','Texto do botão'],['ctaUrl','Link do botão','url'],['showSection','Mostrar seção','checkbox']];
  const defaults={kicker:'PARCERIAS',titleMain:'Quem fortalece o',titleAccent:'tabuleiro.',description:'Parceiros, apoiadores e marcas que ajudam o CosplayChess a crescer, alcançar novos eventos e criar experiências cada vez maiores.',ctaText:'Quer apoiar o CosplayChess?',ctaButtonText:'Falar com a equipe',ctaUrl:'https://www.instagram.com/fergorverse/',showSection:true};
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state={...defaults},saved={...defaults},active=false,timer=null;
  function wait(){const tabs=document.querySelector('.cms-page-tabs'),editor=document.getElementById('cmsEditor'),frame=document.getElementById('cmsFrame');if(!tabs||!editor||!frame){setTimeout(wait,120);return}install(tabs,editor,frame)}
  function install(tabs,editor,frame){
    let btn=tabs.querySelector('[data-page="partners"]');if(!btn){btn=document.createElement('button');btn.type='button';btn.dataset.page='partners';btn.textContent='Parcerias';tabs.appendChild(btn)}
    btn.addEventListener('click',async e=>{e.stopImmediatePropagation();await activate(editor,frame,btn)},true);
    window.addEventListener('message',e=>{if(e.origin!==location.origin||!active)return;const d=e.data||{};if(d.type==='cosplaychess-cms-preview-ready'&&d.page==='partners')send(frame);if(d.type==='cosplaychess-cms-select'&&d.page==='partners'&&d.field){const el=editor.querySelector(`[data-field="${CSS.escape(d.field)}"]`);el?.scrollIntoView({behavior:'smooth',block:'center'});el?.querySelector('input,textarea')?.focus();}});
  }
  async function activate(editor,frame,btn){
    active=true;document.querySelectorAll('.cms-page-tabs [data-page]').forEach(b=>b.classList.toggle('active',b===btn));
    const{data,error}=await db.from('cosplay_site_content').select('content').eq('key','partners').maybeSingle();if(error)return status(error.message,'error');state={...defaults,...(data?.content||{})};saved=JSON.parse(JSON.stringify(state));
    document.getElementById('cmsPreviewTitle').textContent='Parcerias';document.getElementById('cmsOpenReal').href='./index.html#parcerias';document.getElementById('cmsSearch').value='';
    editor.innerHTML=`<details class="cms-group" open><summary><span>Parcerias</span><small>Seção da Landing</small></summary><div class="cms-fields">${fields.map(fieldHtml).join('')}</div></details><details class="cms-group" open><summary><span>Parceiros cadastrados</span><small>Admin</small></summary><div class="cms-fields"><p class="cms-note">Logos, links e dados de cada parceiro são gerenciados no painel administrativo.</p><a class="cms-btn primary" href="./admin.html" target="_blank" rel="noopener">Gerenciar parceiros ↗</a></div></details>`;
    editor.querySelectorAll('[name]').forEach(el=>{const change=()=>{state[el.name]=el.type==='checkbox'?el.checked:el.value;status('Alterações ainda não publicadas','dirty');send(frame,el.name)};el.addEventListener('input',change);el.addEventListener('change',change)});
    const save=document.getElementById('cmsSave'),discard=document.getElementById('cmsDiscard');save.onclick=()=>saveContent(frame);discard.onclick=()=>{state=JSON.parse(JSON.stringify(saved));activate(editor,frame,btn)};
    frame.src='./index.html?cmsPreview=1#parcerias';status('Prévia conectando...','live');setTimeout(()=>send(frame),600);
  }
  function fieldHtml([name,label,type='text']){const v=state[name];if(type==='checkbox')return`<label class="cms-check cms-field" data-field="${name}"><input type="checkbox" name="${name}" ${v!==false?'checked':''}><span>${esc(label)}</span></label>`;if(type==='textarea')return`<label class="cms-field" data-field="${name}"><span>${esc(label)}</span><textarea name="${name}" rows="3">${esc(v??'')}</textarea></label>`;return`<label class="cms-field" data-field="${name}"><span>${esc(label)}</span><input type="${type}" name="${name}" value="${esc(v??'')}"></label>`}
  function send(frame,focus=''){clearTimeout(timer);timer=setTimeout(()=>frame.contentWindow?.postMessage({type:'cosplaychess-cms-preview',page:'partners',content:state,focus},location.origin),40)}
  async function saveContent(frame){const save=document.getElementById('cmsSave');save.disabled=true;status('Publicando...','dirty');try{const{data:{user}}=await db.auth.getUser();const{error}=await db.from('cosplay_site_content').upsert({key:'partners',content:state,published:true,updated_at:new Date().toISOString(),updated_by:user?.id||null},{onConflict:'key'});if(error)throw error;saved=JSON.parse(JSON.stringify(state));status('Publicado com sucesso.','live');send(frame)}catch(e){status(e.message||String(e),'error')}finally{save.disabled=false}}
  function status(text,kind='live'){const el=document.getElementById('cmsStatus');if(!el)return;el.className=`cms-status ${kind}`;const b=el.querySelector('b');if(b)b.textContent=text}
  wait();
})();
