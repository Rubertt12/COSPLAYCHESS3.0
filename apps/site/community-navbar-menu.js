(() => {
  'use strict';

  const getTopbar = () => document.querySelector('.community-premium-topbar');
  const getTopActions = () => document.querySelector('.premium-top-actions');
  const getUserButton = () => document.querySelector('.premium-user-menu');

  const ensureSearch = () => {
    const topbar = getTopbar();
    if (!topbar) return null;

    let search = topbar.querySelector('.premium-global-search');
    if (!search) {
      search = document.createElement('label');
      search.className = 'premium-global-search';
      search.innerHTML = '<span aria-hidden="true">⌕</span><input id="premiumGlobalSearch" type="search" placeholder="Buscar pessoas, comunidades, eventos..." autocomplete="off"><small class="premium-search-key">Ctrl /</small>';

      const actions = getTopActions();
      if (actions) topbar.insertBefore(search, actions);
      else topbar.appendChild(search);
    }

    const input = search.querySelector('#premiumGlobalSearch');
    if (input && input.dataset.communitySearchBound !== '1') {
      input.dataset.communitySearchBound = '1';
      input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        const q = input.value.trim();
        const discover = document.querySelector('[data-community-view="discover"]');
        discover?.click();
        setTimeout(() => {
          const target = document.getElementById('communityPeopleSearch');
          if (!target) return;
          target.value = q;
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.focus();
        }, 100);
      });
    }

    return search;
  };

  const bindSearchShortcut = () => {
    if (document.documentElement.dataset.communitySearchShortcut === '1') return;
    document.documentElement.dataset.communitySearchShortcut = '1';
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        ensureSearch()?.querySelector('input')?.focus();
      }
    });
  };

  const openSettings = () => {
    const settings = document.querySelector('[data-community-view="social-settings"]');
    if (settings) {
      settings.click();
      setTimeout(() => {
        const main = document.querySelector('.community-main');
        if (!main) return;
        const topbar = getTopbar();
        const offset = (topbar?.offsetHeight || 72) + 14;
        const y = main.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }, 90);
    }
  };

  const mount = () => {
    ensureSearch();
    bindSearchShortcut();

    const actions = getTopActions();
    const user = getUserButton();
    if (!actions || !user || actions.querySelector('.community-profile-dropdown')) return;

    const oldHref = user.getAttribute('href') || './participante.html';
    user.setAttribute('href', '#');
    user.setAttribute('role', 'button');
    user.setAttribute('aria-haspopup', 'menu');
    user.setAttribute('aria-expanded', 'false');

    const name = document.querySelector('.community-me-copy h1')?.textContent?.trim() || 'Minha conta';
    const character = document.querySelector('.community-me-copy p')?.textContent?.trim() || 'CosplayChess';

    const menu = document.createElement('div');
    menu.className = 'community-profile-dropdown';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `
      <div class="community-profile-dropdown-head">
        <b>${name.replace(/[&<>"']/g, '')}</b>
        <span>${character.replace(/[&<>"']/g, '')}</span>
      </div>
      <a href="${oldHref}" role="menuitem">👤 Meu perfil</a>
      <button type="button" data-profile-menu-settings role="menuitem">⚙ Configurações</button>
      <a href="./passaporte.html" role="menuitem">♜ Passaporte</a>
      <div class="danger-separator">
        <a href="./index.html" role="menuitem">↩ Voltar ao site</a>
      </div>`;

    actions.appendChild(menu);

    const close = () => {
      menu.hidden = true;
      user.setAttribute('aria-expanded', 'false');
    };
    const toggle = (event) => {
      event.preventDefault();
      event.stopPropagation();
      menu.hidden = !menu.hidden;
      user.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
    };

    user.addEventListener('click', toggle);
    menu.querySelector('[data-profile-menu-settings]')?.addEventListener('click', () => {
      close();
      openSettings();
    });
    document.addEventListener('click', (event) => {
      if (!menu.hidden && !actions.contains(event.target)) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  };

  const clearLeftAchievements = () => {
    document.querySelectorAll('.community-me-card [data-community-achievements-preview], .community-me-card > .community-achievement-mini').forEach(el => el.remove());
  };

  const run = () => {
    clearLeftAchievements();
    ensureSearch();
    mount();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('cosplay:social-shell-ready', () => setTimeout(run, 50));
  window.addEventListener('load', () => setTimeout(run, 50), { once: true });
  setTimeout(run, 350);
  setTimeout(run, 900);
  setTimeout(run, 1800);
})();