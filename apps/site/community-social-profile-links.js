(() => {
  if(window.__COSPLAY_SOCIAL_PROFILE_LINKS__)return;
  window.__COSPLAY_SOCIAL_PROFILE_LINKS__=true;

  const enhanceRoot=(root,{primarySocial=false}={})=>{
    if(!root)return;
    root.querySelectorAll('.community-person-card').forEach(card=>{
      const source=card.querySelector('.community-person-copy[href*="jogador.html"],.community-person-avatar[href*="jogador.html"],a[href*="jogador.html?slug="]');
      if(!source)return;
      try{
        const url=new URL(source.href,location.href);
        const slug=url.searchParams.get('slug');
        if(!slug)return;
        const socialHref=`./perfil-social.html?slug=${encodeURIComponent(slug)}`;

        if(primarySocial){
          card.querySelectorAll('.community-person-copy[href*="jogador.html"],.community-person-avatar[href*="jogador.html"]').forEach(link=>{
            link.href=socialHref;
            link.title='Abrir comunidade deste amigo';
          });
        }

        const actions=card.querySelector('.community-person-actions');
        if(!actions)return;
        let link=card.querySelector('.community-view-social-profile');
        if(!link){
          link=document.createElement('a');
          link.className='btn dark community-view-social-profile';
          const view=actions.querySelector('a[href*="jogador.html"]');
          if(view)view.insertAdjacentElement('afterend',link);else actions.prepend(link);
        }
        link.href=socialHref;
        link.textContent='Ver comunidade';
      }catch{}
    });
  };

  const bind=(id,options)=>{
    const root=document.getElementById(id);
    if(!root)return;
    enhanceRoot(root,options);
    if(root.dataset.socialLinkObserver==='1')return;
    root.dataset.socialLinkObserver='1';
    new MutationObserver(()=>enhanceRoot(root,options)).observe(root,{childList:true,subtree:true});
  };

  const run=()=>{
    bind('communityFriends',{primarySocial:true});
    bind('communityRequests',{primarySocial:false});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('cosplay:social-shell-ready',run);
  setTimeout(run,600);
  setTimeout(run,1800);
})();