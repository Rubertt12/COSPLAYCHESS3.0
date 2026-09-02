(() => {
  'use strict';

  const publicDb = window.getCosplayChessDb ? window.getCosplayChessDb() : window.COSPLAYCHESS_DB;
  const participantDb = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const BUCKET = 'cosplaychess-social-media';
  const POST_PAGE = 8;
  const GALLERY_LIMIT = 18;
  const $ = (id) => document.getElementById(id);
  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = {
    profile: null,
    viewer: null,
    user: null,
    socialSettings: null,
    eventTitle: '—',
    achievementCount: 0,
    postOffset: 0,
    postDone: false,
    tabLoaded: new Set(['posts']),
    signedCache: new Map(),
  };

  const safeUrl = (value) => {
    try {
      const u = new URL(String(value || ''), location.href);
      return ['http:', 'https:'].includes(u.protocol) ? u.href : null;
    } catch {
      return null;
    }
  };

  const fmtDate = (value) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
    } catch {
      return '';
    }
  };

  const fmtMonth = (value) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(value));
    } catch {
      return '—';
    }
  };

  const displayName = (p) => p?.display_name || p?.nick || 'Participante';
  const show = (el, yes = true) => { if (el) el.hidden = !yes; };

  function setSkeleton(root, type = 'card', count = 3) {
    if (!root) return;
    root.replaceChildren();
    for (let i = 0; i < count; i += 1) {
      const el = document.createElement('div');
      el.className = `profile-skeleton profile-skeleton-${type}`;
      el.setAttribute('aria-hidden', 'true');
      root.appendChild(el);
    }
  }

  function setTabCount(name, value) {
    const btn = q(`[data-tab="${name}"]`);
    if (!btn) return;
    const count = Math.max(0, Number(value) || 0);
    btn.dataset.count = String(count);
    btn.setAttribute('aria-label', `${btn.textContent.trim()}, ${count}`);
  }

  async function loadProfile() {
    const slug = String(new URLSearchParams(location.search).get('slug') || '').trim();
    if (!slug || !publicDb) return null;
    const { data, error } = await publicDb.from('cosplay_participant_profiles')
      .select('id,registration_id,event_id,public_slug,display_name,nick,character_name,character_photo_url,cover_photo_url,cover_position_x,cover_position_y,bio,instagram_url,tiktok_url,facebook_url,youtube_url,profile_visible,user_id,created_at,registration_status')
      .eq('public_slug', slug)
      .eq('profile_visible', true)
      .neq('registration_status', 'cancelled')
      .maybeSingle();
    return error ? null : data || null;
  }

  async function loadViewer() {
    if (!participantDb?.auth) return;
    const { data } = await participantDb.auth.getSession();
    state.user = data?.session?.user || null;
    if (!state.user) return;
    const { data: mine } = await participantDb.from('cosplay_participant_profiles')
      .select('id,user_id,public_slug,display_name,nick')
      .eq('user_id', state.user.id)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    state.viewer = mine || null;
  }

  async function signed(path) {
    if (!path || !publicDb) return null;
    if (state.signedCache.has(path)) return state.signedCache.get(path);
    const promise = (async () => {
      const { data, error } = await publicDb.storage.from(BUCKET).createSignedUrl(path, 3600);
      return error ? null : data?.signedUrl || null;
    })();
    state.signedCache.set(path, promise);
    return promise;
  }

  async function signedMany(paths) {
    const unique = [...new Set((paths || []).filter(Boolean))];
    if (!unique.length) return new Map();
    const missing = unique.filter(path => !state.signedCache.has(path));
    const bucket = publicDb.storage.from(BUCKET);

    if (missing.length && typeof bucket.createSignedUrls === 'function') {
      try {
        const batchResult = await bucket.createSignedUrls(missing, 3600);
        if (batchResult?.error) throw batchResult.error;
        const batchMap = new Map((batchResult?.data || []).map(row => [row?.path, row?.signedUrl || null]));
        missing.forEach(path => state.signedCache.set(path, Promise.resolve(batchMap.get(path) || null)));
      } catch {
        missing.forEach(path => state.signedCache.delete(path));
      }
    }

    const entries = await Promise.all(unique.map(async path => [path, await signed(path)]));
    return new Map(entries);
  }

  function renderBase() {
    const p = state.profile;
    const name = displayName(p);
    $('displayName').textContent = name;
    $('sideName').textContent = name;
    $('characterName').textContent = p.character_name || 'Personagem';
    $('sideCharacter').textContent = p.character_name || 'Personagem';
    $('bio').textContent = String(p.bio || '').trim() || 'Este participante ainda não escreveu uma bio.';

    const nick = String(p.nick || '').trim().replace(/^@/, '');
    $('nick').textContent = nick ? `@${nick}` : '';
    show($('nick'), Boolean(nick));
    $('sideNick').textContent = nick ? `@${nick}` : '—';
    document.title = `${name} — CosplayChess`;

    const avatar = $('avatar');
    avatar.replaceChildren();
    const src = safeUrl(p.character_photo_url);
    if (src) {
      const img = new Image();
      img.src = src;
      img.alt = `Cosplay de ${name}`;
      img.decoding = 'async';
      img.fetchPriority = 'high';
      avatar.appendChild(img);
    } else {
      const s = document.createElement('span');
      s.textContent = '♜';
      avatar.appendChild(s);
    }

    const cover = $('cover');
    const coverSrc = safeUrl(p.cover_photo_url);
    if (coverSrc) {
      cover.replaceChildren();
      const img = new Image();
      img.src = coverSrc;
      img.alt = `Capa de ${name}`;
      img.decoding = 'async';
      img.fetchPriority = 'high';
      const x = Number.isFinite(Number(p.cover_position_x)) ? Math.max(0, Math.min(100, Number(p.cover_position_x))) : 50;
      const y = Number.isFinite(Number(p.cover_position_y)) ? Math.max(0, Math.min(100, Number(p.cover_position_y))) : 50;
      img.style.objectPosition = `${x}% ${y}%`;
      cover.appendChild(img);
    }

    const socials = $('socialLinks');
    socials.replaceChildren();
    [['Instagram', p.instagram_url], ['TikTok', p.tiktok_url], ['Facebook', p.facebook_url], ['YouTube', p.youtube_url]].forEach(([label, url]) => {
      const href = safeUrl(url);
      if (!href) return;
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = `${label} ↗`;
      socials.appendChild(a);
    });
  }

  function renderExtendedProfile() {
    const p = state.profile;
    const settings = state.socialSettings;
    const socialBio = String(settings?.social_bio || '').trim();
    const profileBio = socialBio || String(p.bio || '').trim();
    if ($('bio')) $('bio').textContent = profileBio || 'Este participante ainda não escreveu o Sobre mim.';

    const aboutPanel = q('[data-panel="about"]');
    if (aboutPanel && !q('.about-layout', aboutPanel)) {
      const interests = $('interests');
      const wrap = document.createElement('div');
      wrap.className = 'about-layout';

      const story = document.createElement('section');
      story.className = 'about-story';
      story.innerHTML = '<span class="side-kicker">MINHA HISTÓRIA</span><h3>Sobre mim</h3><p></p>';
      story.querySelector('p').textContent = profileBio || 'Este participante ainda não escreveu o Sobre mim.';
      if (!profileBio) story.querySelector('p').className = 'empty-about';

      const facts = document.createElement('section');
      facts.className = 'about-facts';
      facts.innerHTML = '<span class="side-kicker">PERFIL</span><h3>Informações</h3>';
      const rows = [
        ['Personagem', p.character_name || '—'],
        ['Usuário', p.nick ? `@${String(p.nick).replace(/^@/, '')}` : '—'],
        ['Evento', state.eventTitle],
        ['Membro desde', fmtMonth(p.created_at)],
        ['Status', p.registration_status === 'confirmed' ? 'Inscrição confirmada' : 'Participante ativo'],
      ];
      rows.forEach(([label, value]) => {
        const row = document.createElement('div');
        row.className = 'about-fact';
        const s = document.createElement('span');
        s.textContent = label;
        const b = document.createElement('b');
        b.textContent = value;
        row.append(s, b);
        facts.appendChild(row);
      });

      const socials = document.createElement('div');
      socials.className = 'about-socials';
      [['Instagram', p.instagram_url], ['TikTok', p.tiktok_url], ['Facebook', p.facebook_url], ['YouTube', p.youtube_url]].forEach(([label, url]) => {
        const href = safeUrl(url);
        if (!href) return;
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = `${label} ↗`;
        socials.appendChild(a);
      });
      if (socials.children.length) facts.appendChild(socials);
      wrap.append(story, facts);

      if (interests) {
        const interestTitle = document.createElement('div');
        interestTitle.className = 'section-heading interests-heading';
        interestTitle.innerHTML = '<span>GOSTOS & REFERÊNCIAS</span><h2>Interesses</h2>';
        aboutPanel.insertBefore(wrap, interests);
        aboutPanel.insertBefore(interestTitle, interests);
      }
    }

    const sideCard = q('.side-column .side-card');
    if (sideCard && !sideCard.classList.contains('profile-detail-card')) {
      sideCard.classList.add('profile-detail-card');
      const dl = sideCard.querySelector('dl');
      const add = (label, value) => {
        const d = document.createElement('div');
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = value;
        d.append(dt, dd);
        dl?.appendChild(d);
      };
      add('Evento', state.eventTitle);
      add('Membro desde', fmtMonth(p.created_at));
    }

    const summary = q('.summary-main');
    if (summary && !q('.profile-extra-strip', summary)) {
      const strip = document.createElement('div');
      strip.className = 'profile-extra-strip';
      [
        ['Evento', state.eventTitle],
        ['Membro desde', fmtMonth(p.created_at)],
        ['Personagem', p.character_name || '—'],
        ['Perfil', 'Público'],
      ].forEach(([label, value]) => {
        const d = document.createElement('div');
        const s = document.createElement('span');
        s.textContent = label;
        const b = document.createElement('b');
        b.textContent = value;
        d.append(s, b);
        strip.appendChild(d);
      });
      summary.appendChild(strip);
    }
  }

  async function renderProfileMeta() {
    const p = state.profile;
    const tasks = [
      publicDb.from('cosplay_profile_verifications').select('label').eq('profile_id', p.id).maybeSingle(),
      publicDb.from('cosplay_profile_social_settings').select('birthday_day,birthday_month,show_birthday,show_online,last_seen_at,social_bio').eq('profile_id', p.id).maybeSingle(),
      p.event_id ? publicDb.from('cosplay_events').select('title').eq('id', p.event_id).maybeSingle() : Promise.resolve({ data: null }),
    ];
    const [{ data: verification }, { data: settings }, { data: event }] = await Promise.all(tasks);
    state.socialSettings = settings || null;
    state.eventTitle = event?.title || '—';

    if (verification) {
      $('verifiedBadge').textContent = `✓ ${verification.label || 'Verificado'}`;
      show($('verifiedBadge'), true);
    }
    if (settings?.show_birthday && settings.birthday_day && settings.birthday_month) {
      $('birthday').textContent = `🎂 ${String(settings.birthday_day).padStart(2, '0')}/${String(settings.birthday_month).padStart(2, '0')}`;
      show($('birthday'), true);
    }
    if (settings?.show_online && settings.last_seen_at && Date.now() - new Date(settings.last_seen_at).getTime() < 5 * 60 * 1000) {
      $('presence').textContent = '● online agora';
      show($('presence'), true);
      $('sideStatus').textContent = 'Online agora';
    }
    renderExtendedProfile();
  }

  async function renderStats() {
    const [{ data }, { count: achievements }] = await Promise.all([
      publicDb.rpc('cosplay_public_profile_social_stats', { target_profile_id: state.profile.id }),
      publicDb.from('cosplay_cosplayer_achievements').select('achievement_id', { count: 'exact', head: true }).eq('registration_id', state.profile.registration_id),
    ]);
    const row = Array.isArray(data) ? data[0] : data || {};
    state.achievementCount = achievements || 0;
    const values = [row.friend_count || 0, row.post_count || 0, row.photo_count || 0, state.achievementCount];
    [...$('stats').children].forEach((el, i) => { el.querySelector('b').textContent = String(values[i] || 0); });
    $('achievementCount').textContent = String(state.achievementCount);
    setTabCount('posts', row.post_count || 0);
    setTabCount('gallery', row.photo_count || 0);
    setTabCount('achievements', state.achievementCount);
  }

  function createPostCard(post, url, index = 0) {
    const card = document.createElement('article');
    card.className = 'post-card';
    if (url) {
      card.classList.add('has-image');
      const wrap = document.createElement('button');
      wrap.className = 'post-image';
      wrap.type = 'button';
      wrap.dataset.lightbox = url;
      wrap.dataset.caption = post.body || 'Publicação cosplay';
      wrap.setAttribute('aria-label', 'Ampliar imagem da publicação');
      const img = new Image();
      img.src = url;
      img.alt = post.body || 'Publicação cosplay';
      img.decoding = 'async';
      img.loading = index === 0 ? 'eager' : 'lazy';
      wrap.appendChild(img);
      card.appendChild(wrap);
    }
    const copy = document.createElement('div');
    copy.className = 'post-copy';
    if (post.body) {
      const p = document.createElement('p');
      p.textContent = post.body;
      copy.appendChild(p);
    }
    const t = document.createElement('time');
    t.textContent = fmtDate(post.created_at);
    copy.appendChild(t);
    card.appendChild(copy);
    return card;
  }

  async function renderPosts(reset = false) {
    const root = $('posts');
    if (reset) {
      state.postOffset = 0;
      state.postDone = false;
      setSkeleton(root, 'post', 3);
    }
    if (state.postDone && !reset) return;

    const from = state.postOffset;
    const to = from + POST_PAGE;
    const { data, error } = await publicDb.from('cosplay_social_posts')
      .select('id,body,image_path,created_at')
      .eq('author_profile_id', state.profile.id)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(from, to);

    const rows = error ? [] : data || [];
    const page = rows.slice(0, POST_PAGE);
    const hasMore = rows.length > POST_PAGE;
    const signedMap = await signedMany(page.map(post => post.image_path));

    if (reset) root.replaceChildren();
    q('.posts-more', root)?.remove();

    if (!page.length && reset) {
      root.innerHTML = '<div class="empty">Nenhuma publicação pública ainda.</div>';
      state.postDone = true;
      return;
    }

    page.forEach((post, index) => root.appendChild(createPostCard(post, signedMap.get(post.image_path) || null, from + index)));
    state.postOffset += page.length;
    state.postDone = !hasMore;

    if (hasMore) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'posts-more';
      more.textContent = 'Carregar mais publicações';
      more.addEventListener('click', async () => {
        more.disabled = true;
        more.textContent = 'Carregando…';
        await renderPosts(false);
      }, { once: true });
      root.appendChild(more);
    }
  }

  async function renderAchievements() {
    if (state.tabLoaded.has('achievements')) return;
    state.tabLoaded.add('achievements');
    const root = $('achievements');
    const highlights = $('achievementHighlights');
    setSkeleton(root, 'achievement', 4);

    const { data: awards, error } = await publicDb.from('cosplay_cosplayer_achievements')
      .select('achievement_id,note,awarded_at')
      .eq('registration_id', state.profile.registration_id)
      .order('awarded_at', { ascending: false });

    root.replaceChildren();
    highlights.replaceChildren();
    if (error || !awards?.length) {
      root.innerHTML = '<div class="empty">Nenhuma conquista pública desbloqueada ainda.</div>';
      highlights.innerHTML = '<div class="empty small">Nenhuma conquista ainda.</div>';
      return;
    }

    const ids = [...new Set(awards.map(a => a.achievement_id).filter(Boolean))];
    const { data: defs } = await publicDb.from('cosplay_achievements')
      .select('id,title,description,icon,tier')
      .in('id', ids)
      .eq('published', true);
    const map = new Map((defs || []).map(x => [x.id, x]));
    let added = 0;

    awards.forEach((a) => {
      const d = map.get(a.achievement_id);
      if (!d) return;
      added += 1;
      const c = document.createElement('article');
      c.className = `achievement-card tier-${String(d.tier || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
      c.innerHTML = '<div class="achievement-icon"></div><div><b></b><p></p><small></small></div>';
      c.querySelector('.achievement-icon').textContent = d.icon || '🏆';
      c.querySelector('b').textContent = d.title || 'Conquista';
      c.querySelector('p').textContent = a.note || d.description || '';
      c.querySelector('small').textContent = String(d.tier || 'conquista').toUpperCase();
      root.appendChild(c);
      if (added <= 3) {
        const m = document.createElement('div');
        m.className = 'mini-achievement';
        m.innerHTML = '<i></i><div><b></b><span></span></div>';
        m.querySelector('i').textContent = d.icon || '🏆';
        m.querySelector('b').textContent = d.title || 'Conquista';
        m.querySelector('span').textContent = String(d.tier || 'conquista');
        highlights.appendChild(m);
      }
    });

    $('achievementCount').textContent = String(added);
    [...$('stats').children][3].querySelector('b').textContent = String(added);
    setTabCount('achievements', added);
  }

  async function renderGallery() {
    if (state.tabLoaded.has('gallery')) return;
    state.tabLoaded.add('gallery');
    const root = $('gallery');
    const highlights = $('galleryHighlights');
    setSkeleton(root, 'gallery', 6);

    const [{ data: posts }, { data: albums }] = await Promise.all([
      publicDb.from('cosplay_social_posts')
        .select('image_path,created_at')
        .eq('author_profile_id', state.profile.id)
        .eq('visibility', 'public')
        .not('image_path', 'is', null)
        .order('created_at', { ascending: false })
        .limit(12),
      publicDb.from('cosplay_social_albums')
        .select('id')
        .eq('owner_profile_id', state.profile.id)
        .eq('visibility', 'public')
        .limit(8),
    ]);

    const paths = [];
    (posts || []).forEach(p => p.image_path && paths.push({ path: p.image_path, href: '' }));
    if (albums?.length) {
      const { data: photos } = await publicDb.from('cosplay_social_album_photos')
        .select('album_id,image_path,created_at')
        .in('album_id', albums.map(a => a.id))
        .order('created_at', { ascending: false })
        .limit(24);
      (photos || []).forEach(p => p.image_path && paths.push({ path: p.image_path, href: `./album.html?id=${encodeURIComponent(p.album_id)}` }));
    }

    const unique = [];
    const seen = new Set();
    for (const item of paths) {
      if (seen.has(item.path)) continue;
      seen.add(item.path);
      unique.push(item);
      if (unique.length >= GALLERY_LIMIT) break;
    }

    root.replaceChildren();
    highlights.replaceChildren();
    if (!unique.length) {
      root.innerHTML = '<div class="empty">Nenhuma foto pública ainda.</div>';
      highlights.innerHTML = '<div class="empty small">Sem fotos públicas.</div>';
      return;
    }

    const signedMap = await signedMany(unique.map(item => item.path));
    unique.forEach((item, index) => {
      const url = signedMap.get(item.path);
      if (!url) return;
      const button = document.createElement('button');
      button.className = 'gallery-item';
      button.type = 'button';
      button.dataset.lightbox = url;
      if (item.href) button.dataset.albumHref = item.href;
      button.setAttribute('aria-label', `Ampliar foto ${index + 1} de ${displayName(state.profile)}`);
      const img = new Image();
      img.src = url;
      img.alt = `Foto de ${displayName(state.profile)}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      button.appendChild(img);
      root.appendChild(button);

      if (index < 6) {
        const h = button.cloneNode(true);
        h.className = 'gallery-highlight-button';
        highlights.appendChild(h);
      }
    });
  }

  async function renderInterests() {
    if (state.tabLoaded.has('about')) return;
    state.tabLoaded.add('about');
    const root = $('interests');
    setSkeleton(root, 'interest', 3);
    const { data } = await publicDb.from('cosplay_profile_interests')
      .select('anime,games,films_series,music,hobbies')
      .eq('profile_id', state.profile.id)
      .maybeSingle();
    root.replaceChildren();
    const labels = { anime: 'Anime & mangá', games: 'Games', films_series: 'Filmes & séries', music: 'Música', hobbies: 'Hobbies' };
    let any = false;
    Object.entries(labels).forEach(([key, label]) => {
      if (!data?.[key]) return;
      any = true;
      const c = document.createElement('div');
      c.className = 'interest';
      const b = document.createElement('b');
      b.textContent = label;
      const s = document.createElement('span');
      s.textContent = data[key];
      c.append(b, s);
      root.appendChild(c);
    });
    if (!any) root.innerHTML = '<div class="empty">Nenhum interesse público cadastrado.</div>';
  }

  async function ensureTab(name) {
    if (name === 'gallery') await renderGallery();
    if (name === 'achievements') await renderAchievements();
    if (name === 'about') await renderInterests();
  }

  async function setupFriend() {
    const btn = $('friendButton');
    if (!participantDb || !state.viewer) {
      btn.textContent = 'Entrar para adicionar';
      btn.onclick = () => { location.href = './participante.html'; };
      return;
    }
    if (state.viewer.id === state.profile.id) {
      btn.textContent = 'Abrir minha comunidade';
      btn.onclick = () => { location.href = './comunidade.html'; };
      return;
    }

    const { data: rows } = await participantDb.from('cosplay_friendships')
      .select('id,requester_profile_id,addressee_profile_id,status')
      .or(`and(requester_profile_id.eq.${state.viewer.id},addressee_profile_id.eq.${state.profile.id}),and(requester_profile_id.eq.${state.profile.id},addressee_profile_id.eq.${state.viewer.id})`)
      .order('created_at', { ascending: false })
      .limit(1);
    const r = rows?.[0];

    if (r?.status === 'accepted') {
      btn.textContent = '✓ Amigos';
      btn.classList.remove('primary');
      btn.classList.add('ghost');
      btn.onclick = () => { location.href = './comunidade.html'; };
      return;
    }
    if (r?.status === 'pending') {
      btn.textContent = r.addressee_profile_id === state.viewer.id ? 'Solicitação recebida' : 'Solicitação enviada ✓';
      btn.classList.remove('primary');
      btn.classList.add('ghost');
      btn.onclick = () => { location.href = './comunidade.html'; };
      return;
    }

    btn.onclick = async () => {
      btn.disabled = true;
      const { error } = await participantDb.from('cosplay_friendships').insert({
        requester_profile_id: state.viewer.id,
        addressee_profile_id: state.profile.id,
        status: 'pending',
      });
      btn.disabled = false;
      btn.textContent = error ? 'Tentar novamente' : 'Solicitação enviada ✓';
    };
  }

  function setupTabs() {
    qa('[data-tab]').forEach(btn => btn.addEventListener('click', async () => {
      qa('[data-tab]').forEach(x => x.classList.toggle('active', x === btn));
      qa('[data-panel]').forEach(p => p.classList.toggle('active', p.dataset.panel === btn.dataset.tab));
      await ensureTab(btn.dataset.tab);
      if (innerWidth < 920) q(`[data-panel="${btn.dataset.tab}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  function setupShare() {
    $('shareButton').addEventListener('click', async () => {
      const title = `${displayName(state.profile)} no CosplayChess`;
      const url = location.href;
      try {
        if (navigator.share) await navigator.share({ title, url });
        else {
          await navigator.clipboard.writeText(url);
          $('shareButton').textContent = 'Link copiado ✓';
          setTimeout(() => { $('shareButton').textContent = 'Compartilhar'; }, 1600);
        }
      } catch {}
    });
  }

  function setupLightbox() {
    let dialog = $('profileLightbox');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'profileLightbox';
      dialog.className = 'profile-lightbox';
      dialog.innerHTML = '<button class="lightbox-close" type="button" aria-label="Fechar">×</button><div class="lightbox-stage"><img alt=""></div><div class="lightbox-footer"><p></p><a hidden>Abrir álbum</a></div>';
      document.body.appendChild(dialog);
      q('.lightbox-close', dialog).addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    }

    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-lightbox]');
      if (!trigger) return;
      const url = safeUrl(trigger.dataset.lightbox);
      if (!url) return;
      event.preventDefault();
      const img = q('img', dialog);
      const caption = q('.lightbox-footer p', dialog);
      const album = q('.lightbox-footer a', dialog);
      img.src = url;
      img.alt = trigger.dataset.caption || 'Foto ampliada';
      caption.textContent = trigger.dataset.caption || '';
      const albumHref = safeUrl(trigger.dataset.albumHref);
      if (albumHref) {
        album.href = albumHref;
        album.hidden = false;
      } else {
        album.hidden = true;
      }
      dialog.showModal();
    });
  }

  function idlePrefetch() {
    const run = () => {
      if (innerWidth >= 921) renderAchievements().catch(() => {});
    };
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1800 });
    else setTimeout(run, 1200);
  }

  async function init() {
    if (!publicDb) {
      show($('stateLoading'), false);
      show($('stateError'), true);
      return;
    }

    const [profile] = await Promise.all([loadProfile(), loadViewer()]);
    state.profile = profile;
    if (!state.profile) {
      show($('stateLoading'), false);
      show($('stateError'), true);
      return;
    }

    renderBase();
    setupTabs();
    setupShare();
    setupLightbox();
    show($('stateLoading'), false);
    show($('profileApp'), true);

    await Promise.allSettled([
      renderProfileMeta(),
      renderStats(),
      renderPosts(true),
      setupFriend(),
    ]);
    idlePrefetch();
  }

  init();
})();
