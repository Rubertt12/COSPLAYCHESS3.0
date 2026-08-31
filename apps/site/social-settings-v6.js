(() => {
  'use strict';
  if (window.__CC_SOCIAL_SETTINGS_V6__) return;
  window.__CC_SOCIAL_SETTINGS_V6__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const $ = (id) => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORE_KEY = 'cosplaychess-social-appearance-v6';
  const THEMES = new Set(['cosplay-dark','orkut-night','royal-purple','chess-gold','white-mode']);
  const ACCENTS = new Set(['gold','blue','pink','purple']);
  const BACKGROUNDS = new Set(['classic','chessboard','nebula','sakura','minimal','stars']);
  const state = { profile:null, settings:null, activeTab:'appearance', loading:false };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalized = (settings = {}) => ({
    theme: THEMES.has(settings.theme) ? settings.theme : 'cosplay-dark',
    accent: ACCENTS.has(settings.accent) ? settings.accent : 'gold',
    community_background: BACKGROUNDS.has(settings.community_background) ? settings.community_background : 'classic'
  });

  const appearanceLabel = (theme) => ({
    'cosplay-dark':'Cosplay Dark',
    'royal-purple':'Royal Purple',
    'chess-gold':'Chess Gold',
    'orkut-night':'Orkut Night',
    'white-mode':'White Mode'
  }[theme] || 'Cosplay Dark');

  const applyAppearance = (next = {}, persistLocal = true) => {
    const appearance = normalized(next);
    const body = document.body;
    body.dataset.ccTheme = appearance.theme;
    body.dataset.ccAccent = appearance.accent;
    body.dataset.ccBg = appearance.community_background;
    document.documentElement.dataset.communityTheme = appearance.theme;
    if (persistLocal) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(appearance)); } catch {}
    }
    window.dispatchEvent(new CustomEvent('cosplay:social-appearance-applied',{detail:appearance}));
  };

  const applyStoredImmediately = () => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) applyAppearance(JSON.parse(raw), false);
    } catch {}
  };

  const getProfile = async () => {
    if (state.profile) return state.profile;
    const { data: sessionData } = await db.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return null;
    const { data, error } = await db.from('cosplay_participant_profiles')
      .select('id,user_id,public_slug,display_name,nick,character_name,character_photo_url')
      .eq('user_id',userId)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    state.profile = data;
    return data;
  };

  const loadSettings = async (force = false) => {
    if (state.settings && !force) return state.settings;
    const profile = await getProfile();
    if (!profile) return null;
    const { data, error } = await db.from('cosplay_profile_social_settings').select('*').eq('profile_id',profile.id).maybeSingle();
    if (error) return null;
    state.settings = data || {
      profile_id:profile.id,
      status_message:'',
      allow_messages:'friends',
      allow_friend_requests:true,
      community_visible:true,
      allow_tags:true,
      show_online:true,
      record_visits:true,
      show_visitors:true,
      theme:'cosplay-dark',
      accent:'gold',
      community_background:'classic'
    };
    applyAppearance(state.settings);
    return state.settings;
  };

  const ensurePanel = () => {
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

  const switchToSettings = () => {
    const panel = ensurePanel();
    if (!panel) return null;
    qa('[data-community-panel]').forEach((item) => {
      const active = item === panel;
      item.hidden = !active;
      item.classList.toggle('active',active);
    });
    qa('.community-nav [data-community-view], .cc-left > [data-community-view]').forEach((item) => {
      item.classList.toggle('active',item.dataset.communityView === 'social-settings');
    });
    document.body.dataset.ccView = 'social-settings';
    return panel;
  };

  const themeCard = (value, cls, title, subtitle, checked) => `<label class="cc-theme-choice"><input type="radio" name="theme" value="${value}"${checked ? ' checked' : ''}><span class="cc-theme-preview ${cls}"><i></i><b>${title}</b><small>${subtitle}</small></span></label>`;
  const accentCard = (value, title, checked) => `<label class="cc-accent-choice"><input type="radio" name="accent" value="${value}"${checked ? ' checked' : ''}><span class="cc-accent-swatch"><i class="cc-accent-dot ${value}"></i>${title}</span></label>`;
  const bgCard = (value, title, checked) => `<label class="cc-bg-choice"><input type="radio" name="community_background" value="${value}"${checked ? ' checked' : ''}><span class="cc-bg-card ${value}">${title}</span></label>`;

  const render = async (tab = state.activeTab) => {
    if (state.loading) return;
    state.loading = true;
    state.activeTab = tab === 'privacy' ? 'privacy' : 'appearance';
    const panel = switchToSettings();
    if (!panel) { state.loading = false; return; }
    panel.innerHTML = '<div class="cc-loading-inline">Carregando configurações...</div>';
    const settings = await loadSettings();
    if (!settings) {
      panel.innerHTML = '<div class="cc-runtime-empty">Entre novamente na Área do Participante para acessar as configurações.</div>';
      state.loading = false;
      return;
    }
    const a = normalized(settings);
    panel.innerHTML = `
      <div class="cc-settings-v6">
        <div class="cc-settings-v6-head">
          <div><h2>Configurações da rede</h2><p>Personalize a aparência e controle como você interage no CosplayChess.</p></div>
          <div class="cc-settings-v6-tabs" role="tablist">
            <button type="button" data-settings-tab="appearance" class="${state.activeTab === 'appearance' ? 'active' : ''}">✦ Temas & aparência</button>
            <button type="button" data-settings-tab="privacy" class="${state.activeTab === 'privacy' ? 'active' : ''}">⚙ Privacidade & rede</button>
          </div>
        </div>
        <form id="ccSettingsV6Form">
          <div class="cc-settings-v6-grid">
            <section class="cc-settings-v6-main">
              <div data-settings-pane="appearance"${state.activeTab === 'appearance' ? '' : ' hidden'}>
                <div class="cc-settings-v6-section">
                  <div class="cc-settings-v6-section-head"><b>Tema da rede</b><span>A mudança aparece na hora.</span></div>
                  <div class="cc-theme-grid">
                    ${themeCard('cosplay-dark','dark','Cosplay Dark','Preto, roxo e dourado',a.theme === 'cosplay-dark')}
                    ${themeCard('royal-purple','purple','Royal Purple','Roxo mais intenso',a.theme === 'royal-purple')}
                    ${themeCard('chess-gold','gold','Chess Gold','Preto e dourado clássico',a.theme === 'chess-gold')}
                    ${themeCard('orkut-night','orkut','Orkut Night','Azul nostálgico da comunidade',a.theme === 'orkut-night')}
                    ${themeCard('white-mode','light','White Mode','Claro e limpo',a.theme === 'white-mode')}
                  </div>
                </div>
                <div class="cc-settings-v6-section">
                  <div class="cc-settings-v6-section-head"><b>Cor de destaque</b><span>Botões, seleção e detalhes.</span></div>
                  <div class="cc-accent-grid">
                    ${accentCard('gold','Dourado',a.accent === 'gold')}
                    ${accentCard('purple','Roxo',a.accent === 'purple')}
                    ${accentCard('blue','Azul',a.accent === 'blue')}
                    ${accentCard('pink','Rosa',a.accent === 'pink')}
                  </div>
                </div>
                <div class="cc-settings-v6-section">
                  <div class="cc-settings-v6-section-head"><b>Plano de fundo</b><span>Textura da rede social.</span></div>
                  <div class="cc-bg-grid">
                    ${bgCard('classic','Clássico',a.community_background === 'classic')}
                    ${bgCard('chessboard','Tabuleiro',a.community_background === 'chessboard')}
                    ${bgCard('nebula','Nebulosa',a.community_background === 'nebula')}
                    ${bgCard('sakura','Sakura',a.community_background === 'sakura')}
                    ${bgCard('stars','Estrelas',a.community_background === 'stars')}
                    ${bgCard('minimal','Minimalista',a.community_background === 'minimal')}
                  </div>
                </div>
              </div>
              <div data-settings-pane="privacy"${state.activeTab === 'privacy' ? '' : ' hidden'}>
                <div class="cc-settings-v6-section">
                  <div class="cc-settings-v6-section-head"><b>Privacidade e interação</b><span>Configurações vinculadas ao seu participante.</span></div>
                  <div class="cc-settings-v6-privacy">
                    <label class="cc-settings-v6-field wide"><b>Recado da rede</b><small>Uma frase curta usada nas áreas sociais do seu participante.</small><input name="status_message" maxlength="180" value="${esc(settings.status_message || '')}" placeholder="Ex.: Bora jogar e fazer cosplay!"></label>
                    <label class="cc-settings-v6-field"><b>Mensagens</b><small>Quem pode iniciar uma conversa com você.</small><select name="allow_messages"><option value="friends">Somente amigos</option><option value="participants">Todos os participantes</option><option value="none">Ninguém</option></select></label>
                    <div class="cc-settings-v6-toggle"><span><b>Solicitações de amizade</b><small>Permitir que participantes enviem convites.</small></span><input type="checkbox" name="allow_friend_requests"></div>
                    <div class="cc-settings-v6-toggle"><span><b>Aparecer na rede</b><small>Permitir que outros participantes encontrem você nas áreas sociais.</small></span><input type="checkbox" name="community_visible"></div>
                    <div class="cc-settings-v6-toggle"><span><b>Marcações em fotos</b><small>Permitir que participantes marquem você.</small></span><input type="checkbox" name="allow_tags"></div>
                    <div class="cc-settings-v6-toggle"><span><b>Status online</b><small>Mostrar quando você estiver ativo na rede.</small></span><input type="checkbox" name="show_online"></div>
                    <div class="cc-settings-v6-toggle"><span><b>Registrar visitas</b><small>Registrar visitas feitas entre participantes.</small></span><input type="checkbox" name="record_visits"></div>
                    <div class="cc-settings-v6-toggle"><span><b>Mostrar visitantes</b><small>Permitir a visualização das visitas recentes.</small></span><input type="checkbox" name="show_visitors"></div>
                  </div>
                </div>
              </div>
            </section>
            <aside class="cc-settings-v6-side">
              <div class="cc-settings-v6-side-inner">
                <div><h3>Prévia da sua rede</h3><p>O tema altera a interface da rede, sem modificar a aparência do seu perfil cosplay público.</p></div>
                <div class="cc-settings-v6-preview"><div class="cc-settings-v6-preview-bar"></div><div class="cc-settings-v6-preview-row"><div class="cc-settings-v6-preview-avatar"></div><div class="cc-settings-v6-preview-lines"><i></i><i></i></div></div></div>
                <div class="cc-settings-summary"><div><span>Tema atual</span><b id="ccSettingsThemeLabel">${appearanceLabel(a.theme)}</b></div><div><span>Mensagens</span><b id="ccSettingsMessageLabel">${settings.allow_messages === 'none' ? 'Bloqueadas' : settings.allow_messages === 'participants' ? 'Participantes' : 'Amigos'}</b></div><div><span>Na rede</span><b id="ccSettingsVisibleLabel">${settings.community_visible === false ? 'Oculto' : 'Visível'}</b></div></div>
              </div>
              <div class="cc-settings-v6-actions"><span id="ccSettingsV6Status" class="cc-settings-v6-status"></span><button class="btn gold" type="submit">Salvar configurações</button></div>
            </aside>
          </div>
        </form>
      </div>`;

    const form = $('ccSettingsV6Form');
    form.elements.allow_messages.value = settings.allow_messages || 'friends';
    form.elements.allow_friend_requests.checked = settings.allow_friend_requests !== false;
    form.elements.community_visible.checked = settings.community_visible !== false;
    form.elements.allow_tags.checked = settings.allow_tags !== false;
    form.elements.show_online.checked = settings.show_online !== false;
    form.elements.record_visits.checked = settings.record_visits !== false;
    form.elements.show_visitors.checked = settings.show_visitors !== false;

    qa('[data-settings-tab]',panel).forEach((button) => button.addEventListener('click',() => {
      state.activeTab = button.dataset.settingsTab === 'privacy' ? 'privacy' : 'appearance';
      qa('[data-settings-tab]',panel).forEach((item) => item.classList.toggle('active',item === button));
      qa('[data-settings-pane]',panel).forEach((pane) => { pane.hidden = pane.dataset.settingsPane !== state.activeTab; });
    }));

    const previewAppearance = () => {
      const theme = form.elements.theme.value;
      const accent = form.elements.accent.value;
      const background = form.elements.community_background.value;
      applyAppearance({theme,accent,community_background:background},false);
      const label = $('ccSettingsThemeLabel');
      if (label) label.textContent = appearanceLabel(theme);
    };
    qa('input[name="theme"],input[name="accent"],input[name="community_background"]',form).forEach((input) => input.addEventListener('change',previewAppearance));
    form.elements.allow_messages.addEventListener('change',() => { const el=$('ccSettingsMessageLabel'); if(el)el.textContent=form.elements.allow_messages.value === 'none' ? 'Bloqueadas' : form.elements.allow_messages.value === 'participants' ? 'Participantes' : 'Amigos'; });
    form.elements.community_visible.addEventListener('change',() => { const el=$('ccSettingsVisibleLabel'); if(el)el.textContent=form.elements.community_visible.checked ? 'Visível' : 'Oculto'; });

    form.addEventListener('submit',async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const status = $('ccSettingsV6Status');
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
        applyAppearance(state.settings || {});
        status.textContent = 'Não foi possível salvar. Tente novamente.';
        status.className = 'cc-settings-v6-status error';
        return;
      }
      state.settings = data || payload;
      applyAppearance(state.settings);
      status.textContent = 'Configurações salvas ✓';
      status.className = 'cc-settings-v6-status success';
      window.dispatchEvent(new CustomEvent('cosplay:social-settings-saved',{detail:{settings:state.settings}}));
      setTimeout(() => { if (status.textContent.includes('salvas')) status.textContent=''; },2200);
    });

    state.loading = false;
  };

  const openFromTrigger = (trigger) => {
    const wantsAppearance = /tema/i.test(trigger?.textContent || '') || trigger?.dataset?.settingsTab === 'appearance';
    render(wantsAppearance ? 'appearance' : 'privacy').catch(() => { state.loading=false; });
  };

  document.addEventListener('click',(event) => {
    const trigger = event.target.closest('[data-community-view="social-settings"], [data-cc-open-settings]');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openFromTrigger(trigger);
  },true);

  const init = async () => {
    applyStoredImmediately();
    ensurePanel();
    await loadSettings().catch(() => null);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
