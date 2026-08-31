(() => {
  'use strict';
  if (window.__CC_SOCIAL_SETTINGS_V7__) return;
  window.__CC_SOCIAL_SETTINGS_V7__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const q = (s, root = document) => root.querySelector(s);
  const qa = (s, root = document) => [...root.querySelectorAll(s)];
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = 'cosplaychess-social-appearance-v8';
  const THEMES = ['cosplay-dark','royal-purple','chess-gold','orkut-night','white-mode'];
  const ACCENTS = ['gold','purple','blue','pink'];
  const BACKGROUNDS = ['classic','chessboard','nebula','sakura','stars','minimal'];
  const defaults = {
    status_message:'', allow_messages:'friends', allow_friend_requests:true, community_visible:true,
    allow_tags:true, show_online:true, record_visits:true, show_visitors:true,
    theme:'cosplay-dark', accent:'gold', community_background:'classic'
  };
  let current = {...defaults};
  let activeTab = 'appearance';

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const valid = (v, list, fallback) => list.includes(v) ? v : fallback;
  const normalize = (s = {}) => ({...defaults,...s,
    theme:valid(s.theme,THEMES,'cosplay-dark'),
    accent:valid(s.accent,ACCENTS,'gold'),
    community_background:valid(s.community_background,BACKGROUNDS,'classic')
  });
  const themeName = (v) => ({'cosplay-dark':'Cosplay Dark','royal-purple':'Royal Purple','chess-gold':'Chess Gold','orkut-night':'Orkut Night','white-mode':'White Mode'}[v] || 'Cosplay Dark');

  const applyAppearance = (settings, save = true) => {
    const a = normalize(settings);
    document.body.dataset.ccTheme = a.theme;
    document.body.dataset.ccAccent = a.accent;
    document.body.dataset.ccBg = a.community_background;
    document.documentElement.dataset.communityTheme = a.theme;
    if (save) { try { localStorage.setItem(STORE_KEY, JSON.stringify({theme:a.theme,accent:a.accent,community_background:a.community_background})); } catch {} }
  };

  const applyLocal = () => {
    try {
      const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem('cosplaychess-social-appearance-v7') || localStorage.getItem('cosplaychess-social-appearance-v6');
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

  const activate = (trigger, tab) => {
    const panel = getPanel();
    if (!panel) return null;
    activeTab = tab === 'privacy' ? 'privacy' : 'appearance';
    qa('[data-community-panel]').forEach(p => {
      const on = p === panel;
      p.hidden = !on;
      p.classList.toggle('active', on);
    });
    qa('[data-community-view]').forEach(el => el.classList.remove('active'));
    trigger?.classList.add('active');
    document.body.dataset.ccView = 'social-settings';
    panel.hidden = false;
    return panel;
  };

  const loadSettings = async () => {
    const { data, error } = await db.rpc('cosplay_my_social_settings');
    if (error) throw error;
    current = normalize(data && typeof data === 'object' ? data : defaults);
    applyAppearance(current);
    return current;
  };

  const themeCard = (value, cls, title, subtitle, checked) => `<label class="cc-theme-choice"><input type="radio" name="theme" value="${value}"${checked?' checked':''}><span class="cc-theme-preview ${cls}"><i></i><b>${title}</b><small>${subtitle}</small></span></label>`;
  const accentCard = (value, title, checked) => `<label class="cc-accent-choice"><input type="radio" name="accent" value="${value}"${checked?' checked':''}><span class="cc-accent-swatch"><i class="cc-accent-dot ${value}"></i>${title}</span></label>`;
  const bgCard = (value, title, checked) => `<label class="cc-bg-choice"><input type="radio" name="community_background" value="${value}"${checked?' checked':''}><span class="cc-bg-card ${value}">${title}</span></label>`;

  const render = (panel, s) => {
    const a = normalize(s);
    panel.innerHTML = `
      <div class="cc-settings-v6">
        <div class="cc-settings-v6-head">
          <div><h2>Configurações da rede</h2><p>Personalize a aparência e controle sua privacidade no CosplayChess.</p></div>
          <div class="cc-settings-v6-tabs">
            <button type="button" data-settings-tab="appearance" class="${activeTab==='appearance'?'active':''}">✦ Temas & aparência</button>
            <button type="button" data-settings-tab="privacy" class="${activeTab==='privacy'?'active':''}">⚙ Privacidade & rede</button>
          </div>
        </div>
        <form id="ccSettingsV8Form">
          <div class="cc-settings-v6-grid">
            <section class="cc-settings-v6-main">
              <div data-settings-pane="appearance"${activeTab==='appearance'?'':' hidden'}>
                <div class="cc-settings-v6-section"><div class="cc-settings-v6-section-head"><b>Tema da rede</b><span>Prévia instantânea</span></div><div class="cc-theme-grid">
                  ${themeCard('cosplay-dark','dark','Cosplay Dark','Preto, roxo e dourado',a.theme==='cosplay-dark')}
                  ${themeCard('royal-purple','purple','Royal Purple','Roxo intenso',a.theme==='royal-purple')}
                  ${themeCard('chess-gold','gold','Chess Gold','Preto e dourado',a.theme==='chess-gold')}
                  ${themeCard('orkut-night','orkut','Orkut Night','Azul nostálgico',a.theme==='orkut-night')}
                  ${themeCard('white-mode','light','White Mode','Claro e limpo',a.theme==='white-mode')}
                </div></div>
                <div class="cc-settings-v6-section"><div class="cc-settings-v6-section-head"><b>Cor de destaque</b><span>Botões e seleção</span></div><div class="cc-accent-grid">
                  ${accentCard('gold','Dourado',a.accent==='gold')}${accentCard('purple','Roxo',a.accent==='purple')}${accentCard('blue','Azul',a.accent==='blue')}${accentCard('pink','Rosa',a.accent==='pink')}
                </div></div>
                <div class="cc-settings-v6-section"><div class="cc-settings-v6-section-head"><b>Plano de fundo</b><span>Textura da rede</span></div><div class="cc-bg-grid">
                  ${bgCard('classic','Clássico',a.community_background==='classic')}${bgCard('chessboard','Tabuleiro',a.community_background==='chessboard')}${bgCard('nebula','Nebulosa',a.community_background==='nebula')}${bgCard('sakura','Sakura',a.community_background==='sakura')}${bgCard('stars','Estrelas',a.community_background==='stars')}${bgCard('minimal','Minimalista',a.community_background==='minimal')}
                </div></div>
              </div>
              <div data-settings-pane="privacy"${activeTab==='privacy'?'':' hidden'}>
                <div class="cc-settings-v6-section"><div class="cc-settings-v6-section-head"><b>Privacidade e interação</b><span>Preferências da sua conta social</span></div><div class="cc-settings-v6-privacy">
                  <label class="cc-settings-v6-field wide"><b>Recado da rede</b><small>Uma frase curta para suas áreas sociais.</small><input name="status_message" maxlength="180" value="${esc(a.status_message)}"></label>
                  <label class="cc-settings-v6-field"><b>Mensagens</b><small>Quem pode iniciar conversa.</small><select name="allow_messages"><option value="friends">Somente amigos</option><option value="participants">Todos os participantes</option><option value="none">Ninguém</option></select></label>
                  <div class="cc-settings-v6-toggle"><span><b>Solicitações de amizade</b><small>Permitir novos convites.</small></span><input type="checkbox" name="allow_friend_requests"></div>
                  <div class="cc-settings-v6-toggle"><span><b>Aparecer na rede</b><small>Permitir que participantes encontrem você.</small></span><input type="checkbox" name="community_visible"></div>
                  <div class="cc-settings-v6-toggle"><span><b>Marcações em fotos</b><small>Permitir marcações.</small></span><input type="checkbox" name="allow_tags"></div>
                  <div class="cc-settings-v6-toggle"><span><b>Status online</b><small>Mostrar quando estiver ativo.</small></span><input type="checkbox" name="show_online"></div>
                  <div class="cc-settings-v6-toggle"><span><b>Registrar visitas</b><small>Registrar visitas entre participantes.</small></span><input type="checkbox" name="record_visits"></div>
                  <div class="cc-settings-v6-toggle"><span><b>Mostrar visitantes</b><small>Mostrar visitas recentes.</small></span><input type="checkbox" name="show_visitors"></div>
                </div></div>
              </div>
            </section>
            <aside class="cc-settings-v6-side">
              <div class="cc-settings-v6-side-inner"><div><h3>Prévia da sua rede</h3><p>As mudanças afetam só a rede social.</p></div><div class="cc-settings-v6-preview"><div class="cc-settings-v6-preview-bar"></div><div class="cc-settings-v6-preview-row"><div class="cc-settings-v6-preview-avatar"></div><div class="cc-settings-v6-preview-lines"><i></i><i></i></div></div></div><div class="cc-settings-summary"><div><span>Tema atual</span><b id="ccSettingsThemeLabel">${themeName(a.theme)}</b></div><div><span>Mensagens</span><b id="ccSettingsMessageLabel"></b></div><div><span>Na rede</span><b id="ccSettingsVisibleLabel"></b></div></div></div>
              <div class="cc-settings-v6-actions"><span id="ccSettingsV8Status" class="cc-settings-v6-status"></span><button class="btn gold" type="submit">Salvar configurações</button></div>
            </aside>
          </div>
        </form>
      </div>`;

    const form = $('ccSettingsV8Form');
    form.elements.allow_messages.value = a.allow_messages || 'friends';
    ['allow_friend_requests','community_visible','allow_tags','show_online','record_visits','show_visitors'].forEach(name => { form.elements[name].checked = a[name] !== false; });

    const sync = () => {
      const m = $('ccSettingsMessageLabel');
      const v = $('ccSettingsVisibleLabel');
      if (m) m.textContent = form.elements.allow_messages.value === 'none' ? 'Bloqueadas' : form.elements.allow_messages.value === 'participants' ? 'Participantes' : 'Amigos';
      if (v) v.textContent = form.elements.community_visible.checked ? 'Visível' : 'Oculto';
    };
    sync();

    qa('[data-settings-tab]',panel).forEach(btn => btn.addEventListener('click',() => {
      activeTab = btn.dataset.settingsTab === 'privacy' ? 'privacy' : 'appearance';
      qa('[data-settings-tab]',panel).forEach(x => x.classList.toggle('active',x===btn));
      qa('[data-settings-pane]',panel).forEach(x => x.hidden = x.dataset.settingsPane !== activeTab);
    }));

    qa('input[name="theme"],input[name="accent"],input[name="community_background"]',form).forEach(input => input.addEventListener('change',() => {
      applyAppearance({theme:form.elements.theme.value,accent:form.elements.accent.value,community_background:form.elements.community_background.value},false);
      const label = $('ccSettingsThemeLabel'); if (label) label.textContent = themeName(form.elements.theme.value);
    }));
    form.elements.allow_messages.addEventListener('change',sync);
    form.elements.community_visible.addEventListener('change',sync);

    form.addEventListener('submit',async (event) => {
      event.preventDefault();
      const status = $('ccSettingsV8Status');
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      status.textContent = 'Salvando...';
      const payload = {
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
        community_background:form.elements.community_background.value
      };
      const { data, error } = await db.rpc('cosplay_update_my_social_settings',{p_settings:payload});
      submit.disabled = false;
      if (error) {
        status.textContent = 'Não foi possível salvar agora.';
        status.className = 'cc-settings-v6-status error';
        applyAppearance(current);
        return;
      }
      current = normalize(data || payload);
      applyAppearance(current);
      status.textContent = 'Configurações salvas ✓';
      status.className = 'cc-settings-v6-status success';
      window.dispatchEvent(new CustomEvent('cosplay:social-settings-saved',{detail:{settings:current}}));
    });
  };

  const open = async (trigger, tab) => {
    const panel = activate(trigger,tab);
    if (!panel) return;
    panel.innerHTML = '<div class="cc-loading-inline">Carregando configurações...</div>';
    try {
      const settings = await loadSettings();
      render(panel,settings);
    } catch (error) {
      console.error('Falha ao carregar configurações sociais:',error);
      panel.innerHTML = '<div class="cc-runtime-empty">Não foi possível carregar suas configurações. Sua sessão pode ter expirado. <button type="button" id="ccSettingsRetry" class="btn gold">Tentar novamente</button></div>';
      $('ccSettingsRetry')?.addEventListener('click',() => open(trigger,tab),{once:true});
    }
  };

  document.addEventListener('click',(event) => {
    const trigger = event.target.closest('[data-settings-open], [data-community-view="social-settings"], [data-cc-open-settings]');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const explicit = trigger.dataset.settingsOpen;
    const tab = explicit === 'appearance' || (!explicit && /tema/i.test(trigger.textContent || '')) ? 'appearance' : 'privacy';
    open(trigger,tab);
  },true);

  const init = async () => {
    applyLocal();
    getPanel();
    try { await loadSettings(); } catch {}
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();