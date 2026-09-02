(() => {
  'use strict';
  if (window.__CC_MOBILE_POLISH_V3__) return;
  window.__CC_MOBILE_POLISH_V3__ = true;

  const root = document.documentElement;
  const mqMobile = matchMedia('(max-width: 980px)');
  const mqStandalone = matchMedia('(display-mode: standalone)');
  let stableHeight = window.innerHeight || root.clientHeight || 0;
  let listScrollTop = 0;
  let historyPushed = false;
  let timer = 0;

  const q = (s, r = document) => r.querySelector(s);
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  function setPageState(){
    document.body?.setAttribute('data-cc-page', page.replace(/\.html$/,''));
    document.body?.classList.toggle('cc-standalone', mqStandalone.matches || navigator.standalone === true);
  }

  function syncViewport(){
    const vv = window.visualViewport;
    const h = Math.round(vv?.height || window.innerHeight || root.clientHeight || 0);
    const w = Math.round(vv?.width || window.innerWidth || root.clientWidth || 0);
    const top = Math.max(0, Math.round(vv?.offsetTop || 0));
    const left = Math.max(0, Math.round(vv?.offsetLeft || 0));
    if(h) root.style.setProperty('--cc-visual-height', `${h}px`);
    if(w) root.style.setProperty('--cc-visual-width', `${w}px`);
    root.style.setProperty('--cc-visual-top', `${top}px`);
    root.style.setProperty('--cc-visual-left', `${left}px`);

    const focused = document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]');
    if(!focused && h > stableHeight * .86) stableHeight = Math.max(stableHeight, h);
    const keyboardOpen = mqMobile.matches && !!vv && focused && stableHeight > 0 && h < stableHeight * .82;
    document.body?.classList.toggle('cc-keyboard-open', !!keyboardOpen);
    document.body?.classList.toggle('cc-mobile-viewport', mqMobile.matches);
  }

  function chat(){ return q('.cc20'); }

  function closeChatConversation({fromHistory=false}={}){
    const c = chat();
    if(!c) return;
    c.classList.remove('in-conversation');
    q('#cc20Body', c)?.blur?.();
    const list = q('.cc20-threads', c);
    if(list) requestAnimationFrame(() => { list.scrollTop = listScrollTop; });
    if(!fromHistory && historyPushed && history.state?.__ccChatOpen){
      historyPushed = false;
      history.back();
      return;
    }
    historyPushed = false;
  }

  function openChatConversation(c){
    if(!mqMobile.matches || !c) return;
    const list = q('.cc20-threads', c);
    if(list) listScrollTop = list.scrollTop;
    c.classList.add('in-conversation');
    if(!history.state?.__ccChatOpen){
      try{
        history.pushState({...history.state,__ccChatOpen:true}, '', location.href);
        historyPushed = true;
      }catch{}
    }else historyPushed = true;
  }

  function bindChat(){
    const c = chat();
    if(!c || c.dataset.ccPolishV3 === '1') return;
    c.dataset.ccPolishV3 = '1';

    c.addEventListener('click', (event) => {
      const back = event.target.closest('.cc20-head-back');
      if(back && mqMobile.matches){
        event.preventDefault();
        event.stopImmediatePropagation();
        closeChatConversation();
        return;
      }
      const opener = event.target.closest('.cc20-thread,[data-cc22-peer],.cc20-presence-person,.cc20-new-person');
      if(opener && mqMobile.matches) setTimeout(() => openChatConversation(c), 45);
    }, true);
  }

  function enhanceTouchTargets(){
    if(!mqMobile.matches) return;
    document.querySelectorAll('button,a.btn,[role="button"]').forEach(el => {
      if(el instanceof HTMLElement) el.style.touchAction = 'manipulation';
    });
  }

  function sync(){
    setPageState();
    syncViewport();
    bindChat();
    enhanceTouchTargets();
  }

  function schedule(){
    clearTimeout(timer);
    timer = setTimeout(sync, 70);
  }

  window.addEventListener('popstate', (event) => {
    const c = chat();
    if(c?.classList.contains('in-conversation') && !event.state?.__ccChatOpen){
      closeChatConversation({fromHistory:true});
    }
  });

  window.addEventListener('resize', syncViewport, {passive:true});
  window.addEventListener('orientationchange', () => {
    stableHeight = 0;
    setTimeout(() => {
      stableHeight = window.innerHeight || root.clientHeight || 0;
      sync();
    }, 140);
  }, {passive:true});

  window.visualViewport?.addEventListener('resize', syncViewport, {passive:true});
  window.visualViewport?.addEventListener('scroll', syncViewport, {passive:true});
  mqMobile.addEventListener?.('change', sync);
  mqStandalone.addEventListener?.('change', setPageState);

  document.addEventListener('focusin', (event) => {
    if(!mqMobile.matches) return;
    if(event.target.matches?.('input,textarea,select,[contenteditable="true"]')){
      setTimeout(() => {
        syncViewport();
        if(page === 'mensagens.html') event.target.scrollIntoView?.({block:'nearest',inline:'nearest'});
      }, 100);
    }
  });
  document.addEventListener('focusout', () => {
    if(!mqMobile.matches) return;
    setTimeout(syncViewport, 180);
  });

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync, {once:true});
  else sync();

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
})();
