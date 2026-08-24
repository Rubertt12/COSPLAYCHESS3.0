(()=>{
  if(window.__CC_ADMIN_SIDEBAR_POLISH__)return;window.__CC_ADMIN_SIDEBAR_POLISH__=true;
  const NS='http://www.w3.org/2000/svg';
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
  const ICON_BY_HREF={
    '#overview':'home','#events':'calendar','#registrations':'chess','#eventGalleryPanel':'image','#pages':'file','#blog':'news','#rules':'rules','#announcement':'announcement','#banners':'flag','#testimonials':'quote','#faq':'question','#googleDrive':'cloud','#settings':'settings','#social':'share','#users':'users','#partners':'partners','#backup':'backup','#logs':'list'
  };
  const TEXT_FALLBACK=[
    ['Google Drive','cloud'],['Configurações Gerais','settings'],['Redes Sociais','share'],['Usuários','users'],['Parcerias','partners'],['Backup & Exportar','backup'],['Logs de Atividade','list']
  ];

  function svgIcon(name){
    const span=document.createElement('span');span.className='cc-svg-icon';span.dataset.ccIcon=name;span.setAttribute('aria-hidden','true');
    const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('focusable','false');svg.innerHTML=ICONS[name]||ICONS.file;span.appendChild(svg);return span;
  }
  function iconNameFor(a){
    const href=a.getAttribute('href')||'';
    if(ICON_BY_HREF[href])return ICON_BY_HREF[href];
    const text=(a.querySelector('span')?.textContent||a.textContent||'').trim();
    return TEXT_FALLBACK.find(([label])=>text.includes(label))?.[1]||null;
  }
  function decorateLink(a){
    if(!a?.matches('.v6-nav a'))return;
    const label=(a.querySelector('span')?.textContent||a.textContent||'').replace(/\s+/g,' ').trim();
    if(label){a.dataset.sidebarLabel=label;a.setAttribute('aria-label',label);a.title=label;}
    const name=iconNameFor(a),cell=a.querySelector(':scope > i');
    if(name&&cell){cell.replaceChildren(svgIcon(name));cell.dataset.sidebarIcon=name;}
  }
  function decorateAll(){document.querySelectorAll('.v6-nav a').forEach(decorateLink);}

  function syncCollapsed(){
    const shell=document.getElementById('dashboardPanel'),btn=document.getElementById('v6Collapse');if(!shell)return;
    const collapsed=shell.classList.contains('collapsed');
    shell.dataset.sidebarState=collapsed?'collapsed':'expanded';
    if(btn){btn.setAttribute('aria-expanded',String(!collapsed));btn.setAttribute('aria-label',collapsed?'Expandir menu lateral':'Recolher menu lateral');btn.title=collapsed?'Expandir menu':'Recolher menu';}
    try{localStorage.setItem('cc-admin-sidebar-collapsed',collapsed?'1':'0');}catch{}
  }
  function restore(){
    const shell=document.getElementById('dashboardPanel');if(!shell||window.innerWidth<=1000)return;
    try{if(localStorage.getItem('cc-admin-sidebar-collapsed')==='1')shell.classList.add('collapsed');}catch{}
    syncCollapsed();
  }
  function boot(){
    decorateAll();restore();
    const nav=document.querySelector('.v6-nav');if(nav)new MutationObserver(()=>decorateAll()).observe(nav,{childList:true,subtree:true});
    const shell=document.getElementById('dashboardPanel');if(shell)new MutationObserver(syncCollapsed).observe(shell,{attributes:true,attributeFilter:['class']});
    ['v6Collapse','v6Menu'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>requestAnimationFrame(syncCollapsed)));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();