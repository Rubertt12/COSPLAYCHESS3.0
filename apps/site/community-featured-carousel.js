(() => {
  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db || window.__COSPLAY_FEATURED_CAROUSEL__) return;
  window.__COSPLAY_FEATURED_CAROUSEL__ = true;

  const safeImage = (value) => {
    try {
      const url = new URL(String(value || ''));
      return ['http:','https:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  };

  const formatRange = (start, end) => {
    if (!start) return '';
    try {
      const a = new Date(start);
      const b = end ? new Date(end) : null;
      const day = String(a.getDate()).padStart(2,'0');
      const month = a.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase();
      if (b && a.toDateString() !== b.toDateString()) {
        return `${day} a ${String(b.getDate()).padStart(2,'0')} ${month} ${b.getFullYear()}`;
      }
      return `${day} ${month} ${a.getFullYear()}`;
    } catch { return ''; }
  };

  const waitHero = () => new Promise((resolve) => {
    const found = document.querySelector('.premium-featured-event');
    if (found) return resolve(found);
    const observer = new MutationObserver(() => {
      const hero = document.querySelector('.premium-featured-event');
      if (!hero) return;
      observer.disconnect();
      resolve(hero);
    });
    observer.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => { observer.disconnect(); resolve(document.querySelector('.premium-featured-event')); }, 6000);
  });

  const loadProfile = async () => {
    const { data: sessionData } = await db.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;
    const { data } = await db
      .from('cosplay_participant_profiles')
      .select('id,event_id,character_name,character_photo_url')
      .eq('user_id', user.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ ascending:false })
      .limit(1)
      .maybeSingle();
    return data || null;
  };

  const loadEvents = async () => {
    const now = new Date().toISOString();
    const { data, error } = await db
      .from('cosplay_events')
      .select('id,title,slug,description,venue,city,start_at,end_at,cover_url')
      .eq('published', true)
      .gte('start_at', now)
      .order('start_at',{ ascending:true })
      .limit(3);
    return error ? [] : (data || []);
  };

  const init = async () => {
    const hero = await waitHero();
    if (!hero || hero.dataset.carouselReady === '1') return;

    const [profile, events] = await Promise.all([loadProfile(), loadEvents()]);
    if (!events.length) return;

    const copy = hero.querySelector('.premium-event-copy');
    const art = hero.querySelector('.premium-event-art');
    let dots = hero.querySelector('.premium-event-dots');
    if (!copy || !art) return;

    if (!dots) {
      dots = document.createElement('div');
      dots.className = 'premium-event-dots';
      hero.appendChild(dots);
    }

    let index = 0;
    let timer = 0;
    let paused = false;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    const render = (nextIndex, animate = true) => {
      index = ((nextIndex % events.length) + events.length) % events.length;
      const event = events[index];
      if (!event) return;

      if (animate && !reduceMotion) hero.classList.add('is-switching');
      window.setTimeout(() => {
        const eyebrow = copy.querySelector('.eyebrow');
        const title = copy.querySelector('h2');
        const character = copy.querySelector('.premium-event-character span');
        const meta = copy.querySelector('.premium-event-meta');
        const link = copy.querySelector('.premium-event-link');

        if (eyebrow) eyebrow.textContent = index === 0 ? 'PRÓXIMO EVENTO' : 'EVENTO EM DESTAQUE';
        if (title) title.textContent = event.title || 'Evento CosplayChess';
        if (character) {
          const sameEvent = profile?.event_id && profile.event_id === event.id;
          character.textContent = sameEvent
            ? (profile.character_name || 'Sua participação')
            : (event.description || 'Evento CosplayChess').slice(0, 78);
        }
        if (meta) {
          meta.replaceChildren();
          if (event.start_at) {
            const date = document.createElement('span');
            date.textContent = `▣ ${formatRange(event.start_at,event.end_at)}`;
            meta.appendChild(date);
          }
          const placeText = [event.venue,event.city].filter(Boolean).join(', ');
          if (placeText) {
            const place = document.createElement('span');
            place.textContent = `⌖ ${placeText}`;
            meta.appendChild(place);
          }
        }
        if (link) {
          link.href = './index.html#eventos';
          link.textContent = 'Ver evento';
        }

        art.replaceChildren();
        const image = safeImage(event.cover_url) || (profile?.event_id === event.id ? safeImage(profile.character_photo_url) : null);
        if (image) {
          const img = document.createElement('img');
          img.src = image;
          img.alt = event.title ? `Capa de ${event.title}` : 'Evento CosplayChess';
          img.loading = index === 0 ? 'eager' : 'lazy';
          art.appendChild(img);
        } else {
          const placeholder = document.createElement('div');
          placeholder.className = 'premium-art-placeholder';
          placeholder.textContent = '♞';
          art.appendChild(placeholder);
        }

        [...dots.querySelectorAll('button')].forEach((button, i) => {
          const active = i === index;
          button.classList.toggle('active', active);
          button.setAttribute('aria-current', active ? 'true' : 'false');
        });
        hero.classList.remove('is-switching');
      }, animate && !reduceMotion ? 130 : 0);
    };

    dots.replaceChildren();
    events.forEach((event, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Mostrar ${event.title || `evento ${i + 1}`}`);
      dot.addEventListener('click', () => {
        render(i);
        restart();
      });
      dots.appendChild(dot);
    });

    const tick = () => {
      if (!paused && events.length > 1) render(index + 1);
    };
    const restart = () => {
      clearInterval(timer);
      if (!reduceMotion && events.length > 1) timer = window.setInterval(tick, 6500);
    };

    hero.addEventListener('mouseenter', () => { paused = true; });
    hero.addEventListener('mouseleave', () => { paused = false; });
    hero.addEventListener('focusin', () => { paused = true; });
    hero.addEventListener('focusout', () => { paused = false; });

    hero.dataset.carouselReady = '1';
    render(0, false);
    restart();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init().catch(() => {}), { once:true });
  } else {
    init().catch(() => {});
  }
})();
