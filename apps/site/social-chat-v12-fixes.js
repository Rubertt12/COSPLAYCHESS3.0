(() => {
  'use strict';
  if (window.__CC_SOCIAL_UNIFIED_LOADER_V20__) return;
  window.__CC_SOCIAL_UNIFIED_LOADER_V20__ = true;

  const loadCss = (href,id) => {
    if (document.getElementById(id)) return;
    const link=document.createElement('link');
    link.id=id; link.rel='stylesheet'; link.href=href;
    document.head.appendChild(link);
  };
  const loadScript = (src,id) => {
    if (document.getElementById(id)) return;
    const script=document.createElement('script');
    script.id=id; script.src=src; script.defer=true;
    document.body.appendChild(script);
  };

  // Messenger único.
  loadCss('./social-chat-v20.css?v=20260901-2','ccChatV20Css');
  loadScript('./social-chat-v20.js?v=20260901-2','ccChatV20Js');
  loadScript('./social-chat-audio-v20.js?v=20260901-1','ccChatAudioV20Js');
  loadCss('./social-chat-presence-v21.css?v=20260902-1','ccChatPresenceV21Css');
  loadScript('./social-chat-presence-v21.js?v=20260902-1','ccChatPresenceV21Js');

  // Notificações multipágina: sino com as 3 últimas + central completa.
  loadCss('./social-notifications-v22.css?v=20260901-2','ccNotificationsV22Css');
  loadCss('./social-notifications-v23.css?v=20260902-1','ccNotificationsV23Css');
  loadScript('./social-notifications-v23.js?v=20260902-1','ccNotificationsV23Js');

  // Estado persistente do perfil/tema entre as páginas da rede.
  loadScript('./social-shell-state-v2.js?v=20260902-1','ccSocialShellStateV2Js');

  // Modal de fotos: curtir, comentar e compartilhar no feed.
  loadCss('./social-photo-actions-v21.css?v=20260901-2','ccPhotoActionsV21Css');
  loadScript('./social-photo-actions-v21.js?v=20260901-2','ccPhotoActionsV21Js');

  // Recursos independentes do chat antigo que continuam válidos.
  loadCss('./community-event-calendar-v13.css?v=20260831-1','ccEventCalendarV13Css');
  loadScript('./community-event-calendar-v13.js?v=20260831-1','ccEventCalendarV13Js');
  loadScript('./social-message-alerts-v13.js?v=20260831-1','ccMessageAlertsV13Js');
})();