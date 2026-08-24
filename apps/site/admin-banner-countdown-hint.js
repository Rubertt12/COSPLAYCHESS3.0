(()=>{
  if(window.__COSPLAYCHESS_BANNER_COUNTDOWN_HINT__)return;
  window.__COSPLAYCHESS_BANNER_COUNTDOWN_HINT__=true;

  const install=()=>{
    document.querySelectorAll('#banners textarea[data-field="text"]').forEach(textarea=>{
      const label=textarea.closest('label');
      if(!label||label.querySelector('.cc-banner-countdown-help'))return;
      textarea.placeholder='Ex.: Atenção, pecinhas! As inscrições estão abertas e faltam só dias para a jogatina.';
      const help=document.createElement('small');
      help.className='cc-banner-countdown-help';
      help.textContent='A quantidade de dias é calculada automaticamente pela Data do evento. Não digite o número: escreva “faltam só dias”.';
      help.style.cssText='display:block;margin-top:7px;color:#8fa0b5;font-size:10px;line-height:1.45;';
      textarea.after(help);
    });
  };

  const observer=new MutationObserver(install);
  const start=()=>{install();observer.observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
