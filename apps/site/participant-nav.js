(() => {
  const mount = async () => {
    const page = location.pathname.split('/').pop() || 'index.html';
    if (['admin.html','cms.html','participante.html'].includes(page)) return;

    const href = './participante.html';
    const desktopActions = document.querySelector('.top-actions');
    if (desktopActions && !desktopActions.querySelector('[data-participant-access]')) {
      const link = document.createElement('a');
      link.className = 'btn participant-access-btn';
      link.href = href;
      link.dataset.participantAccess = 'true';
      link.innerHTML = '<span class="participant-access-icon" aria-hidden="true">👤</span><span class="participant-access-label">Área do Participante</span>';
      desktopActions.insertBefore(link, desktopActions.firstChild || null);
    }

    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu && !mobileMenu.querySelector('[data-participant-access]')) {
      const link = document.createElement('a');
      link.className = 'mobile-participant-access';
      link.href = href;
      link.dataset.participantAccess = 'true';
      link.innerHTML = '<span class="participant-access-icon" aria-hidden="true">👤</span><span class="participant-access-label">Área do Participante</span>';
      const divider = mobileMenu.querySelector('.mobile-menu-divider');
      mobileMenu.insertBefore(link, divider || mobileMenu.lastElementChild || null);
    }

    const db = window.getCosplayChessDb ? window.getCosplayChessDb() : window.COSPLAYCHESS_DB;
    if (!db?.auth?.getSession) return;
    try {
      const { data } = await db.auth.getSession();
      const user = data?.session?.user;
      if (!user) return;
      const displayName = user.user_metadata?.display_name || user.user_metadata?.name || user.user_metadata?.full_name || '';
      document.querySelectorAll('[data-participant-access] .participant-access-label').forEach(label => {
        label.textContent = displayName ? displayName.split(' ')[0] : 'Minha Área';
      });
      document.querySelectorAll('[data-participant-access]').forEach(link => link.setAttribute('aria-label', 'Abrir minha área de participante'));
    } catch (_) {}
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true });
  else mount();
})();