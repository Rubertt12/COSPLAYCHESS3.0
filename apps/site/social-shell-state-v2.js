(() => {
  'use strict';
  if (window.__CC_SOCIAL_SHELL_STATE_V2__) return;
  window.__CC_SOCIAL_SHELL_STATE_V2__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db?.auth) return;

  const CACHE_KEY = 'cc-social-shell-state-v2';
  let current = null;
  let heartbeatTimer = 0;
  let repaintTimer = 0;
  let observer = null;

  const safeUrl = (value) => {
    try {
      const url = new URL(String(value || ''), location.href);
      return ['http:','https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };

  const readCache = () => {
    try {
      const value = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (!value || !value.uid || !value.profile) return null;
      return value;
    } catch { return null; }
  };

  const writeCache = (value) => {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({...value, cachedAt:Date.now()})); } catch {}
  };

  const paintAvatar = (root, src, name) => {
    if (!root) return;
    const url = safeUrl(src);
    root.replaceChildren();
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = name || 'Foto do participante';
      img.loading = 'eager';
      img.decoding = 'async';
      root.appendChild(img);
    } else {
      const fallback = document.createElement('span');
      fallback.textContent = '♜';
      root.appendChild(fallback);
    }
  };

  const applyTheme = (settings = {}) => {
    const theme = settings.theme || 'cosplay-dark';
    const accent = settings.accent || 'gold';
    document.body.dataset.ccTheme = theme;
    document.body.dataset.ccAccent = accent;
    if (accent === 'purple') {
      document.body.style.setProperty('--gold','#c776ff');
      document.body.style.setProperty('--gold2','#9150c6');
      document.body.style.setProperty('--purple','#9b4dff');
    } else {
      document.body.style.setProperty('--gold','#f0b62f');
      document.body.style.setProperty('--gold2','#c98b12');
      document.body.style.setProperty('--purple','#9747ff');
    }
  };

  const apply = (snapshot) => {
    if (!snapshot?.profile) return;
    current = snapshot;
    const p = snapshot.profile;
    const s = snapshot.settings || {};
    const name = p.display_name || p.nick || 'Participante';
    const character = p.character_name || 'CosplayChess';

    const mineName = document.getElementById('communityMyName');
    if (mineName) mineName.textContent = name;
    const mineCharacter = document.getElementById('communityMyCharacter');
    if (mineCharacter) mineCharacter.textContent = character;
    document.querySelectorAll('[data-cc-profile-name]').forEach((el) => { el.textContent = name; });
    document.querySelectorAll('[data-cc-profile-character]').forEach((el) => { el.textContent = character; });

    const avatars = new Set([
      document.getElementById('communityMyAvatar'),
      ...document.querySelectorAll('.cc-mirror-avatar')
    ].filter(Boolean));
    avatars.forEach((el) => paintAvatar(el, p.character_photo_url, name));

    const link = document.getElementById('communityMyProfileLink');
    if (link && p.public_slug) {
      link.href = `./jogador.html?slug=${encodeURIComponent(p.public_slug)}`;
      link.textContent = 'Ver perfil cosplay';
    }

    const cover = document.querySelector('.cc-profile-cover');
    if (cover) {
      const url = safeUrl(p.cover_photo_url);
      cover.classList.toggle('has-cover', Boolean(url));
      if (url) {
        cover.style.backgroundImage = `url("${url.replace(/"/g,'%22')}")`;
        cover.style.backgroundPosition = `${Number(p.cover_position_x ?? 50)}% ${Number(p.cover_position_y ?? 50)}%`;
        cover.style.backgroundSize = 'cover';
      } else {
        cover.style.removeProperty('background-image');
      }
    }

    applyTheme(s);
    document.documentElement.dataset.ccSocialShellReady = '1';
    window.dispatchEvent(new CustomEvent('cosplay:social-shell-restored',{detail:{profile:p,settings:s}}));
  };

  const scheduleRepaint = () => {
    if (!current?.profile) return;
    clearTimeout(repaintTimer);
    repaintTimer = setTimeout(() => {
      const expectedName = current.profile.display_name || current.profile.nick || 'Participante';
      const expectedCharacter = current.profile.character_name || 'CosplayChess';
      const shownName = document.getElementById('communityMyName')?.textContent?.trim() || '';
      const shownCharacter = document.getElementById('communityMyCharacter')?.textContent?.trim() || '';
      const mirrorNames = [...document.querySelectorAll('[data-cc-profile-name]')].map(el => el.textContent?.trim() || '');
      const mirrorCharacters = [...document.querySelectorAll('[data-cc-profile-character]')].map(el => el.textContent?.trim() || '');
      const expectedAvatar = safeUrl(current.profile.character_photo_url);
      const avatarSrc = document.querySelector('#communityMyAvatar img,.cc-mirror-avatar img')?.src || '';

      const mismatch =
        shownName !== expectedName ||
        shownCharacter !== expectedCharacter ||
        mirrorNames.some(value => value !== expectedName) ||
        mirrorCharacters.some(value => value !== expectedCharacter) ||
        (expectedAvatar && avatarSrc !== expectedAvatar);

      if (mismatch) apply(current);
    }, 80);
  };

  const heartbeat = async () => {
    if (document.hidden) return;
    try { await db.rpc('cosplay_social_presence_heartbeat'); } catch {}
  };

  const startHeartbeat = () => {
    clearInterval(heartbeatTimer);
    heartbeat().catch(() => {});
    heartbeatTimer = setInterval(() => heartbeat().catch(() => {}), 60_000);
  };

  const sync = async () => {
    const { data:sessionData } = await db.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      current = null;
      try { sessionStorage.removeItem(CACHE_KEY); } catch {}
      return;
    }

    const cached = readCache();
    if (cached?.uid === user.id) apply(cached);

    const { data:profile, error } = await db.from('cosplay_participant_profiles')
      .select('id,user_id,public_slug,display_name,nick,character_name,character_photo_url,cover_photo_url,cover_position_x,cover_position_y,profile_visible,created_at')
      .eq('user_id',user.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:true})
      .limit(1)
      .maybeSingle();
    if (error || !profile) return;

    const { data:settings } = await db.from('cosplay_profile_social_settings')
      .select('theme,accent,status_message,show_online,presence_status,community_background,community_visible')
      .eq('profile_id',profile.id)
      .maybeSingle();

    const snapshot = {uid:user.id,profile,settings:settings || {}};
    writeCache(snapshot);
    apply(snapshot);
    startHeartbeat();

    if (!observer) {
      observer = new MutationObserver(scheduleRepaint);
      observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      heartbeat().catch(() => {});
      scheduleRepaint();
    }
  });
  window.addEventListener('focus', () => { heartbeat().catch(() => {}); scheduleRepaint(); });
  window.addEventListener('pageshow', scheduleRepaint);
  window.addEventListener('cosplay:right-rail-restored', () => setTimeout(() => current && apply(current), 20));
  db.auth.onAuthStateChange((event,session) => {
    if (!session?.user && event === 'SIGNED_OUT') {
      current = null;
      try { sessionStorage.removeItem(CACHE_KEY); } catch {}
      return;
    }
    if (session?.user && ['SIGNED_IN','TOKEN_REFRESHED','INITIAL_SESSION','USER_UPDATED'].includes(event)) setTimeout(() => sync().catch(() => {}),60);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => sync().catch(() => {}), {once:true});
  else sync().catch(() => {});
})();