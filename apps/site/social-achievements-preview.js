(() => {
  if (window.__COSPLAY_SOCIAL_ACHIEVEMENTS_PREVIEW__) return;
  window.__COSPLAY_SOCIAL_ACHIEVEMENTS_PREVIEW__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const fmtDate = value => {
    try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)); }
    catch { return ''; }
  };
  const tier = value => String(value || 'bronze').toLowerCase().replace(/[^a-z0-9_-]/g,'');
  const safeText = value => String(value || '').trim();
  const displayName = profile => profile?.display_name || profile?.nick || 'Participante';

  const ownProfile = async () => {
    const { data:s } = await db.auth.getSession();
    const user = s?.session?.user;
    if (!user) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url')
      .eq('user_id', user.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    return data || null;
  };

  const socialTarget = async () => {
    const slug = safeText(new URLSearchParams(location.search).get('slug'));
    if (!slug) return null;
    const { data, error } = await db.rpc('cosplay_community_profile_by_slug',{ p_slug:slug });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return { ...row, id:row.profile_id };
  };

  const loadAwards = async profileId => {
    if (!profileId) return [];
    const { data, error } = await db.rpc('cosplay_community_profile_achievements',{ p_profile_id:profileId });
    return error ? [] : (Array.isArray(data) ? data : []);
  };

  const uniqueLatest = awards => {
    const seen = new Set();
    return awards.filter(award => {
      const key = award.achievement_id || award.award_id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const makeItem = (award, compact = false) => {
    const item = document.createElement('div');
    item.className = compact ? 'community-achievement-mini-item' : 'social-achievement-preview-item';
    item.dataset.tier = tier(award.tier);

    const icon = document.createElement('div');
    icon.className = compact ? 'community-achievement-mini-icon' : 'social-achievement-preview-icon';
    icon.textContent = award.icon || '🏆';

    const copy = document.createElement('div');
    copy.className = compact ? 'community-achievement-mini-copy' : 'social-achievement-preview-copy';
    const title = document.createElement('b');
    title.textContent = award.title || 'Conquista';
    const description = document.createElement('span');
    description.textContent = award.note || award.description || 'Conquista desbloqueada no CosplayChess.';
    const meta = document.createElement('small');
    const event = safeText(award.event_title);
    meta.textContent = [String(award.tier || 'bronze').toUpperCase(), event || fmtDate(award.awarded_at)].filter(Boolean).join(' · ');
    copy.append(title,description,meta);
    item.append(icon,copy);
    return item;
  };

  const renderSocialProfile = (profile, awards) => {
    const side = document.querySelector('.social-profile-side');
    if (!side || side.querySelector('[data-social-achievements-preview]')) return false;
    const unique = uniqueLatest(awards);
    const href = `./conquistas-social.html?slug=${encodeURIComponent(profile.public_slug || new URLSearchParams(location.search).get('slug') || '')}`;

    const section = document.createElement('section');
    section.className = 'social-profile-card social-achievement-preview-card';
    section.dataset.socialAchievementsPreview = '1';
    section.innerHTML = `<div class="social-profile-card-head"><div><span class="kicker">CONQUISTAS</span><h2>Galeria de troféus</h2></div><a href="${href}">VER TODAS →</a></div>`;
    const list = document.createElement('div');
    list.className = 'social-achievement-preview-list';
    if (!unique.length) {
      list.innerHTML = '<div class="social-achievement-preview-empty">Nenhuma conquista desbloqueada ainda.</div>';
    } else {
      unique.slice(0,4).forEach(award => list.appendChild(makeItem(award,false)));
    }
    section.appendChild(list);
    side.insertBefore(section, side.firstChild);

    const stats = document.getElementById('socialProfileStats');
    if (stats && !stats.querySelector('[data-social-achievements-stat]')) {
      const box = document.createElement('div');
      box.dataset.socialAchievementsStat = '1';
      box.innerHTML = `<b>${unique.length}</b><span>conquistas</span>`;
      stats.appendChild(box);
    }
    return true;
  };

  const renderCommunity = (profile, awards) => {
    const card = document.querySelector('.community-me-card');
    if (!card || card.querySelector('[data-community-achievements-preview]')) return false;
    const unique = uniqueLatest(awards);
    const section = document.createElement('section');
    section.className = 'community-achievement-mini';
    section.dataset.communityAchievementsPreview = '1';
    section.innerHTML = `<div class="community-achievement-mini-head"><div><strong>♕ MINHAS CONQUISTAS</strong><div class="community-achievement-mini-count">${unique.length} desbloqueada${unique.length===1?'':'s'}</div></div><a href="./conquistas-social.html">VER TODAS →</a></div>`;
    const list = document.createElement('div');
    list.className = 'community-achievement-mini-list';
    if (!unique.length) list.innerHTML = '<div class="community-achievement-mini-empty">Jogue partidas oficiais para começar sua coleção.</div>';
    else unique.slice(0,3).forEach(award => list.appendChild(makeItem(award,true)));
    section.appendChild(list);

    const stats = card.querySelector('.community-me-stats');
    if (stats?.parentNode) stats.insertAdjacentElement('afterend',section);
    else card.appendChild(section);
    return true;
  };

  const init = async () => {
    const isSocialProfile = document.body.classList.contains('social-profile-page');
    const isCommunity = document.body.classList.contains('community-page') && !!document.querySelector('.community-me-card');
    if (!isSocialProfile && !isCommunity) return;

    const profile = isSocialProfile ? await socialTarget() : await ownProfile();
    if (!profile?.id) return;
    const awards = await loadAwards(profile.id);
    if (isSocialProfile) renderSocialProfile(profile,awards);
    else renderCommunity(profile,awards);
  };

  const run = () => init().catch(() => {});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.addEventListener('cosplay:social-shell-ready',run);
  window.addEventListener('pageshow',run);
  setTimeout(run,450);
  setTimeout(run,1400);
})();
