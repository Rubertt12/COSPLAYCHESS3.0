(() => {
  if (window.__cosplayHallChampionModeLoaded) return;
  window.__cosplayHallChampionModeLoaded = true;

  const db = window.getCosplayChessDb?.() || window.COSPLAYCHESS_DB;
  if (!db) return;

  const esc = (value = '') => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const sideLabel = side => side === 'B' ? 'Brancas' : side === 'P' ? 'Pretas' : '—';
  const opponentPlayer = n => n === 1 ? 2 : n === 2 ? 1 : null;

  function fmtDate(value) {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'long',
        timeZone: window.COSPLAYCHESS_CONFIG?.timezone || 'America/Sao_Paulo'
      }).format(new Date(value));
    } catch (_) {
      return '';
    }
  }

  function chooseChampionMatch(rows) {
    const byEvent = new Map();
    for (const row of rows || []) {
      if (!row?.event_id || row.winner_side === 'DRAW' || ![1, 2].includes(Number(row.winner_player))) continue;
      const key = String(row.event_id);
      const current = byEvent.get(key);
      const isFinal = /\bfinal\b/i.test(String(row.match_label || ''));
      const currentIsFinal = /\bfinal\b/i.test(String(current?.match_label || ''));
      if (!current || (isFinal && !currentIsFinal) || (isFinal === currentIsFinal && new Date(row.played_at) > new Date(current.played_at))) {
        byEvent.set(key, row);
      }
    }
    return [...byEvent.values()].sort((a, b) => new Date(b.played_at) - new Date(a.played_at));
  }

  function playerName(match, number) {
    const direct = number === 1 ? match.player1_name : match.player2_name;
    if (direct && String(direct).trim()) return String(direct).trim();
    if (Number(match.winner_player) === number && match.winner_cosplayer) return String(match.winner_cosplayer).trim();
    if (Number(match.winner_player) !== number && match.opponent_cosplayer) return String(match.opponent_cosplayer).trim();
    return `Jogador ${number}`;
  }

  function installStyles() {
    if (document.getElementById('hallChampionModeStyles')) return;
    const style = document.createElement('style');
    style.id = 'hallChampionModeStyles';
    style.textContent = `
      .event-champion-card{position:relative;overflow:hidden;border:1px solid rgba(224,190,119,.24);background:radial-gradient(circle at 50% 0,rgba(224,190,119,.12),transparent 34%),linear-gradient(150deg,#151017,#09080c);border-radius:20px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.28)}
      .event-champion-card:before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,transparent,#e0be77,transparent)}
      .event-champion-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.08)}
      .event-champion-head small{display:block;color:#c99b53;font-size:8px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}
      .event-champion-head h3{margin:5px 0 3px;color:#fff4dc;font-family:Georgia,serif;font-size:22px;font-weight:500}
      .event-champion-head span{color:#827a86;font-size:9px;line-height:1.45}
      .event-champion-badge{flex:0 0 auto;padding:7px 10px;border:1px solid rgba(224,190,119,.32);border-radius:999px;background:rgba(224,190,119,.09);color:#efce88;font-size:8px;font-weight:1000;letter-spacing:1.2px}
      .event-champion-main{display:grid;grid-template-columns:minmax(0,1fr) 70px minmax(0,1fr);align-items:center;gap:14px;padding:22px 0 8px}
      .event-champion-side{display:grid;justify-items:center;text-align:center;gap:6px;min-width:0}
      .event-champion-side .crown{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;font-size:34px;background:radial-gradient(circle at 35% 25%,#fff0a6,#bc812e 48%,#4f2d12 78%);border:2px solid #f0ce7b;box-shadow:0 0 0 6px rgba(224,190,119,.06),0 15px 35px rgba(0,0,0,.45)}
      .event-champion-side.loser .crown{background:#17141a;border-color:#39323f;box-shadow:none;filter:grayscale(1);opacity:.7;font-size:28px}
      .event-champion-side em{font-style:normal;color:#d6aa5a;font-size:8px;font-weight:1000;letter-spacing:1.4px;text-transform:uppercase}
      .event-champion-side.loser em{color:#77707c}
      .event-champion-side b{max-width:100%;color:#fff;font-family:Georgia,serif;font-size:20px;line-height:1.1;overflow-wrap:anywhere}
      .event-champion-side span{color:#aaa0ad;font-size:10px;font-weight:800}
      .event-champion-side strong{padding:4px 8px;border-radius:999px;font-size:8px;letter-spacing:.8px;background:rgba(255,255,255,.05);color:#c9c0ca;border:1px solid rgba(255,255,255,.08)}
      .event-champion-vs{text-align:center;color:#5d5560;font-family:Georgia,serif;font-size:18px;font-weight:900;letter-spacing:2px}
      .event-champion-note{margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06);color:#746d77;font-size:9px;text-align:center}
      @media(max-width:650px){.event-champion-main{grid-template-columns:1fr}.event-champion-vs{padding:4px 0}.event-champion-head{display:grid}.event-champion-badge{justify-self:start}}
    `;
    document.head.appendChild(style);
  }

  async function renderEventChampions() {
    const root = document.getElementById('championsGrid');
    if (!root) return;

    const { data, error } = await db
      .from('cosplay_matches')
      .select('id,event_id,match_label,played_at,winner_player,winner_side,winner_cosplayer,opponent_cosplayer,player1_name,player2_name,cosplay_events(title,start_at,venue,city)')
      .eq('published', true)
      .order('played_at', { ascending: false });

    if (error) {
      root.innerHTML = `<div class="empty-card">Não foi possível carregar os campeões agora.</div>`;
      return;
    }

    const champions = chooseChampionMatch(data || []);
    if (!champions.length) {
      root.innerHTML = `<div class="empty-card">Nenhum campeão oficial publicado ainda. Quando uma partida tiver vencedor, ele entra para o Hall da Fama.</div>`;
      return;
    }

    root.innerHTML = champions.map(match => {
      const winner = Number(match.winner_player);
      const loser = opponentPlayer(winner);
      const winnerSide = match.winner_side;
      const loserSide = winnerSide === 'B' ? 'P' : 'B';
      const winnerName = playerName(match, winner);
      const loserName = playerName(match, loser);
      const event = match.cosplay_events || {};
      const location = [event.venue, event.city].filter(Boolean).join(' · ');
      return `
        <article class="event-champion-card">
          <div class="event-champion-head">
            <div>
              <small>CAMPEÃO OFICIAL DO EVENTO</small>
              <h3>${esc(event.title || 'CosplayChess')}</h3>
              <span>${esc(fmtDate(match.played_at))}${location ? ` · ${esc(location)}` : ''}</span>
            </div>
            <div class="event-champion-badge">🏆 HALL DA FAMA</div>
          </div>
          <div class="event-champion-main">
            <div class="event-champion-side winner">
              <div class="crown">♛</div>
              <em>CAMPEÃO</em>
              <b>${esc(winnerName)}</b>
              <span>PLAYER ${winner}</span>
              <strong>${esc(sideLabel(winnerSide))}</strong>
            </div>
            <div class="event-champion-vs">VS</div>
            <div class="event-champion-side loser">
              <div class="crown">♟</div>
              <em>ADVERSÁRIO</em>
              <b>${esc(loserName)}</b>
              <span>PLAYER ${loser}</span>
              <strong>${esc(sideLabel(loserSide))}</strong>
            </div>
          </div>
          <div class="event-champion-note">${esc(match.match_label || 'Partida oficial')} · resultado registrado pelo CosplayChess</div>
        </article>`;
    }).join('');
  }

  installStyles();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderEventChampions, { once: true });
  else renderEventChampions();
})();
