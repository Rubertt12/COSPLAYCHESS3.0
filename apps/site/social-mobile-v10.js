(() => {
  'use strict';
  if (window.__CC_SOCIAL_MOBILE_V10__) return;
  window.__CC_SOCIAL_MOBILE_V10__ = true;

  const $ = (id) => document.getElementById(id);
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const mq = window.matchMedia('(max-width: 980px)');
  let menuButton = null;
  let overlay = null;
  let bottom = null;

  const items = [
    ['feed','⌂','Feed'],
    ['discover','⌕','Explorar'],
    ['communities','♙','Comunidades'],
    ['messages','✉','Mensagens'],
    ['notifications','♧','Alertas']
  ];

  function original(view) {
    return q(`.community-nav [data-community-view="${view}"]`);
  }

  function activeView() {
    const active = q('.community-nav [data-community-view].active');
    return active?.dataset.communityView || document.body.dataset.ccView || 'feed';
  }

  function syncBottom(view = activeView()) {
    if (!bottom) return;
    qa('[data-mobile-view]', bottom).forEach((button) => {
      button.classList.toggle('active', button.dataset.mobileView === view);
      button.setAttribute('aria-current', button.dataset.mobileView === view ? 'page' : 'false');
    });
  }

  function setMenu(open) {
    const enabled = mq.matches && !!open;
    document.body.classList.toggle('cc-mobile-menu-open', enabled);
    if (menuButton) {
      menuButton.setAttribute('aria-expanded', enabled ? 'true' : 'false');
      menuButton.textContent = enabled ? '×' : '☰';
      menuButton.setAttribute('aria-label', enabled ? 'Fechar menu' : 'Abrir menu');
    }
    if (overlay) overlay.hidden = !enabled;
  }

  function ensureUi() {
    if (!menuButton) {
      menuButton = document.createElement('button');
      menuButton.id = 'ccMobileMenuButton';
      menuButton.className = 'cc-mobile-menu-button';
      menuButton.type = 'button';
      menuButton.textContent = '☰';
      menuButton.setAttribute('aria-label','Abrir menu');
      menuButton.setAttribute('aria-expanded','false');
      menuButton.addEventListener('click', () => setMenu(!document.body.classList.contains('cc-mobile-menu-open')));
      document.body.appendChild(menuButton);
    }

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ccMobileMenuOverlay';
      overlay.className = 'cc-mobile-menu-overlay';
      overlay.hidden = true;
      overlay.addEventListener('click', () => setMenu(false));
      document.body.appendChild(overlay);
    }

    if (!bottom) {
      bottom = document.createElement('nav');
      bottom.id = 'ccMobileBottomNav';
      bottom.className = 'cc-mobile-bottom-nav';
      bottom.setAttribute('aria-label','Navegação principal no celular');
      bottom.innerHTML = items.map(([view,icon,label]) => `<button type="button" data-mobile-view="${view}"><i>${icon}</i><span>${label}</span></button>`).join('');
      qa('[data-mobile-view]', bottom).forEach((button) => {
        button.addEventListener('click', () => {
          const target = original(button.dataset.mobileView);
          if (target) target.click();
          syncBottom(button.dataset.mobileView);
          setMenu(false);
        });
      });
      document.body.appendChild(bottom);
    }

    syncBottom();
  }

  function applyMode() {
    ensureUi();
    const mobile = mq.matches;
    menuButton.hidden = !mobile;
    bottom.hidden = !mobile;
    if (!mobile) setMenu(false);
    if (mobile) document.body.classList.remove('cc-left-collapsed');
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-community-view]');
    if (trigger?.dataset.communityView) {
      syncBottom(trigger.dataset.communityView);
      if (mq.matches && trigger.closest('.cc-left')) setMenu(false);
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('cc-mobile-menu-open')) setMenu(false);
  });

  window.addEventListener('orientationchange', () => setTimeout(applyMode, 120), { passive:true });
  mq.addEventListener?.('change', applyMode);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyMode, { once:true });
  else applyMode();
})();
