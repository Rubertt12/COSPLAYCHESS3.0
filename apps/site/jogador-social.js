(() => {
  const publicDb = window.getCosplayChessDb ? window.getCosplayChessDb() : window.COSPLAYCHESS_DB;
  const participantDb = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const BUCKET = 'cosplaychess-social-media';
  let enhanced = false;
  let profile = null;
  let viewerProfile = null;
  let viewerSession = null;

  const $ = (id) => document.getElementById(id);
  const content = $('playerContent');
  const hero = document.querySelector('.player-hero-card');
  const actions = document.querySelector('.player-actions');
  const achievements = document.querySelector('.player-achievements-section');

  const displayName = (row) => row?.display_name || row?.nick || 'Participante';
  const fmtDate = (value) => {
    try { return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(value)); }
    catch { return ''; }
  };

  const getSignedImage = async (path) => {
    if (!path) return null;
    const { data, error } = await publicDb.storage.from(BUCKET).createSignedUrl(path, 3600);
    return error ? null : data?.signedUrl || null;
  };

  const makeStat = (value, label) => {
    const item = document.createElement('div');
    item.className = 'player-social-stat';
    const b = document.createElement('b'); b.textContent = String(value || 0);
    const span = document.createElement('span'); span.textContent = label;
    item.append(b, span);
    return item;
  };

  const loadProfile = async () => {
    const slug = String(new URLSearchParams(location.search).get('slug') || '').trim();
    if (!slug) return null;
    const { data, error } = await publicDb
      .from('cosplay_participant_profiles')
      .select('id,registration_id,public_slug,display_name,nick,character_name,character_photo_url,bio,profile_visible,user_id')
      .eq('public_slug', slug)
      .eq('profile_visible', true)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  };

  const loadViewer = async () => {
    if (!participantDb?.auth) return;
    const { data } = await participantDb.auth.getSession();
    viewerSession = data?.session || null;
    if (!viewerSession?.user) return;
    const { data: mine } = await participantDb
      .from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url,user_id')
      .eq('user_id', viewerSession.user.id)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending:false })
      .limit(1)
      .maybeSingle();
    viewerProfile = mine || null;
  };

  const setupFriendAction = async () => {
    if (!actions || !profile) return;
    const existing = actions.querySelector('[data-player-friend-action]');
    if (existing) existing.remove();
    if (!viewerProfile) {
      const link = document.createElement('a');
      link.className = 'btn dark player-friend-button';
      link.href = './participante.html';
      link.dataset.playerFriendAction = '1';
      link.textContent = '♟ Entrar para adicionar';
      actions.prepend(link);
      return;
    }
    if (viewerProfile.id === profile.id) {
      const link = document.createElement('a');
      link.className = 'btn dark player-friend-button';
      link.href = './comunidade.html';
      link.dataset.playerFriendAction = '1';
      link.textContent = '✦ Abrir minha comunidade';
      actions.prepend(link);
      return;
    }
    const { data: rows } = await participantDb
      .from('cosplay_friendships')
      .select('id,requester_profile_id,addressee_profile_id,status')
      .or(`and(requester_profile_id.eq.${viewerProfile.id},addressee_profile_id.eq.${profile.id}),and(requester_profile_id.eq.${profile.id},addressee_profile_id.eq.${viewerProfile.id})`)
      .order('created_at', { ascending:false })
      .limit(1);
    const relation = rows?.[0] || null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn gold player-friend-button';
    button.dataset.playerFriendAction = '1';
    if (!relation || ['declined','cancelled'].includes(relation.status)) {
      button.textContent = '♟ Adicionar amigo';
      button.addEventListener('click', async () => {
        button.disabled = true;
        const { error } = await participantDb.from('cosplay_friendships').insert({ requester_profile_id:viewerProfile.id, addressee_profile_id:profile.id, status:'pending' });
        if (error) { button.disabled = false; button.textContent = 'Tentar novamente'; return; }
        button.classList.add('pending');
        button.textContent = 'Solicitação enviada ✓';
      });
    } else if (relation.status === 'accepted') {
      button.className = 'btn dark player-friend-button';
      button.textContent = '✓ Vocês são amigos';
      button.addEventListener('click', () => location.href = './comunidade.html');
    } else if (relation.status === 'pending') {
      const incoming = relation.addressee_profile_id === viewerProfile.id;
      button.className = 'btn dark player-friend-button pending';
      button.textContent = incoming ? 'Solicitação recebida' : 'Solicitação enviada ✓';
      button.addEventListener('click', () => location.href = './comunidade.html');
    } else if (relation.status === 'blocked') {
      return;
    }
    actions.prepend(button);
  };

  const setupStats = async () => {
    if (!hero || !profile) return;
    const { data } = await publicDb.rpc('cosplay_public_profile_social_stats', { target_profile_id:profile.id });
    const row = Array.isArray(data) ? data[0] : data;
    const stats = document.createElement('div');
    stats.className = 'player-social-stats';
    stats.append(
      makeStat(row?.friend_count || 0, 'amigos'),
      makeStat(row?.post_count || 0, 'posts'),
      makeStat(row?.photo_count || 0, 'fotos'),
      makeStat($('playerAchievementCount')?.textContent || 0, 'conquistas')
    );
    document.querySelector('.player-identity')?.appendChild(stats);
  };

  const createTabs = () => {
    if (!achievements?.parentElement) return null;
    const nav = document.createElement('nav');
    nav.className = 'player-social-tabs';
    nav.innerHTML = '<button type="button" class="active" data-player-tab="wall">Mural</button><button type="button" data-player-tab="photos">Fotos</button><button type="button" data-player-tab="achievements">Conquistas</button>';

    const wall = document.createElement('section');
    wall.className = 'player-social-panel';
    wall.dataset.playerSocialPanel = 'wall';
    wall.innerHTML = '<div class="player-social-panel-head"><div><span class="kicker">MOMENTOS</span><h2>Publicações</h2></div></div><div class="player-social-feed" id="playerSocialFeed"><div class="player-social-empty">Carregando mural...</div></div>';

    const photos = document.createElement('section');
    photos.className = 'player-social-panel';
    photos.dataset.playerSocialPanel = 'photos';
    photos.hidden = true;
    photos.innerHTML = '<div class="player-social-panel-head"><div><span class="kicker">GALERIA</span><h2>Fotos públicas</h2></div></div><div class="player-photo-wall" id="playerPhotoWall"><div class="player-social-empty">Carregando fotos...</div></div>';

    achievements.dataset.playerSocialPanel = 'achievements';
    achievements.classList.add('player-social-panel');
    achievements.hidden = true;

    achievements.parentElement.insertBefore(nav, achievements);
    achievements.parentElement.insertBefore(wall, achievements);
    achievements.parentElement.insertBefore(photos, achievements);

    nav.querySelectorAll('[data-player-tab]').forEach(button => button.addEventListener('click', () => {
      const name = button.dataset.playerTab;
      nav.querySelectorAll('[data-player-tab]').forEach(b => b.classList.toggle('active', b === button));
      document.querySelectorAll('[data-player-social-panel]').forEach(panel => panel.hidden = panel.dataset.playerSocialPanel !== name);
    }));
    return { wall, photos };
  };

  const loadPublicPosts = async () => {
    const feed = $('playerSocialFeed');
    const photoWall = $('playerPhotoWall');
    if (!feed || !photoWall || !profile) return;
    const { data, error } = await publicDb
      .from('cosplay_social_posts')
      .select('id,body,image_path,created_at')
      .eq('author_profile_id', profile.id)
      .eq('visibility', 'public')
      .order('created_at', { ascending:false })
      .limit(30);
    const posts = error ? [] : data || [];
    feed.replaceChildren();
    photoWall.replaceChildren();
    if (!posts.length) {
      feed.innerHTML = '<div class="player-social-empty">Nenhuma publicação pública ainda.</div>';
      photoWall.innerHTML = '<div class="player-social-empty">Nenhuma foto pública ainda.</div>';
      return;
    }
    for (const post of posts) {
      const card = document.createElement('article');
      card.className = 'player-social-post';
      if (post.image_path) {
        const url = await getSignedImage(post.image_path);
        if (url) {
          const imageWrap = document.createElement('div');
          imageWrap.className = 'player-social-post-image';
          const img = document.createElement('img');
          img.src = url;
          img.alt = post.body || `Foto de ${displayName(profile)}`;
          img.loading = 'lazy';
          imageWrap.appendChild(img);
          card.appendChild(imageWrap);

          const tile = document.createElement('div');
          tile.className = 'player-photo-tile';
          const tileImg = document.createElement('img');
          tileImg.src = url;
          tileImg.alt = post.body || `Foto de ${displayName(profile)}`;
          tileImg.loading = 'lazy';
          tile.appendChild(tileImg);
          photoWall.appendChild(tile);
        }
      }
      const copy = document.createElement('div');
      copy.className = 'player-social-post-copy';
      if (post.body) { const p = document.createElement('p'); p.textContent = post.body; copy.appendChild(p); }
      const small = document.createElement('small'); small.textContent = fmtDate(post.created_at); copy.appendChild(small);
      card.appendChild(copy);
      feed.appendChild(card);
    }
    if (!photoWall.children.length) photoWall.innerHTML = '<div class="player-social-empty">Nenhuma foto pública ainda.</div>';
  };

  const addCommunityCta = () => {
    if (!content || content.querySelector('.player-community-cta')) return;
    const cta = document.createElement('section');
    cta.className = 'player-community-cta';
    const copy = document.createElement('div');
    const b = document.createElement('b'); b.textContent = 'Comunidade CosplayChess';
    const span = document.createElement('span'); span.textContent = viewerProfile ? 'Veja seu mural, amigos e publique fotos com outros participantes.' : 'Participantes podem criar amizades e compartilhar momentos dentro da comunidade.';
    copy.append(b, span);
    const link = document.createElement('a');
    link.className = 'btn gold';
    link.href = viewerProfile ? './comunidade.html' : './participante.html';
    link.textContent = viewerProfile ? 'Abrir comunidade' : 'Entrar na minha área';
    cta.append(copy, link);
    content.appendChild(cta);
  };

  const enhance = async () => {
    if (enhanced || !content || content.hidden) return;
    enhanced = true;
    profile = await loadProfile();
    if (!profile) return;
    await loadViewer();
    createTabs();
    await Promise.all([setupStats(), setupFriendAction(), loadPublicPosts()]);
    addCommunityCta();
  };

  if (content && !content.hidden) enhance();
  const observer = content ? new MutationObserver(() => { if (!content.hidden) enhance(); }) : null;
  observer?.observe(content, { attributes:true, attributeFilter:['hidden'] });
})();