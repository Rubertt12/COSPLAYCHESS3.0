(() => {
  'use strict';
  if (window.__CC_PHOTO_MODAL_LIKES_V31__) return;
  window.__CC_PHOTO_MODAL_LIKES_V31__ = true;

  const db = window.getCosplayChessParticipantDb
    ? window.getCosplayChessParticipantDb()
    : (window.COSPLAYCHESS_PARTICIPANT_DB || (window.getCosplayChessDb ? window.getCosplayChessDb() : window.COSPLAYCHESS_DB));
  if (!db) return;

  let me = null;
  let modal = null;
  let modalObserver = null;
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

  const resolveAlbumPhoto = async () => {
    const image = document.querySelector('.cc30-photo-modal.is-open .cc30-photo-image');
    const path = storagePathFromUrl(image?.currentSrc || image?.src || '');
    if (!path) return null;
    const { data, error } = await db.from('cosplay_social_album_photos')
      .select('id,image_path')
      .eq('image_path', path)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return { id:data.id, path };
  };

  const loadLikeState = async (photoId, profile) => {
    const queries = [
      db.from('cosplay_social_photo_likes').select('photo_id', { count:'exact', head:true }).eq('photo_id', photoId)
    ];
    if (profile?.id) {
      queries.push(db.from('cosplay_social_photo_likes')
        .select('photo_id')
        .eq('photo_id', photoId)
        .eq('profile_id', profile.id)
        .maybeSingle());
    }
    const results = await Promise.all(queries);
    return {
      count:results[0]?.count || 0,
      liked:!!results[1]?.data
    };
  };

  const sync = async () => {
    const token = ++syncToken;
    const root = document.querySelector('.cc30-photo-modal.is-open');
    if (!root) return;
    const side = root.querySelector('.cc30-photo-side');
    const actions = side?.querySelector('.cc30-photo-actions');
    const engagement = side?.querySelector('.cc30-engagement');
    if (!side || !actions || !engagement) return;

    if (actions.querySelector('[data-cc30-like]')) return;

    const [photo, profile] = await Promise.all([resolveAlbumPhoto(), getMe()]);
    if (!photo || !profile || token !== syncToken) return;

    const image = root.querySelector('.cc30-photo-image');
    if (storagePathFromUrl(image?.currentSrc || image?.src || '') !== photo.path) return;

    const state = await loadLikeState(photo.id, profile);
    if (token !== syncToken) return;

    const currentActions = side.querySelector('.cc30-photo-actions');
    if (!currentActions || currentActions.querySelector('[data-cc31-photo-like]') || currentActions.querySelector('[data-cc30-like]')) return;

    currentActions.classList.remove('two');
    const button = document.createElement('button');
    button.className = `cc30-photo-action${state.liked ? ' is-active' : ''}`;
    button.type = 'button';
    button.dataset.cc31PhotoLike = photo.id;
    button.innerHTML = `<span class="cc30-action-icon">${state.liked ? '♥' : '♡'}</span><span>${state.liked ? 'Curtido' : 'Curtir'}</span>`;
    currentActions.prepend(button);

    const firstSummary = side.querySelector('.cc30-engagement span:first-child');
    if (firstSummary) {
      firstSummary.innerHTML = `<b data-cc31-like-count>${state.count}</b> curtida${state.count === 1 ? '' : 's'}`;
    }
  };

  const scheduleSync = () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => sync().catch(() => {}), 90);
  };

  const attach = () => {
    const found = document.querySelector('.cc30-photo-modal');
    if (!found) return false;
    if (modal === found && modalObserver) return true;
    modal = found;
    modalObserver?.disconnect();
    modalObserver = new MutationObserver(scheduleSync);
    modalObserver.observe(modal, {
      attributes:true,
      attributeFilter:['class'],
      childList:true,
      subtree:true
    });
    modal.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-cc31-photo-like]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();

      const profile = await getMe();
      const photoId = button.dataset.cc31PhotoLike;
      if (!profile?.id || !photoId) return;

      const active = button.classList.contains('is-active');
      button.disabled = true;
      const result = active
        ? await db.from('cosplay_social_photo_likes').delete().eq('photo_id', photoId).eq('profile_id', profile.id)
        : await db.from('cosplay_social_photo_likes').insert({ photo_id:photoId, profile_id:profile.id });
      button.disabled = false;
      if (result.error) return;

      const next = !active;
      button.classList.toggle('is-active', next);
      const icon = button.querySelector('.cc30-action-icon');
      const label = button.querySelector('span:last-child');
      if (icon) icon.textContent = next ? '♥' : '♡';
      if (label) label.textContent = next ? 'Curtido' : 'Curtir';

      const count = modal.querySelector('[data-cc31-like-count]');
      if (count) {
        const value = Math.max(0, Number(count.textContent || 0) + (next ? 1 : -1));
        count.textContent = String(value);
        const summary = count.closest('span');
        if (summary) summary.lastChild.textContent = ` curtida${value === 1 ? '' : 's'}`;
      }
    });
    scheduleSync();
    return true;
  };

  const boot = () => {
    if (attach()) return;
    bootObserver = new MutationObserver(() => {
      if (attach()) bootObserver?.disconnect();
    });
    bootObserver.observe(document.body, { childList:true, subtree:true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
