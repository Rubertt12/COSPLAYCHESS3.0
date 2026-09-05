/* Cosplay Chess - criador de peças extras (Windows/Electron) */
(() => {
  if (window.__cosplayCustomPiecesInstalled) return;
  window.__cosplayCustomPiecesInstalled = true;

  const TYPES = {
    P:{label:'PEÃO / INFANTARIA',icon:'♟'},
    T:{label:'TORRE',icon:'♜'},
    C:{label:'CAVALO / CAVALARIA',icon:'♞'},
    B:{label:'BISPO',icon:'♝'},
    Q:{label:'RAINHA',icon:'♛'},
    K:{label:'REI',icon:'♚'}
  };
  let pendingPlacementId = null;

  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\"/g,'&quot;').replace(/'/g,'&#039;');

  function customIds(side=null){
    if(typeof store==='undefined'||!store?.p)return [];
    return Object.keys(store.p).filter(id=>store.p[id]?.customPiece&&(!side||id.endsWith('_'+side)));
  }
  function fileAsDataUrl(file){
    if(!file)return Promise.resolve('');
    return new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>resolve(String(r.result||''));
      r.onerror=()=>reject(r.error||new Error('Não foi possível ler o arquivo.'));
      r.readAsDataURL(file);
    });
  }
  function makeId(type,side){
    let id;
    do{id=`${type}X${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2,5).toUpperCase()}_${side}`;}while(store.p[id]);
    return id;
  }
  function ensureStyles(){
    if(document.getElementById('custom-piece-styles'))return;
    const style=document.createElement('style');
    style.id='custom-piece-styles';
    style.textContent=`
      #custom-piece-card{border-color:rgba(0,229,255,.3)!important;background:linear-gradient(145deg,rgba(0,229,255,.08),rgba(10,11,17,.96))!important}
      #custom-piece-card .custom-piece-title{font-size:11px;font-weight:900;letter-spacing:1px;color:var(--accent)}
      #custom-piece-card p{font-size:8px;line-height:1.45;color:#8e8995;margin:7px 0 10px}#custom-piece-card button{width:100%;min-height:36px}
      #custom-piece-modal{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;background:rgba(3,4,8,.88);backdrop-filter:blur(9px)}
      #custom-piece-modal .cp-card{width:min(560px,92vw);max-height:88vh;overflow:auto;padding:24px;border-radius:16px;border:1px solid rgba(0,229,255,.42);background:linear-gradient(155deg,#15111b,#080a0f 72%);box-shadow:0 30px 90px rgba(0,0,0,.75)}
      #custom-piece-modal h2{font-family:Georgia,serif;color:#f4ead7;font-size:20px;margin:0 0 5px}.cp-sub{color:#8e8995;font-size:9px;line-height:1.5;margin-bottom:18px}
      #custom-piece-modal .cp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}#custom-piece-modal label{display:block;color:#d9ab55;font-size:9px;font-weight:900;letter-spacing:.8px}
      #custom-piece-modal input,#custom-piece-modal select{width:100%;margin-top:6px;min-height:42px;padding:9px 11px;border:1px solid #393340;border-radius:9px;background:#090a0f;color:#fff;font-size:12px;outline:none}
      #custom-piece-modal input:focus,#custom-piece-modal select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,229,255,.09)}
      #custom-piece-modal .cp-file{grid-column:1/-1}.cp-preview{display:flex;align-items:center;gap:12px;margin-top:8px;padding:9px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:rgba(255,255,255,.025)}
      .cp-photo{width:64px;height:64px;flex:0 0 auto;border-radius:10px;background:#050509 center/cover no-repeat;border:1px solid rgba(255,255,255,.11)}.cp-file-info{min-width:0;color:#98929f;font-size:9px;line-height:1.5;word-break:break-word}
      .cp-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}.cp-danger{grid-column:1/-1;color:#ff7894!important;border-color:rgba(255,70,115,.38)!important;background:rgba(255,70,115,.06)!important}
      .custom-extra-heading{margin:18px 0 9px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);font-size:9px;font-weight:900;letter-spacing:1.4px;color:var(--accent)}
      .custom-extra-piece{display:grid;grid-template-columns:46px minmax(0,1fr);gap:10px;align-items:center;margin-bottom:8px;padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.025)}
      .custom-extra-piece .cp-thumb{width:46px;height:46px;border-radius:8px;background:#050509 center/cover no-repeat;border:1px solid rgba(255,255,255,.1);display:grid;place-items:center;font-size:22px}
      .custom-extra-piece strong{display:block;color:#f2edf4;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.custom-extra-piece small{display:block;color:#77717e;font-size:8px;margin-top:3px}
      .cp-mini-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:7px}.cp-mini-actions button{min-height:27px;padding:4px 5px;font-size:7px}
      #custom-piece-placement{position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:13000;padding:11px 16px;border:1px solid var(--accent);border-radius:10px;background:rgba(7,11,17,.96);color:#fff;font-size:10px;font-weight:900;letter-spacing:.5px;box-shadow:0 12px 40px rgba(0,0,0,.55)}
      #board.custom-piece-placement-active{outline:3px solid var(--accent);outline-offset:5px}
      @media(max-width:640px){#custom-piece-modal .cp-grid{grid-template-columns:1fr}#custom-piece-modal .cp-file{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }
  function notice(text){
    document.getElementById('custom-piece-placement')?.remove();
    if(!text)return;
    const el=document.createElement('div');el.id='custom-piece-placement';el.textContent=text;document.body.appendChild(el);
  }
  function cancelPlacement(){pendingPlacementId=null;document.getElementById('board')?.classList.remove('custom-piece-placement-active');notice('');}
  function beginPlacement(id){
    if(!store.p[id])return;
    if(!store.board.some(x=>!x)){alert('O tabuleiro está cheio. Remova uma peça antes de colocar esta nova peça.');return;}
    pendingPlacementId=id;document.getElementById('board')?.classList.add('custom-piece-placement-active');
    notice(`NOVA PEÇA: clique em uma casa vazia para colocar ${store.p[id].name||'a peça'}. ESC cancela.`);
  }
  function removeEverywhere(id){
    store.board=store.board.map(x=>x===id?null:x);store.graveyard=(store.graveyard||[]).filter(x=>x!==id);
    if(typeof pieceSoundAudios!=='undefined'&&pieceSoundAudios?.[id]){try{pieceSoundAudios[id].pause();}catch(_){} delete pieceSoundAudios[id];}
    delete store.p[id];if(pendingPlacementId===id)cancelPlacement();save();renderBoard();renderGraveyard();renderConfigLists();
  }
  function applyBoardHoverNames(){
    if(typeof store==='undefined'||!store?.p)return;
    document.querySelectorAll('#board .piece[data-piece-id]').forEach(piece=>{
      const id=piece.dataset.pieceId;
      const name=store.p[id]?.name;
      if(!name)return;
      piece.title=name;
      piece.setAttribute('aria-label',name);
      const sq=piece.closest('.sq');
      if(sq) sq.title=name;
    });
  }
  function openModal(id=null){
    document.getElementById('custom-piece-modal')?.remove();
    const editing=!!id,current=editing?(store.p[id]||{}):{},type=editing?id.charAt(0):'P',side=editing?(id.endsWith('_B')?'B':'P'):'B';
    const modal=document.createElement('div');modal.id='custom-piece-modal';
    modal.innerHTML=`<div class="cp-card"><h2>${editing?'EDITAR PEÇA EXTRA':'ADICIONAR NOVA PEÇA'}</h2><div class="cp-sub">Só o nome é obrigatório. Foto e música são opcionais. Sem foto, a peça usa o símbolo de xadrez e o nome aparece ao passar o mouse.</div><div class="cp-grid">
      <label>TIPO / MOVIMENTO<select id="cp-type" ${editing?'disabled':''}>${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${k===type?'selected':''}>${v.icon} ${v.label}</option>`).join('')}</select></label>
      <label>LADO<select id="cp-side" ${editing?'disabled':''}><option value="B" ${side==='B'?'selected':''}>⚪ BRANCAS</option><option value="P" ${side==='P'?'selected':''}>⚫ PRETAS</option></select></label>
      <label style="grid-column:1/-1">NOME DA PEÇA<input id="cp-name" maxlength="60" autocomplete="off" placeholder="Ex.: DRAGÃO DE FOGO, GUARDIÃO, SAMURAI..." value="${esc(current.name||'')}"><div class="cp-file-info" style="margin-top:6px;color:var(--accent)">Obrigatório. Este nome será usado no jogo e aparecerá ao passar o mouse sobre a peça.</div></label>
      <label class="cp-file">FOTO DA PEÇA — OPCIONAL<input id="cp-photo" type="file" accept="image/*"><div class="cp-preview"><div id="cp-photo-preview" class="cp-photo" style="${current.img?`background-image:url('${String(current.img).replace(/'/g,'%27')}')`:''}"></div><div class="cp-file-info">${current.img?'Foto atual carregada. Escolha outra apenas se quiser substituir.':'Pode deixar vazio. Sem foto, a peça continuará funcionando normalmente com o símbolo de xadrez.'}</div></div></label>
      <label class="cp-file">MÚSICA / SOM DA PEÇA — OPCIONAL<input id="cp-sound" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"><div class="cp-preview"><div style="font-size:26px">🎵</div><div id="cp-sound-info" class="cp-file-info">${current.sound?'Áudio atual carregado. Escolha outro arquivo para substituir.':'Pode deixar vazio. A peça funciona normalmente sem música própria.'}</div></div></label>
      </div><div class="cp-actions"><button class="btn" id="cp-cancel">CANCELAR</button><button class="btn btn-yes" id="cp-save">${editing?'SALVAR ALTERAÇÕES':'CRIAR E COLOCAR'}</button>${editing?'<button class="btn cp-danger" id="cp-delete">EXCLUIR ESTA PEÇA EXTRA</button>':''}</div></div>`;
    document.body.appendChild(modal);
    const photo=modal.querySelector('#cp-photo'),sound=modal.querySelector('#cp-sound'),preview=modal.querySelector('#cp-photo-preview'),soundInfo=modal.querySelector('#cp-sound-info');
    photo.addEventListener('change',()=>{const f=photo.files?.[0];if(f)preview.style.backgroundImage=`url('${URL.createObjectURL(f)}')`;});
    sound.addEventListener('change',()=>{const f=sound.files?.[0];if(f)soundInfo.textContent=`${f.name} • ${(f.size/1024/1024).toFixed(1)} MB`;});
    const close=()=>modal.remove();modal.querySelector('#cp-cancel').onclick=close;modal.onclick=e=>{if(e.target===modal)close();};
    modal.querySelector('#cp-save').onclick=async()=>{
      const btn=modal.querySelector('#cp-save'),name=modal.querySelector('#cp-name').value.trim();
      if(!name){alert('Digite o nome da nova peça. A foto não é obrigatória.');modal.querySelector('#cp-name').focus();return;}
      btn.disabled=true;btn.textContent='SALVANDO...';
      try{
        const t=modal.querySelector('#cp-type').value,s=modal.querySelector('#cp-side').value,target=editing?id:makeId(t,s),data=editing?store.p[target]:{};
        data.customPiece=true;data.archetype=t;data.name=name.toUpperCase();if(data.volume===undefined)data.volume=.8;
        if(photo.files?.[0])data.img=await fileAsDataUrl(photo.files[0]);
        if(sound.files?.[0]){data.sound=await fileAsDataUrl(sound.files[0]);if(typeof pieceSoundAudios!=='undefined'&&pieceSoundAudios?.[target]){try{pieceSoundAudios[target].pause();}catch(_){} delete pieceSoundAudios[target];}}
        store.p[target]=data;save();renderBoard();applyBoardHoverNames();renderConfigLists();close();if(!editing)beginPlacement(target);
      }catch(error){alert(`Não foi possível salvar a peça.\n\n${error.message||error}`);btn.disabled=false;btn.textContent=editing?'SALVAR ALTERAÇÕES':'CRIAR E COLOCAR';}
    };
    const del=modal.querySelector('#cp-delete');if(del)del.onclick=()=>{if(confirm(`Excluir definitivamente a peça extra "${current.name||id}"?`)){close();removeEverywhere(id);}};
    setTimeout(()=>modal.querySelector('#cp-name')?.focus(),30);
  }
  function renderCards(){
    [['B','list-white'],['P','list-black']].forEach(([side,listId])=>{
      const list=document.getElementById(listId);if(!list)return;list.querySelectorAll('[data-custom-extra-root]').forEach(n=>n.remove());
      const ids=customIds(side);if(!ids.length)return;const root=document.createElement('div');root.dataset.customExtraRoot='1';root.innerHTML=`<div class="custom-extra-heading">➕ PEÇAS EXTRAS (${ids.length})</div>`;
      ids.forEach(id=>{const d=store.p[id]||{},onBoard=store.board.includes(id),card=document.createElement('div');card.className='custom-extra-piece';card.innerHTML=`<div class="cp-thumb" style="${d.img?`background-image:url('${String(d.img).replace(/'/g,'%27')}')`:''}">${d.img?'':(TYPES[id.charAt(0)]?.icon||'♟')}</div><div style="min-width:0"><strong>${esc(d.name||id)}</strong><small>${esc(TYPES[id.charAt(0)]?.label||'PEÇA')} • ${onBoard?'NO TABULEIRO':'FORA DO TABULEIRO'}${d.sound?' • 🎵':''}${d.img?'':' • SEM FOTO'}</small><div class="cp-mini-actions"><button class="btn-play-sm" data-place>COLOCAR</button><button class="btn-play-sm" data-edit>EDITAR</button><button class="btn-play-sm" data-remove>EXCLUIR</button></div></div>`;
        card.querySelector('[data-place]').onclick=()=>beginPlacement(id);card.querySelector('[data-edit]').onclick=()=>openModal(id);card.querySelector('[data-remove]').onclick=()=>{if(confirm(`Excluir definitivamente a peça extra "${d.name||id}"?`))removeEverywhere(id);};root.appendChild(card);});list.appendChild(root);
    });
  }
  function injectCard(){
    const list=document.getElementById('list-sys');if(!list||document.getElementById('custom-piece-card'))return false;
    const card=document.createElement('div');card.id='custom-piece-card';card.className='unit-card';card.innerHTML='<div class="custom-piece-title">➕ CRIADOR DE PEÇAS EXTRAS</div><p>Crie uma peça usando apenas nome, tipo e lado. Foto e música são opcionais; sem foto aparece o símbolo da peça e o nome no mouse.</p><button type="button" class="btn btn-yes" id="custom-piece-add">+ ADICIONAR NOVA PEÇA</button>';
    const dataCard=[...list.querySelectorAll('.unit-card')].find(n=>(n.textContent||'').includes('GESTÃO DE DADOS'));if(dataCard)dataCard.insertAdjacentElement('beforebegin',card);else list.insertBefore(card,list.firstChild);card.querySelector('#custom-piece-add').onclick=()=>openModal();return true;
  }
  function hookRender(){
    if(window.__cosplayCustomPieceRenderHook||typeof renderConfigLists!=='function')return;window.__cosplayCustomPieceRenderHook=true;const original=renderConfigLists;renderConfigLists=function(...args){const r=original.apply(this,args);renderCards();applyBoardHoverNames();return r;};
  }
  function hookBoardRender(){
    if(window.__cosplayCustomPieceBoardRenderHook||typeof renderBoard!=='function')return;
    window.__cosplayCustomPieceBoardRenderHook=true;
    const original=renderBoard;
    renderBoard=function(...args){const r=original.apply(this,args);applyBoardHoverNames();return r;};
  }
  function bindBoard(){
    const board=document.getElementById('board');if(!board||board.dataset.customPlacementBound==='1')return false;board.dataset.customPlacementBound='1';
    board.addEventListener('click',e=>{if(!pendingPlacementId)return;const sq=e.target.closest('.sq');if(!sq||!board.contains(sq))return;e.preventDefault();e.stopImmediatePropagation();const index=[...board.children].indexOf(sq);if(index<0)return;if(store.board[index]){notice('Essa casa já está ocupada. Escolha uma casa vazia. ESC cancela.');return;}store.board[index]=pendingPlacementId;const name=store.p[pendingPlacementId]?.name||pendingPlacementId;cancelPlacement();save();renderBoard();applyBoardHoverNames();renderConfigLists();notice(`${name} adicionada ao tabuleiro.`);setTimeout(()=>notice(''),1600);},true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pendingPlacementId)cancelPlacement();});return true;
  }
  function init(){if(typeof store==='undefined'||!store?.p||!Array.isArray(store.board))return false;ensureStyles();injectCard();hookRender();hookBoardRender();bindBoard();renderCards();applyBoardHoverNames();return true;}
  const boot=()=>{let tries=0;const timer=setInterval(()=>{tries++;if(init()||tries>40)clearInterval(timer);},250);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();