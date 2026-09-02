(() => {
  'use strict';
  if (window.__CC_SOCIAL_PROFILE_AVATAR_POSITION_V1__) return;
  window.__CC_SOCIAL_PROFILE_AVATAR_POSITION_V1__ = true;

  const db = window.getCosplayChessParticipantDb
    ? window.getCosplayChessParticipantDb()
    : (window.COSPLAYCHESS_PARTICIPANT_DB || window.COSPLAYCHESS_DB);
  if (!db?.auth) return;

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const safe = (value) => {
    try {
      const url = new URL(String(value || ''), location.href);
      return ['http:','https:','blob:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };

  const state = {
    user: null,
    profile: null,
    draftX: 50,
    draftY: 35,
    dragging: false,
    drag: null,
    observerTimer: 0
  };

  const style = document.createElement('style');
  style.id = 'ccSocialAvatarPositionCss';
  style.textContent = `
    .cc-profile-card .cc-profile-identity .cc-mirror-avatar{
      position:relative!important;
      overflow:visible!important;
    }
    .cc-profile-card .cc-profile-identity .cc-mirror-avatar>img{
      width:100%!important;
      height:100%!important;
      border-radius:inherit!important;
      object-fit:cover!important;
    }
    .cc-avatar-edit-direct{
      position:absolute;
      right:-5px;
      bottom:-5px;
      z-index:18;
      width:28px;
      height:28px;
      display:grid;
      place-items:center;
      padding:0;
      border:1px solid rgba(216,174,67,.72);
      border-radius:50%;
      background:linear-gradient(145deg,#16131e,#090c12);
      color:#f5cb63;
      box-shadow:0 5px 16px rgba(0,0,0,.42);
      cursor:pointer;
      font:900 13px/1 Inter,system-ui,sans-serif;
    }
    .cc-avatar-edit-direct:hover{transform:translateY(-1px);border-color:#f2ca66;background:#20182c}
    .cc-avatar-edit-direct[hidden]{display:none!important}
    .cc-avatar-position-modal{
      position:fixed;
      inset:0;
      z-index:12050;
      display:grid;
      place-items:center;
      padding:18px;
    }
    .cc-avatar-position-modal[hidden]{display:none!important}
    .cc-avatar-position-backdrop{
      position:absolute;
      inset:0;
      background:rgba(1,3,8,.82);
      backdrop-filter:blur(9px);
    }
    .cc-avatar-position-dialog{
      position:relative;
      width:min(470px,100%);
      padding:20px;
      border:1px solid rgba(159,82,255,.42);
      border-radius:20px;
      background:linear-gradient(145deg,#12101a,#080b11);
      color:#f8f5fb;
      box-shadow:0 32px 100px rgba(0,0,0,.62);
    }
    .cc-avatar-position-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:17px}
    .cc-avatar-position-head span{display:block;color:#f0bd45;font-size:8px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
    .cc-avatar-position-head h3{margin:4px 0 3px;font-size:20px}
    .cc-avatar-position-head p{margin:0;color:#8e8798;font-size:9px;line-height:1.45}
    .cc-avatar-position-close{width:34px;height:34px;border:1px solid rgba(255,255,255,.11);border-radius:10px;background:#17151d;color:#fff;cursor:pointer;font-size:20px}
    .cc-avatar-position-stage{
      display:grid;
      place-items:center;
      min-height:286px;
      border:1px solid rgba(255,255,255,.07);
      border-radius:16px;
      background:radial-gradient(circle at 50% 42%,rgba(137,67,246,.15),transparent 47%),rgba(5,7,12,.64);
    }
    .cc-avatar-position-preview{
      position:relative;
      width:238px;
      height:238px;
      overflow:hidden;
      border:4px solid #d9aa42;
      border-radius:50%;
      background:#080b11;
      box-shadow:0 0 0 5px rgba(217,170,66,.08),0 20px 55px rgba(0,0,0,.45);
      cursor:grab;
      touch-action:none;
      user-select:none;
    }
    .cc-avatar-position-preview.is-dragging{cursor:grabbing}
    .cc-avatar-position-preview img{width:100%;height:100%;display:block;object-fit:cover;pointer-events:none;user-select:none}
    .cc-avatar-position-preview:after{
      content:'↕ ARRASTE PARA ENQUADRAR';
      position:absolute;
      left:50%;
      bottom:14px;
      transform:translateX(-50%);
      padding:7px 10px;
      border:1px solid rgba(255,255,255,.15);
      border-radius:999px;
      background:rgba(4,6,11,.78);
      color:#fff;
      font-size:7px;
      font-weight:900;
      letter-spacing:.08em;
      white-space:nowrap;
      pointer-events:none;
    }
    .cc-avatar-position-readout{margin:13px 0 0;text-align:center;color:#8f8799;font-size:9px}
    .cc-avatar-position-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:16px}
    .cc-avatar-position-status{margin-right:auto;color:#9a93a2;font-size:8.5px}
    .cc-avatar-position-status[data-kind="success"]{color:#7fdda0}
    .cc-avatar-position-status[data-kind="error"]{color:#ff8fa1}
    .cc-avatar-position-actions button{min-height:38px;border-radius:10px;padding:0 13px;font-size:9px;font-weight:800;cursor:pointer}
    .cc-avatar-position-center,.cc-avatar-position-cancel{border:1px solid rgba(255,255,255,.12);background:#141720;color:#eee}
    .cc-avatar-position-save{border:1px solid #9d4cff;background:linear-gradient(135deg,#7831d8,#a344ff);color:#fff}
    @media(max-width:520px){
      .cc-avatar-position-dialog{padding:16px;border-radius:17px}
      .cc-avatar-position-stage{min-height:250px}
      .cc-avatar-position-preview{width:205px;height:205px}
      .cc-avatar-position-actions{display:grid;grid-template-columns:1fr 1fr}
      .cc-avatar-position-status{grid-column:1/-1;margin:0;min-height:13px}
      .cc-avatar-position-save{grid-column:1/-1}
    }
  `;
  if (!document.getElementById(style.id)) document.head.appendChild(style);

  function ownAvatarImages() {
    return qa('#communityMyAvatar img,.cc-mirror-avatar img').filter((img) => {
      return img.closest('.cc-profile-card') || img.closest('#communityMyAvatar') || img.closest('.community-me-card') || img.closest('.cc-left');
    });
  }

  function applyPosition() {
    const x = clamp(state.profile?.avatar_position_x ?? state.draftX ?? 50);
    const y = clamp(state.profile?.avatar_position_y ?? state.draftY ?? 35);
    ownAvatarImages().forEach((img) => {
      img.style.setProperty('object-fit','cover','important');
      img.style.setProperty('object-position',`${x}% ${y}%`,'important');
    });
  }

  async function loadProfile(force = false) {
    if (state.profile && !force) return state.profile;
    const { data: auth } = await db.auth.getSession();
    state.user = auth?.session?.user || null;
    if (!state.user) return null;
    const { data, error } = await db.from('cosplay_participant_profiles')
      .select('id,user_id,character_photo_url,avatar_position_x,avatar_position_y,registration_status,created_at')
      .eq('user_id', state.user.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:true})
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    state.profile = data;
    state.draftX = clamp(data.avatar_position_x ?? 50);
    state.draftY = clamp(data.avatar_position_y ?? 35);
    applyPosition();
    return data;
  }

  function ensureEditButton() {
    const avatar = q('.cc-profile-card .cc-profile-identity .cc-mirror-avatar');
    if (!avatar) return;
    let button = q('.cc-avatar-edit-direct', avatar);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'cc-avatar-edit-direct';
      button.title = 'Ajustar foto do perfil';
      button.setAttribute('aria-label','Ajustar foto do perfil');
      button.textContent = '✎';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openEditor().catch(() => {});
      });
      avatar.appendChild(button);
    }
    button.hidden = !q('img', avatar);
  }

  function status(message = '', kind = '') {
    const el = q('#ccAvatarPositionStatus');
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
  }

  function updateReadout() {
    const el = q('#ccAvatarPositionReadout');
    if (el) el.textContent = `Horizontal ${state.draftX}% · Vertical ${state.draftY}%`;
  }

  function paintPreview() {
    const img = q('#ccAvatarPositionPreview img');
    if (!img) return;
    img.style.objectPosition = `${state.draftX}% ${state.draftY}%`;
    updateReadout();
  }

  function ensureModal() {
    let modal = q('#ccAvatarPositionModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'ccAvatarPositionModal';
    modal.className = 'cc-avatar-position-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="cc-avatar-position-backdrop" data-avatar-close></div>
      <section class="cc-avatar-position-dialog" role="dialog" aria-modal="true" aria-labelledby="ccAvatarPositionTitle">
        <div class="cc-avatar-position-head">
          <div><span>SEU PERFIL COSPLAY</span><h3 id="ccAvatarPositionTitle">Ajustar foto de perfil</h3><p>Arraste a foto até o rosto ficar enquadrado do jeito que você quer.</p></div>
          <button class="cc-avatar-position-close" type="button" data-avatar-close aria-label="Fechar">×</button>
        </div>
        <div class="cc-avatar-position-stage">
          <div class="cc-avatar-position-preview" id="ccAvatarPositionPreview"></div>
        </div>
        <div class="cc-avatar-position-readout" id="ccAvatarPositionReadout">Horizontal 50% · Vertical 35%</div>
        <div class="cc-avatar-position-actions">
          <span class="cc-avatar-position-status" id="ccAvatarPositionStatus"></span>
          <button class="cc-avatar-position-cancel" type="button" data-avatar-close>Cancelar</button>
          <button class="cc-avatar-position-center" id="ccAvatarPositionCenter" type="button">Centralizar</button>
          <button class="cc-avatar-position-save" id="ccAvatarPositionSave" type="button">Salvar posição</button>
        </div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-avatar-close]').forEach((el) => el.addEventListener('click', closeEditor));
    q('#ccAvatarPositionCenter')?.addEventListener('click', () => {
      state.draftX = 50;
      state.draftY = 35;
      paintPreview();
      status('Posição inicial restaurada.');
    });
    q('#ccAvatarPositionSave')?.addEventListener('click', savePosition);
    bindDrag();
    return modal;
  }

  function bindDrag() {
    const root = q('#ccAvatarPositionPreview');
    if (!root || root.dataset.dragBound === '1') return;
    root.dataset.dragBound = '1';
    root.addEventListener('pointerdown', (event) => {
      if (!q('img', root)) return;
      event.preventDefault();
      const rect = root.getBoundingClientRect();
      state.dragging = true;
      state.drag = {
        id:event.pointerId,
        x:event.clientX,
        y:event.clientY,
        startX:state.draftX,
        startY:state.draftY,
        w:Math.max(rect.width,1),
        h:Math.max(rect.height,1)
      };
      root.classList.add('is-dragging');
      try { root.setPointerCapture(event.pointerId); } catch {}
    });
    root.addEventListener('pointermove', (event) => {
      const drag = state.drag;
      if (!state.dragging || !drag || event.pointerId !== drag.id) return;
      event.preventDefault();
      state.draftX = clamp(drag.startX - ((event.clientX - drag.x) / drag.w) * 100);
      state.draftY = clamp(drag.startY - ((event.clientY - drag.y) / drag.h) * 100);
      paintPreview();
    });
    const finish = (event) => {
      if (!state.dragging || !state.drag || event.pointerId !== state.drag.id) return;
      state.dragging = false;
      state.drag = null;
      root.classList.remove('is-dragging');
      try { root.releasePointerCapture(event.pointerId); } catch {}
    };
    root.addEventListener('pointerup', finish);
    root.addEventListener('pointercancel', finish);
  }

  async function openEditor() {
    const profile = await loadProfile(true);
    if (!profile) return;
    const image = safe(profile.character_photo_url) || q('.cc-profile-card .cc-mirror-avatar img')?.src || '';
    if (!image) return;
    state.draftX = clamp(profile.avatar_position_x ?? 50);
    state.draftY = clamp(profile.avatar_position_y ?? 35);
    const modal = ensureModal();
    const preview = q('#ccAvatarPositionPreview');
    preview.replaceChildren();
    const img = document.createElement('img');
    img.src = image;
    img.alt = 'Prévia da foto do perfil';
    img.draggable = false;
    preview.appendChild(img);
    paintPreview();
    status('Arraste a foto para ajustar.');
    modal.hidden = false;
  }

  function closeEditor() {
    const modal = q('#ccAvatarPositionModal');
    if (modal) modal.hidden = true;
    state.dragging = false;
    state.drag = null;
  }

  async function savePosition() {
    if (!state.profile?.id || !state.user?.id) return;
    const button = q('#ccAvatarPositionSave');
    if (button) button.disabled = true;
    status('Salvando...');
    const { error } = await db.from('cosplay_participant_profiles')
      .update({avatar_position_x:state.draftX, avatar_position_y:state.draftY})
      .eq('id',state.profile.id)
      .eq('user_id',state.user.id);
    if (error) {
      status('Não foi possível salvar a posição.','error');
      if (button) button.disabled = false;
      return;
    }
    state.profile.avatar_position_x = state.draftX;
    state.profile.avatar_position_y = state.draftY;
    applyPosition();
    status('Foto alinhada e salva.','success');
    if (button) button.disabled = false;
    setTimeout(closeEditor, 520);
    window.dispatchEvent(new CustomEvent('cosplay:avatar-position-updated',{detail:{profileId:state.profile.id,x:state.draftX,y:state.draftY}}));
  }

  function refresh() {
    clearTimeout(state.observerTimer);
    state.observerTimer = setTimeout(() => {
      ensureEditButton();
      applyPosition();
    }, 60);
  }

  function bind() {
    loadProfile().catch(() => {});
    ensureEditButton();
    const rail = q('.cc-right') || document.body;
    new MutationObserver(refresh).observe(rail,{childList:true,subtree:true});
    window.addEventListener('cosplay:right-rail-restored', refresh);
    window.addEventListener('cosplay-load-primary-profile', () => {
      state.profile = null;
      setTimeout(() => loadProfile(true).then(refresh).catch(() => {}), 80);
    });
    db.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;
      state.profile = null;
      setTimeout(() => loadProfile(true).then(refresh).catch(() => {}), 180);
    });
    [250,700,1400,2600].forEach((ms) => setTimeout(refresh,ms));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
