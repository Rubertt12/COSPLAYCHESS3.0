(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  function init(){const body=$('.cms-v7-body'),preview=$('.cms-v7-preview'),right=$('.cms-v7-right'),editorCard=$('.cms-v7-editor-card');if(!body||!preview||!right||!editorCard||body.dataset.v72)return;body.dataset.v72='1';
    const saved=Math.min(65,Math.max(30,Number(localStorage.getItem('cosplayCmsEditorWidth'))||42));body.style.setProperty('--cms-editor-width',saved+'%');
    const split=document.createElement('div');split.className='cms-v72-splitter';split.title='Arraste para redimensionar editor e preview';body.insertBefore(split,right);
    let dragging=false;const move=e=>{if(!dragging)return;const rect=body.getBoundingClientRect(),x=Math.min(rect.right-480,Math.max(rect.left+360,e.clientX)),pct=(x-rect.left)/rect.width*100;body.style.setProperty('--cms-editor-width',pct+'%');localStorage.setItem('cosplayCmsEditorWidth',pct.toFixed(2));};
    split.addEventListener('pointerdown',e=>{dragging=true;split.classList.add('dragging');document.body.classList.add('cms-v72-resizing');split.setPointerCapture?.(e.pointerId);e.preventDefault();});
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',()=>{dragging=false;split.classList.remove('dragging');document.body.classList.remove('cms-v72-resizing');});

    const head=$('.cms-preview-head',preview);if(head&&!$('.cms-v72-expand',head)){const tools=document.createElement('div');tools.className='cms-v72-preview-tools';const devices=$('.cms-device-tabs',head);if(devices)tools.appendChild(devices);const exp=document.createElement('button');exp.className='cms-v72-expand';exp.type='button';exp.title='Expandir preview';exp.textContent='⛶';tools.appendChild(exp);head.appendChild(tools);const overlay=document.createElement('div');overlay.className='cms-v72-overlay';document.body.appendChild(overlay);const toggle=()=>{const on=!preview.classList.contains('cms-v72-preview-fullscreen');preview.classList.toggle('cms-v72-preview-fullscreen',on);overlay.classList.toggle('active',on);exp.textContent=on?'✕':'⛶';exp.title=on?'Fechar preview expandido':'Expandir preview';};exp.addEventListener('click',toggle);overlay.addEventListener('click',toggle);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&preview.classList.contains('cms-v72-preview-fullscreen'))toggle();});}

    const info=$('.cms-v7-info');if(info)info.remove();
    const quick=$('.cms-v7-quick');if(quick){quick.classList.add('cms-v72-quickbar');const title=quick.querySelector('h3');if(title)title.remove();const cardHead=$('.cms-v7-card-head',editorCard);if(cardHead)cardHead.insertAdjacentElement('afterend',quick);}
    right.classList.add('cms-v72-preview-only');
  }
  const wsObserver=new MutationObserver(()=>requestAnimationFrame(init));wsObserver.observe(document.body,{childList:true,subtree:true});setTimeout(init,300);setTimeout(init,900);
})();