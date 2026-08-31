(() => {
  'use strict';
  if (window.__CC_EXPLORE_FOLLOW_V10__) return;
  window.__CC_EXPLORE_FOLLOW_V10__ = true;

  // Carrega o complemento de acesso direto às comunidades sem depender de outro ponto da navbar.
  if (!document.querySelector('link[data-cc-community-access-v2]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './community-groups-access-v2.css?v=20260831-1';
    link.dataset.ccCommunityAccessV2 = '1';
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[data-cc-community-access-v2]')) {
    const script = document.createElement('script');
    script.src = './community-groups-access-v2.js?v=20260831-1';
    script.defer = true;
    script.dataset.ccCommunityAccessV2 = '1';
    document.head.appendChild(script);
  }

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = (v) => { try { const u = new URL(String(v || ''), location.href); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const profileHref = (p) => p?.public_slug ? `./jogador.html?slug=${encodeURIComponent(p.public_slug)}` : '#';
  const displayName = (p) => p?.display_name || p?.nick || 'Participante';
  let me = null;
  let seq = 0;
  let inputTimer = 0;

  function toast(message, error = false) {
    let el = $('ccExploreFollowToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ccExploreFollowToast';
      el.style.cssText = 'position:fixed;z-index:99999;left:50%;bottom:92px;transform:translateX(-50%);max-width:calc(100vw - 28px);padding:10px 14px;border:1px solid rgba(175,118,235,.35);border-radius:10px;background:rgba(8,10,17,.96);color:#f2edf7;font:700 11px Inter,system-ui;box-shadow:0 14px 36px rgba(0,0,0,.42)';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.borderColor = error ? 'rgba(239,99,113,.5)' : 'rgba(175,118,235,.35)';
    el.hidden = false;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.hidden = true; }, 2200);
  }

  async function getMe() {
    if (me) return me;
    const { data: sessionData } = await db.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id')
      .eq('user_id', user.id)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    me = data || null;
    return me;
  }

  function syncTargetButtons(targetId, following) {
    document.querySelectorAll(`[data-explore-follow="${CSS.escape(targetId)}"],[data-profile="${CSS.escape(targetId)}"] [data-follow]`).forEach(btn => {
      btn.classList.toggle('active', following);
      btn.setAttribute('aria-pressed', following ? 'true' : 'false');
      btn.textContent = following ? '✓ Seguindo' : '＋ Seguir';
    });
  }

  async function setFollow(targetId, desired, button) {
    if (!targetId || !button) return;
    button.disabled = true;
    const previous = button.textContent;
    button.textContent = desired ? 'Seguindo…' : 'Deixando de seguir…';
    let result = await db.rpc('cosplay_social_set_follow', { p_target: targetId, p_follow: desired });
    if (result.error) {
      result = await db.rpc('cosplay_social_toggle_follow', { p_target: targetId });
    }
    button.disabled = false;
    if (result.error) {
      button.textContent = previous;
      toast('Não foi possível atualizar o seguimento agora.', true);
      return;
    }
    const following = typeof result.data === 'boolean' ? result.data : desired;
    syncTargetButtons(targetId, following);
    toast(following ? 'Agora você está seguindo este cosplayer.' : 'Você deixou de seguir este cosplayer.');
    document.dispatchEvent(new CustomEvent('cosplay:follow-changed', { detail: { targetId, following } }));
  }

  async function sendFriendRequest(person, button) {
    const mine = await getMe();
    if (!mine) return;
    if (person.friendship_incoming && person.friendship_id) {
      document.querySelector('[data-community-view="friends"]')?.click();
      return;
    }
    button.disabled = true;
    const { error } = await db.from('cosplay_friendships').insert({
      requester_profile_id: mine.id,
      addressee_profile_id: person.id,
      status: 'pending'
    });
    if (error) {
      button.disabled = false;
      if (error.code === '23505') button.textContent = 'Convite já enviado';
      else toast('Não foi possível enviar o convite de amizade.', true);
      return;
    }
    button.textContent = 'Convite enviado';
  }

  async function renderExplore() {
    const root = $('communityPeople');
    const input = $('communityPeopleSearch');
    const panel = document.querySelector('[data-community-panel="discover"]');
    if (!root || !panel || panel.hidden) return;

    const mine = await getMe();
    if (!mine) return;
    const current = ++seq;
    root.className = 'cc9-explore-grid';
    root.innerHTML = '<div class="cc9-empty">Carregando participantes...</div>';

    const term = String(input?.value || '').trim();
    const { data, error } = await db.rpc('cosplay_discover_participants', { p_search: term, p_page: 1, p_page_size: 100 });
    if (current !== seq) return;
    if (error) {
      root.innerHTML = '<div class="cc9-empty">Não foi possível carregar participantes.</div>';
      return;
    }

    const people = (data || []).filter(x => x.profile_id && x.profile_id !== mine.id).map(x => ({
      id: x.profile_id,
      public_slug: x.public_slug,
      display_name: x.display_name,
      nick: x.nick,
      character_name: x.character_name,
      character_photo_url: x.character_photo_url,
      friendship_id: x.friendship_id,
      friendship_status: x.friendship_status,
      friendship_incoming: x.friendship_incoming
    }));

    const ids = people.map(p => p.id);
    const { data: followRows, error: followError } = ids.length
      ? await db.from('cosplay_profile_follows').select('followed_profile_id').eq('follower_profile_id', mine.id).in('followed_profile_id', ids)
      : { data: [], error: null };
    if (current !== seq) return;
    const followed = new Set((followRows || []).map(x => x.followed_profile_id));

    root.innerHTML = people.map(p => {
      const img = safeUrl(p.character_photo_url);
      const following = followed.has(p.id);
      let friendText = 'Adicionar amigo';
      let friendDisabled = '';
      if (p.friendship_status === 'accepted') {
        friendText = '✓ Amigos';
        friendDisabled = ' disabled';
      } else if (p.friendship_status === 'pending') {
        friendText = p.friendship_incoming ? 'Responder convite' : 'Convite enviado';
        if (!p.friendship_incoming) friendDisabled = ' disabled';
      }
      return `<article class="cc9-person" data-profile="${esc(p.id)}">
        <a class="cc9-person-avatar" href="${esc(profileHref(p))}">${img ? `<img src="${esc(img)}" alt="">` : '♜'}</a>
        <div class="cc9-person-copy"><a href="${esc(profileHref(p))}">${esc(displayName(p))}</a><span>${esc(p.character_name || 'CosplayChess')}</span></div>
        <div class="cc9-person-actions">
          <button type="button" class="primary${following ? ' active' : ''}" data-explore-follow="${esc(p.id)}" aria-pressed="${following ? 'true' : 'false'}">${following ? '✓ Seguindo' : '＋ Seguir'}</button>
          <button type="button" data-explore-friend="${esc(p.id)}"${friendDisabled}>${friendText}</button>
          <a href="${esc(profileHref(p))}">Ver perfil</a>
        </div>
      </article>`;
    }).join('') || '<div class="cc9-empty">Nenhum participante encontrado.</div>';

    if (followError) toast('A lista abriu, mas não consegui verificar todos os perfis seguidos.', true);

    root.querySelectorAll('[data-explore-follow]').forEach(button => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.exploreFollow;
        const desired = button.getAttribute('aria-pressed') !== 'true';
        setFollow(targetId, desired, button);
      });
    });

    root.querySelectorAll('[data-explore-friend]').forEach(button => {
      const person = people.find(p => p.id === button.dataset.exploreFriend);
      if (person) button.addEventListener('click', () => sendFriendRequest(person, button));
    });
  }

  function scheduleRender(delay = 40) {
    setTimeout(() => renderExplore().catch(() => {}), delay);
  }

  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-community-view="discover"]');
    if (!trigger) return;
    scheduleRender(30);
    scheduleRender(420);
  }, true);

  const input = $('communityPeopleSearch');
  if (input) {
    input.addEventListener('input', e => {
      e.stopImmediatePropagation();
      clearTimeout(inputTimer);
      inputTimer = setTimeout(() => renderExplore().catch(() => {}), 180);
    }, true);
  }

  document.addEventListener('cosplay:follow-changed', e => {
    const d = e.detail || {};
    if (d.targetId) syncTargetButtons(d.targetId, !!d.following);
  });

  if (!document.querySelector('[data-community-panel="discover"]')?.hidden) scheduleRender(250);
})();
