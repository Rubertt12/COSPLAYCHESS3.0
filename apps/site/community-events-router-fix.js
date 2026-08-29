(() => {
  if (window.__COSPLAY_EVENTS_ROUTER_FIX__) return;
  window.__COSPLAY_EVENTS_ROUTER_FIX__ = true;

  const ensureShell = () => {
    const nav = document.querySelector('.community-nav');
    const main = document.querySelector('.community-main');
    if (!nav || !main) return null;

    let button = nav.querySelector('[data-community-view="events"]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.dataset.communityView = 'events';
      button.innerHTML = '<span>▣</span>Eventos';
      const photos = nav.querySelector('[data-community-view="photos"]');
      nav.insertBefore(button, photos || null);
    }

    let panel = main.querySelector('[data-community-panel="events"]');
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'community-view social-ext-panel';
      panel.dataset.communityPanel = 'events';
      panel.hidden = true;
      panel.innerHTML = '<div class="community-section-head"><div><span class="kicker">AGENDA COSPLAY</span><h2>Meus <i>eventos.</i></h2></div></div><div id="socialExt-events"></div>';
      main.appendChild(panel);
    } else if (!panel.querySelector('#socialExt-events')) {
      const legacyRoot = document.createElement('div');
      legacyRoot.id = 'socialExt-events';
      panel.appendChild(legacyRoot);
    }

    return { button, panel };
  };

  const openEvents = (button) => {
    const shell = ensureShell();
    if (!shell) return;
    const activeButton = button || shell.button;

    document.querySelectorAll('[data-community-view]').forEach((item) => {
      item.classList.toggle('active', item === activeButton || item.dataset.communityView === 'events');
    });

    document.querySelectorAll('[data-community-panel]').forEach((panel) => {
      const active = panel.dataset.communityPanel === 'events';
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });

    window.dispatchEvent(new CustomEvent('cosplay:events-panel-opened'));
  };

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-community-view="events"]');
    if (!button || !button.closest('.community-nav')) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    openEvents(button);
  }, true);

  const run = () => ensureShell();
  run();
  document.addEventListener('DOMContentLoaded', run, { once: true });
  window.addEventListener('cosplay:social-shell-ready', run);
  setTimeout(run, 250);
  setTimeout(run, 900);
  setTimeout(run, 1800);
})();