(() => {
  const $ = (id) => document.getElementById(id);
  const q = (s, root = document) => root.querySelector(s);
  const qa = (s, root = document) => [...root.querySelectorAll(s)];

  const copyAvatar = (source, target) => {
    if (!source || !target) return;
    target.replaceChildren();
    const img = source.querySelector('img');
    if (img?.src) {
      const clone = document.createElement('img');
      clone.src = img.src;
      clone.alt = img.alt || 'Avatar';
      clone.loading = 'lazy';
      target.appendChild(clone);
    } else {
      const span = document.createElement('span');
      span.textContent = '♜';
      target.appendChild(span);
    }
  };

  const syncProfile = () => {
    const name = $('communityMyName')?.textContent?.trim() || 'Participante';
    const character = $('communityMyCharacter')?.textContent?.trim() || 'CosplayChess';
    qa('[data-cc-profile-name]').forEach(el => { el.textContent = name; });
    qa('[data-cc-profile-character]').forEach(el => { el.textContent = character; });
    qa('.cc-mirror-avatar').forEach(el => copyAvatar($('communityMyAvatar'), el));
  };

  const syncCounts = () => {
    const values = {
      friends: $('communityFriendCount')?.textContent?.trim() || '0',
      posts: $('communityPostCount')?.textContent?.trim() || '0',
      photos: $('communityPhotoCount')?.textContent?.trim() || '0',
    };
    qa('[data-cc-count="friends"]').forEach(el => { el.textContent = values.friends; });
    qa('[data-cc-count="posts"]').forEach(el => { el.textContent = values.posts; });
    qa('[data-cc-count="photos"]').forEach(el => { el.textContent = values.photos; });
  };

  const buildStories = () => {
    const wrap = $('ccStories');
    if (!wrap) return false;
    const cards = qa('.community-person-card', $('communityFriends')).slice(0, 5);
    wrap.replaceChildren();

    const mine = document.createElement('div');
    mine.className = 'cc-story';
    mine.innerHTML = '<div class="cc-story-avatar cc-mirror-avatar"><span>♜</span></div><span>Você</span>';
    wrap.appendChild(mine);
    copyAvatar($('communityMyAvatar'), mine.querySelector('.cc-mirror-avatar'));

    cards.forEach(card => {
      const item = document.createElement('div');
      item.className = 'cc-story';
      const avatar = document.createElement('div');
      avatar.className = 'cc-story-avatar';
      const sourceImg = card.querySelector('.community-person-avatar img');
      if (sourceImg?.src) avatar.innerHTML = `<img src="${sourceImg.src}" alt="">`;
      else avatar.textContent = '♟';
      const label = document.createElement('span');
      label.textContent = card.querySelector('.community-person-copy b')?.textContent?.trim() || 'Cosplayer';
      item.append(avatar, label);
      wrap.appendChild(item);
    });
    return cards.length > 0;
  };

  const buildCommunities = () => {
    const wrap = $('ccHighlightedGroups');
    if (!wrap) return false;
    const cards = qa('#communityGroups > *').filter(el => !el.classList.contains('community-empty')).slice(0, 3);
    wrap.replaceChildren();
    if (!cards.length) {
      ['Cosplays Épicos', 'Animes & Mangás', 'Games & RPG'].forEach((name, idx) => {
        const row = document.createElement('div');
        row.className = 'cc-highlight-item';
        row.innerHTML = `<div class="cc-highlight-avatar">${idx === 0 ? '♜' : idx === 1 ? '✦' : '♞'}</div><div class="cc-highlight-copy"><b>${name}</b><span>Comunidade CosplayChess</span></div><button type="button">Participar</button>`;
        row.querySelector('button').addEventListener('click', () => q('[data-community-view="communities"]')?.click());
        wrap.appendChild(row);
      });
      return false;
    }
    cards.forEach(card => {
      const row = document.createElement('div');
      row.className = 'cc-highlight-item';
      const sourceImg = card.querySelector('img');
      const title = card.querySelector('h3,b,strong')?.textContent?.trim() || 'Comunidade';
      const sub = card.querySelector('small,span,p')?.textContent?.trim() || 'CosplayChess';
      const avatar = document.createElement('div');
      avatar.className = 'cc-highlight-avatar';
      if (sourceImg?.src) avatar.innerHTML = `<img src="${sourceImg.src}" alt="">`; else avatar.textContent = '♜';
      const copy = document.createElement('div');
      copy.className = 'cc-highlight-copy';
      copy.innerHTML = `<b>${title}</b><span>${sub}</span>`;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Participar';
      button.addEventListener('click', () => q('[data-community-view="communities"]')?.click());
      row.append(avatar, copy, button);
      wrap.appendChild(row);
    });
    return true;
  };

  const wireSearch = () => {
    const global = $('ccGlobalSearch');
    const people = $('communityPeopleSearch');
    if (!global) return;
    const go = () => {
      const term = global.value.trim();
      q('[data-community-view="discover"]')?.click();
      if (people) {
        people.value = term;
        people.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => people.focus(), 120);
      }
    };
    global.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  };

  const wireFeedTabs = () => {
    const tabs = qa('.cc-feed-tabs button');
    tabs.forEach(btn => btn.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.feedMode === 'recent') $('communityRefreshFeed')?.click();
    }));
  };

  const boundedWatch = () => {
    const targets = [$('communityMyAvatar'), $('communityMyName'), $('communityMyCharacter'), $('communityFriendCount'), $('communityPostCount'), $('communityPhotoCount'), $('communityFriends'), $('communityGroups')].filter(Boolean);
    if (!targets.length) return;
    const observer = new MutationObserver(() => {
      syncProfile();
      syncCounts();
      buildStories();
      buildCommunities();
    });
    targets.forEach(t => observer.observe(t, { childList:true, subtree:true, characterData:true }));
    setTimeout(() => observer.disconnect(), 30000);
  };

  const init = () => {
    syncProfile();
    syncCounts();
    buildStories();
    buildCommunities();
    wireSearch();
    wireFeedTabs();
    boundedWatch();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();