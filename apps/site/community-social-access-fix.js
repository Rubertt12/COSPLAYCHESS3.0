(() => {
  'use strict';
  if (window.__COSPLAY_SOCIAL_ACCESS_FIX__) return;
  window.__COSPLAY_SOCIAL_ACCESS_FIX__ = true;

  const db = window.getCosplayChessParticipantDb
    ? window.getCosplayChessParticipantDb()
    : window.COSPLAYCHESS_PARTICIPANT_DB;

  const safeImage = (value) => {
    try {
      const u = new URL(String(value || ''), location.href);
      return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
    } catch (_) { return ''; }
  };
  const socialHref = (slug) => slug ? `./perfil-social.html?slug=${encodeURIComponent(slug)}` : '#';
  const publicHref = (slug) => slug ? `./jogador.html?slug=${encodeURIComponent(slug)}` : '#';

  let timer = null;
  let seq = 0;

  const dedupeSocialActions = (actions, slug) => {
    if (!actions || !slug) return;
    const targetHref = socialHref(slug);
    const candidates = Array.from(actions.querySelectorAll('a,button')).filter(el =>
      String(el.textContent || '').trim().toLowerCase() === 'ver comunidade'
    );

    let social = candidates[0] || actions.querySelector('.community-view-social-profile');
    if (!social) {
      social = document.createElement('a');
      social.className = 'btn dark community-view-social-profile';
      social.textContent = 'Ver comunidade';
      actions.prepend(social);
    }

    if (social.tagName !== 'A') {
      const replacement = document.createElement('a');
      replacement.className = social.className || 'btn dark community-view-social-profile';
      replacement.textContent = 'Ver comunidade';
      social.replaceWith(replacement);
      social = replacement;
    }

    social.classList.add('community-view-social-profile');
    social.href = targetHref;
    social.textContent = 'Ver comunidade';

    Array.from(actions.querySelectorAll('a,button')).forEach(el => {
      if (el === social) return;
      if (String(el.textContent || '').trim().toLowerCase() === 'ver comunidade') el.remove();
    });
  };

  const cardFor = (row) => {
    const card = document.createElement('article');
    card.className = 'community-person-card community-social-discovery-card';
    card.dataset.profileId = row.profile_id || '';

    const avatar = document.createElement('a');
    avatar.className = 'community-person-avatar';
    avatar.href = socialHref(row.public_slug);
    const image = safeImage(row.character_photo_url);
    if (image) {
      const img = document.createElement('img');
      img.src = image;
      img.alt = '';
      img.loading = 'lazy';
      avatar.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = '♜';
      avatar.appendChild(span);
    }

    const copy = document.createElement('a');
    copy.className = 'community-person-copy';
    copy.href = socialHref(row.public_slug);
    copy.style.textDecoration = 'none';
    copy.style.color = 'inherit';
    const name = document.createElement('b');
    name.textContent = row.display_name || row.nick || 'Participante';
    const meta = document.createElement('span');
    meta.textContent = row.character_name || 'Participante CosplayChess';
    copy.append(name, meta);

    const actions = document.createElement('div');
    actions.className = 'community-person-actions';

    const social = document.createElement('a');
    social.className = 'btn dark community-view-social-profile';
    social.href = socialHref(row.public_slug);
    social.textContent = 'Ver comunidade';
    actions.appendChild(social);

    if (row.public_profile_visible && row.public_slug) {
      const pub = document.createElement('a');
      pub.className = 'btn dark';
      pub.href = publicHref(row.public_slug);
      pub.textContent = 'Ver perfil cosplay';
      actions.appendChild(pub);
    }

    const relation = row.friendship_status || '';
    if (!relation) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'btn gold';
      add.textContent = 'Adicionar amigo';
      add.addEventListener('click', async () => {
        if (!row.profile_id) return;
        const requesterId = await getMyProfileId();
        if (!requesterId) {
          add.textContent = 'Sessão inválida';
          return;
        }
        add.disabled = true;
        const { error } = await db.from('cosplay_friendships').insert({
          requester_profile_id: requesterId,
          addressee_profile_id: row.profile_id,
          status: 'pending'
        });
        if (error) {
          add.disabled = false;
          add.textContent = error.code === '23505' ? 'Solicitação já existe' : 'Tentar novamente';
          return;
        }
        add.textContent = 'Solicitação enviada';
      });
      actions.appendChild(add);
    } else if (relation === 'accepted') {
      const friend = document.createElement('button');
      friend.type = 'button';
      friend.className = 'btn dark';
      friend.disabled = true;
      friend.textContent = '✓ Amigos';
      actions.appendChild(friend);
    } else if (relation === 'pending') {
      const pending = document.createElement('button');
      pending.type = 'button';
      pending.className = 'btn dark';
      pending.textContent = row.friendship_incoming ? 'Responder solicitação' : 'Solicitação enviada';
      pending.disabled = !row.friendship_incoming;
      if (row.friendship_incoming) pending.addEventListener('click', () => document.querySelector('[data-community-view="friends"]')?.click());
      actions.appendChild(pending);
    }

    card.append(avatar, copy, actions);
    return card;
  };

  let myProfileIdPromise = null;
  const getMyProfileId = () => {
    if (myProfileIdPromise) return myProfileIdPromise;
    myProfileIdPromise = (async () => {
      const { data: auth } = await db.auth.getSession();
      const uid = auth?.session?.user?.id;
      if (!uid) return null;
      const { data } = await db.from('cosplay_participant_profiles')
        .select('id')
        .eq('user_id', uid)
        .neq('registration_status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.id || null;
    })();
    return myProfileIdPromise;
  };

  const renderDiscover = async () => {
    const root = document.getElementById('communityPeople');
    const input = document.getElementById('communityPeopleSearch');
    if (!root || !db?.rpc) return;
    const current = ++seq;
    const term = String(input?.value || '').trim();
    const { data, error } = await db.rpc('cosplay_discover_participants', {
      p_search: term,
      p_page: 1,
      p_page_size: 10
    });
    if (current !== seq) return;
    if (error) {
      root.innerHTML = '<div class="community-empty">Não foi possível carregar os perfis sociais agora.</div>';
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    root.replaceChildren();
    if (!rows.length) {
      root.innerHTML = '<div class="community-empty">Nenhum perfil social encontrado.</div>';
      return;
    }
    rows.forEach(row => root.appendChild(cardFor(row)));
  };

  const bindDiscover = () => {
    const input = document.getElementById('communityPeopleSearch');
    const root = document.getElementById('communityPeople');
    if (!input || !root || input.dataset.socialAccessBound === '1') return;
    input.dataset.socialAccessBound = '1';
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(renderDiscover, 180);
    });
    document.addEventListener('click', (event) => {
      const open = event.target.closest('[data-community-view="discover"]');
      if (open) setTimeout(renderDiscover, 100);
    });
    setTimeout(renderDiscover, 250);
  };

  const fixExistingSocialLinks = (root = document) => {
    root.querySelectorAll('.community-person-card').forEach(card => {
      const anySlugLink = card.querySelector('a[href*="jogador.html?slug="], a[href*="perfil-social.html?slug="]');
      if (!anySlugLink) return;
      let slug = '';
      try { slug = new URL(anySlugLink.href, location.href).searchParams.get('slug') || ''; } catch (_) {}
      if (!slug) return;

      card.querySelectorAll('.community-person-avatar,.community-person-copy').forEach(link => {
        if (link.tagName === 'A') link.href = socialHref(slug);
      });

      dedupeSocialActions(card.querySelector('.community-person-actions'), slug);
    });
  };

  const fixAutocompleteLinks = () => {
    document.querySelectorAll('.premium-search-person[href*="jogador.html?slug="]').forEach(link => {
      try {
        const slug = new URL(link.href, location.href).searchParams.get('slug');
        if (slug) link.href = socialHref(slug);
      } catch (_) {}
    });
  };

  const run = () => {
    bindDiscover();
    fixExistingSocialLinks();
    fixAutocompleteLinks();
    const root = document.querySelector('.community-main') || document.body;
    const observer = new MutationObserver((mutations) => {
      if (!mutations.some(m => m.addedNodes?.length)) return;
      requestAnimationFrame(() => {
        fixExistingSocialLinks(root);
        fixAutocompleteLinks();
      });
    });
    observer.observe(root, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 30000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
