(()=>{
  const SVG={
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
    eyeOff:'<path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.1 3.2"/><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.5 8 10 8a10.8 10.8 0 0 0 5.4-1.5"/>',
    camera:'<path d="M14.5 4 16 6h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2z"/><circle cx="12" cy="13" r="3.5"/>',
    edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
    trash:'<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>',
    message:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    link:'<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
    check:'<path d="m20 6-11 11-5-5"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    trophy:'<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/>',
    star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.8 1.2 6.9-6.2-3.3L5.8 21 7 14.1l-5-4.8 6.9-1z"/>',
    chess:'<path d="M8 3h8l-1 4 2 3-2 3 3 7H6l3-7-2-3 2-3z"/><path d="M7 20h10"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    megaphone:'<path d="m3 11 18-5v12L3 13z"/><path d="M11.6 15.4 13 21H7l-1.5-7"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    upload:'<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 21h14"/>',
    download:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    refresh:'<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert:'<path d="M10.3 3.6 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    game:'<rect x="2" y="7" width="20" height="12" rx="4"/><path d="M7 13h4M9 11v4M16 12h.01M18 14h.01"/>',
    chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    folder:'<path d="M3 5h7l2 2h9v12H3z"/>',
    save:'<path d="M5 3h12l4 4v14H3V3z"/><path d="M7 3v6h8V3M7 21v-8h10v8"/>',
    copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    unlock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
    clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    external:'<path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6"/>'
  };

  const MAP=new Map([
    ['🙈','eyeOff'],['🐵','eye'],['👁️','eye'],['👁','eye'],['📷','camera'],['📸','camera'],['✏️','edit'],['✏','edit'],['📝','file'],['🗑️','trash'],['🗑','trash'],['🔍','search'],['🔎','search'],['📱','phone'],['☎️','phone'],['☎','phone'],['💬','message'],['💭','message'],['📧','mail'],['✉️','mail'],['✉','mail'],['🔗','link'],['⚙️','settings'],['⚙','settings'],['🛠️','settings'],['🛠','settings'],['✅','check'],['☑️','check'],['☑','check'],['❌','x'],['✖️','x'],['✖','x'],['🏆','trophy'],['🥇','trophy'],['⭐','star'],['🌟','star'],['♟️','chess'],['♟','chess'],['♛','chess'],['♚','chess'],['🎭','users'],['👥','users'],['📢','megaphone'],['📣','megaphone'],['📄','file'],['📋','copy'],['🖼️','image'],['🖼','image'],['➕','plus'],['⬆️','upload'],['⬆','upload'],['📤','upload'],['⬇️','download'],['⬇','download'],['📥','download'],['🔄','refresh'],['↻','refresh'],['ℹ️','info'],['ℹ','info'],['⚠️','alert'],['⚠','alert'],['📅','calendar'],['🗓️','calendar'],['🗓','calendar'],['👤','user'],['🧑','user'],['🎮','game'],['🕹️','game'],['🕹','game'],['📊','chart'],['📈','chart'],['📉','chart'],['🏠','home'],['🏡','home'],['☰','menu'],['📂','folder'],['📁','folder'],['💾','save'],['🔔','bell'],['🔒','lock'],['🔓','unlock'],['❤️','heart'],['❤','heart'],['🌐','globe'],['🌎','globe'],['📍','pin'],['🕒','clock'],['⏰','clock'],['↗️','external'],['↗','external']
  ]);
  const TOKENS=[...MAP.keys()].sort((a,b)=>b.length-a.length);
  const TARGETS='button,a,[role="button"],.btn,.nav-link,.menu-item,.sidebar-item,.sidebar-link,.action,.chip,.badge,summary,label,h1,h2,h3,h4,h5,h6';
  const SKIP='script,style,textarea,pre,code,[contenteditable="true"],[data-cc-keep-emoji]';

  function icon(name){
    const span=document.createElement('span');
    span.className='cc-svg-icon';
    span.dataset.ccIcon=name;
    span.setAttribute('aria-hidden','true');
    span.innerHTML='<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">'+SVG[name]+'</svg>';
    return span;
  }

  function firstText(root){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
      if(!node.nodeValue||!node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
      const p=node.parentElement;
      if(!p||p.closest(SKIP)||p.closest('.cc-svg-icon')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    return walker.nextNode();
  }

  function replace(el){
    if(!(el instanceof Element)||el.matches(SKIP)||el.closest('[data-cc-keep-emoji]')) return;
    const node=firstText(el);
    if(!node) return;
    const raw=node.nodeValue;
    const lead=(raw.match(/^\s*/)||[''])[0];
    const rest=raw.slice(lead.length);
    const token=TOKENS.find(t=>rest.startsWith(t));
    if(!token) return;
    const name=MAP.get(token);
    const after=rest.slice(token.length).replace(/^\s+/,'');
    node.nodeValue=lead+after;
    node.parentNode.insertBefore(icon(name),node);
    el.dataset.ccEmojiReplaced='1';
    if(!after.trim()&&el.matches('button,a,[role="button"]')) el.classList.add('cc-icon-only');
  }

  function scan(root=document){
    if(root instanceof Element&&root.matches(TARGETS)) replace(root);
    root.querySelectorAll?.(TARGETS).forEach(replace);
  }

  function boot(){
    scan(document);
    const observer=new MutationObserver(list=>{
      for(const mutation of list){
        if(mutation.type==='characterData'){
          const el=mutation.target.parentElement?.closest(TARGETS);
          if(el) replace(el);
          continue;
        }
        mutation.addedNodes.forEach(node=>{
          if(node.nodeType===1) scan(node);
          else if(node.nodeType===3){
            const el=node.parentElement?.closest(TARGETS);
            if(el) replace(el);
          }
        });
      }
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    window.CosplayChessIcons={scan,replace};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();