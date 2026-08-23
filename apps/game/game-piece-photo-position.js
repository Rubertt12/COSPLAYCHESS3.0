(() => {
  if (window.__cosplayPiecePhotoPositionLoaded) return;
  window.__cosplayPiecePhotoPositionLoaded = true;

  const DEFAULT_CROP = Object.freeze({ x: 50, y: 50, zoom: 1 });
  const STYLE_ID = 'cosplay-piece-photo-position-style';
  let activePieceId = '';
  let pendingCrop = { ...DEFAULT_CROP };
  let dragState = null;
  let scanQueued = false;

  const clamp = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function normalizeCrop(value) {
    const source = value && typeof value === 'object'
      ? (value.photoCrop || value.photo_crop || value)
      : {};
    return {
      x: clamp(source.x, 0, 100, DEFAULT_CROP.x),
      y: clamp(source.y, 0, 100, DEFAULT_CROP.y),
      zoom: clamp(source.zoom, 1, 3, DEFAULT_CROP.zoom)
    };
  }

  function imageStyle(value) {
    const crop = normalizeCrop(value);
    return `object-position:${crop.x}% ${crop.y}%;transform:scale(${crop.zoom});transform-origin:${crop.x}% ${crop.y}%;`;
  }

  function pieceFor(pieceId) {
    try { return store?.p?.[pieceId] || null; }
    catch (_) { return null; }
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .piece,.gy-piece,.arena-box,.cc-piece-photo-frame{position:relative;overflow:hidden}
      .cc-piece-photo-layer{position:absolute;inset:0;width:100%;height:100%;max-width:none!important;display:block;object-fit:cover;pointer-events:none;user-select:none;z-index:0;filter:none!important;will-change:transform}
      .piece.no-img .cc-piece-photo-layer,.gy-piece.no-img .cc-piece-photo-layer{display:none}
      #arena .arena-box::after{z-index:2}
      .cc-piece-crop-trigger{position:absolute;right:3px;bottom:3px;z-index:6;width:24px;height:24px;border-radius:50%;border:2px solid #050509;background:#00e5ff;color:#001013;display:none;align-items:center;justify-content:center;padding:0;font-size:12px;font-weight:1000;line-height:1;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.72);transition:transform .16s ease,background .16s ease}
      #edit-mode:checked~* #board .cc-piece-crop-trigger,.cc-edit-photo-active .cc-piece-crop-trigger{display:flex}
      .cc-piece-crop-trigger:hover{transform:scale(1.12);background:#fff}
      .cc-piece-photo-frame{background:#09090d;flex:0 0 auto}
      .cc-piece-photo-frame .cc-piece-photo-layer{border-radius:inherit}
      .cc-photo-position-modal{position:fixed;inset:0;z-index:19000;background:rgba(0,0,0,.91);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:18px;color:#fff}
      .cc-photo-position-modal[hidden]{display:none!important}
      .cc-photo-position-card{width:min(780px,97vw);max-height:94vh;overflow:auto;background:#09090d;border:1px solid rgba(0,229,255,.32);border-radius:17px;box-shadow:0 32px 100px rgba(0,0,0,.82)}
      .cc-photo-position-head{padding:18px 20px 13px;border-bottom:1px solid #23232b;display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
      .cc-photo-position-kicker{font-size:9px;letter-spacing:2px;color:var(--accent,#00e5ff);font-weight:1000}
      .cc-photo-position-title{margin:5px 0 4px;font-size:22px}
      .cc-photo-position-subtitle{margin:0;color:#8d8d98;font-size:10px;line-height:1.45}
      .cc-photo-position-close{width:38px;height:38px;flex:0 0 auto;border-radius:9px;border:1px solid #333;background:#15151b;color:#fff;font-size:19px;cursor:pointer}
      .cc-photo-position-body{padding:20px;display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:24px;align-items:center}
      .cc-photo-position-preview-shell{display:flex;flex-direction:column;align-items:center;gap:10px}
      .cc-photo-position-preview{position:relative;width:min(280px,72vw);aspect-ratio:1;border-radius:50%;overflow:hidden;background:#111;border:4px solid #20212a;box-shadow:0 18px 45px rgba(0,0,0,.52),0 0 0 1px rgba(0,229,255,.18);cursor:grab;touch-action:none}
      .cc-photo-position-preview.dragging{cursor:grabbing;border-color:var(--accent,#00e5ff)}
      .cc-photo-position-preview img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;user-select:none;will-change:transform}
      .cc-photo-position-preview::after{content:'ARRASTE A FOTO';position:absolute;left:50%;bottom:13px;transform:translateX(-50%);z-index:2;padding:5px 8px;border-radius:999px;background:rgba(0,0,0,.72);border:1px solid rgba(255,255,255,.17);color:#fff;font-size:8px;font-weight:900;letter-spacing:1px;white-space:nowrap;pointer-events:none}
      .cc-photo-position-note{font-size:9px;color:#686873;text-align:center;line-height:1.4}
      .cc-photo-position-controls{display:grid;gap:15px}
      .cc-photo-position-control{display:grid;gap:7px}
      .cc-photo-position-control span{display:flex;justify-content:space-between;gap:8px;color:#aaa;font-size:10px}
      .cc-photo-position-control b{color:#fff}
      .cc-photo-position-control input{width:100%;accent-color:var(--accent,#00e5ff)}
      .cc-photo-position-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}
      .cc-photo-position-actions button{min-height:39px;border-radius:9px;border:1px solid #333;background:#17171e;color:#ddd;padding:8px 10px;font-size:9px;font-weight:900;cursor:pointer}
      .cc-photo-position-actions .primary{grid-column:1/-1;background:var(--accent,#00e5ff);border-color:var(--accent,#00e5ff);color:#001014;font-size:10px}
      .cc-photo-position-actions button:disabled{opacity:.38;cursor:not-allowed}
      .cc-photo-position-status{min-height:17px;color:#8fffc0;font-size:9px;text-align:center}
      @media(max-width:650px){.cc-photo-position-body{grid-template-columns:1fr;gap:18px}.cc-photo-position-preview{width:min(230px,70vw)}.cc-photo-position-card{max-height:96vh}.cc-photo-position-title{font-size:18px}}
    `;
    document.head.appendChild(style);
  }

  function makePhotoLayer(element, pieceId, options = {}) {
    if (!element || !pieceId) return;
    const piece = pieceFor(pieceId);
    const source = piece?.img || '';
    element.dataset.pieceId = pieceId;

    let layer = element.querySelector(':scope > .cc-piece-photo-layer');
    if (!source) {
      layer?.remove();
      element.style.removeProperty('background-image');
      element.querySelector(':scope > .cc-piece-crop-trigger')?.remove();
      return;
    }

    element.style.setProperty('background-image', 'none', 'important');
    if (!layer) {
      layer = document.createElement('img');
      layer.className = 'cc-piece-photo-layer';
      layer.alt = '';
      layer.draggable = false;
      element.prepend(layer);
    }
    if (layer.src !== source) layer.src = source;
    const crop = normalizeCrop(piece.photoCrop);
    layer.style.objectPosition = `${crop.x}% ${crop.y}%`;
    layer.style.transform = `scale(${crop.zoom})`;
    layer.style.transformOrigin = `${crop.x}% ${crop.y}%`;

    const isBoardPiece = options.board || element.matches?.('#board .piece');
    if (!isBoardPiece) return;
    let trigger = element.querySelector(':scope > .cc-piece-crop-trigger');
    if (!trigger) {
      trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'cc-piece-crop-trigger';
      trigger.innerHTML = '✥';
      trigger.title = 'Posicionar foto nesta peça';
      trigger.setAttribute('aria-label', `Posicionar foto de ${piece.name || pieceId}`);
      trigger.addEventListener('pointerdown', event => {
        event.preventDefault();
        event.stopPropagation();
      });
      trigger.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openEditor(pieceId);
      });
      element.appendChild(trigger);
    }
  }

  function scanPhotos() {
    installStyles();
    let edit = false;
    try { edit = Boolean(document.getElementById('edit-mode')?.checked); } catch (_) {}
    document.documentElement.classList.toggle('cc-edit-photo-active', edit);

    const board = document.getElementById('board');
    board?.querySelectorAll('.sq').forEach((square, index) => {
      const element = square.querySelector('.piece');
      const pieceId = store?.board?.[index];
      if (element && pieceId) makePhotoLayer(element, pieceId, { board: true });
    });

    const graveyard = document.getElementById('graveyard');
    graveyard?.querySelectorAll('.gy-piece').forEach((element, index) => {
      const pieceId = store?.graveyard?.[index];
      if (pieceId) makePhotoLayer(element, pieceId);
    });
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      try { scanPhotos(); } catch (_) {}
    });
  }

  function ensureModal() {
    installStyles();
    if (document.getElementById('cc-photo-position-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'cc-photo-position-modal';
    modal.className = 'cc-photo-position-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="cc-photo-position-card" role="dialog" aria-modal="true" aria-labelledby="cc-photo-position-title">
        <div class="cc-photo-position-head">
          <div>
            <div class="cc-photo-position-kicker">ENQUADRAMENTO DA PEÇA</div>
            <h2 id="cc-photo-position-title" class="cc-photo-position-title">Posicionar foto</h2>
            <p class="cc-photo-position-subtitle">Arraste para colocar o rosto no círculo. O ajuste vale somente para esta peça.</p>
          </div>
          <button type="button" class="cc-photo-position-close" data-close aria-label="Fechar">×</button>
        </div>
        <div class="cc-photo-position-body">
          <div class="cc-photo-position-preview-shell">
            <div id="cc-photo-position-preview" class="cc-photo-position-preview">
              <img id="cc-photo-position-image" alt="Prévia da foto na peça" draggable="false">
            </div>
            <div class="cc-photo-position-note">A foto original não é alterada. Só guardamos posição e zoom.</div>
          </div>
          <div class="cc-photo-position-controls">
            <label class="cc-photo-position-control"><span>Horizontal <b id="cc-photo-x-value">50%</b></span><input id="cc-photo-x" type="range" min="0" max="100" step="1" value="50"></label>
            <label class="cc-photo-position-control"><span>Vertical <b id="cc-photo-y-value">50%</b></span><input id="cc-photo-y" type="range" min="0" max="100" step="1" value="50"></label>
            <label class="cc-photo-position-control"><span>Zoom <b id="cc-photo-zoom-value">1.00×</b></span><input id="cc-photo-zoom" type="range" min="1" max="3" step="0.01" value="1"></label>
            <div class="cc-photo-position-actions">
              <button id="cc-photo-center" type="button">CENTRALIZAR</button>
              <button id="cc-photo-registration" type="button">USAR CADASTRO</button>
              <button id="cc-photo-save" type="button" class="primary">SALVAR POSIÇÃO</button>
            </div>
            <div id="cc-photo-position-status" class="cc-photo-position-status" aria-live="polite"></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const preview = modal.querySelector('#cc-photo-position-preview');
    const close = () => {
      modal.hidden = true;
      activePieceId = '';
      dragState = null;
      preview.classList.remove('dragging');
    };
    modal.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', close));
    modal.addEventListener('click', event => { if (event.target === modal) close(); });

    ['cc-photo-x', 'cc-photo-y', 'cc-photo-zoom'].forEach(id => {
      modal.querySelector(`#${id}`).addEventListener('input', readControls);
    });
    modal.querySelector('#cc-photo-center').addEventListener('click', () => {
      pendingCrop = { ...DEFAULT_CROP };
      syncControls();
    });
    modal.querySelector('#cc-photo-registration').addEventListener('click', () => {
      const registered = pieceFor(activePieceId)?.participant?.photoCrop;
      if (!registered) return;
      pendingCrop = normalizeCrop(registered);
      syncControls();
    });
    modal.querySelector('#cc-photo-save').addEventListener('click', saveCrop);

    preview.addEventListener('pointerdown', event => {
      if (!activePieceId) return;
      preview.setPointerCapture?.(event.pointerId);
      dragState = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, crop: { ...pendingCrop } };
      preview.classList.add('dragging');
    });
    preview.addEventListener('pointermove', event => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const rect = preview.getBoundingClientRect();
      const factor = Math.max(1, pendingCrop.zoom);
      pendingCrop.x = clamp(dragState.crop.x - ((event.clientX - dragState.x) / Math.max(1, rect.width)) * 100 / factor, 0, 100, 50);
      pendingCrop.y = clamp(dragState.crop.y - ((event.clientY - dragState.y) / Math.max(1, rect.height)) * 100 / factor, 0, 100, 50);
      syncControls();
    });
    const finishDrag = event => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      dragState = null;
      preview.classList.remove('dragging');
    };
    preview.addEventListener('pointerup', finishDrag);
    preview.addEventListener('pointercancel', finishDrag);
  }

  function updatePreview() {
    const image = document.getElementById('cc-photo-position-image');
    if (!image) return;
    image.style.objectPosition = `${pendingCrop.x}% ${pendingCrop.y}%`;
    image.style.transform = `scale(${pendingCrop.zoom})`;
    image.style.transformOrigin = `${pendingCrop.x}% ${pendingCrop.y}%`;
    document.getElementById('cc-photo-x-value').textContent = `${Math.round(pendingCrop.x)}%`;
    document.getElementById('cc-photo-y-value').textContent = `${Math.round(pendingCrop.y)}%`;
    document.getElementById('cc-photo-zoom-value').textContent = `${pendingCrop.zoom.toFixed(2)}×`;
  }

  function syncControls() {
    document.getElementById('cc-photo-x').value = String(pendingCrop.x);
    document.getElementById('cc-photo-y').value = String(pendingCrop.y);
    document.getElementById('cc-photo-zoom').value = String(pendingCrop.zoom);
    updatePreview();
  }

  function readControls() {
    pendingCrop = normalizeCrop({
      x: document.getElementById('cc-photo-x').value,
      y: document.getElementById('cc-photo-y').value,
      zoom: document.getElementById('cc-photo-zoom').value
    });
    updatePreview();
  }

  function saveCrop() {
    const piece = pieceFor(activePieceId);
    if (!piece) return;
    piece.photoCrop = {
      x: Number(pendingCrop.x.toFixed(2)),
      y: Number(pendingCrop.y.toFixed(2)),
      zoom: Number(pendingCrop.zoom.toFixed(2))
    };
    piece.rosterManagedPhotoCrop = false;
    try { save(); } catch (_) {}
    try { renderBoard(); } catch (_) {}
    try { renderGraveyard(); } catch (_) {}
    try { renderConfigLists(); } catch (_) {}
    const status = document.getElementById('cc-photo-position-status');
    if (status) status.textContent = 'Posição salva. O rosto escapou dessa vez.';
    queueScan();
    setTimeout(() => {
      const modal = document.getElementById('cc-photo-position-modal');
      if (modal) modal.hidden = true;
      activePieceId = '';
    }, 430);
  }

  function openEditor(pieceId) {
    const piece = pieceFor(pieceId);
    if (!piece?.img) {
      window.alert?.('Esta peça ainda não possui uma foto para posicionar.');
      return;
    }
    ensureModal();
    activePieceId = pieceId;
    pendingCrop = normalizeCrop(piece.photoCrop || piece.participant?.photoCrop || DEFAULT_CROP);
    const modal = document.getElementById('cc-photo-position-modal');
    const image = document.getElementById('cc-photo-position-image');
    const inherited = piece.rosterManagedImg ? piece.participant?.photoCrop : null;
    document.getElementById('cc-photo-position-title').textContent = `Posicionar ${piece.name || pieceId}`;
    document.getElementById('cc-photo-position-status').textContent = '';
    document.getElementById('cc-photo-registration').disabled = !inherited;
    document.getElementById('cc-photo-registration').title = inherited ? 'Restaurar o enquadramento feito no painel' : 'Esta foto não possui enquadramento salvo no cadastro';
    image.src = piece.img;
    image.alt = `Prévia de ${piece.name || pieceId}`;
    syncControls();
    modal.hidden = false;
    setTimeout(() => document.getElementById('cc-photo-x')?.focus(), 30);
  }

  window.normalizePiecePhotoCrop = normalizeCrop;
  window.piecePhotoImageStyle = imageStyle;
  window.applyPiecePhotoCrop = makePhotoLayer;
  window.refreshPiecePhotoCrops = queueScan;
  window.openPiecePhotoPositionEditor = openEditor;
  window.piecePhotoFrameMarkup = (source, crop, options = {}) => {
    if (!source) return '';
    const width = Number(options.width) || 64;
    const radius = Number(options.radius) || 10;
    const className = options.className ? ` ${esc(options.className)}` : '';
    return `<span class="cc-piece-photo-frame${className}" style="width:${width}px;height:${width}px;border-radius:${radius}px;border:1px solid #333;display:block;"><img class="cc-piece-photo-layer" src="${esc(source)}" alt="" draggable="false" style="${imageStyle(crop)}"></span>`;
  };

  installStyles();
  ensureModal();
  document.addEventListener('change', event => {
    if (event.target?.id === 'edit-mode') queueScan();
  });
  document.addEventListener('keydown', event => {
    const modal = document.getElementById('cc-photo-position-modal');
    if (event.key === 'Escape' && modal && !modal.hidden) {
      modal.hidden = true;
      activePieceId = '';
    }
  });
  const observer = new MutationObserver(queueScan);
  observer.observe(document.body, { childList: true, subtree: true });
  queueScan();
})();
