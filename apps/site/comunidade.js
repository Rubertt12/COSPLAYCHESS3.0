(() => {
  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const $ = (id) => document.getElementById(id);
  const BUCKET = 'cosplaychess-social-media';
  const state = {
    session: null,
    user: null,
    profile: null,
    friendships: [],
    friends: [],
    people: [],
    posts: [],
    imageUrls: new Map(),
    profilesById: new Map(),
    likesByPost: new Map(),
  };

  const authBlock = $('communityAuthBlock');
  const myAvatar = $('communityMyAvatar');
  const composerAvatar = $('communityComposerAvatar');
  const myName = $('communityMyName');
  const myCharacter = $('communityMyCharacter');
  const myProfileLink = $('communityMyProfileLink');
  const friendCount = $('communityFriendCount');
  const postCount = $('communityPostCount');
  const photoCount = $('communityPhotoCount');
  const requestBadge = $('communityRequestBadge');
  const requestsSection = $('communityRequestsSection');
  const requestsCount = $('communityRequestsCount');
  const requestsEl = $('communityRequests');
  const friendsCount = $('communityFriendsCount');
  const friendsEl = $('communityFriends');
  const peopleEl = $('communityPeople');
  const peopleSearch = $('communityPeopleSearch');
  const feedEl = $('communityFeed');
  const photosEl = $('communityPhotos');
  const postForm = $('communityPostForm');
  const postBody = $('communityPostBody');
  const postImage = $('communityPostImage');
  const postPreview = $('communityPostPreview');
  const postTag = $('communityPostTag');
  const postVisibility = $('communityPostVisibility');
  const postSubmit = $('communityPostSubmit');
  const postStatus = $('communityPostStatus');

  const setStatus = (message = '', kind = '') => {
    if (!postStatus) return;
    postStatus.textContent = message;
    postStatus.className = `community-status${kind ? ` ${kind}` : ''}`;
  };

  const safeImage = (url) => {
    if (!url) return null;
    try {
      const parsed = new URL(String(url));
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
    } catch { return null; }
  };

  const setAvatar = (container, url, alt = '') => {
    if (!container) return;
    container.replaceChildren();
    const safe = safeImage(url);
    if (safe) {
      const img = document.createElement('img');
      img.src = safe;
      img.alt = alt;
      img.loading = 'lazy';
      container.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = '♜';
      container.appendChild(span);
    }
  };

  const displayName = (profile) => profile?.display_name || profile?.nick || 'Participante';
  const fmtDate = (value) => {
    try { return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(value)); }
    catch { return ''; }
  };

  const profileHref = (profile) => profile?.public_slug ? `./jogador.html?slug=${encodeURIComponent(profile.public_slug)}` : '#';

  const getSignedImage = async (path) => {
    if (!path) return null;
    if (state.imageUrls.has(path)) return state.imageUrls.get(path);
    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
    const url = error ? null : data?.signedUrl || null;
    state.imageUrls.set(path, url);
    return url;
  };

  const loadOwnedProfile = async () => {
    const { data, error } = await db
      .from('cosplay_participant_profiles')
      .select('id,user_id,registration_id,public_slug,display_name,nick,character_name,character_photo_url,bio,profile_visible')
      .eq('user_id', state.user.id)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending:false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum perfil participante está vinculado a esta conta.');
    state.profile = data;
    state.profilesById.set(data.id, data);
    if (myName) myName.textContent = displayName(data);
    if (myCharacter) myCharacter.textContent = data.character_name || 'CosplayChess';
    if (myProfileLink) {
      myProfileLink.href = data.public_slug ? profileHref(data) : './participante.html';
      myProfileLink.textContent = data.public_slug ? 'Ver meu perfil' : 'Editar meu perfil';
    }
    setAvatar(myAvatar, data.character_photo_url, `Foto de ${displayName(data)}`);
    setAvatar(composerAvatar, data.character_photo_url, `Foto de ${displayName(data)}`);
  };

  const loadProfiles = async (ids) => {
    const missing = [...new Set((ids || []).filter(Boolean))].filter(id => !state.profilesById.has(id));
    if (!missing.length) return;
    const { data } = await db
      .from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url,profile_visible,user_id')
      .in('id', missing);
    (data || []).forEach(profile => state.profilesById.set(profile.id, profile));
  };

  const loadFriendships = async () => {
    const { data, error } = await db
      .from('cosplay_friendships')
      .select('id,requester_profile_id,addressee_profile_id,status,created_at,updated_at')
      .order('created_at', { ascending:false });
    if (error) throw error;
    state.friendships = data || [];
    const otherIds = state.friendships.map(row => row.requester_profile_id === state.profile.id ? row.addressee_profile_id : row.requester_profile_id);
    await loadProfiles(otherIds);
    state.friends = state.friendships
      .filter(row => row.status === 'accepted')
      .map(row => state.profilesById.get(row.requester_profile_id === state.profile.id ? row.addressee_profile_id : row.requester_profile_id))
      .filter(Boolean);
    renderFriends();
    renderRequests();
    renderTagOptions();
    if (friendCount) friendCount.textContent = String(state.friends.length);
  };

  const relationFor = (profileId) => state.friendships.find(row =>
    (row.requester_profile_id === state.profile.id && row.addressee_profile_id === profileId)
    || (row.addressee_profile_id === state.profile.id && row.requester_profile_id === profileId)
  );

  const personCard = (profile, mode = 'discover', relation = null) => {
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
    card.append(avatar, copy);

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
    } else {
      const button = document.createElement('button');
      button.className = relation?.status === 'accepted' ? 'btn dark' : 'btn gold';
      button.type = 'button';
      if (!relation) {
        button.textContent = 'Adicionar amigo';
        button.addEventListener('click', () => sendFriendRequest(profile.id, button));
      } else if (relation.status === 'accepted') {
        button.textContent = '✓ Amigos';
        button.disabled = true;
      } else if (relation.status === 'pending') {
        const incoming = relation.addressee_profile_id === state.profile.id;
        button.textContent = incoming ? 'Responder solicitação' : 'Solicitação enviada';
        if (incoming) button.addEventListener('click', () => switchView('friends'));
        else button.disabled = true;
      } else {
        button.textContent = 'Adicionar amigo';
        button.addEventListener('click', () => sendFriendRequest(profile.id, button));
      }
      actions.appendChild(button);
    }
    card.appendChild(actions);
    return card;
  };

  const renderFriends = () => {
    if (!friendsEl || !friendsCount) return;
    friendsEl.replaceChildren();
    const acceptedRows = state.friendships.filter(row => row.status === 'accepted');
    friendsCount.textContent = String(acceptedRows.length);
    if (!acceptedRows.length) {
      friendsEl.innerHTML = '<div class="community-empty">Você ainda não adicionou amigos. Encontre outros participantes na aba “Encontrar pessoas”.</div>';
      return;
    }
    acceptedRows.forEach(row => {
      const otherId = row.requester_profile_id === state.profile.id ? row.addressee_profile_id : row.requester_profile_id;
      const profile = state.profilesById.get(otherId);
      if (profile) friendsEl.appendChild(personCard(profile, 'friend', row));
    });
  };

  const renderRequests = () => {
    if (!requestsEl || !requestsSection || !requestsCount || !requestBadge) return;
    const incoming = state.friendships.filter(row => row.status === 'pending' && row.addressee_profile_id === state.profile.id);
    requestsEl.replaceChildren();
    requestsSection.hidden = incoming.length === 0;
    requestsCount.textContent = String(incoming.length);
    requestBadge.hidden = incoming.length === 0;
    requestBadge.textContent = String(incoming.length);
    incoming.forEach(row => {
      const profile = state.profilesById.get(row.requester_profile_id);
      if (profile) requestsEl.appendChild(personCard(profile, 'request', row));
    });
  };

  const renderTagOptions = () => {
    if (!postTag) return;
    postTag.replaceChildren(new Option('Nenhum', ''));
    state.friends.forEach(profile => postTag.appendChild(new Option(`${displayName(profile)} — ${profile.character_name || 'Cosplay'}`, profile.id)));
  };

  const loadPeople = async () => {
    const { data, error } = await db
      .from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url,profile_visible,user_id')
      .eq('profile_visible', true)
      .not('user_id', 'is', null)
      .neq('id', state.profile.id)
      .neq('registration_status', 'cancelled')
      .order('display_name', { ascending:true })
      .limit(100);
    if (error) throw error;
    state.people = data || [];
    state.people.forEach(profile => state.profilesById.set(profile.id, profile));
    renderPeople();
  };

  const renderPeople = () => {
    if (!peopleEl) return;
    const term = String(peopleSearch?.value || '').trim().toLowerCase();
    const rows = state.people.filter(profile => {
      const haystack = `${profile.display_name || ''} ${profile.nick || ''} ${profile.character_name || ''}`.toLowerCase();
      return !term || haystack.includes(term);
    });
    peopleEl.replaceChildren();
    if (!rows.length) {
      peopleEl.innerHTML = '<div class="community-empty">Nenhum participante encontrado.</div>';
      return;
    }
    rows.forEach(profile => peopleEl.appendChild(personCard(profile, 'discover', relationFor(profile.id))));
  };

  const sendFriendRequest = async (targetId, button) => {
    button.disabled = true;
    const { error } = await db.from('cosplay_friendships').insert({ requester_profile_id:state.profile.id, addressee_profile_id:targetId, status:'pending' });
    if (error) {
      button.disabled = false;
      button.textContent = error.code === '23505' ? 'Solicitação já existe' : 'Tentar novamente';
      return;
    }
    button.textContent = 'Solicitação enviada';
    await loadFriendships();
    renderPeople();
  };

  const respondRequest = async (id, status, button) => {
    button.disabled = true;
    const { error } = await db.from('cosplay_friendships').update({ status }).eq('id', id);
    if (error) { button.disabled = false; return; }
    await loadFriendships();
    renderPeople();
    await loadFeed();
  };

  const removeFriend = async (id, button) => {
    button.disabled = true;
    const { error } = await db.from('cosplay_friendships').delete().eq('id', id);
    if (error) { button.disabled = false; return; }
    await loadFriendships();
    renderPeople();
    await loadFeed();
  };

  const loadPostProfilesAndMeta = async (posts) => {
    const ids = posts.map(post => post.author_profile_id);
    await loadProfiles(ids);
    const postIds = posts.map(post => post.id);
    state.likesByPost.clear();
    if (!postIds.length) return new Map();
    const [{ data: tags }, { data: likes }] = await Promise.all([
      db.from('cosplay_social_post_tags').select('post_id,profile_id').in('post_id', postIds),
      db.from('cosplay_social_post_likes').select('post_id,profile_id').in('post_id', postIds),
    ]);
    const tagIds = (tags || []).map(row => row.profile_id);
    await loadProfiles(tagIds);
    const tagsByPost = new Map();
    (tags || []).forEach(row => {
      if (!tagsByPost.has(row.post_id)) tagsByPost.set(row.post_id, []);
      const profile = state.profilesById.get(row.profile_id);
      if (profile) tagsByPost.get(row.post_id).push(profile);
    });
    (likes || []).forEach(row => {
      if (!state.likesByPost.has(row.post_id)) state.likesByPost.set(row.post_id, []);
      state.likesByPost.get(row.post_id).push(row.profile_id);
    });
    return tagsByPost;
  };

  const loadFeed = async () => {
    if (!feedEl) return;
    feedEl.innerHTML = '<div class="community-empty">Carregando mural...</div>';
    const { data, error } = await db
      .from('cosplay_social_posts')
      .select('id,author_profile_id,body,image_path,visibility,created_at,updated_at')
      .order('created_at', { ascending:false })
      .limit(60);
    if (error) {
      feedEl.innerHTML = '<div class="community-empty">Não foi possível carregar o mural agora.</div>';
      return;
    }
    state.posts = data || [];
    const tagsByPost = await loadPostProfilesAndMeta(state.posts);
    await renderFeed(tagsByPost);
    const ownPosts = state.posts.filter(post => post.author_profile_id === state.profile.id);
    if (postCount) postCount.textContent = String(ownPosts.length);
    if (photoCount) photoCount.textContent = String(ownPosts.filter(post => post.image_path).length);
  };

  const renderFeed = async (tagsByPost = new Map()) => {
    feedEl.replaceChildren();
    if (!state.posts.length) {
      feedEl.innerHTML = '<div class="community-empty">O mural ainda está vazio. Publique o primeiro momento da comunidade. ✦</div>';
      return;
    }
    for (const post of state.posts) {
      const author = state.profilesById.get(post.author_profile_id) || { display_name:'Participante' };
      const article = document.createElement('article');
      article.className = 'community-post';

      const head = document.createElement('div');
      head.className = 'community-post-head';
      const avatar = document.createElement('a');
      avatar.className = 'community-person-avatar';
      avatar.href = profileHref(author);
      setAvatar(avatar, author.character_photo_url, `Foto de ${displayName(author)}`);
      const authorCopy = document.createElement('div');
      authorCopy.className = 'community-post-author';
      const authorName = document.createElement('b');
      authorName.textContent = displayName(author);
      const meta = document.createElement('span');
      meta.textContent = `${author.character_name || 'CosplayChess'} · ${fmtDate(post.created_at)}`;
      authorCopy.append(authorName, meta);
      const privacy = document.createElement('span');
      privacy.className = 'community-post-privacy';
      privacy.textContent = post.visibility === 'public' ? '🌐 Público' : '👥 Amigos';
      head.append(avatar, authorCopy, privacy);
      article.appendChild(head);

      if (post.body) {
        const body = document.createElement('div');
        body.className = 'community-post-body';
        body.textContent = post.body;
        article.appendChild(body);
      }
      const tagged = tagsByPost.get(post.id) || [];
      if (tagged.length) {
        const tags = document.createElement('div');
        tags.className = 'community-post-tags';
        tags.textContent = `com ${tagged.map(displayName).join(', ')}`;
        article.appendChild(tags);
      }
      if (post.image_path) {
        const imageUrl = await getSignedImage(post.image_path);
        if (imageUrl) {
          const imageWrap = document.createElement('div');
          imageWrap.className = 'community-post-image';
          const img = document.createElement('img');
          img.src = imageUrl;
          img.alt = `Publicação de ${displayName(author)}`;
          img.loading = 'lazy';
          imageWrap.appendChild(img);
          article.appendChild(imageWrap);
        }
      }

      const actions = document.createElement('div');
      actions.className = 'community-post-actions';
      const likes = state.likesByPost.get(post.id) || [];
      const liked = likes.includes(state.profile.id);
      const like = document.createElement('button');
      like.type = 'button';
      like.className = liked ? 'liked' : '';
      like.textContent = `${liked ? '♥' : '♡'} ${likes.length ? likes.length : 'Curtir'}`;
      like.addEventListener('click', () => toggleLike(post.id, liked, like));
      const share = document.createElement('button');
      share.type = 'button';
      share.textContent = '↗ Compartilhar';
      share.addEventListener('click', () => sharePost(post, author, share));
      actions.append(like, share);
      if (post.author_profile_id === state.profile.id) {
        const remove = document.createElement('button');
        remove.className = 'community-delete-post';
        remove.type = 'button';
        remove.textContent = 'Excluir';
        remove.addEventListener('click', () => deletePost(post, remove));
        actions.appendChild(remove);
      }
      article.appendChild(actions);
      feedEl.appendChild(article);
    }
  };

  const toggleLike = async (postId, liked, button) => {
    button.disabled = true;
    const query = db.from('cosplay_social_post_likes');
    const { error } = liked
      ? await query.delete().eq('post_id', postId).eq('profile_id', state.profile.id)
      : await query.insert({ post_id:postId, profile_id:state.profile.id });
    if (!error) await loadFeed();
    else button.disabled = false;
  };

  const sharePost = async (post, author, button) => {
    const url = profileHref(author) === '#' ? location.href : new URL(profileHref(author), location.href).href;
    const text = post.body || `Veja uma publicação de ${displayName(author)} no CosplayChess.`;
    try {
      if (navigator.share) await navigator.share({ title:`${displayName(author)} · CosplayChess`, text:text.slice(0,180), url });
      else { await navigator.clipboard.writeText(url); button.textContent = 'Link copiado ✓'; setTimeout(() => button.textContent='↗ Compartilhar', 1500); }
    } catch (error) { if (error?.name !== 'AbortError') button.textContent = 'Falhou'; }
  };

  const deletePost = async (post, button) => {
    button.disabled = true;
    const { error } = await db.from('cosplay_social_posts').delete().eq('id', post.id);
    if (error) { button.disabled = false; return; }
    if (post.image_path) await db.storage.from(BUCKET).remove([post.image_path]).catch(() => {});
    state.imageUrls.delete(post.image_path);
    await loadFeed();
    await loadPhotos();
  };

  const loadPhotos = async () => {
    if (!photosEl) return;
    photosEl.innerHTML = '<div class="community-empty">Carregando fotos...</div>';
    const { data, error } = await db
      .from('cosplay_social_posts')
      .select('id,body,image_path,visibility,created_at')
      .eq('author_profile_id', state.profile.id)
      .not('image_path', 'is', null)
      .order('created_at', { ascending:false })
      .limit(80);
    if (error || !data?.length) {
      photosEl.innerHTML = '<div class="community-empty">Você ainda não publicou fotos.</div>';
      if (photoCount) photoCount.textContent = '0';
      return;
    }
    photosEl.replaceChildren();
    photoCount.textContent = String(data.length);
    for (const post of data) {
      const url = await getSignedImage(post.image_path);
      if (!url) continue;
      const card = document.createElement('article');
      card.className = 'community-photo-card';
      const img = document.createElement('img');
      img.src = url;
      img.alt = post.body || 'Foto do CosplayChess';
      img.loading = 'lazy';
      const overlay = document.createElement('div');
      overlay.className = 'community-photo-overlay';
      overlay.textContent = `${post.visibility === 'public' ? '🌐' : '👥'} ${fmtDate(post.created_at)}`;
      card.append(img, overlay);
      photosEl.appendChild(card);
    }
  };

  const uploadPostImage = async (file) => {
    if (!file) return null;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use uma imagem JPG, PNG ou WebP.');
    if (file.size > 8 * 1024 * 1024) throw new Error('A foto pode ter no máximo 8 MB.');
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${state.user.id}/${state.profile.id}/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
    const { error } = await db.storage.from(BUCKET).upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type });
    if (error) throw error;
    return path;
  };

  postForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = String(postBody?.value || '').trim();
    const file = postImage?.files?.[0] || null;
    if (!body && !file) return setStatus('Escreva algo ou escolha uma foto.', 'error');
    postSubmit.disabled = true;
    setStatus('Publicando...');
    let imagePath = null;
    try {
      imagePath = await uploadPostImage(file);
      const { data: created, error } = await db.from('cosplay_social_posts').insert({
        author_profile_id: state.profile.id,
        body: body || null,
        image_path: imagePath,
        visibility: postVisibility?.value === 'public' ? 'public' : 'friends'
      }).select('id').single();
      if (error) throw error;
      const taggedId = String(postTag?.value || '').trim();
      if (taggedId) {
        const { error: tagError } = await db.from('cosplay_social_post_tags').insert({ post_id:created.id, profile_id:taggedId });
        if (tagError) console.warn('tag friend failed', tagError.message);
      }
      postForm.reset();
      postPreview.hidden = true;
      postPreview.replaceChildren();
      setStatus('Publicado com sucesso.', 'success');
      await Promise.all([loadFeed(), loadPhotos()]);
      renderTagOptions();
    } catch (error) {
      if (imagePath) await db.storage.from(BUCKET).remove([imagePath]).catch(() => {});
      setStatus(String(error?.message || 'Não foi possível publicar.'), 'error');
    } finally {
      postSubmit.disabled = false;
    }
  });

  postImage?.addEventListener('change', () => {
    postPreview.replaceChildren();
    const file = postImage.files?.[0];
    if (!file) { postPreview.hidden = true; return; }
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);
    postPreview.appendChild(img);
    postPreview.hidden = false;
  });

  const switchView = (name) => {
    document.querySelectorAll('[data-community-view]').forEach(button => button.classList.toggle('active', button.dataset.communityView === name));
    document.querySelectorAll('[data-community-panel]').forEach(panel => {
      const active = panel.dataset.communityPanel === name;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
  };

  document.querySelectorAll('[data-community-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.communityView)));
  peopleSearch?.addEventListener('input', renderPeople);
  $('communityRefreshFeed')?.addEventListener('click', loadFeed);

  const init = async () => {
    if (!db) { if (authBlock) authBlock.hidden = false; return; }
    const { data } = await db.auth.getSession();
    state.session = data?.session || null;
    state.user = state.session?.user || null;
    if (!state.user) { if (authBlock) authBlock.hidden = false; return; }
    try {
      await loadOwnedProfile();
      await loadFriendships();
      await Promise.all([loadPeople(), loadFeed(), loadPhotos()]);
    } catch (error) {
      console.error('community init failed', error);
      if (authBlock) {
        authBlock.hidden = false;
        const p = authBlock.querySelector('p');
        if (p) p.textContent = String(error?.message || 'Não foi possível abrir sua comunidade agora.');
      }
    }
  };

  init();
})();