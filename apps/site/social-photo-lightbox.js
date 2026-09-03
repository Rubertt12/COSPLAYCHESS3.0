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
  const relative = (value) => {
    try {
      const ms = Date.now() - new Date(value).getTime();
      const min = Math.max(0, Math.floor(ms / 60000));
      if (min < 1) return 'agora';
      if (min < 60) return `${min} min`;
      const hour = Math.floor(min / 60);
      if (hour < 24) return `${hour} h`;
      const day = Math.floor(hour / 24);
      if (day < 7) return `${day} d`;
      return fmt(value);
    } catch { return ''; }
  };
  const displayName = (profile) => profile?.display_name || profile?.nick || 'Participante';
  const profileHref = (profile) => profile?.public_slug ? `./jogador.html?slug=${encodeURIComponent(profile.public_slug)}` : '#';

  const injectStyle = () => {
    if (document.getElementById('cc-photo-lightbox-social-v26')) return;
    const link = document.createElement('link');
    link.id = 'cc-photo-lightbox-social-v26';
    link.rel = 'stylesheet';
    link.href = './social-photo-lightbox-social-v26.css?v=20260903-1';
    document.head.appendChild(link);
  };
  injectStyle();

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

  const loadEngagement = async (context, me, commentCount) => {
    const base = { likes:0, shares:0, comments:commentCount, liked:false };
    if (!db || context?.kind !== 'post-photo' || !context.id) return base;
    const queries = [
      db.from('cosplay_social_post_likes').select('post_id',{count:'exact',head:true}).eq('post_id',context.id),
      db.from('cosplay_social_post_shares').select('post_id',{count:'exact',head:true}).eq('post_id',context.id)
    ];
    if (me?.id) queries.push(db.from('cosplay_social_post_likes').select('post_id').eq('post_id',context.id).eq('profile_id',me.id).maybeSingle());
    const results = await Promise.all(queries);
    return {
      likes:results[0]?.count || 0,
      shares:results[1]?.count || 0,
      comments:commentCount,
      liked:!!results[2]?.data
    };
  };

  const avatarHtml = (profile) => {
    const src = safeUrl(profile?.character_photo_url);
    return `<span class="photo-lightbox-avatar">${src ? `<img src="${esc(src)}" alt="">` : '♜'}</span>`;
  };

  const commentHtml = (comment) => {
    const href = profileHref(comment.author);
    return `<article class="photo-lightbox-comment">
      <a class="photo-lightbox-comment-avatar" href="${esc(href)}" aria-label="Perfil de ${esc(displayName(comment.author))}">${avatarHtml(comment.author)}</a>
      <div class="photo-lightbox-comment-content">
        <div class="photo-lightbox-comment-bubble">
          <a class="photo-lightbox-comment-name" href="${esc(href)}">${esc(displayName(comment.author))}</a>
          <p>${esc(comment.body)}</p>
        </div>
        <div class="photo-lightbox-comment-meta"><time title="${esc(fmt(comment.created_at))}">${esc(relative(comment.created_at))}</time></div>
      </div>
    </article>`;
  };

  const shareContext = async (context) => {
    const url = context.kind === 'post-photo' && context.id
      ? `${location.origin}${location.pathname}?post=${encodeURIComponent(context.id)}`
      : location.href;
    const data = { title:'CosplayChess', text:context.caption || 'Confira esta foto no CosplayChess', url };
    try {
      if (navigator.share) await navigator.share(data);
      else if (navigator.clipboard) await navigator.clipboard.writeText(url);
    } catch {}
  };

  const renderSide = async (context, token, options = {}) => {
    if (!side || token !== paintToken) return;
    side.innerHTML = '<div class="photo-lightbox-side-loading">Carregando detalhes...</div>';
    const [comments, me] = await Promise.all([loadComments(context), getCurrentProfile()]);
    const engagement = await loadEngagement(context, me, comments.length);
    if (token !== paintToken) return;

    const author = context.author;
    const authorUrl = profileHref(author);
    const interactive = ['album-photo','post-photo'].includes(context.kind);
    const canLike = context.kind === 'post-photo' && !!me;
    const actionCount = canLike ? 3 : 2;
    const caption = context.caption || 'Foto do CosplayChess';

    side.innerHTML = `
      <header class="photo-lightbox-author">
        <a class="photo-lightbox-author-avatar" href="${esc(authorUrl)}">${avatarHtml(author)}</a>
        <div class="photo-lightbox-author-copy">
          <a href="${esc(authorUrl)}">${esc(displayName(author))}</a>
          <span>${esc(author?.character_name ? `Cosplay: ${author.character_name}` : 'CosplayChess')}</span>
        </div>
      </header>

      <section class="photo-lightbox-discussion">
        <article class="photo-lightbox-caption-row">
          <a class="photo-lightbox-comment-avatar" href="${esc(authorUrl)}">${avatarHtml(author)}</a>
          <div class="photo-lightbox-caption-copy">
            <p><a href="${esc(authorUrl)}">${esc(displayName(author))}</a> ${esc(caption)}</p>
            ${context.created_at ? `<time title="${esc(fmt(context.created_at))}">${esc(relative(context.created_at))}</time>` : ''}
          </div>
        </article>

        <div class="photo-lightbox-comments-head">
          <b>Comentários</b>
          <span>${comments.length}</span>
        </div>
        <div class="photo-lightbox-comments-list">
          ${comments.length ? comments.map(commentHtml).join('') : '<div class="photo-lightbox-no-comments"><b>Seja o primeiro a comentar</b><span>Comece a conversa sobre este cosplay.</span></div>'}
        </div>
      </section>

      ${interactive ? `<section class="photo-lightbox-engagement">
        <div class="photo-lightbox-engagement-summary">
          ${context.kind === 'post-photo' ? `<span><b data-photo-like-count>${engagement.likes}</b> curtida${engagement.likes === 1 ? '' : 's'}</span>` : '<span>Foto do álbum</span>'}
          <span><b>${comments.length}</b> comentário${comments.length === 1 ? '' : 's'}${context.kind === 'post-photo' && engagement.shares ? ` · <b>${engagement.shares}</b> compartilhamento${engagement.shares === 1 ? '' : 's'}` : ''}</span>
        </div>
        <div class="photo-lightbox-actionbar" style="--photo-action-count:${actionCount}">
          ${canLike ? `<button class="photo-lightbox-action${engagement.liked ? ' active' : ''}" type="button" data-photo-like><span class="photo-action-icon">${engagement.liked ? '♥' : '♡'}</span><span>${engagement.liked ? 'Curtido' : 'Curtir'}</span></button>` : ''}
          <button class="photo-lightbox-action" type="button" data-photo-comment><span class="photo-action-icon">◯</span><span>Comentar</span></button>
          <button class="photo-lightbox-action" type="button" data-photo-share><span class="photo-action-icon">↗</span><span>Compartilhar</span></button>
        </div>
      </section>` : ''}

      ${me && interactive ? `<form class="photo-lightbox-comment-form">
        <span class="photo-lightbox-comment-me">${avatarHtml(me)}</span>
        <div class="photo-lightbox-comment-input-wrap">
          <textarea maxlength="1200" rows="1" placeholder="Adicione um comentário..." aria-label="Adicionar comentário" required></textarea>
          <div class="photo-lightbox-comment-compose-meta"><small class="photo-lightbox-comment-status"></small><small class="photo-lightbox-comment-count">0/1200</small></div>
        </div>
        <button type="submit">Publicar</button>
      </form>` : ''}`;

    const form = side.querySelector('.photo-lightbox-comment-form');
    const textarea = form?.querySelector('textarea');
    const status = form?.querySelector('.photo-lightbox-comment-status');
    const counter = form?.querySelector('.photo-lightbox-comment-count');

    const updateComposer = () => {
      if (!textarea) return;
      if (counter) counter.textContent = `${textarea.value.length}/1200`;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(104, Math.max(38, textarea.scrollHeight))}px`;
    };
    textarea?.addEventListener('input', updateComposer);
    textarea?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        form?.requestSubmit();
      }
    });

    side.querySelector('[data-photo-comment]')?.addEventListener('click', () => textarea?.focus({preventScroll:false}));
    side.querySelector('[data-photo-share]')?.addEventListener('click', () => shareContext(context));

    side.querySelector('[data-photo-like]')?.addEventListener('click', async (event) => {
      if (!me || context.kind !== 'post-photo') return;
      const button = event.currentTarget;
      button.disabled = true;
      const active = button.classList.contains('active');
      const result = active
        ? await db.from('cosplay_social_post_likes').delete().eq('post_id',context.id).eq('profile_id',me.id)
        : await db.from('cosplay_social_post_likes').insert({post_id:context.id,profile_id:me.id});
      button.disabled = false;
      if (result.error) return;
      const next = !active;
      button.classList.toggle('active', next);
      button.querySelector('.photo-action-icon').textContent = next ? '♥' : '♡';
      button.querySelector('span:last-child').textContent = next ? 'Curtido' : 'Curtir';
      const count = side.querySelector('[data-photo-like-count]');
      if (count) count.textContent = String(Math.max(0, Number(count.textContent || 0) + (next ? 1 : -1)));
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button');
      const body = textarea.value.trim();
      if (!body || !me) return;
      button.disabled = true;
      status.textContent = 'Publicando...';
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
      updateComposer();
      status.textContent = '';
      await renderSide(context, token, { scrollToEnd:true });
    });

    if (options.scrollToEnd) {
      requestAnimationFrame(() => {
        const discussion = side?.querySelector('.photo-lightbox-discussion');
        if (discussion) discussion.scrollTop = discussion.scrollHeight;
      });
    }
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
