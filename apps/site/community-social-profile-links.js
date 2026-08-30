(() => {
  'use strict';
  // Legacy compatibility shim.
  // Social/community profile routing is now owned by community-social-access-fix.js
  // and community-discovery-pagination.js. Keeping this file inert prevents
  // duplicate "Ver comunidade" actions from being injected into participant cards.
  window.__COSPLAY_SOCIAL_PROFILE_LINKS__ = true;
})();
