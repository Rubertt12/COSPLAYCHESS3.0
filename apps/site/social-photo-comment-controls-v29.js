(() => {
  'use strict';
  if (window.__CC_PHOTO_COMMENT_CONTROLS_V29__) return;
  window.__CC_PHOTO_COMMENT_CONTROLS_V29__ = true;

  const db = window.getCosplayChessParticipantDb
    ? window.getCosplayChessParticipantDb()
    : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  let me = null;
  let sideObserver = null;
  let bootObserver = null;
  let syncTimer = 0;
  let syncToken = 0;

  const storagePathFromUrl = (src) => {
    try {
      const pathname = new URL(String(src || ''), location.href).pathname;
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

  const getMe = async () => {
    if (me) return me;
    const { data: session } = await db.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,user_id')
      .eq('user_id', userId)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending:false })
      .limit(1)
      .maybeSingle();
    me = data || null;
    return me;
  };

  const currentImagePath = () => {
    const image = document.querySelector('.photo-lightbox.open .photo-lightbox-image');
    return storagePathFromUrl(image?.currentSrc || image?.src || '');
  };

  const resolveContext = async () => {
    const path = currentImagePath();
    if (!path) return null;

    const { data: photo } = await db.from('cosplay_social_album_photos')
      .select('id,owner_profile_id,image_path')
      .eq('image_path', path)
      .limit(1)
      .maybeSingle();
    if (photo) {
      return {
        kind:'album-photo',
        id:photo.id,
        ownerProfileId:photo.owner_profile_id,
        table:'cosplay_social_photo_comments',
        foreignKey:'photo_id',
        path
      };
    }

    const { data: post } = await db.from('cosplay_social_posts')
      .select('id,author_profile_id,image_path')
      .eq('image_path', path)
      .limit(1)
      .maybeSingle();
    if (!post) return null;
    return {
      kind:'post-photo',
      id:post.id,
      ownerProfileId:post.author_profile_id,
      table:'cosplay_social_comments',
      foreignKey:'post_id',
      path
    };
  };

  const loadRows = async (context) => {
    let query = db.from(context.table)
      .select('id,author_profile_id,body,created_at')
      .eq(context.foreignKey, context.id)
      .order('created_at', { ascending:true })
      .limit(100);
    if (context.kind === 'post-photo') query = query.eq('moderation_status', 'active');
    const { data, error } = await query;
    return error ? [] : (data || []);
  };

  const closeMenus = (except = null) => {
    document.querySelectorAll('.cc-photo-comment-menu-pop').forEach((menu) => {
      if (menu !== except) menu.hidden = true;
    });
  };

  const refreshVisibleCount = () => {
    const side = document.querySelector('.photo-lightbox.open .photo-lightbox-side');
    if (!side) return;
    const list = side.querySelector('.photo-lightbox-comments-list');
    if (!list) return;
    const count = list.querySelectorAll('.photo-lightbox-comment').length;

    const headCount = side.querySelector('.photo-lightbox-comments-head span');
    if (headCount) headCount.textContent = String(count);

    side.querySelectorAll('.photo-lightbox-engagement-summary span').forEach((span) => {
      if (!/coment/i.test(span.textContent || '')) return;
      const b = span.querySelector('b');
      if (b) b.textContent = String(count);
    });

    if (count === 0 && !list.querySelector('.photo-lightbox-no-comments')) {
      const empty = document.createElement('div');
      empty.className = 'photo-lightbox-no-comments';
      empty.innerHTML = '<b>Seja o primeiro a comentar</b><span>Comece a conversa sobre este cosplay.</span>';
      list.appendChild(empty);
    }
  };

  const decorate = (article, row, context, profile) => {
    article.dataset.ccCommentId = row.id;
    article.dataset.ccCommentTable = context.table;
    article.dataset.ccCommentForeignKey = context.foreignKey;
    article.dataset.ccCommentContextId = context.id;
    article.dataset.ccCommentAuthor = row.author_profile_id || '';
    article.dataset.ccCommentBody = row.body || '';

    const canEdit = !!profile && row.author_profile_id === profile.id;
    const canDelete = !!profile && (canEdit || context.ownerProfileId === profile.id);
    if (!canEdit && !canDelete) return;
    if (article.querySelector('.cc-photo-comment-controls')) return;

    const controls = document.createElement('div');
    controls.className = 'cc-photo-comment-controls';
    controls.innerHTML = `
      <button class="cc-photo-comment-menu-toggle" type="button" aria-label="Opções do comentário" aria-expanded="false">•••</button>
      <div class="cc-photo-comment-menu-pop" hidden>
        ${canEdit ? '<button type="button" data-cc-comment-edit>Editar</button>' : ''}
        ${canDelete ? '<button class="danger" type="button" data-cc-comment-delete>Excluir</button>' : ''}
      </div>`;
    article.appendChild(controls);
  };

  const syncControls = async () => {
    const token = ++syncToken;
    const side = document.querySelector('.photo-lightbox.open .photo-lightbox-side');
    if (!side) return;
    const articles = [...side.querySelectorAll('.photo-lightbox-comments-list .photo-lightbox-comment')];
    if (!articles.length) return;

    const [profile, context] = await Promise.all([getMe(), resolveContext()]);
    if (!context || token !== syncToken) return;
    const rows = await loadRows(context);
    if (token !== syncToken || currentImagePath() !== context.path) return;

    articles.forEach((article, index) => {
      const row = rows[index];
      if (row) decorate(article, row, context, profile);
    });
  };

  const scheduleSync = () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncControls, 140);
  };

  const attachSideObserver = () => {
    const side = document.querySelector('.photo-lightbox-side');
    if (!side || side.dataset.ccCommentControlsObserved === '1') return !!side;
    side.dataset.ccCommentControlsObserved = '1';
    sideObserver?.disconnect();
    sideObserver = new MutationObserver(scheduleSync);
    sideObserver.observe(side, { childList:true, subtree:true });
    scheduleSync();
    return true;
  };

  const beginEdit = (article) => {
    closeMenus();
    if (article.querySelector('.cc-photo-comment-editor')) return;
    const paragraph = article.querySelector('.photo-lightbox-comment-bubble p');
    if (!paragraph) return;

    const editor = document.createElement('div');
    editor.className = 'cc-photo-comment-editor';
    editor.innerHTML = `
      <textarea maxlength="1200" rows="3" aria-label="Editar comentário"></textarea>
      <div class="cc-photo-comment-editor-actions">
        <span class="cc-photo-comment-editor-status"></span>
        <button type="button" data-cc-comment-cancel>Cancelar</button>
        <button class="save" type="button" data-cc-comment-save>Salvar</button>
      </div>`;
    const textarea = editor.querySelector('textarea');
    textarea.value = article.dataset.ccCommentBody || paragraph.textContent || '';
    paragraph.hidden = true;
    paragraph.after(editor);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  };

  const cancelEdit = (article) => {
    const editor = article.querySelector('.cc-photo-comment-editor');
    const paragraph = article.querySelector('.photo-lightbox-comment-bubble p');
    editor?.remove();
    if (paragraph) paragraph.hidden = false;
  };

  const saveEdit = async (article, button) => {
    const editor = article.querySelector('.cc-photo-comment-editor');
    const textarea = editor?.querySelector('textarea');
    const status = editor?.querySelector('.cc-photo-comment-editor-status');
    const body = String(textarea?.value || '').trim();
    if (!body) {
      if (status) status.textContent = 'O comentário não pode ficar vazio.';
      textarea?.focus();
      return;
    }

    const profile = await getMe();
    if (!profile || article.dataset.ccCommentAuthor !== profile.id) return;
    button.disabled = true;
    if (status) status.textContent = 'Salvando...';

    const { error } = await db.from(article.dataset.ccCommentTable)
      .update({ body })
      .eq('id', article.dataset.ccCommentId)
      .eq('author_profile_id', profile.id);

    button.disabled = false;
    if (error) {
      if (status) status.textContent = 'Não foi possível editar.';
      return;
    }

    article.dataset.ccCommentBody = body;
    const paragraph = article.querySelector('.photo-lightbox-comment-bubble p');
    if (paragraph) {
      paragraph.textContent = body;
      paragraph.hidden = false;
    }
    editor?.remove();
  };

  const deleteComment = async (article, button) => {
    const ok = window.confirm('Excluir este comentário?');
    if (!ok) return;
    button.disabled = true;

    let query = db.from(article.dataset.ccCommentTable)
      .delete()
      .eq('id', article.dataset.ccCommentId);
    if (article.dataset.ccCommentForeignKey && article.dataset.ccCommentContextId) {
      query = query.eq(article.dataset.ccCommentForeignKey, article.dataset.ccCommentContextId);
    }
    const { error } = await query;
    button.disabled = false;
    if (error) {
      window.alert('Não foi possível excluir o comentário agora.');
      return;
    }

    article.remove();
    refreshVisibleCount();
  };

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('.cc-photo-comment-menu-toggle');
    if (toggle) {
      event.preventDefault();
      event.stopPropagation();
      const pop = toggle.parentElement?.querySelector('.cc-photo-comment-menu-pop');
      if (!pop) return;
      const opening = pop.hidden;
      closeMenus(pop);
      pop.hidden = !opening;
      toggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
      return;
    }

    const edit = event.target.closest('[data-cc-comment-edit]');
    if (edit) {
      event.preventDefault();
      const article = edit.closest('.photo-lightbox-comment');
      if (article) beginEdit(article);
      return;
    }

    const cancel = event.target.closest('[data-cc-comment-cancel]');
    if (cancel) {
      event.preventDefault();
      const article = cancel.closest('.photo-lightbox-comment');
      if (article) cancelEdit(article);
      return;
    }

    const save = event.target.closest('[data-cc-comment-save]');
    if (save) {
      event.preventDefault();
      const article = save.closest('.photo-lightbox-comment');
      if (article) saveEdit(article, save);
      return;
    }

    const remove = event.target.closest('[data-cc-comment-delete]');
    if (remove) {
      event.preventDefault();
      const article = remove.closest('.photo-lightbox-comment');
      if (article) deleteComment(article, remove);
      return;
    }

    if (!event.target.closest('.cc-photo-comment-controls')) closeMenus();
  });

  document.addEventListener('keydown', (event) => {
    const editor = event.target.closest?.('.cc-photo-comment-editor');
    if (!editor) return;
    const article = editor.closest('.photo-lightbox-comment');
    if (event.key === 'Escape' && article) {
      event.preventDefault();
      cancelEdit(article);
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && article) {
      event.preventDefault();
      const save = editor.querySelector('[data-cc-comment-save]');
      if (save) saveEdit(article, save);
    }
  });

  const boot = () => {
    if (attachSideObserver()) return;
    bootObserver = new MutationObserver(() => {
      if (attachSideObserver()) bootObserver?.disconnect();
    });
    bootObserver.observe(document.body, { childList:true, subtree:true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
