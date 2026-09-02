(() => {
  'use strict';
  if (window.__CC_COMMUNITY_CORE_V10__) return;
  window.__CC_COMMUNITY_CORE_V10__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const BUCKET = 'cosplaychess-social-media';
  const $ = id => document.getElementById(id);
  const qa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const state = { user:null, profile:null, friendships:[], profiles:new Map(), busyFriends:false };

  const safeUrl = value => {
    try {
      const u = new URL(String(value || ''), location.href);
      return ['http:','https:'].includes(u.protocol) ? u.href : '';
    } catch { return ''; }
  };
  const displayName = profile => profile?.display_name || profile?.nick || 'Participante';
  const profileHref = profile => profile?.public_slug ? `./jogador.html?slug=${encodeURIComponent(profile.public_slug)}` : './participante.html';

  function setStatus(message = '', kind = '') {
    const el = $('communityPostStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `community-status${kind ? ` ${kind}` : ''}`;
    el.dataset.kind = kind;
  }

  function setAvatar(container, url, alt = '') {
    if (!container) return;
    container.replaceChildren();
    const src = safeUrl(url);
    if (src) {
      const img = new Image();
      img.src = src;
      img.alt = alt;
      img.decoding = 'async';
      img.loading = 'lazy';
      container.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = '♜';
      container.appendChild(span);
    }
  }

  function syncProfileShell(profile) {
    const name = displayName(profile);
    const character = profile.character_name || 'CosplayChess';
    if ($('communityMyName')) $('communityMyName').textContent = name;
    if ($('communityMyCharacter')) $('communityMyCharacter').textContent = character;
    if ($('communityMyProfileLink')) {
      $('communityMyProfileLink').href = profileHref(profile);
      $('communityMyProfileLink').textContent = profile.public_slug ? 'Ver perfil cosplay' : 'Editar meu perfil';
    }
    setAvatar($('communityMyAvatar'), profile.character_photo_url, `Foto de ${name}`);
    setAvatar($('communityComposerAvatar'), profile.character_photo_url, `Foto de ${name}`);
    qa('[data-cc-profile-name]').forEach(el => { el.textContent = name; });
    qa('[data-cc-profile-character]').forEach(el => { el.textContent = character; });
    qa('.cc-mirror-avatar').forEach(el => setAvatar(el, profile.character_photo_url, `Foto de ${name}`));
  }

  async function loadOwnedProfile() {
    const { data, error } = await db.from('cosplay_participant_profiles')
      .select('id,user_id,registration_id,public_slug,display_name,nick,character_name,character_photo_url,profile_visible')
      .eq('user_id', state.user.id)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending:false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum perfil participante está vinculado a esta conta.');
    state.profile = data;
    state.profiles.set(data.id, data);
    syncProfileShell(data);
    return data;
  }

  async function loadProfiles(ids) {
    const missing = [...new Set((ids || []).filter(Boolean))].filter(id => !state.profiles.has(id));
    if (!missing.length) return;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url,profile_visible')
      .in('id', missing);
    (data || []).forEach(profile => state.profiles.set(profile.id, profile));
  }

  function relationOtherId(row) {
    return row.requester_profile_id === state.profile.id ? row.addressee_profile_id : row.requester_profile_id;
  }

  function relationFor(profileId) {
    return state.friendships.find(row => relationOtherId(row) === profileId) || null;
  }

  function createPersonCard(profile, mode, relation) {
    const card = document.createElement('article');
    card.className = 'community-person-card';

    const avatar = document.createElement('a');
    avatar.className = 'community-person-avatar';
    avatar.href = profileHref(profile);
    setAvatar(avatar, profile.character_photo_url, `Foto de ${displayName(profile)}`);

    const copy = document.createElement('a');
    copy.className = 'community-person-copy';
    copy.href = profileHref(profile);
    copy.style.textDecoration = 'none';
    copy.style.color = 'inherit';
    const name = document.createElement('b');
    name.textContent = displayName(profile);
    const character = document.createElement('span');
    character.textContent = profile.character_name || 'Participante CosplayChess';
    copy.append(name, character);

    const actions = document.createElement('div');
    actions.className = 'community-person-actions';
    const view = document.createElement('a');
    view.className = 'btn dark';
    view.href = profileHref(profile);
    view.textContent = 'Ver perfil';
    actions.appendChild(view);

    if (mode === 'request') {
      const accept = document.createElement('button');
      accept.className = 'btn gold';
      accept.type = 'button';
      accept.textContent = 'Aceitar';
      accept.addEventListener('click', () => respondRequest(relation.id, 'accepted', accept));
      const decline = document.createElement('button');
      decline.className = 'btn dark';
      decline.type = 'button';
      decline.textContent = 'Recusar';
      decline.addEventListener('click', () => respondRequest(relation.id, 'declined', decline));
      actions.append(accept, decline);
    } else if (mode === 'friend') {
      const remove = document.createElement('button');
      remove.className = 'btn dark';
      remove.type = 'button';
      remove.textContent = 'Desfazer amizade';
      remove.addEventListener('click', () => removeFriend(relation.id, remove));
      actions.appendChild(remove);
    }

    card.append(avatar, copy, actions);
    return card;
  }

  function renderFriends() {
    const root = $('communityFriends');
    const count = $('communityFriendsCount');
    if (!root || !count) return;
    const accepted = state.friendships.filter(row => row.status === 'accepted');
    count.textContent = String(accepted.length);
    root.replaceChildren();
    if (!accepted.length) {
      root.innerHTML = '<div class="community-empty">Você ainda não adicionou amigos. Use a aba Explorar para encontrar participantes.</div>';
      return;
    }
    accepted.forEach(row => {
      const profile = state.profiles.get(relationOtherId(row));
      if (profile) root.appendChild(createPersonCard(profile, 'friend', row));
    });
  }

  function renderRequests() {
    const section = $('communityRequestsSection');
    const root = $('communityRequests');
    const count = $('communityRequestsCount');
    const badge = $('communityRequestBadge');
    if (!section || !root || !count || !badge) return;
    const incoming = state.friendships.filter(row => row.status === 'pending' && row.addressee_profile_id === state.profile.id);
    section.hidden = incoming.length === 0;
    count.textContent = String(incoming.length);
    badge.hidden = incoming.length === 0;
    badge.textContent = String(incoming.length);
    root.replaceChildren();
    incoming.forEach(row => {
      const profile = state.profiles.get(row.requester_profile_id);
      if (profile) root.appendChild(createPersonCard(profile, 'request', row));
    });
  }

  function renderTagOptions() {
    const select = $('communityPostTag');
    if (!select) return;
    select.replaceChildren(new Option('Ninguém', ''));
    state.friendships.filter(row => row.status === 'accepted').forEach(row => {
      const profile = state.profiles.get(relationOtherId(row));
      if (profile) select.appendChild(new Option(`${displayName(profile)} — ${profile.character_name || 'Cosplay'}`, profile.id));
    });
  }

  async function loadFriendships() {
    if (!state.profile || state.busyFriends) return;
    state.busyFriends = true;
    try {
      const id = state.profile.id;
      const { data, error } = await db.from('cosplay_friendships')
        .select('id,requester_profile_id,addressee_profile_id,status,created_at,updated_at')
        .or(`requester_profile_id.eq.${id},addressee_profile_id.eq.${id}`)
        .order('created_at', { ascending:false });
      if (error) throw error;
      state.friendships = data || [];
      await loadProfiles(state.friendships.map(relationOtherId));
      renderFriends();
      renderRequests();
      renderTagOptions();
    } finally {
      state.busyFriends = false;
    }
  }

  async function respondRequest(id, status, button) {
    button.disabled = true;
    const { error } = await db.from('cosplay_friendships').update({ status }).eq('id', id);
    if (error) { button.disabled = false; return; }
    await loadFriendships();
    document.dispatchEvent(new CustomEvent('cosplay:friendships-changed'));
  }

  async function removeFriend(id, button) {
    button.disabled = true;
    const { error } = await db.from('cosplay_friendships').delete().eq('id', id);
    if (error) { button.disabled = false; return; }
    await loadFriendships();
    document.dispatchEvent(new CustomEvent('cosplay:friendships-changed'));
  }

  async function uploadImage(file) {
    if (!file) return null;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use uma imagem JPG, PNG ou WebP.');
    if (file.size > 8 * 1024 * 1024) throw new Error('A foto pode ter no máximo 8 MB.');
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${state.user.id}/${state.profile.id}/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
    const { error } = await db.storage.from(BUCKET).upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type });
    if (error) throw error;
    return path;
  }

  function wireComposer() {
    const form = $('communityPostForm');
    const bodyEl = $('communityPostBody');
    const fileEl = $('communityPostImage');
    const preview = $('communityPostPreview');
    const submit = $('communityPostSubmit');
    if (!form || !bodyEl || !fileEl || !submit) return;

    form.addEventListener('submit', async event => {
      if (event.defaultPrevented) return;
      const richPanel = $('cc9RichPanel');
      if (richPanel && !richPanel.hidden) return;
      event.preventDefault();
      const body = String(bodyEl.value || '').trim();
      const file = fileEl.files?.[0] || null;
      if (!body && !file) return setStatus('Escreva algo ou escolha uma foto.', 'error');

      submit.disabled = true;
      setStatus('Publicando...');
      let imagePath = null;
      try {
        imagePath = await uploadImage(file);
        const { data: created, error } = await db.from('cosplay_social_posts').insert({
          author_profile_id: state.profile.id,
          body: body || null,
          image_path: imagePath,
          visibility: $('communityPostVisibility')?.value === 'public' ? 'public' : 'friends'
        }).select('id').single();
        if (error) throw error;

        const taggedId = String($('communityPostTag')?.value || '').trim();
        if (taggedId) await db.from('cosplay_social_post_tags').insert({ post_id:created.id, profile_id:taggedId });

        form.reset();
        if (preview) { preview.hidden = true; preview.replaceChildren(); }
        setStatus('Publicado com sucesso.', 'success');
        $('communityRefreshFeed')?.click();
        window.dispatchEvent(new CustomEvent('cosplay:social-post-published', { detail:{ postId:created.id } }));
      } catch (error) {
        if (imagePath) await db.storage.from(BUCKET).remove([imagePath]).catch(() => {});
        setStatus(String(error?.message || 'Não foi possível publicar.'), 'error');
      } finally {
        submit.disabled = false;
      }
    });

    fileEl.addEventListener('change', () => {
      if (!preview) return;
      preview.replaceChildren();
      const file = fileEl.files?.[0];
      if (!file) { preview.hidden = true; return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      img.alt = 'Prévia da publicação';
      img.onload = () => URL.revokeObjectURL(url);
      preview.appendChild(img);
      preview.hidden = false;
    });
  }

  function wireFriendRefresh() {
    document.addEventListener('click', event => {
      if (event.target.closest('[data-community-view="friends"]')) setTimeout(() => loadFriendships().catch(() => {}), 40);
    }, true);
    document.addEventListener('cosplay:follow-changed', () => {});
  }

  async function init() {
    const authBlock = $('communityAuthBlock');
    if (!db) { if (authBlock) authBlock.hidden = false; return; }
    const { data } = await db.auth.getSession();
    state.user = data?.session?.user || null;
    if (!state.user) { if (authBlock) authBlock.hidden = false; return; }
    try {
      await loadOwnedProfile();
      wireComposer();
      wireFriendRefresh();
      await loadFriendships();
    } catch (error) {
      console.error('[CosplayChess core] init failed', error);
      if (authBlock) {
        authBlock.hidden = false;
        const p = authBlock.querySelector('p');
        if (p) p.textContent = String(error?.message || 'Não foi possível abrir sua comunidade agora.');
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
