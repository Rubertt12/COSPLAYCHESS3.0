(() => {
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const formData=(form)=>{
    const out={};
    if(!form) return out;
    [...form.elements].forEach(el=>{
      if(!el.name) return;
      out[el.name]=el.type==='checkbox'?el.checked:el.value;
    });
    return out;
  };

  async function waitForCms(){
    for(let i=0;i<80;i++){
      const landing=document.getElementById('cmsLanding');
      const registration=document.getElementById('cmsRegistration');
      const stack=document.getElementById('cmsStack');
      if(landing&&registration&&stack) return {landing,registration,stack};
      await sleep(100);
    }
    return null;
  }

  function init({landing,registration,stack}){
    if(document.getElementById('cmsLivePreview')) return;

    const style=document.createElement('style');
    style.textContent=`
      .cms-preview-enabled{grid-template-columns:minmax(0,1fr) minmax(440px,1.15fr)!important;align-items:start}
      .cms-preview-enabled>.cms-box{grid-column:1}
      .cms-live-preview{grid-column:2;grid-row:1/span 3;position:sticky;top:92px;padding:16px;border:1px solid #3b2d28;border-radius:16px;background:#100c14;min-width:0}
      .cms-live-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px}
      .cms-live-head h2{margin:2px 0 4px}.cms-live-head p{margin:0;color:#aaa;font-size:11px;max-width:420px}
      .cms-live-tabs,.cms-live-device{display:flex;gap:6px;flex-wrap:wrap}.cms-live-tabs button,.cms-live-device button{border:1px solid #3d343f;background:#0b0810;color:#ddd;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:10px;font-weight:800}
      .cms-live-tabs button.active,.cms-live-device button.active{border-color:#d4aa5c;color:#f4d28c;background:rgba(212,170,92,.12)}
      .cms-live-status{display:flex;align-items:center;gap:7px;font-size:10px;color:#cdbfba;margin:10px 0}.cms-live-dot{width:8px;height:8px;border-radius:50%;background:#48b778;box-shadow:0 0 12px rgba(72,183,120,.6)}
      .cms-live-stage{height:740px;border:1px solid #2d2630;border-radius:12px;background:#050407;overflow:auto;padding:0;display:flex;justify-content:center;align-items:flex-start}
      .cms-live-stage iframe{display:block;border:0;background:#09070b;width:100%;height:100%;min-height:740px;transition:width .2s ease}
      .cms-live-stage.mobile{padding:16px}.cms-live-stage.mobile iframe{width:390px;max-width:100%;height:760px;min-height:760px;border-radius:18px;box-shadow:0 0 0 1px #302a31,0 14px 40px rgba(0,0,0,.45)}
      .cms-live-footer{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}.cms-live-footer small{color:#9b929d}.cms-live-footer a{font-size:10px;color:#e2c078;font-weight:800}
      @media(max-width:1180px){.cms-preview-enabled{grid-template-columns:1fr!important}.cms-preview-enabled>.cms-box,.cms-live-preview{grid-column:1!important}.cms-live-preview{grid-row:auto;position:relative;top:auto;order:-1}.cms-live-stage{height:620px}.cms-live-stage iframe{min-height:620px}}
    `;
    document.head.appendChild(style);

    const box=document.createElement('section');
    box.id='cmsLivePreview';
    box.className='cms-live-preview';
    box.innerHTML=`
      <div class="cms-live-head">
        <div><span class="kicker">PRÉVIA AO VIVO</span><h2>Veja antes de salvar</h2><p>Conforme você digita, a página ao lado muda na hora. Nada é publicado até clicar em salvar.</p></div>
        <div class="cms-live-device"><button type="button" data-device="desktop" class="active">Desktop</button><button type="button" data-device="mobile">Mobile</button></div>
      </div>
      <div class="cms-live-tabs"><button type="button" data-preview-page="landing" class="active">Landing</button><button type="button" data-preview-page="registration">Inscrição</button></div>
      <div class="cms-live-status"><span class="cms-live-dot"></span><span>Prévia conectada</span></div>
      <div class="cms-live-stage"><iframe title="Prévia ao vivo do site"></iframe></div>
      <div class="cms-live-footer"><small>Focar um campo no editor leva a prévia até aquela seção.</small><a href="./index.html" target="_blank" rel="noopener">Abrir página real ↗</a></div>
    `;
    stack.classList.add('cms-preview-enabled');
    stack.prepend(box);

    const frame=box.querySelector('iframe');
    const stage=box.querySelector('.cms-live-stage');
    const status=box.querySelector('.cms-live-status span:last-child');
    const openLink=box.querySelector('.cms-live-footer a');
    let page='landing';
    let pendingFocus='';
    let debounce=null;

    const pageForm=()=>page==='registration'?registration:landing;
    const pageUrl=()=>page==='registration'?'./cadastro.html?cmsPreview=1':'./index.html?cmsPreview=1';
    const realUrl=()=>page==='registration'?'./cadastro.html':'./index.html';

    function sendNow(focus=''){
      if(!frame.contentWindow) return;
      frame.contentWindow.postMessage({
        type:'cosplaychess-cms-preview',
        page,
        content:formData(pageForm()),
        focus:focus||pendingFocus||''
      },location.origin);
      pendingFocus='';
      status.textContent='Atualizado agora';
    }

    function send(focus=''){
      if(focus) pendingFocus=focus;
      clearTimeout(debounce);
      debounce=setTimeout(()=>sendNow(),60);
    }

    function loadPage(next){
      page=next;
      box.querySelectorAll('[data-preview-page]').forEach(b=>b.classList.toggle('active',b.dataset.previewPage===page));
      frame.src=pageUrl();
      openLink.href=realUrl();
      status.textContent='Carregando prévia...';
      setTimeout(()=>sendNow(),700);
      setTimeout(()=>sendNow(),1500);
    }

    box.querySelectorAll('[data-preview-page]').forEach(btn=>btn.onclick=()=>loadPage(btn.dataset.previewPage));
    box.querySelectorAll('[data-device]').forEach(btn=>btn.onclick=()=>{
      const mobile=btn.dataset.device==='mobile';
      stage.classList.toggle('mobile',mobile);
      box.querySelectorAll('[data-device]').forEach(b=>b.classList.toggle('active',b===btn));
    });

    [landing,registration].forEach(form=>{
      const associatedPage=form===registration?'registration':'landing';
      form.addEventListener('input',()=>{if(page!==associatedPage) loadPage(associatedPage); else send();});
      form.addEventListener('change',()=>{if(page!==associatedPage) loadPage(associatedPage); else send();});
      form.addEventListener('focusin',(e)=>{
        if(page!==associatedPage) loadPage(associatedPage);
        const name=e.target?.name||'';
        if(name) send(name);
      });
    });

    document.addEventListener('focusin',(e)=>{
      if(e.target?.closest?.('#cmsTeamForm')){
        if(page!=='landing') loadPage('landing');
        pendingFocus='universeDescription';
        setTimeout(()=>sendNow('universeDescription'),200);
      }
    });

    window.addEventListener('message',(event)=>{
      if(event.origin!==location.origin) return;
      const data=event.data||{};
      if(data.type==='cosplaychess-cms-preview-ready' && data.page===page){
        status.textContent='Prévia conectada';
        sendNow();
      }
    });

    frame.addEventListener('load',()=>{
      status.textContent='Prévia conectada';
      setTimeout(()=>sendNow(),250);
      setTimeout(()=>sendNow(),850);
    });

    loadPage('landing');
  }

  waitForCms().then(found=>found&&init(found));
})();