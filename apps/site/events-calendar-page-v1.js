(() => {
  'use strict';
  if (window.__CC_EVENTS_CALENDAR_PAGE_V1__) return;
  window.__CC_EVENTS_CALENDAR_PAGE_V1__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const state = {
    cursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selected: new Date(),
    official: [],
    participations: [],
    initializedSelection: false,
    busy: false,
    renderToken: 0
  };

  const pad = (n) => String(n).padStart(2, '0');
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };
  const monthLabel = (d) => new Intl.DateTimeFormat('pt-BR', { month:'long', year:'numeric' }).format(d);
  const fullDate = (d) => new Intl.DateTimeFormat('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }).format(d);
  const shortMonth = (d) => new Intl.DateTimeFormat('pt-BR', { month:'short' }).format(d).replace('.', '');
  const shortDate = (d) => new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', year:'numeric' }).format(d);
  const eventTime = (v) => {
    const d = parseDate(v);
    return d ? new Intl.DateTimeFormat('pt-BR', { hour:'2-digit', minute:'2-digit' }).format(d) : '';
  };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const visibleRange = () => {
    const first = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return { start, end:addDays(start, 42) };
  };

  const participationDate = (p) => parseDate(p?.event_start_at);
  const officialDate = (e) => parseDate(e?.start_at);
  const participationKey = (p) => { const d = participationDate(p); return d ? keyOf(d) : ''; };
  const officialKey = (e) => { const d = officialDate(e); return d ? keyOf(d) : ''; };

  const mergedParticipation = (p) => {
    const official = state.official.find((e) => String(e.id || '') === String(p.event_id || ''));
    return {
      ...p,
      event_title: p.event_title || official?.title || 'Evento CosplayChess',
      event_start_at: p.event_start_at || official?.start_at || null,
      event_venue: p.event_venue || official?.venue || '',
      event_city: p.event_city || official?.city || '',
      cover_url: official?.cover_url || ''
    };
  };

  const dayEvents = (key) => {
    const participations = state.participations.filter((p) => participationKey(p) === key).map(mergedParticipation);
    const registeredIds = new Set(participations.map((p) => String(p.event_id || '')).filter(Boolean));
    const official = state.official.filter((e) => officialKey(e) === key && !registeredIds.has(String(e.id || '')));
    return { participations, official };
  };

  const allUpcoming = () => {
    const now = new Date();
    const registered = state.participations.map(mergedParticipation).filter((p) => {
      const d = participationDate(p); return d && d >= addDays(now, -1);
    }).sort((a,b) => participationDate(a) - participationDate(b));
    const registeredIds = new Set(registered.map((p) => String(p.event_id || '')).filter(Boolean));
    const official = state.official.filter((e) => {
      const d = officialDate(e); return d && d >= addDays(now, -1) && !registeredIds.has(String(e.id || ''));
    }).sort((a,b) => officialDate(a) - officialDate(b));
    return [...registered.map((x) => ({type:'registration', row:x})), ...official.map((x) => ({type:'official', row:x}))]
      .sort((a,b) => (a.type === 'registration' ? participationDate(a.row) : officialDate(a.row)) - (b.type === 'registration' ? participationDate(b.row) : officialDate(b.row)));
  };

  const eventCard = (row, type) => {
    const mine = type === 'registration';
    const d = mine ? participationDate(row) : officialDate(row);
    const title = mine ? row.event_title : row.title;
    const place = mine ? [row.event_venue, row.event_city].filter(Boolean).join(' · ') : [row.venue, row.city].filter(Boolean).join(' · ');
    const time = eventTime(mine ? row.event_start_at : row.start_at);
    const character = mine && row.character_name ? `Cosplay: ${row.character_name}` : '';
    return `<article class="cc-event-card ${mine ? 'registration' : 'official'}">
      <div class="cc-event-card-date"><b>${d ? pad(d.getDate()) : '--'}</b><span>${d ? esc(shortMonth(d)) : ''}</span></div>
      <div class="cc-event-card-copy">
        <span>${mine ? 'MINHA INSCRIÇÃO' : 'EVENTO OFICIAL'}</span>
        <h4>${esc(title || 'Evento CosplayChess')}</h4>
        <p>${esc([time, place].filter(Boolean).join(' · ') || 'Horário/local a confirmar')}</p>
        ${mine ? `<small>✓ Inscrição confirmada${character ? ` · ${esc(character)}` : ''}</small>` : ''}
      </div>
    </article>`;
  };

  const renderFeatured = (root) => {
    const box = root.querySelector('#ccEventsNext');
    const next = state.participations.map(mergedParticipation).filter((p) => {
      const d = participationDate(p); return d && d >= addDays(new Date(), -1);
    }).sort((a,b) => participationDate(a) - participationDate(b))[0];
    if (!box) return;
    if (!next) { box.hidden = true; return; }
    const d = participationDate(next);
    const place = [next.event_venue, next.event_city].filter(Boolean).join(' · ');
    box.hidden = false;
    box.innerHTML = `<div class="cc-events-next-copy">
      <span>✓ SUA PRÓXIMA PARTICIPAÇÃO</span>
      <h3>${esc(next.event_title || 'Evento CosplayChess')}</h3>
      <p>${esc([d ? shortDate(d) : '', eventTime(next.event_start_at), place].filter(Boolean).join(' · '))}</p>
      <small>Inscrição confirmada${next.character_name ? ` · Cosplay: ${esc(next.character_name)}` : ''}</small>
    </div>
    <div class="cc-events-next-date"><div><b>${d ? pad(d.getDate()) : '--'}</b><span>${d ? esc(shortMonth(d)) : ''}</span></div></div>`;
  };

  const renderDay = (root) => {
    const title = root.querySelector('#ccEventsSelectedDate');
    const list = root.querySelector('#ccEventsDayList');
    if (title) title.textContent = fullDate(state.selected);
    if (!list) return;
    const {participations, official} = dayEvents(keyOf(state.selected));
    list.innerHTML = [
      ...participations.map((p) => eventCard(p, 'registration')),
      ...official.map((e) => eventCard(e, 'official'))
    ].join('') || '<div class="cc-events-empty">Nenhum evento marcado neste dia.</div>';
  };

  const renderGrid = (root) => {
    const grid = root.querySelector('#ccEventsGrid');
    const label = root.querySelector('#ccEventsMonthLabel');
    if (!grid) return;
    if (label) label.textContent = monthLabel(state.cursor);
    const {start} = visibleRange();
    const today = keyOf(new Date());
    const selected = keyOf(state.selected);
    const html = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map((x) => `<div class="cc-events-weekday">${x}</div>`);
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i);
      const key = keyOf(d);
      const data = dayEvents(key);
      const classes = ['cc-events-day-btn'];
      if (d.getMonth() !== state.cursor.getMonth()) classes.push('outside');
      if (key === today) classes.push('today');
      if (key === selected) classes.push('selected');
      if (data.participations.length) classes.push('has-registration');
      const marks = `${data.participations.length ? '<i class="registration"></i>' : ''}${data.official.length ? '<i class="official"></i>' : ''}`;
      html.push(`<button type="button" class="${classes.join(' ')}" data-cc-event-day="${key}" aria-label="${esc(fullDate(d))}"><b>${d.getDate()}</b><span class="cc-events-marks">${marks}</span></button>`);
    }
    grid.innerHTML = html.join('');
    grid.querySelectorAll('[data-cc-event-day]').forEach((btn) => btn.addEventListener('click', () => {
      const [y,m,d] = btn.dataset.ccEventDay.split('-').map(Number);
      state.selected = new Date(y, m - 1, d);
      renderGrid(root);
      renderDay(root);
    }));
  };

  const renderUpcoming = (root) => {
    const grid = root.querySelector('#ccEventsUpcomingGrid');
    const count = root.querySelector('#ccEventsUpcomingCount');
    if (!grid) return;
    const rows = allUpcoming().slice(0, 9);
    if (count) count.textContent = rows.length ? `${rows.length} próximo${rows.length === 1 ? '' : 's'}` : 'Nenhum próximo';
    grid.innerHTML = rows.map((x) => eventCard(x.row, x.type)).join('') || '<div class="cc-events-empty">Nenhum próximo evento encontrado.</div>';
  };

  const chooseInitialSelection = () => {
    if (state.initializedSelection) return;
    state.initializedSelection = true;
    const now = new Date();
    const sameMonth = (d) => d && d.getFullYear() === state.cursor.getFullYear() && d.getMonth() === state.cursor.getMonth();
    const own = state.participations.map(participationDate).filter((d) => d && d >= addDays(now,-1) && sameMonth(d)).sort((a,b) => a-b)[0];
    const official = state.official.map(officialDate).filter((d) => d && d >= addDays(now,-1) && sameMonth(d)).sort((a,b) => a-b)[0];
    if (own || official) state.selected = new Date((own || official).getFullYear(), (own || official).getMonth(), (own || official).getDate());
  };

  const loadData = async () => {
    const token = ++state.renderToken;
    const {start} = visibleRange();
    const rangeEnd = addMonths(state.cursor, 7);
    const [officialResult, participationResult] = await Promise.all([
      db.from('cosplay_events')
        .select('id,title,slug,venue,city,start_at,end_at,cover_url,published')
        .eq('published', true)
        .gte('start_at', start.toISOString())
        .lt('start_at', rangeEnd.toISOString())
        .order('start_at', {ascending:true}),
      db.rpc('cosplay_my_event_participations')
    ]);
    if (token !== state.renderToken) return false;
    state.official = officialResult.error ? [] : (officialResult.data || []);
    state.participations = participationResult.error ? [] : (participationResult.data || []);
    return true;
  };

  const pageMarkup = () => `<div class="cc-events-page" id="ccEventsCalendarPage">
    <div class="cc-events-head">
      <div><span class="kicker">AGENDA COSPLAYCHESS</span><h2>Calendário de eventos</h2><p>Eventos oficiais e suas inscrições confirmadas aparecem automaticamente aqui.</p></div>
    </div>
    <section class="cc-events-next" id="ccEventsNext" hidden></section>
    <div class="cc-events-layout">
      <section class="cc-events-calendar">
        <div class="cc-events-toolbar"><button type="button" id="ccEventsPrev" aria-label="Mês anterior">‹</button><strong id="ccEventsMonthLabel"></strong><button type="button" id="ccEventsNextMonth" aria-label="Próximo mês">›</button></div>
        <div class="cc-events-grid" id="ccEventsGrid"></div>
        <div class="cc-events-legend"><span><i class="registration"></i>Minha inscrição</span><span><i></i>Evento oficial</span></div>
      </section>
      <aside class="cc-events-day">
        <div class="cc-events-day-head"><span>EVENTOS DO DIA</span><h3 id="ccEventsSelectedDate"></h3></div>
        <div class="cc-events-list" id="ccEventsDayList"></div>
      </aside>
    </div>
    <section class="cc-events-upcoming">
      <div class="cc-events-upcoming-head"><h3>Próximos eventos</h3><span id="ccEventsUpcomingCount"></span></div>
      <div class="cc-events-upcoming-grid" id="ccEventsUpcomingGrid"></div>
    </section>
  </div>`;

  const findPanel = () => document.querySelector('[data-community-panel="events"]');

  const renderPage = async () => {
    if (state.busy) return;
    const panel = findPanel();
    if (!panel) return;
    state.busy = true;
    try {
      await loadData();
      chooseInitialSelection();
      panel.innerHTML = pageMarkup();
      const root = panel.querySelector('#ccEventsCalendarPage');
      if (!root) return;
      renderFeatured(root);
      renderGrid(root);
      renderDay(root);
      renderUpcoming(root);
      root.querySelector('#ccEventsPrev')?.addEventListener('click', async () => {
        state.cursor = addMonths(state.cursor, -1);
        state.selected = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1);
        state.initializedSelection = true;
        await renderPageForce();
      });
      root.querySelector('#ccEventsNextMonth')?.addEventListener('click', async () => {
        state.cursor = addMonths(state.cursor, 1);
        state.selected = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1);
        state.initializedSelection = true;
        await renderPageForce();
      });
    } catch (error) {
      console.error('Falha ao montar calendário de eventos:', error);
      panel.innerHTML = '<div class="cc9-panel"><div class="cc9-panel-head"><div><h2>Eventos</h2><p>Não foi possível carregar o calendário agora.</p></div></div></div>';
    } finally {
      state.busy = false;
    }
  };

  const renderPageForce = async () => {
    state.busy = false;
    await renderPage();
  };

  const watchPanel = () => {
    const panel = findPanel();
    if (!panel || panel.__ccEventsCalendarObserved) return;
    panel.__ccEventsCalendarObserved = true;
    let timer = null;
    const obs = new MutationObserver(() => {
      if (panel.hidden || panel.querySelector('#ccEventsCalendarPage')) return;
      clearTimeout(timer);
      timer = setTimeout(() => renderPageForce().catch(() => {}), 90);
    });
    obs.observe(panel, {childList:true, subtree:false});
  };

  const boot = () => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (findPanel()) {
        clearInterval(timer);
        watchPanel();
        setTimeout(() => renderPageForce().catch(() => {}), 360);
      } else if (tries > 40) clearInterval(timer);
    }, 100);
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-community-view="events"]');
    if (!trigger) return;
    setTimeout(() => { watchPanel(); renderPageForce().catch(() => {}); }, 120);
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
