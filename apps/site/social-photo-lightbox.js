(() => {
  if (window.__COSPLAY_PHOTO_LIGHTBOX__) return;
  window.__COSPLAY_PHOTO_LIGHTBOX__ = true;

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
  let caption = null;
  let index = 0;
  let items = [];

  const ensure = () => {
    if (root) return root;
    root = document.createElement('div');
    root.className = 'photo-lightbox';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Visualização ampliada da foto');
    root.innerHTML = `
      <div class="photo-lightbox-stage">
        <button class="photo-lightbox-close" type="button" aria-label="Fechar">×</button>
        <button class="photo-lightbox-nav photo-lightbox-prev" type="button" aria-label="Foto anterior">‹</button>
        <img class="photo-lightbox-image" alt="">
        <button class="photo-lightbox-nav photo-lightbox-next" type="button" aria-label="Próxima foto">›</button>
        <div class="photo-lightbox-caption" hidden></div>
      </div>`;
    document.body.appendChild(root);
    image = root.querySelector('.photo-lightbox-image');
    caption = root.querySelector('.photo-lightbox-caption');
    root.querySelector('.photo-lightbox-close').addEventListener('click', close);
    root.querySelector('.photo-lightbox-prev').addEventListener('click', (e) => { e.stopPropagation(); move(-1); });
    root.querySelector('.photo-lightbox-next').addEventListener('click', (e) => { e.stopPropagation(); move(1); });
    root.addEventListener('click', (e) => { if (e.target === root || e.target.classList.contains('photo-lightbox-stage')) close(); });
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
    if (post) {
      const author = post.querySelector('.community-post-author');
      const avatar = post.querySelector('.community-person-avatar img');
      const avatarKey = avatar?.currentSrc || avatar?.src || '';
      const authorKey = String(author?.textContent || '').trim().replace(/\s+/g, ' ');
      return `feed-profile:${avatarKey}|${authorKey}`;
    }

    if (el.closest?.('#communityPhotos')) return 'community-own-photos';
    if (el.matches?.('.album-photo-image img')) return `album:${location.pathname}${location.search}`;
    if (el.matches?.('.player-social-post-image img,.player-photo-tile img,.player-photo img,.player-official-image img,.player-public-cover img')) return `player-profile:${location.pathname}${location.search}`;
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

  const paint = () => {
    if (!items.length) return;
    const target = items[index];
    const src = target.currentSrc || target.src;
    const text = target.dataset.lightboxCaption || target.alt || '';
    image.src = src;
    image.alt = text || 'Foto ampliada';
    caption.textContent = text;
    caption.hidden = !text;
    root.dataset.single = items.length <= 1 ? '1' : '0';
  };

  const open = (target) => {
    ensure();
    items = visibleItems(target);
    index = Math.max(0, items.indexOf(target));
    if (!items.length) items = [target];
    paint();
    root.classList.add('open');
    document.body.classList.add('photo-lightbox-open');
    root.querySelector('.photo-lightbox-close')?.focus({ preventScroll:true });
  };

  function close() {
    if (!root?.classList.contains('open')) return;
    root.classList.remove('open');
    document.body.classList.remove('photo-lightbox-open');
    if (image) image.src = '';
  }

  const move = (step) => {
    if (items.length <= 1) return;
    index = (index + step + items.length) % items.length;
    paint();
  };

  document.addEventListener('click', (event) => {
    const target = event.target.closest?.(selector);
    if (!target || !(target instanceof HTMLImageElement)) return;
    event.preventDefault();
    open(target);
  });

  document.addEventListener('keydown', (event) => {
    if (!root?.classList.contains('open')) return;
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowLeft') move(-1);
    else if (event.key === 'ArrowRight') move(1);
  });
})();
