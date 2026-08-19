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

  function playerPhoto(url, champion = false) {
    if (url) {
      return `<div class="event-player-photo${champion ? ' champion' : ''}"><img src="${esc(url)}" alt="${champion ? 'Foto do campeão' : 'Foto do adversário'}" loading="lazy">${champion ? '<span class="photo-crown">♛</span>' : ''}</div>`;
    }
    return `<div class="event-player-photo placeholder${champion ? ' champion' : ''}"><span>${champion ? '♛' : '♟'}</span>${champion ? '<span class="photo-crown">♛</span>' : ''}</div>`;
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
      .event-champion-main{display:grid;grid-template-columns:minmax(0,1fr) 70px minmax(0,1fr);align-items:center;gap:14px;padding:24px 0 8px}
      .event-champion-side{display:grid;justify-items:center;text-align:center;gap:6px;min-width:0}
      .event-player-photo{position:relative;width:148px;height:148px;border-radius:50%;overflow:visible;display:grid;place-items:center;background:#17141a;border:2px solid #39323f;box-shadow:0 16px 38px rgba(0,0,0,.42)}
      .event-player-photo img{width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:center 20%;display:block}
      .event-player-photo.champion{width:166px;height:166px;border:3px solid #efcf82;box-shadow:0 0 0 7px rgba(224,190,119,.07),0 18px 45px rgba(0,0,0,.48),0 0 30px rgba(224,190,119,.14)}
      .event-player-photo.placeholder>span:first-child{font-size:48px;color:#77707c}
      .event-player-photo.placeholder.champion>span:first-child{color:#e8c574}
      .event-player-photo .photo-crown{position:absolute;z-index:4;top:-26px;left:50%;transform:translateX(-50%);width:56px;height:45px;display:grid;place-items:center;border-radius:50% 50% 42% 42%;background:linear-gradient(145deg,#fff0a6,#c88b31 55%,#6b3d15);border:1px solid #ffe9a4;color:#3a220b;font-size:29px;line-height:1;box-shadow:0 8px 18px rgba(0,0,0,.46)}
      .event-champion-side em{font-style:normal;color:#d6aa5a;font-size:8px;font-weight:1000;letter-spacing:1.4px;text-transform:uppercase;margin-top:8px}
      .event-champion-side.loser em{color:#77707c}
      .event-champion-side b{max-width:100%;color:#fff;font-family:Georgia,serif;font-size:20px;line-height:1.1;overflow-wrap:anywhere}
      .event-champion-side span{color:#aaa0ad;font-size:10px;font-weight:800}
      .event-champion-side strong{padding:4px 8px;border-radius:999px;font-size:8px;letter-spacing:.8px;background:rgba(255,255,255,.05);color:#c9c0ca;border:1px solid rgba(255,255,255,.08)}
      .event-champion-vs{text-align:center;color:#5d5560;font-family:Georgia,serif;font-size:18px;font-weight:900;letter-spacing:2px}
      .event-champion-note{margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06);color:#746d77;font-size:9px;text-align:center}
      @media(max-width:650px){.event-champion-main{grid-template-columns:1fr}.event-champion-vs{padding:8px 0}.event-champion-head{display:grid}.event-champion-badge{justify-self:start}.event-player-photo{width:132px;height:132px}.event-player-photo.champion{width:148px;height:148px}}
    `;
    document.head.appendChild(style);
  }

  async function renderEventChampions() {
    const root = document.getElementById('championsGrid');
    if (!root) return;

    const { data, error } = await db
      .from('cosplay_matches')
      .select('id,event_id,match_label,played_at,winner_player,winner_side,winner_cosplayer,opponent_cosplayer,winner_photo_url,opponent_photo_url,player1_name,player2_name,cosplay_events(title,start_at,venue,city)')
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
              ${playerPhoto(match.winner_photo_url, true)}
              <em>CAMPEÃO</em>
              <b>${esc(winnerName)}</b>
              <span>PLAYER ${winner}</span>
              <strong>${esc(sideLabel(winnerSide))}</strong>
            </div>
            <div class="event-champion-vs">VS</div>
            <div class="event-champion-side loser">
              ${playerPhoto(match.opponent_photo_url, false)}
              <em>ADVERSÁRIO</em>
              <b>${esc(loserName)}</b>
              <span>PLAYER ${loser}</span>
              <strong>${esc(sideLabel(loserSide))}</strong>
            </div>
          </div>
          <div class="event-champion-note">${esc(match.match_label || 'Partida oficial')} · fotos definidas no início da partida</div>
        </article>`;
    }).join('');
  }

  installStyles();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderEventChampions, { once: true });
  else renderEventChampions();
})();