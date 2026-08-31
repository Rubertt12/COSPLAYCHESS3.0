(() => {
  'use strict';
  if (window.__CC_SOCIAL_PROFILE_CARD_COVER__) return;
  window.__CC_SOCIAL_PROFILE_CARD_COVER__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const BUCKET = 'cosplaychess-character-photos';
  const allowed = new Set(['image/jpeg','image/png','image/webp']);
  const $ = (id) => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);
  const safe = (value) => { try { const u = new URL(String(value || ''), location.href); return ['http:','https:','blob:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

  const state = {
    user:null,
    profile:null,
    draftX:50,
    draftY:50,
    adjusting:false,
    dragging:false,
    drag:null,
    previewObjectUrl:'',
  };

  const objectPath = (url) => {
    try {
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const pathname = new URL(url).pathname;
      const index = pathname.indexOf(marker);
      return index >= 0 ? decodeURIComponent(pathname.slice(index + marker.length)) : null;
    } catch { return null; }
  };

  const getProfile = async (force = false) => {
    if (state.profile && !force) return state.profile;
    const { data: auth } = await db.auth.getSession();
    state.user = auth?.session?.user || null;
    if (!state.user) return null;
    const { data, error } = await db.from('cosplay_participant_profiles')
      .select('id,user_id,public_slug,profile_visible,cover_photo_url,cover_position_x,cover_position_y')
      .eq('user_id',state.user.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    state.profile = data;
    state.draftX = clamp(data.cover_position_x ?? 50);
    state.draftY = clamp(data.cover_position_y ?? 50);
    return data;
  };

  const applyCardCover = async () => {
    const profile = await getProfile();
    const cover = q('.cc-profile-cover');
    if (!profile || !cover) return;
    const url = safe(profile.cover_photo_url);
    cover.classList.toggle('has-cover', Boolean(url));
    if (url) {
      cover.style.backgroundImage = `url("${url.replace(/"/g,'%22')}")`;
      cover.style.backgroundPosition = `${clamp(profile.cover_position_x ?? 50)}% ${clamp(profile.cover_position_y ?? 50)}%`;
      cover.style.backgroundSize = 'cover';
      cover.style.backgroundRepeat = 'no-repeat';
    } else {
      cover.style.removeProperty('background-image');
      cover.style.backgroundPosition = '50% 50%';
    }
    ensureEditButton(cover);
  };

  const ensureEditButton = (cover = q('.cc-profile-cover')) => {
    if (!cover || $('ccCoverEdit')) return;
    const button = document.createElement('button');
    button.id = 'ccCoverEdit';
    button.className = 'cc-cover-edit';
    button.type = 'button';
    button.innerHTML = '✥ <span>Ajustar capa</span>';
    button.addEventListener('click', () => openEditor().catch(() => {}));
    cover.appendChild(button);
  };

  const status = (message = '', kind = '') => {
    const el = $('ccCoverStatus');
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
  };

  const ensureModal = () => {
    let modal = $('ccCoverModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'ccCoverModal';
    modal.className = 'cc-cover-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="cc-cover-backdrop" data-cc-cover-close></div>
      <section class="cc-cover-dialog" role="dialog" aria-modal="true" aria-labelledby="ccCoverTitle">
        <div class="cc-cover-head">
          <div><b id="ccCoverTitle">Capa do perfil cosplay</b><small>A mesma capa aparece na rede e no seu perfil público.</small></div>
          <button class="cc-cover-close" type="button" data-cc-cover-close aria-label="Fechar">×</button>
        </div>
        <div class="cc-cover-body">
          <div class="cc-cover-preview" id="ccCoverPreview"><span>Sem foto de capa</span></div>
          <div class="cc-cover-controls">
            <label class="btn dark cc-cover-upload">▧ Escolher capa<input id="ccCoverFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
            <button class="btn dark" id="ccCoverAdjust" type="button">✥ Ajustar posição</button>
            <button class="btn dark" id="ccCoverCenter" type="button">Centralizar</button>
            <button class="btn gold" id="ccCoverSavePosition" type="button">Salvar posição</button>
            <button class="btn dark" id="ccCoverRemove" type="button">Remover</button>
            <span class="cc-cover-status" id="ccCoverStatus"></span>
          </div>
          <div class="cc-cover-help">JPG, PNG ou WebP · até 5 MB. Depois de enviar, clique em “Ajustar posição” e arraste a imagem até o enquadramento ficar correto.</div>
        </div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-cc-cover-close]').forEach((el) => el.addEventListener('click', closeEditor));
    $('ccCoverFile')?.addEventListener('change', uploadCover);
    $('ccCoverAdjust')?.addEventListener('click', toggleAdjust);
    $('ccCoverCenter')?.addEventListener('click', centerCover);
    $('ccCoverSavePosition')?.addEventListener('click', savePosition);
    $('ccCoverRemove')?.addEventListener('click', removeCover);
    bindDrag();
    return modal;
  };

  const paintPreview = (url) => {
    const root = $('ccCoverPreview');
    if (!root) return;
    root.replaceChildren();
    const src = safe(url);
    if (!src) {
      const empty = document.createElement('span');
      empty.textContent = 'Sem foto de capa';
      root.appendChild(empty);
      root.classList.remove('is-adjusting','is-dragging');
      return;
    }
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Prévia da capa do perfil cosplay';
    img.draggable = false;
    img.style.objectPosition = `${state.draftX}% ${state.draftY}%`;
    root.appendChild(img);
    root.classList.toggle('is-adjusting', state.adjusting);
  };

  const updatePreviewPosition = () => {
    const img = q('#ccCoverPreview img');
    if (img) img.style.objectPosition = `${state.draftX}% ${state.draftY}%`;
  };

  const updateControls = () => {
    const hasCover = Boolean(state.profile?.cover_photo_url || q('#ccCoverPreview img'));
    const adjust = $('ccCoverAdjust');
    const center = $('ccCoverCenter');
    const save = $('ccCoverSavePosition');
    const remove = $('ccCoverRemove');
    if (adjust) { adjust.disabled = !hasCover; adjust.textContent = state.adjusting ? '✓ Finalizar ajuste' : '✥ Ajustar posição'; }
    if (center) center.disabled = !hasCover;
    if (save) save.disabled = !hasCover;
    if (remove) remove.disabled = !state.profile?.cover_photo_url;
    $('ccCoverPreview')?.classList.toggle('is-adjusting', state.adjusting && hasCover);
  };

  const openEditor = async () => {
    const profile = await getProfile(true);
    if (!profile) return;
    state.draftX = clamp(profile.cover_position_x ?? 50);
    state.draftY = clamp(profile.cover_position_y ?? 50);
    state.adjusting = false;
    const modal = ensureModal();
    paintPreview(profile.cover_photo_url);
    updateControls();
    status('');
    modal.hidden = false;
  };

  function closeEditor() {
    const modal = $('ccCoverModal');
    if (modal) modal.hidden = true;
    state.adjusting = false;
    state.dragging = false;
    state.drag = null;
    if (state.previewObjectUrl) {
      URL.revokeObjectURL(state.previewObjectUrl);
      state.previewObjectUrl = '';
    }
  }

  function toggleAdjust() {
    if (!q('#ccCoverPreview img')) return;
    state.adjusting = !state.adjusting;
    updateControls();
    status(state.adjusting ? 'Arraste a capa para reposicionar.' : 'Posição pronta para salvar.');
  }

  function centerCover() {
    if (!q('#ccCoverPreview img')) return;
    state.draftX = 50;
    state.draftY = 50;
    updatePreviewPosition();
    status('Capa centralizada. Clique em Salvar posição.');
  }

  async function savePosition() {
    if (!state.profile?.cover_photo_url) return;
    const button = $('ccCoverSavePosition');
    if (button) button.disabled = true;
    status('Salvando posição...');
    const { error } = await db.from('cosplay_participant_profiles')
      .update({cover_position_x:state.draftX,cover_position_y:state.draftY})
      .eq('id',state.profile.id)
      .eq('user_id',state.user.id);
    if (error) {
      status('Não foi possível salvar a posição.','error');
      updateControls();
      return;
    }
    state.profile.cover_position_x = state.draftX;
    state.profile.cover_position_y = state.draftY;
    state.adjusting = false;
    updateControls();
    await applyCardCover();
    status('Posição salva.','success');
  }

  async function uploadCover(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!allowed.has(file.type)) { status('Use JPG, PNG ou WebP.','error'); return; }
    if (file.size > 5 * 1024 * 1024) { status('A capa deve ter no máximo 5 MB.','error'); return; }
    if (!state.profile && !await getProfile()) { status('Não foi possível identificar seu perfil.','error'); return; }

    if (state.previewObjectUrl) URL.revokeObjectURL(state.previewObjectUrl);
    state.previewObjectUrl = URL.createObjectURL(file);
    state.draftX = 50;
    state.draftY = 50;
    state.adjusting = false;
    paintPreview(state.previewObjectUrl);
    updateControls();
    status('Enviando capa...');

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const rand = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    const path = `${state.user.id}/profile-covers/${state.profile.id}/${Date.now()}-${rand}.${ext}`;
    const oldUrl = state.profile.cover_photo_url || '';
    const { error: uploadError } = await db.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if (uploadError) { paintPreview(oldUrl); status('Não foi possível enviar a capa.','error'); return; }

    const { data: publicData } = db.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = publicData?.publicUrl || '';
    if (!publicUrl) {
      await db.storage.from(BUCKET).remove([path]).catch(() => {});
      paintPreview(oldUrl);
      status('Não foi possível gerar o link da capa.','error');
      return;
    }

    const { error: updateError } = await db.from('cosplay_participant_profiles')
      .update({cover_photo_url:publicUrl,cover_position_x:50,cover_position_y:50})
      .eq('id',state.profile.id)
      .eq('user_id',state.user.id);
    if (updateError) {
      await db.storage.from(BUCKET).remove([path]).catch(() => {});
      paintPreview(oldUrl);
      status('Não foi possível salvar a capa.','error');
      return;
    }

    const oldPath = objectPath(oldUrl);
    if (oldPath?.startsWith(`${state.user.id}/profile-covers/`)) db.storage.from(BUCKET).remove([oldPath]).catch(() => {});
    state.profile.cover_photo_url = publicUrl;
    state.profile.cover_position_x = 50;
    state.profile.cover_position_y = 50;
    state.draftX = 50;
    state.draftY = 50;
    paintPreview(publicUrl);
    updateControls();
    await applyCardCover();
    status('Capa atualizada. Você pode ajustar o enquadramento agora.','success');
  }

  async function removeCover() {
    if (!state.profile?.cover_photo_url) return;
    const oldUrl = state.profile.cover_photo_url;
    status('Removendo capa...');
    const { error } = await db.from('cosplay_participant_profiles')
      .update({cover_photo_url:null,cover_position_x:50,cover_position_y:50})
      .eq('id',state.profile.id)
      .eq('user_id',state.user.id);
    if (error) { status('Não foi possível remover a capa.','error'); return; }
    const oldPath = objectPath(oldUrl);
    if (oldPath?.startsWith(`${state.user.id}/profile-covers/`)) db.storage.from(BUCKET).remove([oldPath]).catch(() => {});
    state.profile.cover_photo_url = null;
    state.profile.cover_position_x = 50;
    state.profile.cover_position_y = 50;
    state.draftX = 50;
    state.draftY = 50;
    state.adjusting = false;
    paintPreview('');
    updateControls();
    await applyCardCover();
    status('Capa removida.','success');
  }

  const bindDrag = () => {
    const root = $('ccCoverPreview');
    if (!root || root.dataset.dragBound === '1') return;
    root.dataset.dragBound = '1';
    root.addEventListener('pointerdown',(event) => {
      if (!state.adjusting || !root.querySelector('img')) return;
      event.preventDefault();
      const rect = root.getBoundingClientRect();
      state.dragging = true;
      state.drag = {id:event.pointerId,x:event.clientX,y:event.clientY,startX:state.draftX,startY:state.draftY,w:Math.max(rect.width,1),h:Math.max(rect.height,1)};
      root.classList.add('is-dragging');
      try { root.setPointerCapture(event.pointerId); } catch {}
    });
    root.addEventListener('pointermove',(event) => {
      const drag = state.drag;
      if (!state.dragging || !drag || event.pointerId !== drag.id) return;
      event.preventDefault();
      state.draftX = clamp(drag.startX - ((event.clientX - drag.x) / drag.w) * 100);
      state.draftY = clamp(drag.startY - ((event.clientY - drag.y) / drag.h) * 100);
      updatePreviewPosition();
    });
    const finish = (event) => {
      const drag = state.drag;
      if (!state.dragging || !drag || event.pointerId !== drag.id) return;
      state.dragging = false;
      state.drag = null;
      root.classList.remove('is-dragging');
      try { root.releasePointerCapture(event.pointerId); } catch {}
      status('Posição ajustada. Clique em Salvar posição.');
    };
    root.addEventListener('pointerup',finish);
    root.addEventListener('pointercancel',finish);
  };

  const initSidebarCollapse = () => {
    const button = q('.cc-collapse');
    if (!button) return;
    const key = 'cosplaychess-social-sidebar-collapsed';
    const desktop = () => window.innerWidth > 820;
    const restore = () => {
      if (!desktop()) {
        document.body.classList.remove('cc-left-collapsed');
        return;
      }
      const saved = localStorage.getItem(key) === '1';
      document.body.classList.toggle('cc-left-collapsed',saved);
      button.textContent = saved ? '»' : '«';
      button.setAttribute('aria-label',saved ? 'Expandir menu' : 'Recolher menu');
    };
    restore();
    button.addEventListener('click',() => {
      setTimeout(() => {
        if (!desktop()) return;
        const collapsed = document.body.classList.contains('cc-left-collapsed');
        localStorage.setItem(key,collapsed ? '1' : '0');
        button.textContent = collapsed ? '»' : '«';
        button.setAttribute('aria-label',collapsed ? 'Expandir menu' : 'Recolher menu');
      },0);
    });
    let timer = null;
    window.addEventListener('resize',() => {
      clearTimeout(timer);
      timer = setTimeout(restore,120);
    },{passive:true});
  };

  const init = async () => {
    initSidebarCollapse();
    await applyCardCover();
    window.addEventListener('pageshow',() => getProfile(true).then(applyCardCover).catch(() => {}));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',() => init().catch(() => {}),{once:true});
  else init().catch(() => {});
})();