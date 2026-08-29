(() => {
  if(window.__COSPLAY_SOCIAL_PROFILE_LINKS__)return;
  window.__COSPLAY_SOCIAL_PROFILE_LINKS__=true;

  const enhanceRoot=root=>{
    if(!root)return;
    root.querySelectorAll('.community-person-card').forEach(card=>{
      if(card.querySelector('.community-view-social-profile'))return;
      const source=card.querySelector('.community-person-copy[href*="jogador.html"],.community-person-avatar[href*="jogador.html"]');
      if(!source)return;
      try{
        const url=new URL(source.href,location.href);const slug=url.searchParams.get('slug');if(!slug)return;
        const actions=card.querySelector('.community-person-actions');if(!actions)return;
        const link=document.createElement('a');link.className='btn dark community-view-social-profile';link.href=`./perfil-social.html?slug=${encodeURIComponent(slug)}`;link.textContent='Ver comunidade';
        const view=actions.querySelector('a');if(view)view.insertAdjacentElement('afterend',link);else actions.prepend(link);
      }catch{}
    });
  };

  const bind=id=>{
    const root=document.getElementById(id);if(!root||root.dataset.socialLinkObserver==='1')return;
    root.dataset.socialLinkObserver='1';enhanceRoot(root);
    new MutationObserver(()=>enhanceRoot(root)).observe(root,{childList:true,subtree:true});
  };
  const run=()=>['communityFriends','communityRequests'].forEach(bind);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('cosplay:social-shell-ready',run);
  setTimeout(run,600);setTimeout(run,1800);
})();