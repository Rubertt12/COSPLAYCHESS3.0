(() => {
  'use strict';
  if (window.__CC_ALBUMS_MANAGE_V1__) return;
  window.__CC_ALBUMS_MANAGE_V1__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;
  const BUCKET = 'cosplaychess-social-media';
  let profile = null;
  let busy = false;
  let timer = null;

  const toast = (message, kind='') => {
    let el = document.getElementById('ccAlbumManageToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ccAlbumManageToast';
      el.className = 'cc-manage-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.dataset.kind = kind;
    el.hidden = false;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.hidden = true; }, 2600);
  };

  const loadProfile = async () => {
    if (profile) return profile;
    const { data:sessionData } = await db.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,user_id,created_at')
      .eq('user_id', user.id)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending:true })
      .limit(1)
      .maybeSingle();
    profile = data || null;
    return profile;
  };

  const cleanupStorage = async (paths) => {
    const unique = [...new Set((paths || []).filter(Boolean))];
    if (!unique.length) return;
    const { data:stillUsed } = await db.from('cosplay_social_album_photos')
      .select('image_path')
      .in('image_path', unique);
    const blocked = new Set((stillUsed || []).map((x) => x.image_path));
    const removable = unique.filter((path) => !blocked.has(path));
    if (!removable.length) return;
    await db.storage.from(BUCKET).remove(removable).catch(() => {});
  };

  const deletePhoto = async (photo, button) => {
    if (!photo?.id || button.disabled) return;
    if (!confirm('Excluir esta foto definitivamente do álbum? Se ela estiver em uma publicação, essa publicação também será apagada.')) return;
    button.disabled = true;
    const { data:path, error } = await db.rpc('cosplay_delete_album_photo', { p_photo:photo.id });
    if (error) {
      button.disabled = false;
      toast('Não foi possível excluir a foto.', 'error');
      return;
    }
    await cleanupStorage([path || photo.image_path]);
    toast('Foto e publicação vinculada excluídas.');
    setTimeout(() => location.reload(), 220);
  };

  const deleteAlbum = async (album, button) => {
    if (!album?.id || button.disabled) return;
    const suffix = album.system_key ? ' Este álbum reúne fotos preservadas de publicações do feed.' : '';
    if (!confirm(`Excluir o álbum “${album.name}” e todas as fotos dele?${suffix} As publicações vinculadas a essas fotos também serão apagadas.`)) return;
    button.disabled = true;
    const { data:paths, error } = await db.rpc('cosplay_delete_album', { p_album:album.id });
    if (error) {
      button.disabled = false;
      toast('Não foi possível excluir o álbum.', 'error');
      return;
    }
    await cleanupStorage(Array.isArray(paths) ? paths : []);
    toast('Álbum, fotos e publicações vinculadas excluídos.');
    setTimeout(() => location.reload(), 220);
  };

  const decorate = async () => {
    if (busy) return;
    const panel = document.querySelector('[data-community-panel="photos"]');
    const albumGrid = panel?.querySelector('#cc9AlbumGrid');
    const photoGrid = panel?.querySelector('#cc9PhotoGrid');
    if (!panel || !albumGrid || !photoGrid) return;
    const me = await loadProfile();
    if (!me) return;
    busy = true;
    try {
      const [{data:albums},{data:photos}] = await Promise.all([
        db.from('cosplay_social_albums')
          .select('id,name,visibility,system_key,created_at')
          .eq('owner_profile_id', me.id)
          .order('created_at', {ascending:false}),
        db.from('cosplay_social_album_photos')
          .select('id,album_id,image_path,caption,created_at')
          .eq('owner_profile_id', me.id)
          .order('created_at', {ascending:false})
          .limit(200)
      ]);

      const cards = [...albumGrid.querySelectorAll('.cc9-album-card')];
      (albums || []).forEach((album, index) => {
        const card = cards[index];
        if (!card || card.dataset.ccManageReady === '1') return;
        card.dataset.ccManageReady = '1';
        card.dataset.albumId = album.id;
        if (album.system_key) card.classList.add('cc-system-album');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cc-album-delete';
        button.setAttribute('aria-label', `Excluir álbum ${album.name}`);
        button.title = 'Excluir álbum';
        button.textContent = 'Excluir álbum';
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          deleteAlbum(album, button);
        });
        card.appendChild(button);
      });

      const photoEls = [...photoGrid.querySelectorAll('.cc9-photo')];
      (photos || []).forEach((photo, index) => {
        const el = photoEls[index];
        if (!el || el.dataset.ccManageReady === '1') return;
        el.dataset.ccManageReady = '1';
        el.dataset.photoId = photo.id;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cc-photo-delete';
        button.setAttribute('aria-label', 'Excluir foto do álbum');
        button.title = 'Excluir foto';
        button.textContent = '×';
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          deletePhoto(photo, button);
        });
        el.appendChild(button);
      });

      if (!panel.querySelector('.cc-album-retention-note')) {
        const manager = panel.querySelector('.cc9-album-manager');
        if (manager) {
          const note = document.createElement('div');
          note.className = 'cc-album-retention-note';
          note.innerHTML = '<b>Biblioteca de fotos</b><span>Excluir uma postagem não apaga a foto daqui. A exclusão definitiva é feita nesta aba.</span>';
          manager.prepend(note);
        }
      }
    } finally {
      busy = false;
    }
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => decorate().catch(() => {}), 120);
  };

  const boot = () => {
    schedule();
    const panel = document.querySelector('[data-community-panel="photos"]');
    if (panel && !panel.__ccAlbumManageObserver) {
      panel.__ccAlbumManageObserver = true;
      new MutationObserver(schedule).observe(panel, {childList:true, subtree:true});
    }
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-community-view="photos"]')) setTimeout(schedule, 180);
    }, true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 350), {once:true});
  else setTimeout(boot, 350);
})();