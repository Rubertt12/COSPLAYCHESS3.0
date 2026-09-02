(() => {
  'use strict';
  if (window.__CC_PARTICIPANT_EVENT_CARDS_V1__) return;
  window.__CC_PARTICIPANT_EVENT_CARDS_V1__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db?.auth) return;

  const $ = (id) => document.getElementById(id);
  let totalEvents = 0;
  let countObserver = null;
  let loading = false;

  const fmtDay = (value) => {
    try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit'}).format(new Date(value)); }
    catch { return '--'; }
  };
  const fmtMonth = (value) => {
    try { return new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(value)).replace('.','').toUpperCase(); }
    catch { return '---'; }
  };
  const fmtFull = (value) => {
    try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); }
    catch { return ''; }
  };

  const ensureHub = () => {
    const content = $('participantDashboardContent');
    if (!content) return null;
    let hub = $('participantEventHub');
    if (hub) return hub;

    hub = document.createElement('section');
    hub.id = 'participantEventHub';
    hub.className = 'premium-card participant-event-hub';
    hub.innerHTML = `
      <div class="participant-event-head">
        <div><span>♜ SUA AGENDA COSPLAYCHESS</span><h3>Eventos e participações</h3></div>
        <b id="participantEventTotal">0 eventos</b>
      </div>
      <div id="participantNextEvent" class="participant-next-event"><div class="participant-event-empty">Carregando sua agenda...</div></div>
      <div class="participant-calendar-head"><b>Calendário</b><span>Inscrições confirmadas com esta mesma conta</span></div>
      <div id="participantEventCalendar" class="participant-event-calendar"></div>`;

    const hero = content.querySelector('.premium-hero-card');
    if (hero) hero.insertAdjacentElement('afterend', hub);
    else content.prepend(hub);
    return hub;
  };

  const forceEventCount = () => {
    const target = $('participantProgressEvents');
    if (!target) return;
    const wanted = String(totalEvents);
    if (target.textContent !== wanted) target.textContent = wanted;
    if (!countObserver) {
      countObserver = new MutationObserver(() => {
        if (target.textContent !== String(totalEvents)) target.textContent = String(totalEvents);
      });
      countObserver.observe(target,{childList:true,subtree:true,characterData:true});
    }
  };

  const renderNext = (row) => {
    const root = $('participantNextEvent');
    if (!root) return;
    root.replaceChildren();
    if (!row) {
      const empty = document.createElement('div');
      empty.className = 'participant-event-empty';
      empty.textContent = 'Nenhum próximo evento confirmado por enquanto.';
      root.appendChild(empty);
      return;
    }

    const date = document.createElement('div');
    date.className = 'participant-event-date';
    const day = document.createElement('b'); day.textContent = fmtDay(row.event_start_at);
    const month = document.createElement('span'); month.textContent = fmtMonth(row.event_start_at);
    date.append(day,month);

    const copy = document.createElement('div');
    copy.className = 'participant-event-copy';
    const kicker = document.createElement('span'); kicker.textContent = 'PRÓXIMO EVENTO';
    const title = document.createElement('h4'); title.textContent = row.event_title || 'Evento CosplayChess';
    const meta = document.createElement('p');
    meta.textContent = [fmtFull(row.event_start_at),row.event_venue,row.event_city].filter(Boolean).join(' · ');
    const character = document.createElement('div');
    character.className = 'participant-event-character';
    character.innerHTML = '<span>Personagem inscrito</span>';
    const charName = document.createElement('b'); charName.textContent = row.character_name || 'Personagem';
    character.appendChild(charName);
    copy.append(kicker,title,meta,character);

    const status = document.createElement('span');
    status.className = 'participant-event-confirmed';
    status.textContent = '✓ Inscrição confirmada';

    root.append(date,copy,status);
  };

  const renderCalendar = (rows) => {
    const root = $('participantEventCalendar');
    if (!root) return;
    root.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'participant-event-empty';
      empty.textContent = 'Nenhuma participação confirmada encontrada.';
      root.appendChild(empty);
      return;
    }

    rows.forEach((row) => {
      const item = document.createElement('article');
      item.className = `participant-calendar-item${row.is_upcoming ? ' upcoming' : ' past'}`;

      const date = document.createElement('div');
      date.className = 'participant-calendar-date';
      const day = document.createElement('b'); day.textContent = fmtDay(row.event_start_at);
      const month = document.createElement('span'); month.textContent = fmtMonth(row.event_start_at);
      date.append(day,month);

      const body = document.createElement('div');
      const title = document.createElement('b'); title.textContent = row.event_title || 'Evento CosplayChess';
      const location = document.createElement('span');
      location.textContent = [row.event_venue,row.event_city].filter(Boolean).join(' · ') || 'Local a confirmar';
      const character = document.createElement('small');
      character.textContent = `Cosplay: ${row.character_name || 'Personagem'}`;
      body.append(title,location,character);

      const state = document.createElement('em');
      state.textContent = row.is_upcoming ? 'Próximo' : 'Participou';
      item.append(date,body,state);
      root.appendChild(item);
    });
  };

  const render = (rows) => {
    ensureHub();
    const list = Array.isArray(rows) ? rows : [];
    totalEvents = list.length;
    const total = $('participantEventTotal');
    if (total) total.textContent = `${totalEvents} ${totalEvents === 1 ? 'evento' : 'eventos'}`;
    forceEventCount();
    renderNext(list.find(row => row.is_upcoming) || null);
    renderCalendar(list);
    window.dispatchEvent(new CustomEvent('cosplay:participant-events-loaded',{detail:{events:list}}));
  };

  const load = async () => {
    if (loading) return;
    loading = true;
    try {
      const { data: sessionData } = await db.auth.getSession();
      if (!sessionData?.session?.user) return;
      ensureHub();
      const { data, error } = await db.rpc('cosplay_my_event_participations');
      if (error) throw error;
      render(data || []);
    } catch (error) {
      const next = $('participantNextEvent');
      if (next) next.innerHTML = '<div class="participant-event-empty">Não foi possível carregar sua agenda agora.</div>';
    } finally {
      loading = false;
    }
  };

  const bind = () => {
    const dashboard = document.querySelector('[data-participant-dashboard]');
    if (dashboard) {
      new MutationObserver(() => { if (!dashboard.hidden) setTimeout(load,120); }).observe(dashboard,{attributes:true,attributeFilter:['hidden']});
    }
    db.auth.onAuthStateChange((event,session) => {
      if (session?.user && ['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED','INITIAL_SESSION'].includes(event)) setTimeout(load,160);
    });
    setTimeout(load,900);
    setTimeout(load,1900);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
