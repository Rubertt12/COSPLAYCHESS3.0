(() => {
  'use strict';
  if (window.__COSPLAY_PHOTO_MODAL_V30__) return;
  window.__COSPLAY_PHOTO_MODAL_V30__ = true;

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
  let items = [];
  let index = 0;
  let token = 0;
  let currentContext = null;
  let currentProfile = null;
  let lastActiveElement = null;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const safeUrl = (value) => {
    try {
      const url = new URL(String(value || ''), location.href);
      return ['http:','https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  const fmt = (value) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
      }).format(new Date(value));
    } catch {
      return '';
    }
  };

  const relative = (value) => {
    try {
      const ms = Math.max(0, Date.now() - new Date(value).getTime());
      const min = Math.floor(ms / 60000);
      if (min < 1) return 'agora';
      if (min < 60) return `${min} min`;
      const hour = Math.floor(min / 60);
      if (hour < 24) return `${hour} h`;
      const day = Math.floor(hour / 24);
      if (day < 7) return `${day} d`;
      return fmt(value);
    } catch {
      return '';
    }
  };

  const displayName = (profile) => profile?.display_name || profile?.nick || 'Participante';
  const profileHref = (profile) => profile?.public_slug ? `./jogador.html?slug=${encodeURIComponent(profile.public_slug)}` : '#';

  const ensureStyle = () => {
    if (document.getElementById('cc-photo-modal-v30-css')) return;
    const link = document.createElement('link');
    link.id = 'cc-photo-modal-v30-css';
    link.rel = 'stylesheet';
    link.href = './social-photo-modal-v30.css?v=20260903-30';
    document.head.appendChild(link);
  };

  const avatarHtml = (profile, small = false) => {
    const src = safeUrl(profile?.character_photo_url);
    return `<span class="cc30-avatar${small ? ' small' : ''}">${src ? `<img src="${esc(src)}" alt="">` : '♜'}</span>`;
  };

  const ensure = () => {
    if (root) return root;
    ensureStyle();
    root = document.createElement('div');
    root.className = 'cc30-photo-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Visualização de foto');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="cc30-photo-shell">
        <section class="cc30-photo-stage">
          <button class="cc30-photo-close" type="button" aria-label="Fechar">×</button>
          <button class="cc30-photo-nav cc30-photo-prev" type="button" aria-label="Foto anterior">‹</button>
          <img class="cc30-photo-image" alt="">
          <button class="cc30-photo-nav cc30-photo-next" type="button" aria-label="Próxima foto">›</button>
        </section>
        <aside class="cc30-photo-side" aria-live="polite"></aside>
      </div>`;
    document.body.appendChild(root);
    image = root.querySelector('.cc30-photo-image');
    side = root.querySelector('.cc30-photo-side');

    root.querySelector('.cc30-photo-close').addEventListener('click', close);
    root.querySelector('.cc30-photo-prev').addEventListener('click', (event) => {
      event.stopPropagation();
      move(-1);
    });
    root.querySelector('.cc30-photo-next').addEventListener('click', (event) => {
      event.stopPropagation();
      move(1);
    });
    root.addEventListener('click', (event) => {
      if (event.target === root) close();
    });

    return root;
  };

  const visible = (el) => {
    if (!(el instanceof HTMLImageElement)) return false;
    const src = el.currentSrc || el.src;
    if (!src) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const groupFor = (el) => {
    const explicit = String(el?.dataset?.lightboxGroup || '').trim();
    if (explicit) return explicit;
    if (el.closest?.('.community-post')) return `feed:${location.pathname}`;
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
    if (!group) return [target];
    const grouped = [...document.querySelectorAll(selector)]
      .filter(visible)
      .filter((el) => groupFor(el) === group);
    return grouped.length ? grouped : [target];
  };

  const storagePathFromUrl = (src) => {
    try {
      const pathname = new URL(src, location.href).pathname;
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
    if (currentProfile) return currentProfile;
    if (!db?.auth) return null;
    const { data: session } = await db.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url,user_id')
      .eq('user_id', userId)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending:false })
      .limit(1)
      .maybeSingle();
    currentProfile = data || null;
    return currentProfile;
  };

  const loadProfile = async (id) => {
    if (!id || !db) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url')
      .eq('id', id)
      .maybeSingle();
    return data || null;
  };

  const resolveContext = async (target) => {
    const src = target.currentSrc || target.src;
    const fallbackCaption = target.dataset.lightboxCaption || target.alt || '';
    const path = storagePathFromUrl(src);
    const fallback = {
      kind:'generic', id:null, ownerProfileId:null, author:null,
      caption:fallbackCaption, created_at:null, src, path
    };
    if (!db || !path) return fallback;

    const { data: photo } = await db.from('cosplay_social_album_photos')
      .select('id,album_id,owner_profile_id,image_path,caption,created_at')
      .eq('image_path', path)
      .limit(1)
      .maybeSingle();
    if (photo) {
      return {
        kind:'album-photo', id:photo.id, album_id:photo.album_id,
        ownerProfileId:photo.owner_profile_id,
        author:await loadProfile(photo.owner_profile_id),
        caption:photo.caption || fallbackCaption,
        created_at:photo.created_at, src, path
      };
    }

    const { data: post } = await db.from('cosplay_social_posts')
      .select('id,author_profile_id,body,image_path,created_at')
      .eq('image_path', path)
      .limit(1)
      .maybeSingle();
    if (post) {
      return {
        kind:'post-photo', id:post.id,
        ownerProfileId:post.author_profile_id,
        author:await loadProfile(post.author_profile_id),
        caption:post.body || fallbackCaption,
        created_at:post.created_at, src, path
      };
    }

    return fallback;
  };

  const loadComments = async (context) => {
    if (!db || !context?.id || !['album-photo','post-photo'].includes(context.kind)) return [];
    const table = context.kind === 'album-photo' ? 'cosplay_social_photo_comments' : 'cosplay_social_comments';
    let query = db.from(table)
      .select('id,author_profile_id,body,created_at')
      .order('created_at', { ascending:true })
      .limit(150);
    query = context.kind === 'album-photo'
      ? query.eq('photo_id', context.id)
      : query.eq('post_id', context.id).eq('moderation_status', 'active');

    const { data, error } = await query;
    if (error || !data?.length) return [];

    const ids = [...new Set(data.map((row) => row.author_profile_id).filter(Boolean))];
    let profiles = [];
    if (ids.length) {
      const result = await db.from('cosplay_participant_profiles')
        .select('id,public_slug,display_name,nick,character_name,character_photo_url')
        .in('id', ids);
      profiles = result.data || [];
    }
    const map = new Map(profiles.map((profile) => [profile.id, profile]));
    return data.map((row) => ({ ...row, author:map.get(row.author_profile_id) || null }));
  };

  const loadEngagement = async (context, me, commentCount) => {
    const base = { likes:0, shares:0, comments:commentCount, liked:false };
    if (!db || context?.kind !== 'post-photo' || !context.id) return base;
    const queries = [
      db.from('cosplay_social_post_likes').select('post_id', { count:'exact', head:true }).eq('post_id', context.id),
      db.from('cosplay_social_post_shares').select('post_id', { count:'exact', head:true }).eq('post_id', context.id)
    ];
    if (me?.id) {
      queries.push(db.from('cosplay_social_post_likes')
        .select('post_id')
        .eq('post_id', context.id)
        .eq('profile_id', me.id)
        .maybeSingle());
    }
    const results = await Promise.all(queries);
    return {
      likes:results[0]?.count || 0,
      shares:results[1]?.count || 0,
      comments:commentCount,
      liked:!!results[2]?.data
    };
  };

  const commentHtml = (comment, context, me) => {
    const href = profileHref(comment.author);
    const own = !!me?.id && comment.author_profile_id === me.id;
    const canDelete = !!me?.id && (own || context.ownerProfileId === me.id);
    const controls = (own || canDelete) ? `
      <div class="cc30-comment-controls">
        <button class="cc30-comment-menu-toggle" type="button" aria-label="Opções do comentário" aria-expanded="false">•••</button>
        <div class="cc30-comment-menu" hidden>
          ${own ? '<button type="button" data-cc30-edit>Editar</button>' : ''}
          ${canDelete ? '<button class="danger" type="button" data-cc30-delete>Excluir</button>' : ''}
        </div>
      </div>` : '';

    return `<article class="cc30-comment" data-comment-id="${esc(comment.id)}" data-author-id="${esc(comment.author_profile_id || '')}" data-body="${esc(comment.body || '')}">
      <a href="${esc(href)}" aria-label="Perfil de ${esc(displayName(comment.author))}">${avatarHtml(comment.author, true)}</a>
      <div class="cc30-comment-main">
        <a class="cc30-comment-name" href="${esc(href)}">${esc(displayName(comment.author))}</a>
        <p class="cc30-comment-body">${esc(comment.body)}</p>
        <div class="cc30-comment-meta"><time title="${esc(fmt(comment.created_at))}">${esc(relative(comment.created_at))}</time></div>
      </div>
      ${controls}
    </article>`;
  };

  const setStatus = (message = '') => {
    const status = side?.querySelector('.cc30-comment-status');
    if (status) status.textContent = message;
  };

  const closeMenus = (except = null) => {
    root?.querySelectorAll('.cc30-comment-menu').forEach((menu) => {
      if (menu !== except) menu.hidden = true;
    });
    root?.querySelectorAll('.cc30-comment-menu-toggle').forEach((button) => {
      const ownMenu = button.parentElement?.querySelector('.cc30-comment-menu');
      button.setAttribute('aria-expanded', ownMenu && !ownMenu.hidden ? 'true' : 'false');
    });
  };

  const shareContext = async (context) => {
    const url = context.kind === 'post-photo' && context.id
      ? `${location.origin}${location.pathname}?post=${encodeURIComponent(context.id)}`
      : location.href;
    const data = {
      title:'CosplayChess',
      text:context.caption || 'Confira esta foto no CosplayChess',
      url
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setStatus('Link copiado.');
        setTimeout(() => setStatus(''), 1800);
      }
    } catch {}
  };

  const renderGeneric = (context) => {
    const caption = context.caption || 'Foto do CosplayChess';
    side.innerHTML = `
      <div class="cc30-generic-side">
        <header class="cc30-photo-author">
          ${avatarHtml(null)}
          <div class="cc30-author-copy"><a href="./index.html">CosplayChess</a><span>Visualização de foto</span></div>
        </header>
        <div class="cc30-generic-copy">${esc(caption)}</div>
      </div>`;
  };

  const renderSide = async (context, renderToken, options = {}) => {
    if (!side || renderToken !== token) return;
    side.innerHTML = `
      <header class="cc30-photo-author">
        ${avatarHtml(null)}
        <div class="cc30-author-copy"><a href="#">Carregando...</a><span>CosplayChess</span></div>
      </header>
      <div class="cc30-photo-thread"><div class="cc30-empty-comments"><span>Carregando publicação...</span></div></div>`;

    if (!['album-photo','post-photo'].includes(context.kind)) {
      renderGeneric(context);
      return;
    }

    const [comments, me] = await Promise.all([loadComments(context), getCurrentProfile()]);
    if (renderToken !== token) return;
    const engagement = await loadEngagement(context, me, comments.length);
    if (renderToken !== token) return;

    const author = context.author;
    const authorUrl = profileHref(author);
    const caption = context.caption || 'Foto do CosplayChess';
    const canLike = context.kind === 'post-photo' && !!me;
    const actionClass = canLike ? '' : ' two';

    side.innerHTML = `
      <header class="cc30-photo-author">
        <a href="${esc(authorUrl)}" aria-label="Perfil de ${esc(displayName(author))}">${avatarHtml(author)}</a>
        <div class="cc30-author-copy">
          <a href="${esc(authorUrl)}">${esc(displayName(author))}</a>
          <span>${esc(author?.character_name ? `Cosplay: ${author.character_name}` : 'CosplayChess')}</span>
        </div>
      </header>

      <section class="cc30-photo-thread">
        <article class="cc30-caption">
          <a href="${esc(authorUrl)}" aria-label="Perfil de ${esc(displayName(author))}">${avatarHtml(author, true)}</a>
          <div class="cc30-caption-copy">
            <p><a href="${esc(authorUrl)}">${esc(displayName(author))}</a>${esc(caption)}</p>
            ${context.created_at ? `<time title="${esc(fmt(context.created_at))}">${esc(relative(context.created_at))}</time>` : ''}
          </div>
        </article>
        <div class="cc30-comments-title"><b>Comentários</b><span data-cc30-comment-count>${comments.length}</span></div>
        <div class="cc30-comments-list">
          ${comments.length
            ? comments.map((comment) => commentHtml(comment, context, me)).join('')
            : '<div class="cc30-empty-comments"><div><b>Nenhum comentário ainda</b><span>Seja o primeiro a conversar sobre este cosplay.</span></div></div>'}
        </div>
      </section>

      <footer class="cc30-photo-footer">
        <div class="cc30-engagement">
          <span>${context.kind === 'post-photo' ? `<b data-cc30-like-count>${engagement.likes}</b> curtida${engagement.likes === 1 ? '' : 's'}` : '<b>Foto de álbum</b>'}</span>
          <span><b data-cc30-footer-comment-count>${comments.length}</b> comentário${comments.length === 1 ? '' : 's'}${engagement.shares ? ` · ${engagement.shares} compartilhamento${engagement.shares === 1 ? '' : 's'}` : ''}</span>
        </div>
        <div class="cc30-photo-actions${actionClass}">
          ${canLike ? `<button class="cc30-photo-action${engagement.liked ? ' is-active' : ''}" type="button" data-cc30-like><span class="cc30-action-icon">${engagement.liked ? '♥' : '♡'}</span><span>${engagement.liked ? 'Curtido' : 'Curtir'}</span></button>` : ''}
          <button class="cc30-photo-action" type="button" data-cc30-comment-focus><span class="cc30-action-icon">◯</span><span>Comentar</span></button>
          <button class="cc30-photo-action" type="button" data-cc30-share><span class="cc30-action-icon">↗</span><span>Compartilhar</span></button>
        </div>
        ${me ? `<form class="cc30-comment-form">
          ${avatarHtml(me, true)}
          <div class="cc30-comment-input"><textarea maxlength="1200" rows="1" placeholder="Adicione um comentário..." aria-label="Adicionar comentário" required></textarea></div>
          <button class="cc30-comment-submit" type="submit">Publicar</button>
        </form><div class="cc30-comment-status"></div>` : ''}
      </footer>`;

    bindSideEvents(context, me, renderToken);

    if (options.scrollToEnd) {
      requestAnimationFrame(() => {
        const thread = side?.querySelector('.cc30-photo-thread');
        if (thread) thread.scrollTop = thread.scrollHeight;
      });
    }
  };

  const beginEdit = (article) => {
    closeMenus();
    if (!article || article.querySelector('.cc30-comment-editor')) return;
    const bodyNode = article.querySelector('.cc30-comment-body');
    if (!bodyNode) return;
    const editor = document.createElement('div');
    editor.className = 'cc30-comment-editor';
    editor.innerHTML = `
      <textarea maxlength="1200" rows="3" aria-label="Editar comentário"></textarea>
      <div class="cc30-editor-actions">
        <span class="cc30-editor-status"></span>
        <button type="button" data-cc30-cancel>Cancelar</button>
        <button class="save" type="button" data-cc30-save>Salvar</button>
      </div>`;
    const textarea = editor.querySelector('textarea');
    textarea.value = article.dataset.body || bodyNode.textContent || '';
    bodyNode.hidden = true;
    bodyNode.after(editor);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  };

  const cancelEdit = (article) => {
    article?.querySelector('.cc30-comment-editor')?.remove();
    const bodyNode = article?.querySelector('.cc30-comment-body');
    if (bodyNode) bodyNode.hidden = false;
  };

  const saveEdit = async (article, context, me, button) => {
    if (!article || !me || article.dataset.authorId !== me.id) return;
    const editor = article.querySelector('.cc30-comment-editor');
    const textarea = editor?.querySelector('textarea');
    const status = editor?.querySelector('.cc30-editor-status');
    const body = String(textarea?.value || '').trim();
    if (!body) {
      if (status) status.textContent = 'Digite algo antes de salvar.';
      textarea?.focus();
      return;
    }

    button.disabled = true;
    if (status) status.textContent = 'Salvando...';
    const table = context.kind === 'album-photo' ? 'cosplay_social_photo_comments' : 'cosplay_social_comments';
    const { error } = await db.from(table)
      .update({ body })
      .eq('id', article.dataset.commentId)
      .eq('author_profile_id', me.id);
    button.disabled = false;

    if (error) {
      if (status) status.textContent = 'Não foi possível editar.';
      return;
    }

    article.dataset.body = body;
    const bodyNode = article.querySelector('.cc30-comment-body');
    if (bodyNode) {
      bodyNode.textContent = body;
      bodyNode.hidden = false;
    }
    editor?.remove();
  };

  const deleteComment = async (article, context, me, button) => {
    if (!article || !me) return;
    const own = article.dataset.authorId === me.id;
    const canDelete = own || context.ownerProfileId === me.id;
    if (!canDelete) return;
    if (!window.confirm('Excluir este comentário?')) return;

    button.disabled = true;
    const table = context.kind === 'album-photo' ? 'cosplay_social_photo_comments' : 'cosplay_social_comments';
    let query = db.from(table).delete().eq('id', article.dataset.commentId);
    query = context.kind === 'album-photo'
      ? query.eq('photo_id', context.id)
      : query.eq('post_id', context.id);
    const { error } = await query;
    button.disabled = false;

    if (error) {
      setStatus('Não foi possível excluir o comentário.');
      return;
    }

    article.remove();
    const list = side.querySelector('.cc30-comments-list');
    const count = list?.querySelectorAll('.cc30-comment').length || 0;
    side.querySelectorAll('[data-cc30-comment-count],[data-cc30-footer-comment-count]').forEach((node) => {
      node.textContent = String(count);
    });
    if (count === 0 && list) {
      list.innerHTML = '<div class="cc30-empty-comments"><div><b>Nenhum comentário ainda</b><span>Seja o primeiro a conversar sobre este cosplay.</span></div></div>';
    }
  };

  const bindSideEvents = (context, me, renderToken) => {
    if (!side || renderToken !== token) return;
    const form = side.querySelector('.cc30-comment-form');
    const textarea = form?.querySelector('textarea');

    const resizeComposer = () => {
      if (!textarea) return;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(108, Math.max(38, textarea.scrollHeight))}px`;
    };
    textarea?.addEventListener('input', resizeComposer);
    textarea?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        form?.requestSubmit();
      }
    });

    side.querySelector('[data-cc30-comment-focus]')?.addEventListener('click', () => textarea?.focus());
    side.querySelector('[data-cc30-share]')?.addEventListener('click', () => shareContext(context));

    side.querySelector('[data-cc30-like]')?.addEventListener('click', async (event) => {
      if (!me || context.kind !== 'post-photo') return;
      const button = event.currentTarget;
      const active = button.classList.contains('is-active');
      button.disabled = true;
      const result = active
        ? await db.from('cosplay_social_post_likes').delete().eq('post_id', context.id).eq('profile_id', me.id)
        : await db.from('cosplay_social_post_likes').insert({ post_id:context.id, profile_id:me.id });
      button.disabled = false;
      if (result.error) return;
      const next = !active;
      button.classList.toggle('is-active', next);
      button.querySelector('.cc30-action-icon').textContent = next ? '♥' : '♡';
      button.querySelector('span:last-child').textContent = next ? 'Curtido' : 'Curtir';
      const count = side.querySelector('[data-cc30-like-count]');
      if (count) count.textContent = String(Math.max(0, Number(count.textContent || 0) + (next ? 1 : -1)));
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!me || !textarea) return;
      const body = textarea.value.trim();
      if (!body) return;
      const submit = form.querySelector('.cc30-comment-submit');
      submit.disabled = true;
      setStatus('Publicando...');
      const table = context.kind === 'album-photo' ? 'cosplay_social_photo_comments' : 'cosplay_social_comments';
      const payload = context.kind === 'album-photo'
        ? { photo_id:context.id, author_profile_id:me.id, body }
        : { post_id:context.id, author_profile_id:me.id, body, moderation_status:'active' };
      const { error } = await db.from(table).insert(payload);
      submit.disabled = false;
      if (error) {
        setStatus('Não foi possível publicar o comentário.');
        return;
      }
      textarea.value = '';
      resizeComposer();
      setStatus('');
      await renderSide(context, renderToken, { scrollToEnd:true });
    });

    side.addEventListener('click', async (event) => {
      const toggle = event.target.closest('.cc30-comment-menu-toggle');
      if (toggle) {
        event.preventDefault();
        event.stopPropagation();
        const menu = toggle.parentElement?.querySelector('.cc30-comment-menu');
        if (!menu) return;
        const opening = menu.hidden;
        closeMenus(menu);
        menu.hidden = !opening;
        toggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
        return;
      }

      const edit = event.target.closest('[data-cc30-edit]');
      if (edit) {
        event.preventDefault();
        beginEdit(edit.closest('.cc30-comment'));
        return;
      }

      const cancel = event.target.closest('[data-cc30-cancel]');
      if (cancel) {
        event.preventDefault();
        cancelEdit(cancel.closest('.cc30-comment'));
        return;
      }

      const save = event.target.closest('[data-cc30-save]');
      if (save) {
        event.preventDefault();
        await saveEdit(save.closest('.cc30-comment'), context, me, save);
        return;
      }

      const remove = event.target.closest('[data-cc30-delete]');
      if (remove) {
        event.preventDefault();
        await deleteComment(remove.closest('.cc30-comment'), context, me, remove);
        return;
      }

      if (!event.target.closest('.cc30-comment-controls')) closeMenus();
    });

    side.addEventListener('keydown', (event) => {
      const editor = event.target.closest?.('.cc30-comment-editor');
      if (!editor) return;
      const article = editor.closest('.cc30-comment');
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelEdit(article);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        const save = editor.querySelector('[data-cc30-save]');
        if (save) saveEdit(article, context, me, save);
      }
    });
  };

  const paint = async () => {
    if (!root || !image || !side || !items.length) return;
    const paintToken = ++token;
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
    side.innerHTML = `
      <header class="cc30-photo-author">${avatarHtml(null)}<div class="cc30-author-copy"><a href="#">Carregando...</a><span>CosplayChess</span></div></header>
      <div class="cc30-photo-thread"><div class="cc30-empty-comments"><span>Carregando detalhes...</span></div></div>`;

    currentContext = await resolveContext(target);
    if (paintToken !== token) return;
    image.alt = currentContext.caption || fallback || 'Foto ampliada';
    await renderSide(currentContext, paintToken);
  };

  const move = (delta) => {
    if (!items.length) return;
    index = (index + delta + items.length) % items.length;
    paint().catch(() => {});
  };

  function open(target) {
    ensure();
    items = visibleItems(target);
    index = Math.max(0, items.indexOf(target));
    lastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('cc-photo-modal-open');
    document.body.classList.add('cc-photo-modal-open');
    root.querySelector('.cc30-photo-close')?.focus({ preventScroll:true });
    paint().catch(() => close());
  }

  function close() {
    if (!root) return;
    token++;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('cc-photo-modal-open');
    document.body.classList.remove('cc-photo-modal-open');
    image?.removeAttribute('src');
    if (image) image.alt = '';
    if (side) side.innerHTML = '';
    items = [];
    index = 0;
    currentContext = null;
    closeMenus();
    const restore = lastActiveElement;
    lastActiveElement = null;
    if (restore?.isConnected) requestAnimationFrame(() => restore.focus({ preventScroll:true }));
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('.cc30-photo-modal')) return;
    const target = event.target.closest(selector);
    if (!(target instanceof HTMLImageElement) || !visible(target)) return;
    event.preventDefault();
    open(target);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (!root?.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      const openEditor = root.querySelector('.cc30-comment-editor');
      if (openEditor) {
        cancelEdit(openEditor.closest('.cc30-comment'));
        return;
      }
      close();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(1);
    }
  });

  window.addEventListener('pagehide', () => {
    document.documentElement.classList.remove('cc-photo-modal-open');
    document.body.classList.remove('cc-photo-modal-open');
  });
})();
