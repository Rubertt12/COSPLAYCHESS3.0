(() => {
  if (window.__cosplayChampionCollectibleLoaded) return;
  window.__cosplayChampionCollectibleLoaded = true;

  const db = window.getCosplayChessDb?.() || window.COSPLAYCHESS_DB;
  if (!db) return;

  const COLLECTION_KEY = 'cosplaychess-champion-card-collection-v1';
  const LAST_SEEN_PREFIX = 'cosplaychess-champion-card-last-seen:';
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const fmtDate = value => {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
        timeZone: window.COSPLAYCHESS_CONFIG?.timezone || 'America/Sao_Paulo'
      }).format(new Date(value));
    } catch (_) { return ''; }
  };
  const sideLabel = side => side === 'B' ? 'Brancas' : side === 'P' ? 'Pretas' : '—';

  function loadCollection() {
    try {
      const parsed = JSON.parse(localStorage.getItem(COLLECTION_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function saveCollection(rows) {
    try { localStorage.setItem(COLLECTION_KEY, JSON.stringify(rows)); } catch (_) {}
    renderLauncher();
  }

  async function pruneCollection() {
    const cards = loadCollection();
    if (!cards.length) return [];
    const ids = cards.map(card => card.id).filter(Boolean);
    if (!ids.length) return [];
    const { data, error } = await db
      .from('cosplay_matches')
      .select('id,collectible_enabled,source_result_id')
      .in('id', ids);
    if (error) return cards;
    const active = new Set((data || [])
      .filter(row => row.collectible_enabled && String(row.source_result_id || '').trim())
      .map(row => String(row.id)));
    const kept = cards.filter(card => active.has(String(card.id)));
    if (kept.length !== cards.length) saveCollection(kept);
    return kept;
  }

  function hasCard(id) {
    return loadCollection().some(card => String(card.id) === String(id));
  }

  function cardCode(match) {
    const year = new Date(match.played_at || Date.now()).getFullYear();
    return `CC-${year}-${String(match.id || '').replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  }

  function playerName(match) {
    const n = Number(match.winner_player);
    const direct = n === 1 ? match.player1_name : match.player2_name;
    return String(direct || match.winner_cosplayer || `Jogador ${n || ''}`).trim();
  }

  async function getCurrentChampion() {
    const { data: matches, error } = await db
      .from('cosplay_matches')
      .select('id,event_id,match_label,played_at,winner_player,winner_side,winner_cosplayer,winner_photo_url,player1_name,player2_name,collectible_enabled,source_result_id,cosplay_events(id,title,start_at,venue,city)')
      .eq('published', true)
      .eq('collectible_enabled', true)
      .not('source_result_id', 'is', null)
      .neq('winner_side', 'DRAW')
      .order('played_at', { ascending: false })
      .limit(25);
    if (error || !matches?.length) return null;

    const champion = matches.find(row => [1, 2].includes(Number(row.winner_player)) && ['B', 'P'].includes(row.winner_side));
    if (!champion) return null;

    const { data: openEvents } = await db
      .from('cosplay_events')
      .select('id,title,start_at,created_at,registration_open,published')
      .eq('published', true)
      .eq('registration_open', true);

    const championPlayedAt = Date.parse(champion.played_at || '') || 0;
    const championEventStart = Date.parse(champion.cosplay_events?.start_at || '') || championPlayedAt;
    const newerRegistrationOpen = (openEvents || []).some(event => {
      if (String(event.id) === String(champion.event_id)) return false;
      const start = Date.parse(event.start_at || '') || 0;
      const created = Date.parse(event.created_at || '') || 0;
      return start > championEventStart || created > championPlayedAt;
    });
    if (newerRegistrationOpen) return null;

    return {
      id: champion.id,
      code: cardCode(champion),
      championName: playerName(champion),
      player: Number(champion.winner_player),
      side: champion.winner_side,
      sideName: sideLabel(champion.winner_side),
      photo: champion.winner_photo_url || '',
      eventId: champion.event_id,
      eventTitle: champion.cosplay_events?.title || 'CosplayChess',
      venue: champion.cosplay_events?.venue || '',
      city: champion.cosplay_events?.city || '',
      playedAt: champion.played_at,
      matchLabel: champion.match_label || 'Partida oficial',
      capturedAt: null
    };
  }

  function renderLauncher() {
    const cards = loadCollection();
    let launcher = document.querySelector('.cc-collection-launcher');
    if (!cards.length) {
      launcher?.remove();
      return;
    }
    if (!launcher) {
      launcher = document.createElement('button');
      launcher.type = 'button';
      launcher.className = 'cc-collection-launcher';
      launcher.addEventListener('click', openCollection);
      document.body.appendChild(launcher);
    }
    launcher.innerHTML = `♛ Minha coleção <b>${cards.length}</b>`;
  }

  async function openCollection() {
    document.querySelector('.cc-collection-overlay')?.remove();
    const cards = await pruneCollection();
    const overlay = document.createElement('div');
    overlay.className = 'cc-collection-overlay';
    overlay.innerHTML = `
      <div class="cc-collection-panel" role="dialog" aria-modal="true" aria-label="Minha coleção CosplayChess">
        <div class="cc-collection-head">
          <div><small>COLEÇÃO COSPLAYCHESS</small><h2>Campeões capturados</h2></div>
          <button type="button" data-close-collection>Fechar ✕</button>
        </div>
        ${cards.length ? `<div class="cc-collection-grid">${cards.map(card => `
          <article class="cc-mini-card">
            <div class="cc-mini-photo" ${card.photo ? `style="background-image:url('${esc(card.photo)}')"` : ''}>${card.photo ? '' : '♛'}</div>
            <b>${esc(card.championName)}</b>
            <span>${esc(card.eventTitle)} · Player ${esc(card.player)} · ${esc(card.sideName)}</span>
            <span>${esc(card.code)}</span>
          </article>`).join('')}</div>` : '<div class="cc-collection-empty">Você ainda não capturou nenhum card de campeão ativo.</div>'}
      </div>`;
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('[data-close-collection]')) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  function captureCard(card, modal) {
    const cards = loadCollection();
    if (!cards.some(row => String(row.id) === String(card.id))) {
      cards.unshift({ ...card, capturedAt: new Date().toISOString() });
      saveCollection(cards);
    }
    const collectible = modal.querySelector('.cc-collectible');
    collectible?.classList.add('cc-capture-flash');
    const button = modal.querySelector('.cc-capture-card');
    if (button) {
      button.textContent = '✓ CARD NA COLEÇÃO';
      button.disabled = true;
    }
    setTimeout(() => openCollection(), 550);
  }

  function showChampionCard(card, auto = true) {
    document.querySelector('.cc-card-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'cc-card-overlay';
    const owned = hasCard(card.id);
    overlay.innerHTML = `
      <div class="cc-card-modal" role="dialog" aria-modal="true" aria-label="Card colecionável do campeão ${esc(card.championName)}">
        <button class="cc-card-close" type="button" aria-label="Fechar">×</button>
        <article class="cc-collectible">
          <div class="cc-card-frame">
            <div class="cc-card-head"><div><small>CARD DE CAMPEÃO</small><h3>CosplayChess</h3></div><span class="cc-card-number">${esc(card.code)}</span></div>
            <div class="cc-card-photo" ${card.photo ? `style="background-image:url('${esc(card.photo)}')"` : ''}>${card.photo ? '' : '♛'}</div>
            <div class="cc-card-champion"><em>🏆 CAMPEÃO OFICIAL</em><b>${esc(card.championName)}</b><span>PLAYER ${esc(card.player)} · ${esc(card.sideName)}</span></div>
            <div class="cc-card-meta">
              <div><small>Evento</small><b>${esc(card.eventTitle)}</b></div>
              <div><small>Data</small><b>${esc(fmtDate(card.playedAt))}</b></div>
              <div><small>Local</small><b>${esc([card.venue, card.city].filter(Boolean).join(' · ') || 'CosplayChess')}</b></div>
              <div><small>Partida</small><b>${esc(card.matchLabel)}</b></div>
            </div>
            <div class="cc-card-rarity">✦ CAMPEÃO DE EVENTO · CARD OFICIAL ✦</div>
          </div>
        </article>
        <div class="cc-card-actions">
          <button class="cc-capture-card" type="button" ${owned ? 'disabled' : ''}>${owned ? '✓ CARD NA COLEÇÃO' : 'CAPTURAR CARD'}</button>
          <button class="cc-view-collection" type="button">MINHA COLEÇÃO</button>
        </div>
        <div class="cc-card-caption">Este card só fica disponível enquanto estiver ativado pela organização e até a abertura das inscrições do próximo evento.</div>
      </div>`;
    overlay.querySelector('.cc-card-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
    overlay.querySelector('.cc-capture-card').addEventListener('click', () => captureCard(card, overlay));
    overlay.querySelector('.cc-view-collection').addEventListener('click', openCollection);
    document.body.appendChild(overlay);

    if (auto) {
      try { localStorage.setItem(LAST_SEEN_PREFIX + card.id, String(Date.now())); } catch (_) {}
    }
  }

  function shouldAutoShow(card) {
    if (hasCard(card.id)) return false;
    try {
      const last = Number(localStorage.getItem(LAST_SEEN_PREFIX + card.id) || 0);
      return !last || Date.now() - last >= SIX_HOURS;
    } catch (_) { return true; }
  }

  async function init() {
    await pruneCollection();
    renderLauncher();
    const champion = await getCurrentChampion();
    if (!champion || !shouldAutoShow(champion)) return;
    const delay = 8000 + Math.floor(Math.random() * 7000);
    setTimeout(() => {
      if (!document.hidden && !document.querySelector('.cc-card-overlay,.cc-collection-overlay')) showChampionCard(champion, true);
    }, delay);
    window.COSPLAYCHESS_CURRENT_CHAMPION_CARD = champion;
    window.openCosplayChessChampionCard = () => showChampionCard(champion, false);
  }

  window.openCosplayChessCollection = openCollection;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();