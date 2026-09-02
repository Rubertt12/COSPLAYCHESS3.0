(() => {
  'use strict';
  if (window.__CC_COSPLAY_PROFILE_ONLY__) return;
  window.__CC_COSPLAY_PROFILE_ONLY__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const $ = (id) => document.getElementById(id);

  // Compatibilidade para a rede social: quando uma conta possui várias inscrições,
  // consultas do próprio usuário devem continuar usando o primeiro perfil criado
  // como identidade social principal. As inscrições seguintes permanecem apenas
  // como participações/eventos vinculados.
  const installPrimaryProfileGuard = (client) => {
    if (!client || client.__ccSocialPrimaryProfileGuard) return;
    const originalFrom = client.from.bind(client);
    const wrappedFilters = new WeakSet();

    const wrapFilter = (filter, initialUserScoped = false) => {
      if (!filter || typeof filter !== 'object' || wrappedFilters.has(filter)) return filter;
      wrappedFilters.add(filter);
      let userScoped = initialUserScoped;

      if (typeof filter.eq === 'function') {
        const originalEq = filter.eq.bind(filter);
        filter.eq = (column, value) => {
          if (column === 'user_id') userScoped = true;
          const result = originalEq(column, value);
          return result === filter ? filter : wrapFilter(result, userScoped);
        };
      }

      if (typeof filter.order === 'function') {
        const originalOrder = filter.order.bind(filter);
        filter.order = (column, options) => {
          if (userScoped && column === 'created_at' && options?.ascending === false) {
            return originalOrder(column, { ...options, ascending:true });
          }
          return originalOrder(column, options);
        };
      }
      return filter;
    };

    client.from = (table) => {
      const query = originalFrom(table);
      if (table !== 'cosplay_participant_profiles' || !query || typeof query.select !== 'function') return query;
      const originalSelect = query.select.bind(query);
      query.select = (...args) => wrapFilter(originalSelect(...args));
      return query;
    };

    try {
      Object.defineProperty(client, '__ccSocialPrimaryProfileGuard', { value:true, configurable:false });
    } catch {
      client.__ccSocialPrimaryProfileGuard = true;
    }
  };

  installPrimaryProfileGuard(db);

  const cosplayHrefFrom = (href) => {
    try {
      const url = new URL(href, location.href);
      if (!url.pathname.endsWith('/perfil-social.html')) return null;
      const slug = String(url.searchParams.get('slug') || '').trim();
      return slug ? `./jogador.html?slug=${encodeURIComponent(slug)}` : './participante.html';
    } catch (_) {
      return null;
    }
  };

  const normalizeProfileLinks = (root = document) => {
    root.querySelectorAll('a[href*="perfil-social.html"]').forEach((link) => {
      const target = cosplayHrefFrom(link.getAttribute('href') || link.href);
      if (target) link.href = target;
    });
  };

  const setOwnCosplayProfile = async () => {
    if (!db) return;
    const { data: auth } = await db.auth.getSession();
    const userId = auth?.session?.user?.id;
    if (!userId) return;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('public_slug,profile_visible')
      .eq('user_id', userId)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:true})
      .limit(1)
      .maybeSingle();
    const link = $('communityMyProfileLink');
    if (!link) return;
    if (data?.public_slug) {
      link.href = `./jogador.html?slug=${encodeURIComponent(data.public_slug)}`;
      link.textContent = 'Ver perfil cosplay';
      link.title = data.profile_visible === false
        ? 'Seu perfil cosplay está oculto para o público nas configurações do participante.'
        : 'Abrir seu perfil cosplay';
    } else {
      link.href = './participante.html';
      link.textContent = 'Configurar perfil cosplay';
    }
  };

  const adjustSettingsCopy = () => {
    const panel = document.querySelector('[data-community-panel="social-settings"]');
    if (!panel || panel.hidden) return;

    panel.querySelectorAll('.cc-settings-field').forEach((field) => {
      const title = field.querySelector(':scope > span');
      const small = field.querySelector(':scope > small');
      if (title?.textContent.trim() === 'Recado do perfil') {
        title.textContent = 'Recado na rede';
        if (small) small.textContent = 'Uma frase curta exibida junto às suas interações na rede.';
      }
    });

    panel.querySelectorAll('.cc-settings-toggle').forEach((row) => {
      const title = row.querySelector('b');
      const small = row.querySelector('small');
      if (title?.textContent.trim() === 'Perfil social visível') {
        title.textContent = 'Aparecer na rede';
        if (small) small.textContent = 'Permitir que outros participantes encontrem você na rede social.';
      }
    });

    panel.querySelectorAll('.cc-settings-summary > div').forEach((row) => {
      const label = row.querySelector('span');
      if (label?.textContent.trim() === 'Perfil social') label.textContent = 'Presença na rede';
    });

    panel.querySelectorAll('.cc-settings-side p').forEach((paragraph) => {
      if (paragraph.textContent.includes('perfil público de cosplay continua separado')) {
        paragraph.textContent = 'A rede usa o mesmo perfil cosplay do participante. Não existe mais um perfil social separado.';
      }
    });

    const headCopy = panel.querySelector('.cc-runtime-head p');
    if (headCopy?.textContent.includes('sua rede')) headCopy.textContent = 'Privacidade, mensagens e aparência da sua experiência na rede.';
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="perfil-social.html"]');
    if (link) {
      const target = cosplayHrefFrom(link.getAttribute('href') || link.href);
      if (target) {
        event.preventDefault();
        location.href = target;
        return;
      }
    }

    const settings = event.target.closest('[data-community-view="social-settings"]');
    if (settings) {
      setTimeout(adjustSettingsCopy, 180);
      setTimeout(adjustSettingsCopy, 500);
    }

    setTimeout(() => normalizeProfileLinks(), 60);
  }, true);

  const init = () => {
    normalizeProfileLinks();
    setOwnCosplayProfile().catch(() => {});
    setTimeout(normalizeProfileLinks, 500);
    setTimeout(normalizeProfileLinks, 1400);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();