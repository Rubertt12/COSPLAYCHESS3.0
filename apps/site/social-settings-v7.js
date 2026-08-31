(() => {
  'use strict';
  if (window.__CC_SOCIAL_SETTINGS_V7__) return;
  window.__CC_SOCIAL_SETTINGS_V7__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const $ = (id) => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORE_KEY = 'cosplaychess-social-appearance-v7';
  const THEMES = ['cosplay-dark','royal-purple','chess-gold','orkut-night','white-mode'];
  const ACCENTS = ['gold','purple','blue','pink'];
  const BACKGROUNDS = ['classic','chessboard','nebula','sakura','stars','minimal'];
  const state = { profile:null, settings:null, tab:'appearance', request:0 };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const valid = (value, list, fallback) => list.includes(value) ? value : fallback;
  const normalize = (s = {}) => ({
    theme: valid(s.theme, THEMES, 'cosplay-dark'),
    accent: valid(s.accent, ACCENTS, 'gold'),
    community_background: valid(s.community_background, BACKGROUNDS, 'classic')
  });
  const themeName = (value) => ({
    'cosplay-dark':'Cosplay Dark','royal-purple':'Royal Purple','chess-gold':'Chess Gold','orkut-night':'Orkut Night','white-mode':'White Mode'
  }[value] || 'Cosplay Dark');

  const applyAppearance = (settings, saveLocal = true) => {
    const a = normalize(settings);
    document.body.dataset.ccTheme = a.theme;
    document.body.dataset.ccAccent = a.accent;
    document.body.dataset.ccBg = a.community_background;
    document.documentElement.dataset.communityTheme = a.theme;
    if (saveLocal) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(a)); } catch {}
    }
  };

  const applyLocal = () => {
    try {
      const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem('cosplaychess-social-appearance-v6');
      if (raw) applyAppearance(JSON.parse(raw), false);
    } catch {}
  };

  const getPanel = () => {
    let panel = q('[data-community-panel="social-settings"]');
    if (panel) return panel;
    const main = q('.community-main');
    if (!main) return null;
    panel = document.createElement('section');
    panel.className = 'community-view';
    panel.dataset.communityPanel = 'social-settings';
    panel.hidden = true;
    main.appendChild(panel);
    return panel;
  };

  const activatePanel = (tab, trigger) => {
    const panel = getPanel();
    if (!panel) return null;
    state.tab = tab === 'privacy' ? 'privacy' : 'appearance';
    qa('[data-community-panel]').forEach((item) => {
      const active = item === panel;
      item.hidden = !active;
      item.classList.toggle('active', active);
    });
    qa('[data-community-view]').forEach((item) => item.classList.remove('active'));
    if (trigger) trigger.classList.add('active');
    document.body.dataset.ccView = 'social-settings';
    panel.hidden = false;
    panel.classList.add('active');
    return panel;
  };

  const getProfile = async () => {
    if (state.profile) return state.profile;
    const { data: session } = await db.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return null;
    const { data, error } = await db.from('cosplay_participant_profiles')
      .select('id,user_id,public_slug,display_name,nick,character_name')
      .eq('user_id', userId)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if (error) return null;
    state.profile = data || null;
    return state.profile;
  };

  const loadSettings = async () => {
    const profile = await getProfile();
    if (!profile) return null;
    const { data, error } = await db.from('cosplay_profile_social_settings').select('*').eq('profile_id',profile.id).maybeSingle();
    if (error) throw error;
    state.settings = data || {
      profile_id:profile.id,status_message:'',allow_messages:'friends',allow_friend_requests:true,community_visible:true,
      allow_tags:true,show_online:true,record_visits:true,show_visitors:true,theme:'cosplay-dark',accent:'gold',community_background:'classic'
    };
    applyAppearance(state.settings);
    return state.settings;
  };

  const themeCard = (value, cls, title, subtitle, checked) => `<label class="cc-theme-choice"><input type="radio" name="theme" value="${value}"${checked?' checked':''}><span class="cc-theme-preview ${cls}"><i></i><b>${title}</b><small>${subtitle}</small></span></label>`;
  const accentCard = (value, title, checked) => `<label class="cc-accent-choice"><input type="radio" name="accent" value="${value}"${checked?' checked':''}><span class="cc-accent-swatch"><i class="cc-accent-dot ${value}"></i>${title}</span></label>`;
  const bgCard = (value, title, checked) => `<label class="cc-bg-choice"><input type="radio" name="community_background" value="${value}"${checked?' checked':''}><span class="cc-bg-card ${value}">${title}</span></label>`;

  const renderSettings = (panel, settings) => {
    const a = normalize(settings);
    panel.innerHTML = `
      <div class="cc-settings-v6">
        <div class="cc-settings-v6-head">
          <div><h2>Configurações da rede</h2><p>Personalize a rede social e controle sua privacidade.</p></div>
          <div class="cc-settings-v6-tabs" role="tablist">
            <button type="button" data-settings-tab="appearance" class="${state.tab==='appearance'?'active':''}">✦ Temas & aparência</button>
            <button type="button" data-settings-tab="privacy" class="${state.tab==='privacy'?'active':''}">⚙ Privacidade & rede</button>
          </div>
        </div>
        <form id="ccSettingsV7Form">
          <div class="cc-settings-v6-grid">
            <section class="cc-settings-v6-main">
              <div data-settings-pane="appearance"${state.tab==='appearance'?'':' hidden'}>
                <div class="cc-settings-v6-section">
                  <div class="cc-settings-v6-section-head"><b>Tema da rede</b><span>Prévia instantânea</span></div>
                  <div class="cc-theme-grid">
                    ${themeCard('cosplay-dark','dark','Cosplay Dark','Preto, roxo e dourado',a.theme==='cosplay-dark')}
                    ${themeCard('royal-purple','purple','Royal Purple','Roxo intenso',a.theme==='royal-purple')}
                    ${themeCard('chess-gold','gold','Chess Gold','Preto e dourado',a.theme==='chess-gold')}
                    ${themeCard('orkut-night','orkut','Orkut Night','Azul nostálgico',a.theme==='orkut-night')}
                    ${themeCard('white-mode','light','White Mode','Claro e limpo',a.theme==='white-mode')}
                  </div>
                </div>
                <div class="cc-settings-v6-section">
                  <div class="cc-settings-v6-section-head"><b>Cor de destaque</b><span>Botões e seleção</span></div>
                  <div class="cc-accent-grid">
                    ${accentCard('gold','Dourado',a.accent==='gold')}${accentCard('purple','Roxo',a.accent==='purple')}${accentCard('blue','Azul',a.accent==='blue')}${accentCard('pink','Rosa',a.accent==='pink')}
                  </div>
                </div>
                <div class="cc-settings-v6-section">
                  <div class="cc-settings-v6-section-head"><b>Plano de fundo</b><span>Textura da rede</span></div>
                  <div class="cc-bg-grid">
                    ${bgCard('classic','Clássico',a.community_background==='classic')}${bgCard('chessboard','Tabuleiro',a.community_background==='chessboard')}${bgCard('nebula','Nebulosa',a.community_background==='nebula')}${bgCard('sakura','Sakura',a.community_background==='sakura')}${bgCard('stars','Estrelas',a.community_background==='stars')}${bgCard('minimal','Minimalista',a.community_background==='minimal')}
                  </div>
                </div>
              </div>
              <div data-settings-pane="privacy"${state.tab==='privacy'?'':' hidden'}>
                <div class="cc-settings-v6-section">
                  <div class="cc-settings-v6-section-head"><b>Privacidade e interação</b><span>Preferências da sua conta social</span></div>
                  <div class="cc-settings-v6-privacy">
                    <label class="cc-settings-v6-field wide"><b>Recado da rede</b><small>Uma frase curta para suas áreas sociais.</small><input name="status_message" maxlength="180" value="${esc(settings.status_message || '')}" placeholder="Ex.: Bora jogar e fazer cosplay!"></label>
                    <label class="cc-settings-v6-field"><b>Mensagens</b><small>Quem pode iniciar conversa.</small><select name="allow_messages"><option value="friends">Somente amigos</option><option value="participants">Todos os participantes</option><option value="none">Ninguém</option></select></label>
                    <div class="cc-settings-v6-toggle"><span><b>Solicitações de amizade</b><small>Permitir novos convites.</small></span><input type="checkbox" name="allow_friend_requests"></div>
                    <div class="cc-settings-v6-toggle"><span><b>Aparecer na rede</b><small>Permitir que participantes encontrem você.</small></span><input type="checkbox" name="community_visible"></div>
                    <div class="cc-settings-v6-toggle"><span><b>Marcações em fotos</b><small>Permitir que marquem você.</small></span><input type="checkbox" name="allow_tags"></div>
                    <div class="cc-settings-v6-toggle"><span><b>Status online</b><small>Mostrar quando estiver ativo.</small></span><input type="checkbox" name="show_online"></div>
                    <div class="cc-settings-v6-toggle"><span><b>Registrar visitas</b><small>Registrar visitas entre participantes.</small></span><input type="checkbox" name="record_visits"></div>
                    <div class="cc-settings-v6-toggle"><span><b>Mostrar visitantes</b><small>Mostrar visitas recentes.</small></span><input type="checkbox" name="show_visitors"></div>
                  </div>
                </div>
              </div>
            </section>
            <aside class="cc-settings-v6-side">
              <div class="cc-settings-v6-side-inner">
                <div><h3>Prévia da sua rede</h3><p>O tema vale somente para a rede social e não altera seu perfil cosplay público.</p></div>
                <div class="cc-settings-v6-preview"><div class="cc-settings-v6-preview-bar"></div><div class="cc-settings-v6-preview-row"><div class="cc-settings-v6-preview-avatar"></div><div class="cc-settings-v6-preview-lines"><i></i><i></i></div></div></div>
                <div class="cc-settings-summary"><div><span>Tema atual</span><b id="ccSettingsThemeLabel">${themeName(a.theme)}</b></div><div><span>Mensagens</span><b id="ccSettingsMessageLabel"></b></div><div><span>Na rede</span><b id="ccSettingsVisibleLabel"></b></div></div>
              </div>
              <div class="cc-settings-v6-actions"><span id="ccSettingsV7Status" class="cc-settings-v6-status"></span><button class="btn gold" type="submit">Salvar configurações</button></div>
            </aside>
          </div>
        </form>
      </div>`;

    const form = $('ccSettingsV7Form');
    if (!form) return;
    form.elements.allow_messages.value = settings.allow_messages || 'friends';
    form.elements.allow_friend_requests.checked = settings.allow_friend_requests !== false;
    form.elements.community_visible.checked = settings.community_visible !== false;
    form.elements.allow_tags.checked = settings.allow_tags !== false;
    form.elements.show_online.checked = settings.show_online !== false;
    form.elements.record_visits.checked = settings.record_visits !== false;
    form.elements.show_visitors.checked = settings.show_visitors !== false;

    const syncSummary = () => {
      const message = $('ccSettingsMessageLabel');
      const visible = $('ccSettingsVisibleLabel');
      if (message) message.textContent = form.elements.allow_messages.value === 'none' ? 'Bloqueadas' : form.elements.allow_messages.value === 'participants' ? 'Participantes' : 'Amigos';
      if (visible) visible.textContent = form.elements.community_visible.checked ? 'Visível' : 'Oculto';
    };
    syncSummary();

    qa('[data-settings-tab]',panel).forEach((button) => button.addEventListener('click',() => {
      state.tab = button.dataset.settingsTab === 'privacy' ? 'privacy' : 'appearance';
      qa('[data-settings-tab]',panel).forEach((item) => item.classList.toggle('active', item === button));
      qa('[data-settings-pane]',panel).forEach((pane) => { pane.hidden = pane.dataset.settingsPane !== state.tab; });
    }));

    const preview = () => {
      const next = {theme:form.elements.theme.value,accent:form.elements.accent.value,community_background:form.elements.community_background.value};
      applyAppearance(next,false);
      const label = $('ccSettingsThemeLabel');
      if (label) label.textContent = themeName(next.theme);
    };
    qa('input[name="theme"],input[name="accent"],input[name="community_background"]',form).forEach((input) => input.addEventListener('change',preview));
    form.elements.allow_messages.addEventListener('change',syncSummary);
    form.elements.community_visible.addEventListener('change',syncSummary);

    form.addEventListener('submit',async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const status = $('ccSettingsV7Status');
      submit.disabled = true;
      status.textContent = 'Salvando...';
      status.className = 'cc-settings-v6-status';
      const payload = {
        profile_id:state.profile.id,
        status_message:form.elements.status_message.value.trim(),
        allow_messages:form.elements.allow_messages.value,
        allow_friend_requests:form.elements.allow_friend_requests.checked,
        community_visible:form.elements.community_visible.checked,
        allow_tags:form.elements.allow_tags.checked,
        show_online:form.elements.show_online.checked,
        record_visits:form.elements.record_visits.checked,
        show_visitors:form.elements.show_visitors.checked,
        theme:form.elements.theme.value,
        accent:form.elements.accent.value,
        community_background:form.elements.community_background.value,
        updated_at:new Date().toISOString()
      };
      const { data, error } = await db.from('cosplay_profile_social_settings').upsert(payload,{onConflict:'profile_id'}).select('*').single();
      submit.disabled = false;
      if (error) {
        status.textContent = 'Não foi possível salvar as configurações.';
        status.className = 'cc-settings-v6-status error';
        if (state.settings) applyAppearance(state.settings);
        return;
      }
      state.settings = data || payload;
      applyAppearance(state.settings);
      status.textContent = 'Configurações salvas ✓';
      status.className = 'cc-settings-v6-status success';
      window.dispatchEvent(new CustomEvent('cosplay:social-settings-saved',{detail:{settings:state.settings}}));
    });
  };

  const openSettings = async (tab, trigger) => {
    const request = ++state.request;
    const panel = activatePanel(tab, trigger);
    if (!panel) return;
    panel.innerHTML = '<div class="cc-loading-inline">Carregando configurações...</div>';
    try {
      const settings = await loadSettings();
      if (request !== state.request) return;
      if (!settings) {
        panel.innerHTML = '<div class="cc-runtime-empty">Entre novamente na Área do Participante para acessar suas configurações.</div>';
        return;
      }
      renderSettings(panel, settings);
    } catch (error) {
      console.error('Falha ao abrir configurações sociais:', error);
      panel.innerHTML = '<div class="cc-runtime-empty">Não foi possível carregar suas configurações agora. Atualize a página e tente novamente.</div>';
    }
  };

  document.addEventListener('click',(event) => {
    const trigger = event.target.closest('[data-settings-open], [data-community-view="social-settings"], [data-cc-open-settings]');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const explicit = trigger.dataset.settingsOpen;
    const tab = explicit === 'privacy' || (!explicit && !/tema/i.test(trigger.textContent || '')) ? 'privacy' : 'appearance';
    openSettings(tab, trigger).catch(() => {});
  },true);

  const init = async () => {
    applyLocal();
    getPanel();
    try {
      const settings = await loadSettings();
      if (settings) applyAppearance(settings);
    } catch {}
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();