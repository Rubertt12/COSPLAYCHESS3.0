(() => {
  const db = window.getCosplayChessDb ? window.getCosplayChessDb() : window.COSPLAYCHESS_DB;
  const loading = document.getElementById('playerLoading');
  const notFound = document.getElementById('playerNotFound');
  const content = document.getElementById('playerContent');
  const nameEl = document.getElementById('playerName');
  const characterEl = document.getElementById('playerCharacter');
  const nickEl = document.getElementById('playerNick');
  const bioEl = document.getElementById('playerBio');
  const photoEl = document.getElementById('playerPhoto');
  const socialsEl = document.getElementById('playerSocials');
  const achievementsEl = document.getElementById('playerAchievements');
  const achievementCountEl = document.getElementById('playerAchievementCount');
  const achievementNameEl = document.getElementById('playerAchievementName');
  const shareBtn = document.getElementById('playerShare');
  let profile = null;

  const setState = (state) => {
    if (loading) loading.hidden = state !== 'loading';
    if (notFound) notFound.hidden = state !== 'not-found';
    if (content) content.hidden = state !== 'ready';
  };

  const safeHttpUrl = (value) => {
    if (!value) return null;
    try {
      const url = new URL(String(value));
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  };

  const renderPhoto = (url) => {
    if (!photoEl) return;
    photoEl.replaceChildren();
    const safe = safeHttpUrl(url);
    if (!safe) {
      const icon = document.createElement('span');
      icon.textContent = '♜';
      photoEl.appendChild(icon);
      return;
    }
    const img = document.createElement('img');
    img.src = safe;
    img.alt = `Cosplay de ${profile?.display_name || profile?.nick || 'participante'}`;
    img.loading = 'eager';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => {
      photoEl.replaceChildren();
      const icon = document.createElement('span');
      icon.textContent = '♜';
      photoEl.appendChild(icon);
    }, { once:true });
    photoEl.appendChild(img);
  };

  const addSocial = (label, url) => {
    const safe = safeHttpUrl(url);
    if (!safe || !socialsEl) return;
    const link = document.createElement('a');
    link.href = safe;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${label} ↗`;
    socialsEl.appendChild(link);
  };

  const renderProfile = () => {
    const displayName = profile.display_name || profile.nick || 'Participante';
    if (nameEl) nameEl.textContent = displayName;
    if (characterEl) characterEl.textContent = profile.character_name || 'Personagem';
    if (achievementNameEl) achievementNameEl.textContent = displayName;
    if (nickEl) {
      const nick = String(profile.nick || '').trim();
      nickEl.textContent = nick ? `@${nick.replace(/^@/, '')}` : '';
      nickEl.hidden = !nick;
    }
    if (bioEl) {
      const bio = String(profile.bio || '').trim();
      bioEl.textContent = bio;
      bioEl.hidden = !bio;
    }
    renderPhoto(profile.character_photo_url);
    if (socialsEl) socialsEl.replaceChildren();
    addSocial('Instagram', profile.instagram_url);
    addSocial('TikTok', profile.tiktok_url);
    addSocial('Facebook', profile.facebook_url);
    addSocial('YouTube', profile.youtube_url);
    document.title = `${displayName} — CosplayChess`;
  };

  const renderAchievements = async () => {
    if (!achievementsEl || !achievementCountEl) return;
    achievementsEl.innerHTML = '<div class="player-empty">Carregando conquistas...</div>';
    const { data: awards, error } = await db
      .from('cosplay_cosplayer_achievements')
      .select('achievement_id,note,awarded_at')
      .eq('registration_id', profile.registration_id)
      .order('awarded_at', { ascending:false });
    if (error || !awards?.length) {
      achievementsEl.innerHTML = '<div class="player-empty">Nenhuma conquista pública desbloqueada ainda.</div>';
      achievementCountEl.textContent = '0';
      return;
    }
    const ids = [...new Set(awards.map((award) => award.achievement_id).filter(Boolean))];
    const { data: defs } = await db.from('cosplay_achievements').select('id,title,description,icon,tier').in('id', ids).eq('published', true);
    const definitions = new Map((defs || []).map((item) => [item.id, item]));
    achievementsEl.replaceChildren();
    awards.forEach((award) => {
      const def = definitions.get(award.achievement_id);
      if (!def) return;
      const card = document.createElement('article');
      card.className = 'player-achievement-card';
      const icon = document.createElement('div');
      icon.className = 'player-achievement-icon';
      icon.textContent = def.icon || '🏆';
      const copy = document.createElement('div');
      copy.className = 'player-achievement-copy';
      const title = document.createElement('b');
      title.textContent = def.title || 'Conquista';
      const description = document.createElement('p');
      description.textContent = award.note || def.description || '';
      const tier = document.createElement('small');
      tier.textContent = String(def.tier || 'conquista').toUpperCase();
      copy.append(title, description, tier);
      card.append(icon, copy);
      achievementsEl.appendChild(card);
    });
    achievementCountEl.textContent = String(achievementsEl.children.length);
  };

  const init = async () => {
    setState('loading');
    if (!db) return setState('not-found');
    const slug = String(new URLSearchParams(location.search).get('slug') || '').trim();
    if (!slug || slug.length > 180) return setState('not-found');
    const { data, error } = await db
      .from('cosplay_participant_profiles')
      .select('registration_id,public_slug,display_name,nick,character_name,character_photo_url,bio,instagram_url,tiktok_url,facebook_url,youtube_url,profile_visible')
      .eq('public_slug', slug)
      .eq('profile_visible', true)
      .maybeSingle();
    if (error || !data) return setState('not-found');
    profile = data;
    renderProfile();
    setState('ready');
    await renderAchievements();
  };

  shareBtn?.addEventListener('click', async () => {
    if (!profile) return;
    const title = `${profile.display_name || profile.nick || 'Participante'} no CosplayChess`;
    const text = `Veja o cosplay e as conquistas de ${profile.display_name || profile.nick || 'um participante'} no CosplayChess! ♜🎭`;
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title, text, url });
      else {
        await navigator.clipboard.writeText(url);
        shareBtn.textContent = 'Link copiado ✓';
        setTimeout(() => { shareBtn.textContent = 'Compartilhar perfil'; }, 1800);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        shareBtn.textContent = 'Não foi possível compartilhar';
        setTimeout(() => { shareBtn.textContent = 'Compartilhar perfil'; }, 1800);
      }
    }
  });

  init();
})();