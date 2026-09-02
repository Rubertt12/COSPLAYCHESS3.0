(() => {
  'use strict';
  if (window.__CC_PARTICIPANT_AVATAR_POSITION_V1__) return;
  window.__CC_PARTICIPANT_AVATAR_POSITION_V1__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db?.auth) return;

  const $ = (id) => document.getElementById(id);
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  let user = null;
  let profile = null;
  let draftX = 50;
  let draftY = 35;
  let adjusting = false;
  let drag = null;
  let saveTimer = 0;

  const avatarWrap = () => document.querySelector('.premium-avatar-wrap');
  const avatar = () => $('participantHeroAvatar');
  const avatarImg = () => avatar()?.querySelector('img') || null;
  const camera = () => document.querySelector('.premium-avatar-camera');
  const selectedProfileId = () => $('participantProfilePicker')?.value || '';

  function ensureHint() {
    const wrap = avatarWrap();
    if (!wrap) return null;
    let hint = wrap.querySelector('.participant-avatar-position-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'participant-avatar-position-hint';
      hint.hidden = true;
      wrap.appendChild(hint);
    }
    return hint;
  }

  function paint() {
    const img = avatarImg();
    if (img) {
      img.style.objectFit = 'cover';
      img.style.objectPosition = `${draftX}% ${draftY}%`;
      img.draggable = false;
    }
  }

  function setAdjusting(value, message = '') {
    adjusting = Boolean(value && avatarImg());
    const wrap = avatarWrap();
    const cam = camera();
    const hint = ensureHint();
    wrap?.classList.toggle('is-avatar-adjusting', adjusting);
    if (cam) {
      cam.textContent = adjusting ? '✓' : '⌁';
      cam.title = adjusting ? 'Finalizar ajuste da foto' : 'Reposicionar foto de perfil';
      cam.setAttribute('aria-label', cam.title);
    }
    if (hint) {
      hint.hidden = !adjusting;
      hint.innerHTML = adjusting
        ? `<b>${message || 'Ajustar foto de perfil'}</b>Arraste a foto dentro do círculo. A posição é salva ao soltar.`
        : '';
    }
  }

  async function savePosition() {
    if (!profile?.id || !user?.id) return;
    clearTimeout(saveTimer);
    const x = clamp(draftX), y = clamp(draftY);
    saveTimer = window.setTimeout(async () => {
      const { error } = await db.from('cosplay_participant_profiles')
        .update({ avatar_position_x: x, avatar_position_y: y })
        .eq('id', profile.id)
        .eq('user_id', user.id);
      const hint = ensureHint();
      if (error) {
        if (hint && adjusting) hint.innerHTML = '<b>Não foi possível salvar</b>Tente novamente em alguns segundos.';
        return;
      }
      profile.avatar_position_x = x;
      profile.avatar_position_y = y;
      if (hint && adjusting) hint.innerHTML = `<b>Posição salva · ${x}% / ${y}%</b>Você pode arrastar novamente ou clicar no ✓ para finalizar.`;
    }, 80);
  }

  async function loadProfile() {
    const { data: sessionData } = await db.auth.getSession();
    user = sessionData?.session?.user || null;
    if (!user) return false;
    const selected = selectedProfileId();
    let query = db.from('cosplay_participant_profiles')
      .select('id,user_id,character_photo_url,avatar_position_x,avatar_position_y,registration_status,created_at')
      .eq('user_id', user.id)
      .neq('registration_status', 'cancelled');
    const result = selected
      ? await query.eq('id', selected).limit(1).maybeSingle()
      : await query.order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (result.error || !result.data) return false;
    profile = result.data;
    draftX = clamp(profile.avatar_position_x ?? 50);
    draftY = clamp(profile.avatar_position_y ?? 35);
    requestAnimationFrame(paint);
    return true;
  }

  function bindDrag() {
    const root = avatar();
    if (!root || root.dataset.avatarPositionBound === '1') return;
    root.dataset.avatarPositionBound = '1';
    root.addEventListener('pointerdown', (event) => {
      if (!adjusting || !avatarImg()) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = root.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: draftX,
        startY: draftY,
        width: Math.max(rect.width, 1),
        height: Math.max(rect.height, 1)
      };
      try { root.setPointerCapture(event.pointerId); } catch {}
    });
    root.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      const dx = event.clientX - drag.startClientX;
      const dy = event.clientY - drag.startClientY;
      draftX = clamp(drag.startX - (dx / drag.width) * 100);
      draftY = clamp(drag.startY - (dy / drag.height) * 100);
      paint();
    });
    const finish = (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      try { root.releasePointerCapture(event.pointerId); } catch {}
      drag = null;
      savePosition();
    };
    root.addEventListener('pointerup', finish);
    root.addEventListener('pointercancel', finish);
  }

  function bindCamera() {
    const cam = camera();
    if (!cam || cam.dataset.avatarPositionBound === '1') return;
    cam.dataset.avatarPositionBound = '1';
    cam.setAttribute('role', 'button');
    cam.tabIndex = 0;
    cam.title = 'Reposicionar foto de perfil';
    cam.setAttribute('aria-label', cam.title);
    const toggle = async (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!avatarImg()) return;
      if (!profile && !await loadProfile()) return;
      setAdjusting(!adjusting);
    };
    cam.addEventListener('click', toggle);
    cam.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') toggle(event);
    });
  }

  function observeAvatar() {
    const root = avatar();
    if (!root || root.dataset.avatarPositionObserved === '1') return;
    root.dataset.avatarPositionObserved = '1';
    new MutationObserver(() => requestAnimationFrame(paint)).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  }

  const refresh = async () => {
    bindCamera();
    bindDrag();
    observeAvatar();
    await loadProfile();
    paint();
  };

  function bind() {
    refresh();
    $('participantProfilePicker')?.addEventListener('change', () => {
      setAdjusting(false);
      setTimeout(refresh, 260);
      setTimeout(refresh, 620);
    });
    $('participantPhotoFile')?.addEventListener('change', () => {
      draftX = 50;
      draftY = 35;
      requestAnimationFrame(paint);
    });
    const dashboard = document.querySelector('[data-participant-dashboard]');
    if (dashboard) new MutationObserver(() => {
      if (!dashboard.hidden) {
        setTimeout(refresh, 140);
        setTimeout(refresh, 650);
      }
    }).observe(dashboard, { attributes: true, attributeFilter: ['hidden'] });
    db.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setTimeout(refresh, 220);
    });
    setTimeout(refresh, 900);
    setTimeout(refresh, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
