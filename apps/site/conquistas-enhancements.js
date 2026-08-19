(() => {
  if (window.__cosplayAchievementEnhancementsLoaded) return;
  window.__cosplayAchievementEnhancementsLoaded = true;

  const db = window.getCosplayChessDb?.() || window.COSPLAYCHESS_DB;
  if (!db) return;

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const norm = value => String(value ?? '').trim().toLocaleLowerCase('pt-BR');
  const initials = value => String(value || '').trim().split(/\s+/).slice(0, 2).map(v => v[0] || '').join('').toUpperCase() || '♟';
  const fmtDate = value => {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
        timeZone: window.COSPLAYCHESS_CONFIG?.timezone || 'America/Sao_Paulo'
      }).format(new Date(value));
    } catch (_) { return ''; }
  };

  function photoBox(url, name, cls) {
    if (url) return `<div class="${cls}" style="background-image:url('${esc(url)}')" aria-label="Foto de ${esc(name)}"></div>`;
    return `<div class="${cls}" aria-label="${esc(name)}">${esc(initials(name))}</div>`;
  }

  async function loadPhotoMaps(awards) {
    const regIds = [...new Set((awards || []).map(a => a.registration_id).filter(Boolean).map(String))];
    const names = [...new Set((awards || []).filter(a => !a.registration_id).map(a => a.cosplayer_name).filter(Boolean))];
    const rows = [];

    if (regIds.length) {
      const { data } = await db.from('cosplay_match_players')
        .select('registration_id,cosplayer_name,character_name,photo_url,created_at,cosplay_matches!inner(published)')
        .in('registration_id', regIds)
        .eq('cosplay_matches.published', true)
        .not('photo_url', 'is', null)
        .order('created_at', { ascending: false });
      rows.push(...(data || []));
    }

    if (names.length) {
      const { data } = await db.from('cosplay_match_players')
        .select('registration_id,cosplayer_name,character_name,photo_url,created_at,cosplay_matches!inner(published)')
        .in('cosplayer_name', names)
        .eq('cosplay_matches.published', true)
        .not('photo_url', 'is', null)
        .order('created_at', { ascending: false });
      rows.push(...(data || []));
    }

    const byReg = new Map();
    const byPerson = new Map();
    for (const row of rows) {
      if (!row?.photo_url) continue;
      if (row.registration_id && !byReg.has(String(row.registration_id))) byReg.set(String(row.registration_id), row.photo_url);
      const key = `${norm(row.cosplayer_name)}|${norm(row.character_name)}`;
      if (!byPerson.has(key)) byPerson.set(key, row.photo_url);
      const nameKey = `${norm(row.cosplayer_name)}|`;
      if (!byPerson.has(nameKey)) byPerson.set(nameKey, row.photo_url);
    }
    return { byReg, byPerson };
  }

  function awardPhoto(award, maps) {
    if (award.registration_id) {
      const hit = maps.byReg.get(String(award.registration_id));
      if (hit) return hit;
    }
    return maps.byPerson.get(`${norm(award.cosplayer_name)}|${norm(award.character_name)}`)
      || maps.byPerson.get(`${norm(award.cosplayer_name)}|`)
      || '';
  }

  function renderAchievementCards(achievements, awards, maps) {
    const root = document.getElementById('achievementsGrid');
    if (!root) return;
    const grouped = new Map();
    for (const award of awards || []) {
      if (!grouped.has(award.achievement_id)) grouped.set(award.achievement_id, []);
      grouped.get(award.achievement_id).push(award);
    }

    if (!achievements?.length) {
      root.innerHTML = '<div class="empty-card">As conquistas serão reveladas em breve.</div>';
      return;
    }

    root.innerHTML = achievements.map(a => {
      const winners = grouped.get(a.id) || [];
      const preview = winners.slice(0, 4);
      const extra = Math.max(0, winners.length - preview.length);
      return `<article class="achievement-card">
        <span class="award-count">${winners.length} desbloqueio${winners.length === 1 ? '' : 's'}</span>
        <div class="achievement-icon">${esc(a.icon || '🏆')}</div>
        <span class="achievement-tier">${esc(a.tier || 'Conquista')}</span>
        <h3>${esc(a.title || 'Conquista')}</h3>
        <p>${esc(a.description || '')}</p>
        <small>${esc(a.criteria_text || '')}</small>
        ${preview.length ? `<div class="achievement-winners" title="Personagens que desbloquearam esta conquista">${preview.map(w => photoBox(awardPhoto(w, maps), w.character_name || w.cosplayer_name, 'achievement-winner-avatar')).join('')}${extra ? `<span class="achievement-winners-more">+${extra}</span>` : ''}</div>` : ''}
      </article>`;
    }).join('');
  }

  function renderAwardsFeed(awards, maps) {
    const feed = document.getElementById('awardsFeed');
    if (!feed) return;
    if (!awards?.length) {
      feed.innerHTML = '<div class="empty-card">Ainda não há troféus desbloqueados. A história está só começando.</div>';
      return;
    }

    feed.innerHTML = awards.slice(0, 24).map(a => {
      const photo = awardPhoto(a, maps);
      const achievement = a.cosplay_achievements || {};
      const event = a.cosplay_events || {};
      return `<article class="award-item">
        ${photoBox(photo, a.character_name || a.cosplayer_name, 'award-character-photo')}
        <div class="award-item-copy">
          <b>${esc(achievement.icon || '🏆')} ${esc(achievement.title || 'Conquista')}</b>
          <span>${esc(a.cosplayer_name || 'Cosplayer')}<em>${esc(a.character_name || 'Personagem não informado')}</em></span>
          <small>${esc(event.title || 'CosplayChess')} · ${esc(fmtDate(a.awarded_at))}</small>
        </div>
      </article>`;
    }).join('');
  }

  async function init() {
    document.body.classList.add('achievements-page');
    const [achRes, awardRes] = await Promise.all([
      db.from('cosplay_achievements').select('*').eq('published', true).order('sort_order'),
      db.from('cosplay_cosplayer_achievements')
        .select('id,achievement_id,event_id,registration_id,cosplayer_name,character_name,awarded_at,cosplay_achievements(title,icon,tier),cosplay_events(title)')
        .order('awarded_at', { ascending: false })
        .limit(200)
    ]);

    if (achRes.error || awardRes.error) return;
    const achievements = achRes.data || [];
    const awards = awardRes.data || [];
    const maps = await loadPhotoMaps(awards);
    renderAchievementCards(achievements, awards, maps);
    renderAwardsFeed(awards, maps);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
