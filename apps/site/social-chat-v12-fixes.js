(() => {
  'use strict';
  if (window.__CC_CHAT_V13_FIXES__) return;
  window.__CC_CHAT_V13_FIXES__ = true;

  let pendingImage = null;
  const css = `
    [data-community-panel="messages"]{padding:0!important;min-height:0!important;overflow:hidden!important}
    [data-community-panel="messages"]>.cc12-panel{height:calc(100dvh - 106px)!important;min-height:0!important;max-height:calc(100dvh - 106px)!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
    [data-community-panel="messages"] .cc9-panel-head{flex:0 0 auto!important;margin:0!important;padding:12px 14px!important;border-bottom:1px solid var(--line)!important;background:var(--panel)!important}
    [data-community-panel="messages"] .cc12-chat{flex:1 1 auto!important;height:auto!important;min-height:0!important;max-height:none!important;border-radius:0!important;border-left:0!important;border-right:0!important;border-bottom:0!important;overflow:hidden!important}
    [data-community-panel="messages"] .cc12-side{min-height:0!important;height:100%!important;overflow:hidden!important}
    [data-community-panel="messages"] .cc12-side-head{flex:0 0 auto!important;position:sticky!important;top:0!important;z-index:5!important;background:var(--panel)!important}
    [data-community-panel="messages"] .cc12-online-wrap{flex:0 0 auto!important;max-height:92px!important;overflow:hidden!important;background:var(--panel)!important}
    [data-community-panel="messages"] .cc12-online-list{max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;overscroll-behavior-x:contain!important}
    [data-community-panel="messages"] .cc12-thread-title{flex:0 0 auto!important;background:var(--panel)!important}
    [data-community-panel="messages"] .cc12-thread-list{flex:1 1 auto!important;min-height:0!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain!important;scrollbar-gutter:stable!important}
    [data-community-panel="messages"] .cc12-thread{min-height:68px!important;max-width:100%!important}
    [data-community-panel="messages"] .cc12-thread-copy{min-width:0!important;overflow:hidden!important}
    [data-community-panel="messages"] .cc12-thread-copy b,[data-community-panel="messages"] .cc12-thread-copy span{max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
    [data-community-panel="messages"] .cc12-conversation{height:100%!important;min-height:0!important;max-height:100%!important;overflow:hidden!important}
    [data-community-panel="messages"] .cc12-chat-head{flex:0 0 auto!important;position:relative!important;z-index:4!important}
    [data-community-panel="messages"] .cc12-stream{flex:1 1 auto!important;min-height:0!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain!important;scrollbar-gutter:stable!important}
    [data-community-panel="messages"] .cc12-typing,[data-community-panel="messages"] .cc12-pending,[data-community-panel="messages"] .cc12-compose{flex:0 0 auto!important}
    [data-community-panel="messages"] .cc12-compose{position:relative!important;bottom:auto!important;z-index:8!important;background:color-mix(in srgb,var(--panel) 98%,#000)!important;box-shadow:0 -8px 24px rgba(0,0,0,.16)!important}
    .cc13-thread-search{width:100%!important;height:38px!important;margin-top:7px!important;padding:0 10px!important;border:1px solid var(--line)!important;border-radius:9px!important;background:var(--panel2)!important;color:var(--text)!important;font-size:10px!important;outline:none!important}
    .cc13-thread-search:focus{border-color:color-mix(in srgb,var(--purple) 62%,var(--line))!important}
    .cc13-thread-count{margin-top:6px!important;color:var(--muted)!important;font-size:8px!important}
    @media(max-width:720px){
      [data-community-panel="messages"]>.cc12-panel{height:calc(100dvh - 132px)!important;max-height:calc(100dvh - 132px)!important}
      [data-community-panel="messages"] .cc9-panel-head{display:none!important}
      [data-community-panel="messages"] .cc12-chat{height:100%!important;min-height:0!important}
      [data-community-panel="messages"] .cc12-side,[data-community-panel="messages"] .cc12-conversation{height:100%!important;min-height:0!important}
      [data-community-panel="messages"] .cc12-side-head{padding:10px!important}
      [data-community-panel="messages"] .cc12-online-wrap{max-height:104px!important}
      [data-community-panel="messages"] .cc12-thread{min-height:72px!important}
      [data-community-panel="messages"] .cc12-compose{padding-bottom:calc(8px + env(safe-area-inset-bottom,0px))!important}
      [data-community-panel="messages"] .cc12-stream{padding-bottom:12px!important}
    }
    @media(max-width:430px){
      [data-community-panel="messages"]>.cc12-panel{height:calc(100dvh - 122px)!important;max-height:calc(100dvh - 122px)!important}
      [data-community-panel="messages"] .cc12-online-wrap{max-height:98px!important}
      [data-community-panel="messages"] .cc12-thread-list{padding-bottom:calc(8px + env(safe-area-inset-bottom,0px))!important}
    }
  `;
  const style = document.createElement('style');
  style.id = 'ccChatV13Layout';
  style.textContent = css;
  document.head.appendChild(style);

  function loadCss(href,id){
    if(document.getElementById(id))return;
    const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;document.head.appendChild(link);
  }
  function loadScript(src,id){
    if(document.getElementById(id))return;
    const script=document.createElement('script');script.id=id;script.src=src;script.defer=true;document.head.appendChild(script);
  }
  loadCss('./social-chat-delete-v13.css?v=20260831-1','ccChatDeleteV13Css');
  loadCss('./community-event-calendar-v13.css?v=20260831-1','ccEventCalendarV13Css');
  loadScript('./social-chat-delete-v13.js?v=20260831-1','ccChatDeleteV13Js');
  loadScript('./community-event-calendar-v13.js?v=20260831-1','ccEventCalendarV13Js');
  loadScript('./social-message-alerts-v13.js?v=20260831-1','ccMessageAlertsV13Js');

  function filterThreads(input){
    const term = String(input?.value || '').trim().toLocaleLowerCase('pt-BR');
    const rows = [...document.querySelectorAll('#cc12ThreadList .cc12-thread')];
    let visible = 0;
    rows.forEach(row => {
      const show = !term || row.textContent.toLocaleLowerCase('pt-BR').includes(term);
      row.hidden = !show;
      if(show) visible++;
    });
    const count = document.getElementById('cc13ThreadCount');
    if(count) count.textContent = term ? `${visible} conversa${visible===1?'':'s'} encontrada${visible===1?'':'s'}` : `${rows.length} conversa${rows.length===1?'':'s'} recente${rows.length===1?'':'s'}`;
  }

  function enhanceChat(){
    const head = document.querySelector('.cc12-side-head');
    if(!head) return;
    let search = document.getElementById('cc13ThreadSearch');
    if(!search){
      search = document.createElement('input');
      search.id = 'cc13ThreadSearch';
      search.className = 'cc13-thread-search';
      search.type = 'search';
      search.autocomplete = 'off';
      search.placeholder = 'Buscar nas conversas...';
      head.appendChild(search);
      const count = document.createElement('div');
      count.id = 'cc13ThreadCount';
      count.className = 'cc13-thread-count';
      head.appendChild(count);
      search.addEventListener('input',()=>filterThreads(search));
    }
    filterThreads(search);
  }

  document.addEventListener('change', e => {
    const input = e.target.closest?.('#cc12Image');
    if (!input) return;
    pendingImage = input.files?.[0] || null;
  }, true);

  document.addEventListener('click', e => {
    const msgTrigger = e.target.closest?.('[data-community-view="messages"]');
    if(msgTrigger){
      e.stopImmediatePropagation();
      [90,220,480,900].forEach(ms=>setTimeout(enhanceChat,ms));
      return;
    }
    if (e.target.closest?.('#cc12Record')) pendingImage = null;
    if (e.target.closest?.('#cc12Pending button')) pendingImage = null;
  }, true);

  document.addEventListener('submit', e => {
    if (!e.target.matches?.('#cc12Compose') || !pendingImage) return;
    const input = document.getElementById('cc12Image');
    if (!input || input.files?.length) return;
    try {
      const dt = new DataTransfer();
      dt.items.add(pendingImage);
      input.files = dt.files;
      setTimeout(() => { pendingImage = null; }, 0);
    } catch {}
  }, true);

  window.addEventListener('resize',()=>setTimeout(enhanceChat,80),{passive:true});
  [500,1100].forEach(ms=>setTimeout(enhanceChat,ms));
})();
