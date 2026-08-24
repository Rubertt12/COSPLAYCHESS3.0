(()=>{
  const SVG={
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
    eyeOff:'<path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.8 4.2A11 11 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.1 3.2"/><path d="M6.5 6.6C3.8 8.4 2 12 2 12s3.5 8 10 8a11 11 0 0 0 5.4-1.5"/>',
    home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    news:'<path d="M4 5h16v14H4z"/><path d="M7 8h5v4H7zM14 8h3M14 11h3M7 15h10"/>',
    flag:'<path d="M5 22V4"/><path d="M5 5h11l-2 4 2 4H5"/>',
    quote:'<path d="M7 17H3v-4a6 6 0 0 1 6-6v3a3 3 0 0 0-3 3h1zM18 17h-4v-4a6 6 0 0 1 6-6v3a3 3 0 0 0-3 3h1z"/>',
    question:'<circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.8 2.8 0 1 1 4.9 1.9c-1.4 1.3-2.4 1.7-2.4 3.1M12 18h.01"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14v-4a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1v4a1.7 1.7 0 0 0-1.6 1z"/>',
    share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
    backup:'<path d="M4 7h16v13H4z"/><path d="M7 4h10v3M8 11h8M8 15h6"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    crown:'<path d="m3 7 4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 21h14"/>',
    chess:'<path d="M8 3h8l-1 4 2 3-2 3 3 7H6l3-7-2-3 2-3z"/><path d="M7 20h10"/>',
    trophy:'<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    external:'<path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6"/>',
    arrowRight:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUp:'<path d="M12 19V5M6 11l6-6 6 6"/>',
    chevronLeft:'<path d="m15 18-6-6 6-6"/>',
    chevronRight:'<path d="m9 18 6-6-6-6"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    camera:'<path d="M14.5 4 16 6h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2z"/><circle cx="12" cy="13" r="3.5"/>',
    edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
    trash:'<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>',
    phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>',
    message:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    link:'<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
    check:'<path d="m20 6-11 11-5-5"/>',
    alert:'<path d="M10.3 3.6 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    upload:'<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 21h14"/>',
    download:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    save:'<path d="M5 3h12l4 4v14H3V3z"/><path d="M7 3v6h8V3M7 21v-8h10v8"/>',
    info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>'
  };

  const MAP=new Map([
    ['🙈','eyeOff'],['🐵','eye'],['👁️','eye'],['👁','eye'],['◉','eye'],
    ['📷','camera'],['📸','camera'],['✏️','edit'],['✏','edit'],['🗑️','trash'],['🗑','trash'],
    ['🔍','search'],['🔎','search'],['⌕','search'],['📱','phone'],['☎️','phone'],['☎','phone'],['💬','message'],['💭','message'],['📧','mail'],['✉️','mail'],['✉','mail'],['🔗','link'],
    ['⚙️','settings'],['⚙','settings'],['🛠️','settings'],['🛠','settings'],['✅','check'],['☑️','check'],['☑','check'],['❌','x'],['✖️','x'],['✖','x'],['×','x'],
    ['🏆','trophy'],['🥇','trophy'],['👑','crown'],['♛','crown'],['♚','crown'],['♜','chess'],['♟️','chess'],['♟','chess'],['♙','chess'],
    ['🎭','users'],['👥','users'],['♧','users'],['👤','user'],['🧑','user'],
    ['📢','flag'],['📣','flag'],['⚑','flag'],['📄','file'],['📝','file'],['▤','news'],['□','file'],['☷','list'],
    ['🖼️','image'],['🖼','image'],['▧','image'],['▣','calendar'],['📅','calendar'],['🗓️','calendar'],['🗓','calendar'],
    ['〽','quote'],['?','question'],['⌘','share'],['💾','save'],['📂','backup'],['📁','backup'],
    ['🔒','lock'],['🔓','lock'],['♢','lock'],['◎','database'],['◷','clock'],['🕒','clock'],['⏰','clock'],['🔔','bell'],
    ['❤️','heart'],['❤','heart'],['💜','heart'],['🏠','home'],['🏡','home'],['⌂','home'],
    ['➕','plus'],['＋','plus'],['⬆️','upload'],['⬆','upload'],['📤','upload'],['⬇️','download'],['⬇','download'],['📥','download'],
    ['☰','menu'],['↗️','external'],['↗','external'],['→','arrowRight'],['↑','arrowUp'],['‹','chevronLeft'],['›','chevronRight']
  ]);

  const TOKENS=[...MAP.keys()].sort((a,b)=>b.length-a.length);
  const SKIP='script,style,textarea,input,select,option,pre,code,[contenteditable="true"],[data-cc-keep-emoji],.cc-svg-icon';

  function icon(name){
    const span=document.createElement('span');
    span.className='cc-svg-icon';
    span.dataset.ccIcon=name;
    span.setAttribute('aria-hidden','true');
    span.innerHTML='<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">'+SVG[name]+'</svg>';
    return span;
  }

  function shouldSkip(node){
    const p=node?.parentElement;
    return !p || !!p.closest(SKIP);
  }

  function replaceTextNode(node){
    if(!node || node.nodeType!==Node.TEXT_NODE || shouldSkip(node)) return false;
    const text=node.nodeValue||'';
    if(!TOKENS.some(t=>text.includes(t))) return false;
    const frag=document.createDocumentFragment();
    let pos=0,changed=false;
    while(pos<text.length){
      let hit=null;
      for(const token of TOKENS){
        if(text.startsWith(token,pos)){ hit=token; break; }
      }
      if(hit){
        frag.appendChild(icon(MAP.get(hit)));
        pos+=hit.length;
        changed=true;
      }else{
        let next=text.length;
        for(const token of TOKENS){
          const idx=text.indexOf(token,pos+1);
          if(idx!==-1&&idx<next) next=idx;
        }
        frag.appendChild(document.createTextNode(text.slice(pos,next)));
        pos=next;
      }
    }
    if(changed) node.replaceWith(frag);
    return changed;
  }

  function scan(root=document.body){
    if(!root) return;
    if(root.nodeType===Node.TEXT_NODE){ replaceTextNode(root); return; }
    if(root.nodeType!==Node.ELEMENT_NODE && root.nodeType!==Node.DOCUMENT_NODE && root.nodeType!==Node.DOCUMENT_FRAGMENT_NODE) return;
    if(root.nodeType===Node.ELEMENT_NODE && root.closest?.(SKIP)) return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
      if(!node.nodeValue||!TOKENS.some(t=>node.nodeValue.includes(t))||shouldSkip(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replaceTextNode);
  }

  function decorateKnownControls(){
    document.querySelectorAll('.footer-admin').forEach(el=>{
      if(!el.querySelector('.cc-svg-icon')) el.prepend(icon('settings'));
    });
  }

  function boot(){
    scan(document.body);
    decorateKnownControls();
    const observer=new MutationObserver(list=>{
      for(const mutation of list){
        if(mutation.type==='characterData') replaceTextNode(mutation.target);
        mutation.addedNodes.forEach(node=>scan(node));
      }
      decorateKnownControls();
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    window.CosplayChessIcons={scan,replaceTextNode};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();