(() => {
  'use strict';
  if (window.__CC_PLAYER_PARTICIPATIONS_V1__) return;
  window.__CC_PLAYER_PARTICIPATIONS_V1__ = true;

  const q = (sel, root = document) => root.querySelector(sel);
  const slug = String(new URLSearchParams(location.search).get('slug') || '').trim();
  if (!slug) return;

  const fmtDate = (value) => {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
      }).format(new Date(value));
    } catch { return ''; }
  };

  const waitForDb = async () => {
    for (let i = 0; i < 80; i += 1) {
      const db = window.getCosplayChessDb ? window.getCosplayChessDb() : window.COSPLAYCHESS_DB;
      if (db) return db;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return null;
  };

  const buildCard = (row) => {
    const section = document.createElement('section');
    section.className = 'profile-participation-card';
    section.setAttribute('aria-label', row.is_upcoming ? 'Próxima participação' : 'Participação vinculada');

    const badge = document.createElement('span');
    badge.className = 'profile-participation-kicker';
    badge.textContent = row.is_upcoming ? 'PRÓXIMA PARTICIPAÇÃO' : 'PARTICIPAÇÃO VINCULADA';

    const body = document.createElement('div');
    body.className = 'profile-participation-body';

    const event = document.createElement('div');
    event.className = 'profile-participation-event';
    const eventLabel = document.createElement('span');
    eventLabel.textContent = 'Evento';
    const eventTitle = document.createElement('h3');
    eventTitle.textContent = row.event_title || 'Evento CosplayChess';
    const meta = document.createElement('p');
    const parts = [fmtDate(row.event_start_at), String(row.event_city || '').trim()].filter(Boolean);
    meta.textContent = parts.join(' · ');
    event.append(eventLabel, eventTitle);
    if (meta.textContent) event.appendChild(meta);

    const character = document.createElement('div');
    character.className = 'profile-participation-character';
    const characterLabel = document.createElement('span');
    characterLabel.textContent = 'Personagem inscrito';
    const characterName = document.createElement('b');
    characterName.textContent = row.character_name || 'Personagem a definir';
    const status = document.createElement('small');
    status.textContent = '✓ Inscrição confirmada';
    character.append(characterLabel, characterName, status);

    body.append(event, character);
    section.append(badge, body);
    return section;
  };

  const init = async () => {
    const db = await waitForDb();
    if (!db) return;

    const { data, error } = await db.rpc('cosplay_public_profile_participations', { target_slug: slug });
    if (error || !Array.isArray(data) || !data.length) return;

    const rows = [...data];
    rows.sort((a, b) => {
      if (!!a.is_upcoming !== !!b.is_upcoming) return a.is_upcoming ? -1 : 1;
      const at = new Date(a.event_start_at || 0).getTime();
      const bt = new Date(b.event_start_at || 0).getTime();
      return a.is_upcoming ? at - bt : bt - at;
    });

    const target = rows[0];
    const summary = q('.profile-summary');
    if (!summary || q('.profile-participation-card')) return;
    summary.insertAdjacentElement('afterend', buildCard(target));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init().catch(() => {}), { once:true });
  else init().catch(() => {});
})();
