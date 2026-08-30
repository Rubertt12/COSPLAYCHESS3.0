(() => {
  'use strict';

  if (window.__COSPLAY_COMMUNITY_NAVBAR_AUTOCOMPLETE__) return;
  window.__COSPLAY_COMMUNITY_NAVBAR_AUTOCOMPLETE__ = true;

  if (!document.querySelector('link[data-community-discovery-large]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = './community-discovery-large.css?v=20260830-1';
    style.dataset.communityDiscoveryLarge = '1';
    document.head.appendChild(style);
  }

  const db = window.getCosplayChessParticipantDb
    ? window.getCosplayChessParticipantDb()
    : window.COSPLAYCHESS_PARTICIPANT_DB;

  let timer = null;
  let requestSeq = 0;

  const esc = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const safeImage = (value) => {
    try {
      const url = new URL(String(value || ''), location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  };

  const getSearch = () => document.querySelector('.premium-global-search');
  const getInput = () => document.getElementById('premiumGlobalSearch');

  const ensureBox = () => {
    const search = getSearch();
    if (!search) return null;
    let box = search.querySelector('.premium-search-autocomplete');
    if (!box) {
      box = document.createElement('div');
      box.className = 'premium-search-autocomplete';
      box.hidden = true;
      search.appendChild(box);
    }
    return box;
  };

  const closeBox = () => {
    const box = ensureBox();
    if (box) box.hidden = true;
  };

  const goExplore = (query) => {
    const discover = document.querySelector('[data-community-view="discover"]');
    discover?.click();
    setTimeout(() => {
      const target = document.getElementById('communityPeopleSearch');
      if (!target) return;
      target.value = query || '';
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.focus();
    }, 100);
  };

  const render = (rows, query) => {
    const box = ensureBox();
    if (!box) return;

    box.replaceChildren();

    const head = document.createElement('div');
    head.className = 'premium-search-autocomplete-head';
    head.textContent = rows.length ? 'PESSOAS' : 'NENHUM PERFIL ENCONTRADO';
    box.appendChild(head);

    rows.slice(0, 6).forEach((row) => {
      const link = document.createElement('a');
      link.className = 'premium-search-person';
      link.href = row.public_slug
        ? `./jogador.html?slug=${encodeURIComponent(row.public_slug)}`
        : '#';

      const avatar = document.createElement('span');
      avatar.className = 'premium-search-person-avatar';
      const image = safeImage(row.character_photo_url);
      if (image) {
        const img = document.createElement('img');
        img.src = image;
        img.alt = '';
        img.loading = 'lazy';
        avatar.appendChild(img);
      } else {
        avatar.textContent = (row.display_name || row.nick || row.character_name || 'P').charAt(0).toUpperCase();
      }

      const copy = document.createElement('span');
      copy.className = 'premium-search-person-copy';
      const name = document.createElement('b');
      name.textContent = row.display_name || row.nick || 'Participante';
      const meta = document.createElement('small');
      const nick = row.nick ? `@${String(row.nick).replace(/^@/, '')}` : '';
      meta.textContent = [nick, row.character_name].filter(Boolean).join(' · ') || 'Perfil CosplayChess';
      copy.append(name, meta);

      const arrow = document.createElement('span');
      arrow.className = 'premium-search-person-arrow';
      arrow.textContent = '›';

      link.append(avatar, copy, arrow);
      box.appendChild(link);
    });

    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'premium-search-see-all';
    all.textContent = rows.length ? `Ver todos os resultados para “${query}”` : 'Abrir busca completa';
    all.addEventListener('click', () => {
      closeBox();
      goExplore(query);
    });
    box.appendChild(all);
    box.hidden = false;
  };

  const searchPeople = async (query) => {
    if (!db?.rpc) return;
    const seq = ++requestSeq;
    const { data, error } = await db.rpc('cosplay_discover_participants', {
      p_search: query,
      p_page: 1,
      p_page_size: 10
    });
    if (seq !== requestSeq) return;
    if (error) {
      closeBox();
      return;
    }
    render(Array.isArray(data) ? data : [], query);
  };

  const bind = () => {
    const input = getInput();
    const search = getSearch();
    if (!input || !search || input.dataset.autocompleteBound === '1') return;
    input.dataset.autocompleteBound = '1';
    ensureBox();

    input.addEventListener('input', () => {
      clearTimeout(timer);
      const query = input.value.trim();
      if (!query) {
        closeBox();
        return;
      }
      timer = setTimeout(() => searchPeople(query), 180);
    });

    input.addEventListener('focus', () => {
      const query = input.value.trim();
      if (query) searchPeople(query);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeBox();
    });

    document.addEventListener('click', (event) => {
      if (!search.contains(event.target)) closeBox();
    });
  };

  const run = () => bind();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('cosplay:social-shell-ready', () => setTimeout(run, 80));
  setTimeout(run, 400);
  setTimeout(run, 1200);
})();
