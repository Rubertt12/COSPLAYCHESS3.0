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

  // Messenger único. Não carregar novamente as antigas camadas v13/v14 do chat.
  loadCss('./social-chat-v20.css?v=20260901-2','ccChatV20Css');
  loadScript('./social-chat-v20.js?v=20260901-2','ccChatV20Js');
  loadScript('./social-chat-audio-v20.js?v=20260901-1','ccChatAudioV20Js');

  // Notificações: popover das 3 mais recentes + central clicável.
  loadCss('./social-notifications-v22.css?v=20260901-2','ccNotificationsV22Css');
  loadScript('./social-notifications-v22.js?v=20260901-2','ccNotificationsV22Js');

  // Modal de fotos: curtir, comentar e compartilhar no feed.
  loadCss('./social-photo-actions-v21.css?v=20260901-2','ccPhotoActionsV21Css');
  loadScript('./social-photo-actions-v21.js?v=20260901-2','ccPhotoActionsV21Js');

  // Recursos independentes do chat antigo que continuam válidos.
  loadCss('./community-event-calendar-v13.css?v=20260831-1','ccEventCalendarV13Css');
  loadScript('./community-event-calendar-v13.js?v=20260831-1','ccEventCalendarV13Js');
  loadScript('./social-message-alerts-v13.js?v=20260831-1','ccMessageAlertsV13Js');
})();