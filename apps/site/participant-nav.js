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

    const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
    if (!db?.auth?.getSession) return;

    const updateLabel = (session) => {
      const user = session?.user;
      const displayName = user?.user_metadata?.display_name || user?.user_metadata?.name || user?.user_metadata?.full_name || '';
      document.querySelectorAll('[data-participant-access] .participant-access-label').forEach(label => {
        label.textContent = user ? (displayName ? displayName.split(' ')[0] : 'Minha Área') : 'Área do Participante';
      });
      document.querySelectorAll('[data-participant-access]').forEach(link => {
        link.setAttribute('aria-label', user ? 'Abrir minha área de participante' : 'Entrar na Área do Participante');
      });
    };

    try {
      const { data } = await db.auth.getSession();
      updateLabel(data?.session || null);
      db.auth.onAuthStateChange((_event, session) => setTimeout(() => updateLabel(session), 0));
    } catch (_) {}
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true });
  else mount();
})();