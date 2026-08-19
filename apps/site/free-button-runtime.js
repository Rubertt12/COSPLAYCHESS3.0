(()=>{
  if(window.__COSPLAYCHESS_FREE_BUTTONS_BOOTED__)return;
  window.__COSPLAYCHESS_FREE_BUTTONS_BOOTED__=true;
  const preview=new URLSearchParams(location.search).get('cmsPreview')==='1';
  const ROOT_ID='cmsFreeButtonLayer';
  let current=[];
  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function ensureStyles(){
    if(document.getElementById('cmsFreeButtonStyles'))return;
    const s=document.createElement('style');s.id='cmsFreeButtonStyles';s.textContent=`
      #${ROOT_ID}{position:absolute;inset:0 0 auto 0;height:0;z-index:950;pointer-events:none}
      #${ROOT_ID} .cms-free-button{position:absolute;pointer-events:auto;transform:translate(-50%,-50%);margin:0!important;z-index:951;touch-action:none}
      #${ROOT_ID} .cms-free-button.is-dragging{z-index:9999;box-shadow:0 18px 45px rgba(0,0,0,.42)!important}
      #${ROOT_ID} .cms-free-drag-handle{display:none;position:absolute;left:50%;top:-27px;transform:translateX(-50%);height:23px;min-width:72px;padding:0 8px;border:1px solid rgba(240,209,140,.75);border-radius:8px;background:#17111a;color:#f0d18c;font:800 9px/1 system-ui;align-items:center;justify-content:center;white-space:nowrap;box-shadow:0 6px 16px rgba(0,0,0,.35);cursor:grab;user-select:none}
      html[data-cms-free-preview="true"] #${ROOT_ID} .cms-free-drag-handle{display:flex}
      html[data-cms-free-preview="true"] #${ROOT_ID} .cms-free-button{outline:1px dashed rgba(240,209,140,.65);outline-offset:4px}
      @media(max-width:640px){#${ROOT_ID} .cms-free-button{max-width:calc(100vw - 20px)}}`;
    document.head.appendChild(s);
  }
  function layer(){let el=document.getElementById(ROOT_ID);if(!el){el=document.createElement('div');el.id=ROOT_ID;el.setAttribute('aria-label','Botões posicionados livremente');document.body.appendChild(el);}return el;}
  function position(el,b){const x=clamp(Number(b.freeX)||50,2,98);const y=Math.max(80,Number(b.freeY)||Math.round(window.innerHeight*.7));el.style.left=`${x}%`;el.style.top=`${y}px`;}
  const PRESETS={gold:{bg:'linear-gradient(135deg,#b68135,#e0b867)',color:'#130d0b',border:'#efc978'},dark:{bg:'rgba(255,255,255,.035)',color:'#f4efe8',border:'rgba(224,190,119,.24)'},outline:{bg:'transparent',color:'#f0d18c',border:'rgba(240,209,140,.62)'},instagram:{bg:'linear-gradient(135deg,#833ab4 0%,#c13584 34%,#e1306c 62%,#f77737 100%)',color:'#fff',border:'rgba(255,255,255,.22)'},custom:{bg:'#16141b',color:'#f4efe8',border:'rgba(224,190,119,.24)'}};
  function makeButton(b){const a=document.createElement('a');a.href=b.url||'#';a.className='cms-site-button';a.style.display='inline-flex';a.style.alignItems='center';a.style.justifyContent='center';a.style.gap='9px';a.style.minHeight=b.size==='large'?'56px':b.size==='small'?'38px':'46px';a.style.padding=b.size==='large'?'0 20px':b.size==='small'?'0 12px':'0 16px';a.style.font='900 11px/1.15 Inter,Segoe UI,Arial,sans-serif';a.style.textDecoration='none';a.style.whiteSpace='nowrap';const pr=PRESETS[b.preset]||PRESETS.custom;a.style.background=b.background||pr.bg;a.style.color=b.textColor||pr.color;a.style.border=`1px solid ${b.borderColor||pr.border}`;a.style.borderRadius=`${clamp(Number(b.radius)||12,0,40)}px`;if(b.newTab){a.target='_blank';a.rel='noopener noreferrer';}const icon={instagram:'◎',arrow:'↗',chess:'♟',star:'★',custom:b.customIcon||'•'}[b.icon];if(icon&&b.icon!=='none'){const i=document.createElement('span');i.textContent=icon;i.setAttribute('aria-hidden','true');a.appendChild(i);}const l=document.createElement('span');l.textContent=b.label||'Botão';a.appendChild(l);return a;}
  function enhance(el,b){
    el.dataset.cmsFreeButtonId=b.id;
    el.classList.add('cms-free-button');
    position(el,b);
    if(!preview)return;
    el.addEventListener('click',e=>{if(el.dataset.dragged==='1'){e.preventDefault();e.stopPropagation();el.dataset.dragged='0';}},true);
    const h=document.createElement('span');h.className='cms-free-drag-handle';h.textContent='↕ Arrastar';h.setAttribute('role','button');h.tabIndex=0;el.appendChild(h);
    let drag=null;
    const start=(clientX,clientY,pointerId)=>{const r=el.getBoundingClientRect();drag={pointerId,dx:clientX-(r.left+r.width/2),dy:clientY-(r.top+r.height/2),moved:false};el.classList.add('is-dragging');};
    h.addEventListener('pointerdown',e=>{e.preventDefault();h.setPointerCapture?.(e.pointerId);start(e.clientX,e.clientY,e.pointerId);});
    h.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const step=e.shiftKey?20:5;const x=Number(b.freeX)||50;const y=Number(b.freeY)||200;const dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0;const dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;b.freeX=clamp(x+(dx/window.innerWidth*100),2,98);b.freeY=Math.max(80,y+dy);position(el,b);notify(b);});
    h.addEventListener('pointermove',e=>{if(!drag||drag.pointerId!==e.pointerId)return;const docX=e.clientX-drag.dx;const docY=e.clientY+window.scrollY-drag.dy;b.freeX=clamp(docX/document.documentElement.clientWidth*100,2,98);b.freeY=Math.max(80,docY);drag.moved=true;el.dataset.dragged='1';position(el,b);});
    const end=e=>{if(!drag||drag.pointerId!==e.pointerId)return;el.classList.remove('is-dragging');if(drag.moved)notify(b);drag=null;};
    h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end);
  }
  function notify(b){parent.postMessage({type:'cosplaychess-cms-button-position',page:'landing',id:b.id,freeX:Number(b.freeX),freeY:Number(b.freeY)},location.origin);}
  function render(buttons){
    current=Array.isArray(buttons)?buttons:[];ensureStyles();if(preview)document.documentElement.dataset.cmsFreePreview='true';
    const root=layer();root.replaceChildren();
    current.filter(b=>b&&b.enabled!==false&&b.area==='free').forEach(b=>{const el=makeButton(b);enhance(el,b);root.appendChild(el);});
  }
  const hook=()=>{
    const base=window.COSPLAYCHESS_RENDER_BUTTONS;
    if(typeof base!=='function'||base.__freeWrapped)return false;
    const wrapped=function(buttons){base(buttons);render(buttons);};wrapped.__freeWrapped=true;window.COSPLAYCHESS_RENDER_BUTTONS=wrapped;return true;
  };
  async function loadPublished(){
    if(preview)return;
    try{
      const cfg=window.COSPLAYCHESS_CONFIG;
      const db=window.COSPLAYCHESS_DB||window.getCosplayChessDb?.()||window.supabase?.createClient?.(cfg?.supabaseUrl,cfg?.supabaseKey);
      if(!db)return;
      const {data,error}=await db.from('cosplay_site_content').select('content').eq('key','landing').eq('published',true).maybeSingle();
      if(error)throw error;
      if(Array.isArray(data?.content?.buttons))render(data.content.buttons);
    }catch(e){console.warn('[CMS free buttons]',e);}
  }
  let tries=0;const timer=setInterval(()=>{tries++;if(hook()||tries>50)clearInterval(timer);},50);hook();
  window.COSPLAYCHESS_RENDER_FREE_BUTTONS=render;
  loadPublished();
})();