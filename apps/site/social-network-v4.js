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

  const readNumber = (el) => Number.parseInt(String(el?.textContent || '0').replace(/\D/g, ''), 10) || 0;

  const syncProfile = () => {
    const name = $('communityMyName')?.textContent?.trim() || 'Participante';
    const character = $('communityMyCharacter')?.textContent?.trim() || 'CosplayChess';
    qa('[data-cc-profile-name]').forEach(el => { el.textContent = name; });
    qa('[data-cc-profile-character]').forEach(el => { el.textContent = character; });
    qa('.cc-mirror-avatar').forEach(el => copyAvatar($('communityMyAvatar'), el));
  };

  const syncCounts = () => {
    const values = {
      friends: readNumber($('communityFriendCount')),
      posts: readNumber($('communityPostCount')),
      photos: readNumber($('communityPhotoCount')),
    };
    qa('[data-cc-count="friends"]').forEach(el => { el.textContent = String(values.friends); });
    qa('[data-cc-count="posts"]').forEach(el => { el.textContent = String(values.posts); });
    qa('[data-cc-count="photos"]').forEach(el => { el.textContent = String(values.photos); });

    const score = (values.posts * 12) + (values.friends * 20) + (values.photos * 8);
    const level = Math.max(1, Math.floor(score / 100) + 1);
    const progress = Math.min(100, score % 100);
    const levelEl = $('ccSocialLevel');
    const xpBar = $('ccSocialXpBar');
    const xpCopy = $('ccSocialXpCopy');
    if (levelEl) levelEl.textContent = String(level);
    if (xpBar) xpBar.style.width = `${progress}%`;
    if (xpCopy) xpCopy.textContent = `${score} pontos sociais`;
  };

  const syncNotificationBadge = () => {
    const source = q('[data-community-view="notifications"] .social-v2-badge');
    const target = $('ccNotificationBadge');
    if (!target) return;
    const value = readNumber(source);
    target.textContent = String(value);
    target.hidden = value === 0;
  };

  const buildStories = () => {
    const wrap = $('ccStories');
    if (!wrap) return false;
    const cards = qa('.community-person-card', $('communityFriends')).slice(0, 5);
    wrap.replaceChildren();

    const mine = document.createElement('button');
    mine.className = 'cc-story';
    mine.type = 'button';
    mine.innerHTML = '<div class="cc-story-avatar cc-mirror-avatar"><span>♜</span></div><span>Você</span>';
    mine.addEventListener('click', () => $('communityMyProfileLink')?.click());
    wrap.appendChild(mine);
    copyAvatar($('communityMyAvatar'), mine.querySelector('.cc-mirror-avatar'));

    cards.forEach(card => {
      const item = document.createElement('button');
      item.className = 'cc-story';
      item.type = 'button';
      const avatar = document.createElement('div');
      avatar.className = 'cc-story-avatar';
      const sourceImg = card.querySelector('.community-person-avatar img');
      if (sourceImg?.src) {
        const img = document.createElement('img');
        img.src = sourceImg.src;
        img.alt = '';
        avatar.appendChild(img);
      } else avatar.textContent = '♟';
      const label = document.createElement('span');
      label.textContent = card.querySelector('.community-person-copy b')?.textContent?.trim() || 'Cosplayer';
      item.append(avatar, label);
      item.addEventListener('click', () => card.querySelector('.community-person-copy')?.click());
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
      const empty = document.createElement('div');
      empty.className = 'community-empty';
      empty.textContent = 'Suas comunidades em destaque aparecerão aqui.';
      wrap.appendChild(empty);
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
      if (sourceImg?.src) {
        const img = document.createElement('img');
        img.src = sourceImg.src;
        img.alt = '';
        avatar.appendChild(img);
      } else avatar.textContent = '♜';
      const copy = document.createElement('div');
      copy.className = 'cc-highlight-copy';
      const b = document.createElement('b');
      b.textContent = title;
      const span = document.createElement('span');
      span.textContent = sub;
      copy.append(b, span);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Abrir';
      button.addEventListener('click', () => {
        q('[data-community-view="communities"]')?.click();
        setTimeout(() => card.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
      });
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
    global.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        go();
      }
    });
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        global.focus();
        global.select();
      }
    });
  };

  const wireFeedTabs = () => {
    const tabs = qa('.cc-feed-tabs button');
    tabs.forEach(btn => btn.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.feedMode === 'recent') $('communityRefreshFeed')?.click();
    }));
  };

  const wireCreatePost = () => {
    const trigger = $('ccCreatePost');
    const field = $('communityPostBody');
    if (!trigger || !field) return;
    trigger.addEventListener('click', e => {
      e.preventDefault();
      q('[data-community-view="feed"]')?.click();
      history.replaceState(null, '', `${location.pathname}${location.search}`);
      setTimeout(() => {
        field.focus({ preventScroll: true });
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
    });
  };

  const wireCollapse = () => {
    const button = q('.cc-collapse');
    if (!button) return;
    button.addEventListener('click', () => {
      document.body.classList.toggle('cc-left-collapsed');
      const collapsed = document.body.classList.contains('cc-left-collapsed');
      button.textContent = collapsed ? '»' : '«';
      button.setAttribute('aria-label', collapsed ? 'Expandir menu' : 'Recolher menu');
    });
  };

  const wireHash = () => {
    if (location.hash !== '#communityPostBody') return;
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    setTimeout(() => $('ccCreatePost')?.click(), 120);
  };

  const boundedWatch = () => {
    const targets = [
      $('communityMyAvatar'), $('communityMyName'), $('communityMyCharacter'),
      $('communityFriendCount'), $('communityPostCount'), $('communityPhotoCount'),
      $('communityFriends'), $('communityGroups'), q('[data-community-view="notifications"]')
    ].filter(Boolean);
    if (!targets.length) return;
    const observer = new MutationObserver(() => {
      syncProfile();
      syncCounts();
      syncNotificationBadge();
      buildStories();
      buildCommunities();
    });
    targets.forEach(t => observer.observe(t, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['hidden'] }));
    setTimeout(() => observer.disconnect(), 30000);
  };

  const init = () => {
    syncProfile();
    syncCounts();
    syncNotificationBadge();
    buildStories();
    buildCommunities();
    wireSearch();
    wireFeedTabs();
    wireCreatePost();
    wireCollapse();
    wireHash();
    boundedWatch();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();