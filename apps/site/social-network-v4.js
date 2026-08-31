(() => {
  'use strict';
  if (window.__CC_SOCIAL_NETWORK_V4__) return;
  window.__CC_SOCIAL_NETWORK_V4__ = true;

  const $ = (id) => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];

  const copyAvatar = (source, target) => {
    if (!source || !target) return;
    const sourceImg = source.querySelector('img');
    const targetImg = target.querySelector('img');
    if (sourceImg?.src && targetImg?.src === sourceImg.src && target.childElementCount === 1) return;
    if (!sourceImg && !targetImg && target.textContent?.trim() === '♜') return;
    target.replaceChildren();
    if (sourceImg?.src) {
      const img = document.createElement('img');
      img.src = sourceImg.src;
      img.alt = sourceImg.alt || 'Avatar';
      img.loading = 'lazy';
      target.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = '♜';
      target.appendChild(span);
    }
  };

  const readNumber = (el) => Number.parseInt(String(el?.textContent || '0').replace(/\D/g, ''), 10) || 0;

  const syncProfile = () => {
    const name = $('communityMyName')?.textContent?.trim() || 'Participante';
    const character = $('communityMyCharacter')?.textContent?.trim() || 'CosplayChess';
    qa('[data-cc-profile-name]').forEach((el) => { if (el.textContent !== name) el.textContent = name; });
    qa('[data-cc-profile-character]').forEach((el) => { if (el.textContent !== character) el.textContent = character; });
    qa('.cc-mirror-avatar').forEach((el) => copyAvatar($('communityMyAvatar'), el));
  };

  const syncCounts = () => {
    const values = {
      friends: readNumber($('communityFriendCount')),
      posts: readNumber($('communityPostCount')),
      photos: readNumber($('communityPhotoCount')),
    };
    qa('[data-cc-count="friends"]').forEach((el) => { const value=String(values.friends); if(el.textContent!==value)el.textContent=value; });
    qa('[data-cc-count="posts"]').forEach((el) => { const value=String(values.posts); if(el.textContent!==value)el.textContent=value; });
    qa('[data-cc-count="photos"]').forEach((el) => { const value=String(values.photos); if(el.textContent!==value)el.textContent=value; });
    const score=(values.posts*12)+(values.friends*20)+(values.photos*8);
    const level=Math.max(1,Math.floor(score/100)+1);
    const progress=Math.min(100,score%100);
    if($('ccSocialLevel'))$('ccSocialLevel').textContent=String(level);
    if($('ccSocialXpBar'))$('ccSocialXpBar').style.width=`${progress}%`;
    if($('ccSocialXpCopy'))$('ccSocialXpCopy').textContent=`${score} pontos sociais`;
  };

  const syncNotificationBadge = () => {
    const source=q('[data-community-view="notifications"] .social-v2-badge');
    const target=$('ccNotificationBadge');
    if(!target)return;
    const value=readNumber(source);
    target.textContent=String(value);
    target.hidden=value===0;
  };

  const buildCommunities = () => {
    const wrap=$('ccHighlightedGroups');
    if(!wrap)return false;
    const cards=qa('#communityGroups > *').filter((el)=>!el.classList.contains('community-empty')).slice(0,3);
    const signature=cards.map((card)=>`${card.querySelector('h3,b,strong')?.textContent||''}|${card.querySelector('img')?.src||''}`).join('::');
    if(wrap.dataset.renderKey===signature)return cards.length>0;
    wrap.dataset.renderKey=signature;
    wrap.replaceChildren();
    if(!cards.length){const empty=document.createElement('div');empty.className='community-empty';empty.textContent='Suas comunidades em destaque aparecerão aqui.';wrap.appendChild(empty);return false;}
    cards.forEach((card)=>{
      const row=document.createElement('div');row.className='cc-highlight-item';
      const sourceImg=card.querySelector('img');
      const title=card.querySelector('h3,b,strong')?.textContent?.trim()||'Comunidade';
      const sub=card.querySelector('small,span,p')?.textContent?.trim()||'CosplayChess';
      const avatar=document.createElement('div');avatar.className='cc-highlight-avatar';
      if(sourceImg?.src){const img=document.createElement('img');img.src=sourceImg.src;img.alt='';avatar.appendChild(img);}else avatar.textContent='♜';
      const copy=document.createElement('div');copy.className='cc-highlight-copy';copy.innerHTML=`<b></b><span></span>`;copy.querySelector('b').textContent=title;copy.querySelector('span').textContent=sub;
      const button=document.createElement('button');button.type='button';button.textContent='Abrir';button.addEventListener('click',()=>{q('.community-nav [data-community-view="communities"]')?.click();setTimeout(()=>card.scrollIntoView({block:'center',behavior:'smooth'}),120);});
      row.append(avatar,copy,button);wrap.appendChild(row);
    });
    return true;
  };

  const wireSearch = () => {
    const global=$('ccGlobalSearch');
    if(!global)return;
    const go=()=>{
      const term=global.value.trim();
      q('.community-nav [data-community-view="discover"]')?.click();
      setTimeout(()=>{
        const people=$('communityPeopleSearch');
        if(!people)return;
        people.value=term;
        people.dispatchEvent(new Event('input',{bubbles:true}));
        people.focus();
      },120);
    };
    global.addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();go();}});
    document.addEventListener('keydown',(event)=>{if(event.ctrlKey&&event.key==='/'){event.preventDefault();global.focus();global.select();}});
  };

  const wireFeedTabs = () => {
    const tabs=qa('.cc-feed-tabs button');
    tabs.forEach((button)=>button.addEventListener('click',()=>{
      tabs.forEach((item)=>item.classList.remove('active'));
      button.classList.add('active');
      if(button.dataset.feedMode==='recent')$('communityRefreshFeed')?.click();
    }));
  };

  const wireCreatePost = () => {
    const trigger=$('ccCreatePost');const field=$('communityPostBody');
    if(!trigger||!field)return;
    trigger.addEventListener('click',(event)=>{
      event.preventDefault();
      q('.community-nav [data-community-view="feed"]')?.click();
      history.replaceState(null,'',`${location.pathname}${location.search}`);
      setTimeout(()=>{field.focus({preventScroll:true});field.scrollIntoView({behavior:'smooth',block:'center'});},80);
    });
  };

  const wireCollapse = () => {
    const button=q('.cc-collapse');if(!button)return;
    button.addEventListener('click',()=>{
      document.body.classList.toggle('cc-left-collapsed');
      const collapsed=document.body.classList.contains('cc-left-collapsed');
      button.textContent=collapsed?'»':'«';
      button.setAttribute('aria-label',collapsed?'Expandir menu':'Recolher menu');
    });
  };

  const wireHash = () => {
    if(location.hash!=='#communityPostBody')return;
    history.replaceState(null,'',`${location.pathname}${location.search}`);
    setTimeout(()=>$('ccCreatePost')?.click(),120);
  };

  const boundedWatch = () => {
    const targets=[$('communityMyAvatar'),$('communityMyName'),$('communityMyCharacter'),$('communityFriendCount'),$('communityPostCount'),$('communityPhotoCount'),$('communityGroups')].filter(Boolean);
    const notificationBadge=q('[data-community-view="notifications"] .social-v2-badge');
    if(!targets.length&&!notificationBadge)return;
    let queued=false;
    const flush=()=>{queued=false;syncProfile();syncCounts();syncNotificationBadge();buildCommunities();};
    const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(flush);};
    const observer=new MutationObserver(schedule);
    targets.forEach((target)=>observer.observe(target,{childList:true,subtree:true,characterData:true}));
    if(notificationBadge)observer.observe(notificationBadge,{childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});
    setTimeout(()=>observer.disconnect(),8000);
  };

  const init = () => {
    syncProfile();syncCounts();syncNotificationBadge();buildCommunities();
    wireSearch();wireFeedTabs();wireCreatePost();wireCollapse();wireHash();boundedWatch();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();