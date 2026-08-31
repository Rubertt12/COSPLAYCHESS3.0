(() => {
  'use strict';
  if (window.__CC_COMMUNITY_GROUP_ACCESS_V2__) return;
  window.__CC_COMMUNITY_GROUP_ACCESS_V2__ = true;

  const root = document.getElementById('communityGroups');
  if (!root) return;

  let groups = [];
  let profileId = null;

  const normalize = (value) => String(value || '').trim().toLocaleLowerCase('pt-BR');
  const hrefFor = (group) => group?.slug ? `./comunidade-grupo.html?slug=${encodeURIComponent(group.slug)}` : '';

  function resolveGroup(card, index) {
    const title = card.querySelector('.community-group-topline b')?.textContent || '';
    const byTitle = groups.find(group => normalize(group.name) === normalize(title));
    return byTitle || groups[index] || null;
  }

  function openGroup(group) {
    const href = hrefFor(group);
    if (href) location.href = href;
  }

  function patchCards() {
    const cards = [...root.querySelectorAll('.community-group-card')];
    cards.forEach((card, index) => {
      if (card.dataset.ccGroupAccessReady === '1') return;
      const group = resolveGroup(card, index);
      if (!group?.slug) return;

      const href = hrefFor(group);
      card.dataset.ccGroupAccessReady = '1';
      card.dataset.communitySlug = group.slug;
      card.tabIndex = 0;
      card.setAttribute('role', 'link');
      card.setAttribute('aria-label', `Abrir comunidade ${group.name || ''}`.trim());

      const title = card.querySelector('.community-group-topline b');
      if (title && !title.closest('a')) {
        const link = document.createElement('a');
        link.className = 'community-group-title-link';
        link.href = href;
        link.textContent = title.textContent;
        title.replaceWith(link);
      }

      const avatar = card.querySelector('.community-group-avatar');
      if (avatar && !avatar.closest('a')) {
        const avatarLink = document.createElement('a');
        avatarLink.className = 'community-group-avatar-link';
        avatarLink.href = href;
        avatar.parentNode.insertBefore(avatarLink, avatar);
        avatarLink.appendChild(avatar);
      }

      const meta = card.querySelector('.community-group-meta');
      if (meta && !meta.querySelector('.community-group-open')) {
        const open = document.createElement('a');
        open.className = 'community-group-open';
        open.href = href;
        open.textContent = group.owner_profile_id === profileId ? 'Gerenciar comunidade' : 'Abrir comunidade';
        meta.appendChild(open);
      }

      const oldAction = card.querySelector('.community-group-action');
      if (oldAction && group.owner_profile_id === profileId) {
        oldAction.disabled = false;
        oldAction.textContent = 'Gerenciar';
        oldAction.classList.add('owner-open');
        oldAction.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          openGroup(group);
        }, { capture: true });
      }

      card.addEventListener('click', (event) => {
        if (event.target.closest('a,button,input,select,textarea,label')) return;
        openGroup(group);
      });
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (event.target.closest('a,button,input,select,textarea')) return;
        event.preventDefault();
        openGroup(group);
      });
    });
  }

  window.addEventListener('cosplay:communities-loaded', (event) => {
    groups = Array.isArray(event.detail?.groups) ? event.detail.groups : [];
    profileId = event.detail?.profileId || null;
    requestAnimationFrame(patchCards);
  });

  // Também cobre re-renderizações por filtro/pesquisa sem usar observer permanente.
  root.addEventListener('click', () => requestAnimationFrame(patchCards), { capture: true });
  document.querySelectorAll('[data-community-view="communities"]').forEach((button) => {
    button.addEventListener('click', () => setTimeout(patchCards, 120));
  });
  document.getElementById('communityGroupSearch')?.addEventListener('input', () => setTimeout(patchCards, 0));
  document.getElementById('communityGroupFilter')?.addEventListener('change', () => setTimeout(patchCards, 0));
})();
