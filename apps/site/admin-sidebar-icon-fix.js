(()=>{
  if(window.__CC_ADMIN_SIDEBAR_ICON_FIX__)return;
  window.__CC_ADMIN_SIDEBAR_ICON_FIX__=true;

  const ICONS={
    home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    chess:'<path d="M8 3h8l-1 4 2 3-2 3 3 7H6l3-7-2-3 2-3z"/><path d="M7 20h10"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    news:'<path d="M4 5h16v14H4z"/><path d="M7 8h5v4H7zM14 8h3M14 11h3M7 15h10"/>',
    rules:'<path d="M6 3h12a2 2 0 0 1 2 2v16H8a4 4 0 0 1-4-4V5a2 2 0 0 1 2-2z"/><path d="M8 3v18M11 8h6M11 12h6M11 16h4"/>',
    announcement:'<path d="m3 11 18-5v12L3 13z"/><path d="M11.5 15.5 13 21H7l-1.5-7"/>',
    flag:'<path d="M5 22V4"/><path d="M5 5h11l-2 4 2 4H5"/>',
    quote:'<path d="M7 17H3v-4a6 6 0 0 1 6-6v3a3 3 0 0 0-3 3h1zM18 17h-4v-4a6 6 0 0 1 6-6v3a3 3 0 0 0-3 3h1z"/>',
    question:'<circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.8 2.8 0 1 1 4.9 1.9c-1.4 1.3-2.4 1.7-2.4 3.1M12 18h.01"/>',
    cloud:'<path d="M17.5 19H7a5 5 0 0 1-.8-9.9A7 7 0 0 1 19.7 11 4 4 0 0 1 17.5 19z"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14v-4a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3h4a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10v4a1.7 1.7 0 0 0-1.6 1z"/>',
    share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    partners:'<path d="M7 12a4 4 0 1 1 0-8h3"/><path d="M17 12a4 4 0 1 0 0-8h-3"/><path d="M8 20h8M12 16v4M8 8h8"/>',
    backup:'<path d="M4 7h16v13H4z"/><path d="M7 4h10v3M8 11h8M8 15h6"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>'
  };

  const BY_HREF={
    '#overview':'home','#events':'calendar','#registrations':'chess','#eventGalleryPanel':'image',
    '#pages':'file','#blog':'news','#rules':'rules','#announcement':'announcement','#banners':'flag',
    '#testimonials':'quote','#faq':'question','#googleDrive':'cloud','#settings':'settings','#social':'share',
    '#users':'users','#partners':'partners','#backup':'backup','#logs':'list'
  };

  const BY_TEXT=[
    ['Dashboard','home'],['Eventos','calendar'],['Inscrições','chess'],['Galeria','image'],['Páginas','file'],
    ['Blog / Notícias','news'],['Regras','rules'],['Modal / Aviso','announcement'],['Banners','flag'],
    ['Depoimentos','quote'],['FAQ','question'],['Google Drive','cloud'],['Configurações Gerais','settings'],
    ['Redes Sociais','share'],['Usuários','users'],['Parcerias','partners'],['Backup & Exportar','backup'],
    ['Logs de Atividade','list']
  ];

  function iconName(a){
    const href=a.getAttribute('href')||'';
    if(BY_HREF[href])return BY_HREF[href];
    const label=(a.querySelector(':scope > span')?.textContent||a.textContent||'').replace(/\s+/g,' ').trim();
    return BY_TEXT.find(([text])=>label.includes(text))?.[1]||'file';
  }

  function svg(name){
    const el=document.createElementNS('http://www.w3.org/2000/svg','svg');
    el.setAttribute('viewBox','0 0 24 24');
    el.setAttribute('focusable','false');
    el.setAttribute('aria-hidden','true');
    el.classList.add('cc-sidebar-svg');
    el.innerHTML=ICONS[name]||ICONS.file;
    return el;
  }

  function normalize(a){
    if(!a?.matches?.('.v6-nav a'))return;
    let cell=a.querySelector(':scope > i');
    if(!cell){
      cell=document.createElement('i');
      a.prepend(cell);
    }
    const name=iconName(a);
    if(cell.dataset.ccSidebarFixed===name && cell.querySelector(':scope > .cc-sidebar-svg'))return;
    cell.replaceChildren(svg(name));
    cell.dataset.ccSidebarFixed=name;
  }

  function normalizeAll(){document.querySelectorAll('.v6-nav a').forEach(normalize);}

  function boot(){
    normalizeAll();
    const nav=document.querySelector('.v6-nav');
    if(!nav)return;
    let frame=0;
    new MutationObserver(()=>{
      if(frame)return;
      frame=requestAnimationFrame(()=>{frame=0;normalizeAll();});
    }).observe(nav,{childList:true,subtree:true,characterData:true});
    setTimeout(normalizeAll,250);
    setTimeout(normalizeAll,900);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
