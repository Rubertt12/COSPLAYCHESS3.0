(() => {
  if(window.__COSPLAY_SOCIAL_PROFILE_LINKS__)return;
  window.__COSPLAY_SOCIAL_PROFILE_LINKS__=true;

  const socialHrefFrom=(link)=>{
    if(!link)return null;
    try{
      const url=new URL(link.href,location.href);
      const slug=url.searchParams.get('slug');
      return slug?`./perfil-social.html?slug=${encodeURIComponent(slug)}`:null;
    }catch{return null;}
  };

  const enhanceRoot=(root)=>{
    if(!root)return;
    root.querySelectorAll('.community-person-card').forEach(card=>{
      if(card.querySelector('.community-view-social-profile'))return;
      const source=card.querySelector('.community-person-copy[href*="jogador.html"],.community-person-avatar[href*="jogador.html"],a[href*="jogador.html?slug="]');
      const href=socialHrefFrom(source);
      if(!href)return;
      const actions=card.querySelector('.community-person-actions');
      if(!actions)return;
      const link=document.createElement('a');
      link.className='btn dark community-view-social-profile';
      link.href=href;
      link.textContent='Ver comunidade';
      const publicView=actions.querySelector('a[href*="jogador.html"]');
      if(publicView)publicView.insertAdjacentElement('afterend',link);else actions.prepend(link);
    });
  };

  const friends=document.getElementById('communityFriends');
  if(friends&&!friends.dataset.socialPrimaryBound){
    friends.dataset.socialPrimaryBound='1';
    friends.addEventListener('click',(event)=>{
      const target=event.target.closest('.community-person-copy[href*="jogador.html"],.community-person-avatar[href*="jogador.html"]');
      if(!target||!friends.contains(target))return;
      const href=socialHrefFrom(target);
      if(!href)return;
      event.preventDefault();
      location.href=href;
    });
  }

  const run=()=>{
    enhanceRoot(document.getElementById('communityFriends'));
    enhanceRoot(document.getElementById('communityRequests'));
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('cosplay:social-shell-ready',run);
  setTimeout(run,700);
  setTimeout(run,2200);
})();