(() => {
  'use strict';
  if (window.__CC_PLAYER_SHOWCASE_V15__) return;
  window.__CC_PLAYER_SHOWCASE_V15__ = true;

  const waitFor = (selector, timeout = 7000) => new Promise((resolve) => {
    const found = document.querySelector(selector);
    if (found) return resolve(found);
    const obs = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { obs.disconnect(); resolve(el); }
    });
    obs.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(() => { obs.disconnect(); resolve(document.querySelector(selector)); }, timeout);
  });

  const smoothTo = (el) => {
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 82;
    window.scrollTo({ top: Math.max(0, top), behavior:'smooth' });
  };

  const enhanceTabs = async () => {
    const nav = await waitFor('.player-social-tabs');
    if (!nav || nav.dataset.showcaseReady === '1') return;
    nav.dataset.showcaseReady = '1';
    nav.innerHTML = `
      <button type="button" class="active" data-showcase-target="wall">▣ Posts</button>
      <button type="button" data-showcase-target="about">♙ Sobre</button>
      <button type="button" data-showcase-target="photos">▧ Galeria</button>
      <button type="button" data-showcase-target="achievements">☆ Conquistas</button>`;

    const targetFor = (name) => ({
      wall: document.querySelector('.player-social-panel[data-player-social-panel="wall"]'),
      about: document.querySelector('.player-reference-about'),
      photos: document.querySelector('.player-social-panel[data-player-social-panel="photos"]') || document.querySelector('.player-official-photos-section'),
      achievements: document.querySelector('.player-achievements-section')
    })[name];

    nav.querySelectorAll('[data-showcase-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        nav.querySelectorAll('[data-showcase-target]').forEach(x => x.classList.toggle('active', x === btn));
        smoothTo(targetFor(btn.dataset.showcaseTarget));
      });
    });
  };

  const addQuote = async () => {
    const content = await waitFor('#playerContent');
    if (!content || content.querySelector('.player-showcase-quote')) return;
    const quote = document.createElement('section');
    quote.className = 'player-showcase-quote';
    quote.innerHTML = `
      <div class="player-showcase-quote-mark">“</div>
      <div>
        <p>Cada cosplay conta uma história — no tabuleiro e fora dele.</p>
        <small>CosplayChess</small>
      </div>`;
    const cta = content.querySelector('.player-community-cta');
    if (cta) cta.insertAdjacentElement('afterend', quote);
    else content.appendChild(quote);
  };

  const revealPanels = () => {
    document.querySelectorAll('.player-achievements-section,[data-player-social-panel="wall"],[data-player-social-panel="photos"]').forEach((el) => {
      el.hidden = false;
    });
  };

  const init = async () => {
    const content = await waitFor('#playerContent');
    if (!content) return;
    revealPanels();
    await Promise.all([enhanceTabs(), addQuote()]);
    setTimeout(revealPanels, 500);
    setTimeout(revealPanels, 1600);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
