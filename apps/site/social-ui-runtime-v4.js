(() => {
  'use strict';
  if (window.__CC_SOCIAL_UI_RUNTIME_V4__) return;
  window.__CC_SOCIAL_UI_RUNTIME_V4__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const $ = (id) => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { profile:null, settings:null, selectedPeer:null, messages:[], profiles:new Map(), people:[] };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeImage = (value) => { try { const url = new URL(String(value || ''), location.href); return ['http:','https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
  const displayName = (profile) => profile?.display_name || profile?.nick || 'Participante';
  const socialHref = (profile) => profile?.public_slug ? `./perfil-social.html?slug=${encodeURIComponent(profile.public_slug)}` : '#';
  const fmt = (value) => { try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); } catch { return ''; } };

  const avatarHtml = (profile) => {
    const image = safeImage(profile?.character_photo_url);
    return `<span class="cc-runtime-avatar">${image ? `<img src="${esc(image)}" alt="">` : '♜'}</span>`;
  };

  const getMyProfile = async () => {
    if (state.profile) return state.profile;
    const { data: auth } = await db.auth.getSession();
    const userId = auth?.session?.user?.id;
    if (!userId) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,user_id,public_slug,display_name,nick,character_name,character_photo_url,created_at')
      .eq('user_id', userId)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    state.profile = data || null;
    if (data) state.profiles.set(data.id, data);
    return state.profile;
  };

  const loadProfiles = async (ids) => {
    const missing = [...new Set((ids || []).filter(Boolean))].filter((id) => !state.profiles.has(id));
    if (!missing.length) return;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url')
      .in('id', missing);
    (data || []).forEach((profile) => state.profiles.set(profile.id, profile));
  };

  const waitForPanel = async (name, timeout = 1800) => {
    const started = performance.now();
    while (performance.now() - started < timeout) {
      const panel = q(`[data-community-panel="${name}"]`);
      if (panel) return panel;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return null;
  };

  const switchPanel = (name) => {
    qa('[data-community-view]').forEach((el) => el.classList.toggle('active', el.dataset.communityView === name));
    qa('[data-community-panel]').forEach((panel) => {
      const active = panel.dataset.communityPanel === name;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
  };

  const setBadge = (count) => {
    const value = Number(count || 0);
    qa('[data-community-view="notifications"] .social-v2-badge').forEach((badge) => {
      badge.textContent = String(value);
      badge.hidden = value === 0;
    });
    const mirror = $('ccNotificationBadge');
    if (mirror) { mirror.textContent = String(value); mirror.hidden = value === 0; }
  };

  const refreshUnread = async () => {
    const me = await getMyProfile();
    if (!me) return;
    const { count } = await db.from('cosplay_social_notifications')
      .select('id',{count:'exact',head:true})
      .eq('recipient_profile_id',me.id)
      .is('read_at',null);
    setBadge(count || 0);
  };

  const renderNotifications = async () => {
    const me = await getMyProfile();
    const panel = await waitForPanel('notifications');
    if (!me || !panel) return;
    panel.innerHTML = `<div class="cc-runtime-panel"><div class="cc-runtime-head"><div><h2>Notificações</h2><p>Atividade recente da sua rede CosplayChess.</p></div></div><section class="cc-runtime-card"><div class="cc-runtime-card-head"><b>Atividade recente</b><button id="ccMarkNotificationsRead" type="button">Marcar tudo como lido</button></div><div id="ccNotificationList" class="cc-notification-list"><div class="cc-loading-inline">Carregando notificações...</div></div></section></div>`;
    const list = $('ccNotificationList');
    const { data, error } = await db.from('cosplay_social_notifications')
      .select('id,actor_profile_id,kind,body,read_at,created_at')
      .eq('recipient_profile_id',me.id)
      .order('created_at',{ascending:false})
      .limit(80);
    if (error) {
      list.innerHTML = '<div class="cc-runtime-empty">Não foi possível carregar as notificações agora.</div>';
      return;
    }
    const rows = data || [];
    await loadProfiles(rows.map((row) => row.actor_profile_id));
    if (!rows.length) list.innerHTML = '<div class="cc-runtime-empty">Nenhuma notificação ainda.</div>';
    else list.innerHTML = rows.map((row) => {
      const actor = state.profiles.get(row.actor_profile_id);
      return `<article class="cc-notification-row${row.read_at ? '' : ' unread'}">${avatarHtml(actor)}<div class="cc-notification-copy"><b>${esc(actor ? displayName(actor) : 'CosplayChess')}</b><span>${esc(row.body || row.kind || 'Nova atividade na sua rede.')}</span><small>${esc(fmt(row.created_at))}</small></div>${row.read_at ? '' : '<i class="cc-unread-dot"></i>'}</article>`;
    }).join('');
    setBadge(rows.filter((row) => !row.read_at).length);
    $('ccMarkNotificationsRead')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      await db.from('cosplay_social_notifications').update({read_at:new Date().toISOString()}).eq('recipient_profile_id',me.id).is('read_at',null);
      await renderNotifications();
    }, { once:true });
  };

  const applyAppearance = (theme, accent) => {
    const body = document.body;
    body.dataset.ccTheme = theme || 'cosplay-dark';
    body.dataset.ccAccent = accent || 'gold';
    if (accent === 'purple') {
      body.style.setProperty('--gold','#c776ff');
      body.style.setProperty('--gold2','#9150c6');
      body.style.setProperty('--purple','#9b4dff');
    } else {
      body.style.setProperty('--gold','#f0b62f');
      body.style.setProperty('--gold2','#c98b12');
      body.style.setProperty('--purple','#9747ff');
    }
    if (theme === 'royal-purple') body.style.background = 'radial-gradient(circle at 72% 0,rgba(124,45,194,.2),transparent 31%),#05060a';
    else if (theme === 'chess-gold') body.style.background = 'radial-gradient(circle at 70% 0,rgba(190,127,24,.14),transparent 30%),#05070b';
    else body.style.background = 'radial-gradient(circle at 74% -10%,rgba(109,43,176,.13),transparent 26%),#05070b';
  };

  const renderSettings = async (focusAppearance = false) => {
    const me = await getMyProfile();
    const panel = await waitForPanel('social-settings');
    if (!me || !panel) return;
    panel.innerHTML = '<div class="cc-loading-inline">Carregando configurações...</div>';
    const { data } = await db.from('cosplay_profile_social_settings').select('*').eq('profile_id',me.id).maybeSingle();
    const s = data || {};
    state.settings = s;
    panel.innerHTML = `<div class="cc-runtime-panel"><div class="cc-runtime-head"><div><h2>Configurações</h2><p>Privacidade, mensagens e aparência da sua rede.</p></div></div><div class="cc-settings-shell"><section class="cc-runtime-card"><div class="cc-runtime-card-head"><b>Preferências da rede</b></div><form id="ccSettingsForm" class="cc-settings-form"><label class="cc-settings-field wide"><span>Recado do perfil</span><small>Uma frase curta exibida no seu perfil social.</small><input type="text" name="status_message" maxlength="180" value="${esc(s.status_message || '')}"></label><label class="cc-settings-field" data-cc-settings-appearance><span>Tema</span><small>Escolha a atmosfera visual da rede.</small><select name="theme"><option value="cosplay-dark">Cosplay Dark</option><option value="royal-purple">Royal Purple</option><option value="chess-gold">Chess Gold</option></select></label><label class="cc-settings-field"><span>Cor de destaque</span><small>Define a cor dos elementos de ação.</small><select name="accent"><option value="gold">Dourado</option><option value="purple">Roxo</option></select></label><label class="cc-settings-field"><span>Mensagens</span><small>Quem pode iniciar uma conversa com você.</small><select name="allow_messages"><option value="friends">Somente amigos</option><option value="participants">Participantes</option><option value="none">Ninguém</option></select></label><div class="cc-settings-toggle"><span><b>Solicitações de amizade</b><small>Permitir novos convites.</small></span><input type="checkbox" name="allow_friend_requests"></div><div class="cc-settings-toggle"><span><b>Perfil social visível</b><small>Permitir que participantes encontrem seu perfil.</small></span><input type="checkbox" name="community_visible"></div><div class="cc-settings-toggle"><span><b>Marcações</b><small>Permitir marcação em fotos.</small></span><input type="checkbox" name="allow_tags"></div><div class="cc-settings-toggle"><span><b>Mostrar status online</b><small>Exibir presença quando disponível.</small></span><input type="checkbox" name="show_online"></div><div class="cc-settings-toggle"><span><b>Registrar visitas</b><small>Registrar visitas entre perfis.</small></span><input type="checkbox" name="record_visits"></div><div class="cc-settings-toggle"><span><b>Mostrar visitantes</b><small>Exibir suas visitas recentes para você.</small></span><input type="checkbox" name="show_visitors"></div><div class="cc-settings-actions"><span id="ccSettingsStatus" class="cc-runtime-status"></span><button class="btn gold" type="submit">Salvar configurações</button></div></form></section><aside class="cc-runtime-card cc-settings-side"><h3>Resumo</h3><p>Estas opções afetam somente sua experiência social. O perfil público de cosplay continua separado.</p><div class="cc-settings-summary"><div><span>Perfil social</span><b>${s.community_visible === false ? 'Oculto' : 'Visível'}</b></div><div><span>Mensagens</span><b>${s.allow_messages === 'none' ? 'Bloqueadas' : s.allow_messages === 'participants' ? 'Participantes' : 'Amigos'}</b></div><div><span>Tema</span><b>${esc(s.theme || 'Cosplay Dark')}</b></div></div></aside></div></div>`;
    const form = $('ccSettingsForm');
    form.elements.theme.value = s.theme || 'cosplay-dark';
    form.elements.accent.value = s.accent || 'gold';
    form.elements.allow_messages.value = s.allow_messages || 'friends';
    form.elements.allow_friend_requests.checked = s.allow_friend_requests !== false;
    form.elements.community_visible.checked = s.community_visible !== false;
    form.elements.allow_tags.checked = s.allow_tags !== false;
    form.elements.show_online.checked = s.show_online !== false;
    form.elements.record_visits.checked = s.record_visits !== false;
    form.elements.show_visitors.checked = s.show_visitors !== false;
    applyAppearance(form.elements.theme.value, form.elements.accent.value);
    form.elements.theme.addEventListener('change', () => applyAppearance(form.elements.theme.value, form.elements.accent.value));
    form.elements.accent.addEventListener('change', () => applyAppearance(form.elements.theme.value, form.elements.accent.value));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = $('ccSettingsStatus');
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      status.textContent = 'Salvando...';
      status.className = 'cc-runtime-status';
      const payload = {
        profile_id:me.id,
        status_message:form.elements.status_message.value.trim(),
        theme:form.elements.theme.value,
        accent:form.elements.accent.value,
        allow_messages:form.elements.allow_messages.value,
        allow_friend_requests:form.elements.allow_friend_requests.checked,
        community_visible:form.elements.community_visible.checked,
        allow_tags:form.elements.allow_tags.checked,
        show_online:form.elements.show_online.checked,
        record_visits:form.elements.record_visits.checked,
        show_visitors:form.elements.show_visitors.checked,
        updated_at:new Date().toISOString()
      };
      const { error } = await db.from('cosplay_profile_social_settings').upsert(payload,{onConflict:'profile_id'});
      submit.disabled = false;
      if (error) {
        status.textContent = 'Não foi possível salvar as configurações.';
        status.className = 'cc-runtime-status error';
        return;
      }
      state.settings = {...(state.settings || {}),...payload};
      applyAppearance(payload.theme,payload.accent);
      status.textContent = 'Configurações salvas.';
      status.className = 'cc-runtime-status success';
    });
    if (focusAppearance) setTimeout(() => q('[data-cc-settings-appearance]')?.scrollIntoView({behavior:'smooth',block:'center'}),80);
  };

  const loadMessagePeople = async () => {
    if (state.people.length) return state.people;
    const { data } = await db.rpc('cosplay_discover_participants',{p_search:'',p_page:1,p_page_size:100});
    state.people = (data || []).map((row) => ({id:row.profile_id,public_slug:row.public_slug,display_name:row.display_name,nick:row.nick,character_name:row.character_name,character_photo_url:row.character_photo_url}));
    state.people.forEach((profile) => state.profiles.set(profile.id,profile));
    return state.people;
  };

  const renderMessages = async () => {
    const me = await getMyProfile();
    const panel = await waitForPanel('messages');
    if (!me || !panel) return;
    panel.innerHTML = '<div class="cc-loading-inline">Carregando conversas...</div>';
    await loadMessagePeople();
    const { data, error } = await db.from('cosplay_direct_messages')
      .select('id,sender_profile_id,recipient_profile_id,body,read_at,created_at')
      .order('created_at',{ascending:true})
      .limit(600);
    if (error) {
      panel.innerHTML = '<div class="cc-runtime-empty">Não foi possível carregar suas mensagens.</div>';
      return;
    }
    state.messages = data || [];
    const peerIds = [...new Set(state.messages.map((message) => message.sender_profile_id === me.id ? message.recipient_profile_id : message.sender_profile_id))];
    await loadProfiles(peerIds);
    if (state.selectedPeer) await loadProfiles([state.selectedPeer]);
    const latest = new Map();
    state.messages.forEach((message) => {
      const peer = message.sender_profile_id === me.id ? message.recipient_profile_id : message.sender_profile_id;
      latest.set(peer,message);
    });
    const orderedPeers = [...peerIds].sort((a,b) => new Date(latest.get(b)?.created_at || 0) - new Date(latest.get(a)?.created_at || 0));
    const options = state.people.filter((profile) => profile.id !== me.id).map((profile) => `<option value="${esc(profile.id)}">${esc(displayName(profile))} — ${esc(profile.character_name || 'CosplayChess')}</option>`).join('');
    const threads = orderedPeers.length ? orderedPeers.map((id) => {
      const profile = state.profiles.get(id);
      const message = latest.get(id);
      return `<button class="cc-thread${state.selectedPeer === id ? ' active' : ''}" type="button" data-cc-peer="${esc(id)}">${avatarHtml(profile)}<span class="cc-thread-copy"><b>${esc(displayName(profile))}</b><span>${esc(message?.body || '')}</span></span></button>`;
    }).join('') : '<div class="cc-runtime-empty">Nenhuma conversa ainda.</div>';
    let conversation = '<div class="cc-runtime-empty">Escolha uma conversa ou inicie uma nova.</div>';
    if (state.selectedPeer) {
      const peer = state.profiles.get(state.selectedPeer) || state.people.find((profile) => profile.id === state.selectedPeer);
      const rows = state.messages.filter((message) => (message.sender_profile_id === me.id && message.recipient_profile_id === state.selectedPeer) || (message.recipient_profile_id === me.id && message.sender_profile_id === state.selectedPeer));
      conversation = `<div class="cc-conversation-head">${avatarHtml(peer)}<b>${esc(displayName(peer))}</b></div><div id="ccMessageStream" class="cc-message-stream">${rows.length ? rows.map((message) => `<div class="cc-message-bubble${message.sender_profile_id === me.id ? ' mine' : ''}">${esc(message.body)}<small>${esc(fmt(message.created_at))}</small></div>`).join('') : '<div class="cc-runtime-empty">Comece a conversa.</div>'}</div><form id="ccMessageForm" class="cc-message-form"><textarea name="body" maxlength="2000" required placeholder="Escreva uma mensagem..."></textarea><button class="btn gold" type="submit">Enviar</button></form>`;
    }
    panel.innerHTML = `<div class="cc-runtime-panel"><div class="cc-runtime-head"><div><h2>Mensagens</h2><p>Converse com participantes da comunidade.</p></div></div><section class="cc-messages-shell"><aside class="cc-thread-column"><div class="cc-thread-head"><select id="ccNewConversation"><option value="">＋ Nova conversa...</option>${options}</select></div><div class="cc-thread-list">${threads}</div></aside><section class="cc-conversation">${conversation}</section></section></div>`;
    qa('[data-cc-peer]',panel).forEach((button) => button.addEventListener('click', async () => {
      state.selectedPeer = button.dataset.ccPeer;
      await db.from('cosplay_direct_messages').update({read_at:new Date().toISOString()}).eq('sender_profile_id',state.selectedPeer).eq('recipient_profile_id',me.id).is('read_at',null);
      renderMessages();
    }));
    $('ccNewConversation')?.addEventListener('change',(event) => {
      if (!event.target.value) return;
      state.selectedPeer = event.target.value;
      renderMessages();
    });
    $('ccMessageForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const body = form.elements.body.value.trim();
      if (!body || !state.selectedPeer) return;
      const submit = form.querySelector('button');
      submit.disabled = true;
      const { error: sendError } = await db.from('cosplay_direct_messages').insert({sender_profile_id:me.id,recipient_profile_id:state.selectedPeer,body});
      submit.disabled = false;
      if (sendError) {
        form.elements.body.setCustomValidity('Não foi possível enviar. Verifique a privacidade do destinatário.');
        form.elements.body.reportValidity();
        form.elements.body.setCustomValidity('');
        return;
      }
      renderMessages();
    });
    setTimeout(() => { const stream = $('ccMessageStream'); if (stream) stream.scrollTop = stream.scrollHeight; },0);
  };

  const fixProfileLinks = async () => {
    const me = await getMyProfile();
    if (!me) return;
    const link = $('communityMyProfileLink');
    if (link && me.public_slug) {
      link.href = socialHref(me);
      link.textContent = 'Ver perfil';
    }
  };

  const buildAccountMenu = async () => {
    const account = q('.cc-account');
    if (!account || $('ccAccountMenu')) return;
    const me = await getMyProfile();
    const menu = document.createElement('div');
    menu.id = 'ccAccountMenu';
    menu.className = 'cc-account-menu';
    menu.hidden = true;
    menu.innerHTML = `<a href="${me?.public_slug ? esc(socialHref(me)) : './participante.html'}">♙ Meu perfil social</a><button type="button" data-cc-open-settings>⚙ Configurações</button><a href="./passaporte.html">♛ Passaporte</a><a href="./participante.html">▣ Área do participante</a><a href="./index.html">← Voltar ao site</a>`;
    document.body.appendChild(menu);
    const position = () => {
      const rect = account.getBoundingClientRect();
      menu.style.top = `${Math.min(window.innerHeight - menu.offsetHeight - 8, rect.bottom + 8)}px`;
      menu.style.left = `${Math.max(8, rect.right - 210)}px`;
    };
    account.addEventListener('click',(event) => {
      event.preventDefault();
      menu.hidden = !menu.hidden;
      if (!menu.hidden) position();
    });
    menu.querySelector('[data-cc-open-settings]')?.addEventListener('click',() => {
      menu.hidden = true;
      switchPanel('social-settings');
      renderSettings();
    });
    document.addEventListener('click',(event) => {
      if (menu.hidden || account.contains(event.target) || menu.contains(event.target)) return;
      menu.hidden = true;
    });
    window.addEventListener('resize',() => { if (!menu.hidden) position(); },{passive:true});
  };

  const wireUnsupportedComposerActions = () => {
    qa('.community-file-btn[aria-disabled="true"]').forEach((item) => {
      item.title = 'Este formato ainda não está habilitado nesta versão.';
      item.addEventListener('click',() => {
        const status = $('communityPostStatus');
        if (!status) return;
        status.textContent = 'Por enquanto, publicações aceitam texto e foto.';
        status.className = 'community-status';
        setTimeout(() => { if (status.textContent.includes('Por enquanto')) status.textContent = ''; },2200);
      });
    });
  };

  const handleView = async (trigger) => {
    const view = trigger?.dataset?.communityView;
    if (!view) return;
    if (view === 'notifications') { switchPanel(view); await renderNotifications(); return; }
    if (view === 'messages') { switchPanel(view); await renderMessages(); return; }
    if (view === 'social-settings') {
      switchPanel(view);
      const wantsAppearance = /temas/i.test(trigger.textContent || '');
      await renderSettings(wantsAppearance);
    }
  };

  const init = async () => {
    await fixProfileLinks();
    await refreshUnread();
    buildAccountMenu();
    wireUnsupportedComposerActions();
    document.addEventListener('click',(event) => {
      const trigger = event.target.closest('[data-community-view]');
      if (!trigger) return;
      if (['notifications','messages','social-settings'].includes(trigger.dataset.communityView)) setTimeout(() => handleView(trigger),0);
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();