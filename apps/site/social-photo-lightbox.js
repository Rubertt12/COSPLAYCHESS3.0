(() => {
  if (window.__COSPLAY_PHOTO_LIGHTBOX__) return;
  window.__COSPLAY_PHOTO_LIGHTBOX__ = true;

  const db = window.getCosplayChessParticipantDb
    ? window.getCosplayChessParticipantDb()
    : (window.COSPLAYCHESS_PARTICIPANT_DB || (window.getCosplayChessDb ? window.getCosplayChessDb() : window.COSPLAYCHESS_DB));

  const selector = [
    '[data-photo-lightbox]',
    '.community-post-image img',
    '.community-photo-card img',
    '.premium-album-thumb img',
    '.player-social-post-image img',
    '.player-photo-tile img',
    '.player-photo img',
    '.album-photo-image img',
    '.player-official-image img',
    '.player-public-cover img',
    '.participant-photo-preview img',
    '.participant-cover-preview img'
  ].join(',');

  let root = null;
  let image = null;
  let side = null;
  let index = 0;
  let items = [];
  let currentContext = null;
  let currentProfile = null;
  let paintToken = 0;
  let lastActiveElement = null;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeUrl = (value) => { try { const u = new URL(String(value || ''), location.href); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const fmt = (value) => { try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); } catch { return ''; } };
  const displayName = (profile) => profile?.display_name || profile?.nick || 'Participante';

  const ensure = () => {
    if (root) return root;
    root = document.createElement('div');
    root.className = 'photo-lightbox';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    root.setAttribute('aria-label','Visualização da foto');
    root.setAttribute('aria-hidden','true');
    root.innerHTML = `
      <div class="photo-lightbox-shell">
        <section class="photo-lightbox-stage">
          <button class="photo-lightbox-close" type="button" aria-label="Fechar">×</button>
          <button class="photo-lightbox-nav photo-lightbox-prev" type="button" aria-label="Foto anterior">‹</button>
          <img class="photo-lightbox-image" alt="">
          <button class="photo-lightbox-nav photo-lightbox-next" type="button" aria-label="Próxima foto">›</button>
        </section>
        <aside class="photo-lightbox-side" aria-live="polite">
          <div class="photo-lightbox-side-loading">Carregando detalhes...</div>
        </aside>
      </div>`;
    document.body.appendChild(root);
    image = root.querySelector('.photo-lightbox-image');
    side = root.querySelector('.photo-lightbox-side');
    root.querySelector('.photo-lightbox-close').addEventListener('click', close);
    root.querySelector('.photo-lightbox-prev').addEventListener('click', (event) => { event.stopPropagation(); move(-1); });
    root.querySelector('.photo-lightbox-next').addEventListener('click', (event) => { event.stopPropagation(); move(1); });
    root.addEventListener('click', (event) => { if (event.target === root) close(); });
    return root;
  };

  const visible = (el) => {
    const src = el.currentSrc || el.src;
    if (!src) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const groupFor = (el) => {
    const explicit = String(el?.dataset?.lightboxGroup || '').trim();
    if (explicit) return explicit;
    const post = el.closest?.('.community-post');
    if (post) return `feed:${location.pathname}`;
    if (el.closest?.('#communityPhotos')) return 'community-own-photos';
    if (el.matches?.('.album-photo-image img')) return `album:${location.pathname}${location.search}`;
    if (el.matches?.('.player-social-post-image img,.player-photo-tile img,.player-photo img,.player-official-image img,.player-public-cover img')) return `player:${location.pathname}${location.search}`;
    if (el.matches?.('.premium-album-thumb img')) return 'community-album-thumbs';
    if (el.matches?.('.participant-photo-preview img')) return 'participant-profile-photo';
    if (el.matches?.('.participant-cover-preview img')) return 'participant-cover-photo';
    return '';
  };

  const visibleItems = (target) => {
    const group = groupFor(target);
    const all = [...document.querySelectorAll(selector)].filter(visible);
    if (!group) return [target];
    const grouped = all.filter((el) => groupFor(el) === group);
    return grouped.length ? grouped : [target];
  };

  const storagePathFromUrl = (src) => {
    try {
      const pathname = new URL(src).pathname;
      const markers = [
        '/storage/v1/object/sign/cosplaychess-social-media/',
        '/storage/v1/object/public/cosplaychess-social-media/'
      ];
      for (const marker of markers) {
        const at = pathname.indexOf(marker);
        if (at >= 0) return decodeURIComponent(pathname.slice(at + marker.length));
      }
    } catch {}
    return '';
  };

  const getCurrentProfile = async () => {
    if (!db?.auth || currentProfile) return currentProfile;
    const { data: session } = await db.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url')
      .eq('user_id',userId)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    currentProfile = data || null;
    return currentProfile;
  };

  const loadProfile = async (id) => {
    if (!id || !db) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url')
      .eq('id',id)
      .maybeSingle();
    return data || null;
  };

  const resolveContext = async (target) => {
    const src = target.currentSrc || target.src;
    const fallbackCaption = target.dataset.lightboxCaption || target.alt || '';
    const path = storagePathFromUrl(src);
    const base = { kind:'generic', id:null, author:null, caption:fallbackCaption, created_at:null, src };
    if (!db || !path) return base;

    const { data: photo } = await db.from('cosplay_social_album_photos')
      .select('id,album_id,owner_profile_id,image_path,caption,created_at')
      .eq('image_path',path)
      .limit(1)
      .maybeSingle();
    if (photo) {
      return {
        kind:'album-photo',
        id:photo.id,
        album_id:photo.album_id,
        author:await loadProfile(photo.owner_profile_id),
        caption:photo.caption || fallbackCaption,
        created_at:photo.created_at,
        src
      };
    }

    const { data: post } = await db.from('cosplay_social_posts')
      .select('id,author_profile_id,body,image_path,created_at')
      .eq('image_path',path)
      .limit(1)
      .maybeSingle();
    if (post) {
      return {
        kind:'post-photo',
        id:post.id,
        author:await loadProfile(post.author_profile_id),
        caption:post.body || fallbackCaption,
        created_at:post.created_at,
        src
      };
    }
    return base;
  };

  const loadComments = async (context) => {
    if (!db || !context?.id || !['album-photo','post-photo'].includes(context.kind)) return [];
    const table = context.kind === 'album-photo' ? 'cosplay_social_photo_comments' : 'cosplay_social_comments';
    let query = db.from(table).select('id,author_profile_id,body,created_at').order('created_at',{ascending:true}).limit(100);
    query = context.kind === 'album-photo' ? query.eq('photo_id',context.id) : query.eq('post_id',context.id).eq('moderation_status','active');
    const { data, error } = await query;
    if (error || !data?.length) return [];
    const ids = [...new Set(data.map((row) => row.author_profile_id).filter(Boolean))];
    const { data: profiles } = await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url')
      .in('id',ids);
    const map = new Map((profiles || []).map((profile) => [profile.id,profile]));
    return data.map((row) => ({ ...row, author:map.get(row.author_profile_id) || null }));
  };

  const avatarHtml = (profile) => {
    const src = safeUrl(profile?.character_photo_url);
    return `<span class="photo-lightbox-avatar">${src ? `<img src="${esc(src)}" alt="">` : '♜'}</span>`;
  };

  const renderSide = async (context, token) => {
    if (!side || token !== paintToken) return;
    side.innerHTML = '<div class="photo-lightbox-side-loading">Carregando detalhes...</div>';
    const comments = await loadComments(context);
    const me = await getCurrentProfile();
    if (token !== paintToken) return;
    const author = context.author;
    const profileUrl = author?.public_slug ? `./jogador.html?slug=${encodeURIComponent(author.public_slug)}` : '#';
    side.innerHTML = `
      <header class="photo-lightbox-author">
        ${avatarHtml(author)}
        <div><a href="${esc(profileUrl)}">${esc(displayName(author))}</a><span>${esc(author?.character_name ? `Cosplay: ${author.character_name}` : 'CosplayChess')}</span></div>
      </header>
      <section class="photo-lightbox-description">
        <p>${esc(context.caption || 'Foto do CosplayChess')}</p>
        ${context.created_at ? `<small>${esc(fmt(context.created_at))}</small>` : ''}
      </section>
      <section class="photo-lightbox-comments">
        <div class="photo-lightbox-comments-head"><b>Comentários</b><span>${comments.length}</span></div>
        <div class="photo-lightbox-comments-list">
          ${comments.length ? comments.map((comment) => `<article>${avatarHtml(comment.author)}<div><b>${esc(displayName(comment.author))}</b><p>${esc(comment.body)}</p><small>${esc(fmt(comment.created_at))}</small></div></article>`).join('') : '<div class="photo-lightbox-no-comments">Nenhum comentário nesta foto ainda.</div>'}
        </div>
        ${me && ['album-photo','post-photo'].includes(context.kind) ? `<form class="photo-lightbox-comment-form"><span class="photo-lightbox-avatar">${safeUrl(me.character_photo_url) ? `<img src="${esc(safeUrl(me.character_photo_url))}" alt="">` : '♜'}</span><div><textarea maxlength="1200" rows="2" placeholder="Comente nesta foto..." required></textarea><button type="submit">Comentar</button><small class="photo-lightbox-comment-status"></small></div></form>` : ''}
      </section>`;

    const form = side.querySelector('.photo-lightbox-comment-form');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const textarea = form.querySelector('textarea');
      const button = form.querySelector('button');
      const status = form.querySelector('.photo-lightbox-comment-status');
      const body = textarea.value.trim();
      if (!body || !me) return;
      button.disabled = true;
      status.textContent = 'Enviando...';
      const payload = context.kind === 'album-photo'
        ? { photo_id:context.id, author_profile_id:me.id, body }
        : { post_id:context.id, author_profile_id:me.id, body, moderation_status:'active' };
      const table = context.kind === 'album-photo' ? 'cosplay_social_photo_comments' : 'cosplay_social_comments';
      const { error } = await db.from(table).insert(payload);
      button.disabled = false;
      if (error) {
        status.textContent = 'Não foi possível comentar.';
        return;
      }
      textarea.value = '';
      status.textContent = '';
      await renderSide(context, token);
    });
  };

  const paint = async () => {
    if (!items.length || !image || !root) return;
    const token = ++paintToken;
    const target = items[index];
    if (!(target instanceof HTMLImageElement) || !target.isConnected) {
      close();
      return;
    }
    const src = target.currentSrc || target.src;
    if (!src) {
      close();
      return;
    }
    const fallback = target.dataset.lightboxCaption || target.alt || '';
    image.src = src;
    image.alt = fallback || 'Foto ampliada';
    root.dataset.single = items.length <= 1 ? '1' : '0';
    currentContext = await resolveContext(target);
    if (token !== paintToken) return;
    image.alt = currentContext.caption || fallback || 'Foto ampliada';
    renderSide(currentContext, token).catch(() => {});
  };

  const open = (target) => {
    ensure();
    lastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    items = visibleItems(target);
    index = Math.max(0,items.indexOf(target));
    if (!items.length) items = [target];
    root.classList.add('open');
    root.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('photo-lightbox-open');
    document.body.classList.add('photo-lightbox-open');
    paint().catch(() => close());
    root.querySelector('.photo-lightbox-close')?.focus({preventScroll:true});
  };

  function close() {
    if (!root?.classList.contains('open')) return;
    root.classList.remove('open');
    root.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('photo-lightbox-open');
    document.body.classList.remove('photo-lightbox-open');
    paintToken += 1;
    currentContext = null;
    items = [];
    index = 0;
    if (image) {
      image.removeAttribute('src');
      image.alt = '';
    }
    if (side) side.innerHTML = '<div class="photo-lightbox-side-loading">Carregando detalhes...</div>';
    const focusTarget = lastActiveElement;
    lastActiveElement = null;
    if (focusTarget?.isConnected) requestAnimationFrame(() => focusTarget.focus({preventScroll:true}));
  }

  const move = (step) => {
    if (items.length <= 1) return;
    index = (index + step + items.length) % items.length;
    paint().catch(() => close());
  };

  document.addEventListener('click',(event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest(selector);
    if (!target || !(target instanceof HTMLImageElement) || root?.contains(target)) return;
    event.preventDefault();
    open(target);
  });

  document.addEventListener('keydown',(event) => {
    if (!root?.classList.contains('open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(1);
    }
  });

  window.addEventListener('pagehide', () => {
    document.documentElement.classList.remove('photo-lightbox-open');
    document.body.classList.remove('photo-lightbox-open');
  });
})();