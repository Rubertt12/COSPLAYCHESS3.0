(() => {
  'use strict';
  if (window.__CC_COMMUNITY_GROUP_UX_V14__) return;
  window.__CC_COMMUNITY_GROUP_UX_V14__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const $ = id => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);
  const state = {
    ctx: null,
    ctxPromise: null,
    joinBusy: false,
    rulesSource: '',
    rules: [],
    ruleObserver: null,
    ruleTimer: 0
  };

  function toast(message, tone = 'success') {
    let stack = $('cc14ToastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'cc14ToastStack';
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const item = document.createElement('div');
    item.className = `cc14-toast ${tone}`;
    const icon = document.createElement('i');
    icon.textContent = tone === 'error' ? '!' : '✓';
    const copy = document.createElement('span');
    copy.textContent = message;
    item.append(icon, copy);
    stack.appendChild(item);
    while (stack.children.length > 3) stack.firstElementChild?.remove();
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(-6px)';
      item.style.transition = 'opacity .18s ease, transform .18s ease';
      setTimeout(() => item.remove(), 200);
    }, 4200);
  }

  function formatError(error) {
    const raw = String(error?.message || error?.details || error || '').toLocaleLowerCase('pt-BR');
    if (raw.includes('acesso bloqueado')) return 'Seu acesso a esta comunidade está bloqueado pela moderação.';
    if (raw.includes('participante não encontrado')) return 'Não encontrei seu perfil de participante. Entre novamente na sua conta.';
    if (raw.includes('comunidade indisponível')) return 'Esta comunidade não está disponível para novas entradas agora.';
    if (raw.includes('jwt') || raw.includes('auth')) return 'Sua sessão expirou. Entre novamente e tente de novo.';
    return 'Não foi possível concluir a ação agora. Tente novamente em alguns instantes.';
  }

  async function loadContext(refresh = false) {
    if (!db) throw new Error('Banco de participantes indisponível');
    if (refresh) {
      state.ctx = null;
      state.ctxPromise = null;
    }
    if (state.ctx) return state.ctx;
    if (state.ctxPromise) return state.ctxPromise;

    state.ctxPromise = (async () => {
      const { data: sessionData, error: sessionError } = await db.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData?.session?.user;
      if (!user) throw new Error('auth session missing');

      const { data: profile, error: profileError } = await db.from('cosplay_participant_profiles')
        .select('id,user_id,display_name,nick')
        .eq('user_id', user.id)
        .neq('registration_status', 'cancelled')
        .order('created_at', { ascending:false })
        .limit(1)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new Error('participante não encontrado');

      const slug = new URLSearchParams(location.search).get('slug');
      if (!slug) throw new Error('comunidade indisponível');
      const { data: group, error: groupError } = await db.from('cosplay_communities')
        .select('id,name,slug,owner_profile_id,join_policy,visibility,moderation_status')
        .eq('slug', slug)
        .maybeSingle();
      if (groupError) throw groupError;
      if (!group) throw new Error('comunidade indisponível');

      const [memberResult, requestResult] = await Promise.all([
        db.from('cosplay_community_members')
          .select('community_id,profile_id,role,joined_at')
          .eq('community_id', group.id)
          .eq('profile_id', profile.id)
          .maybeSingle(),
        db.from('cosplay_community_join_requests')
          .select('community_id,profile_id,status,created_at,updated_at')
          .eq('community_id', group.id)
          .eq('profile_id', profile.id)
          .maybeSingle()
      ]);
      if (memberResult.error) throw memberResult.error;
      if (requestResult.error) throw requestResult.error;

      state.ctx = {
        user,
        profile,
        group,
        membership: memberResult.data || null,
        request: requestResult.data || null
      };
      return state.ctx;
    })();

    try {
      return await state.ctxPromise;
    } finally {
      state.ctxPromise = null;
    }
  }

  function ensureJoinStatus() {
    let status = $('cc14JoinStatus');
    if (status) return status;
    const actions = q('.group-side > .group-card:first-child .group-actions');
    if (!actions) return null;
    status = document.createElement('div');
    status.id = 'cc14JoinStatus';
    status.hidden = true;
    actions.insertAdjacentElement('afterend', status);
    return status;
  }

  function setJoinStatus(message = '', tone = '') {
    const status = ensureJoinStatus();
    if (!status) return;
    status.textContent = message;
    status.className = tone || '';
    status.hidden = !message;
  }

  function applyJoinState(ctx) {
    const button = $('groupJoinButton');
    if (!button || !ctx || state.joinBusy) return;
    const isOwner = ctx.group.owner_profile_id === ctx.profile.id;
    const pending = ctx.request?.status === 'pending' && !ctx.membership;
    button.dataset.cc14Managed = '1';
    button.classList.toggle('cc14-pending', pending);

    if (isOwner) {
      if (button.textContent !== 'Você é o dono') button.textContent = 'Você é o dono';
      button.disabled = true;
      setJoinStatus('', '');
      return;
    }
    if (ctx.membership) {
      if (button.textContent !== 'Sair da comunidade') button.textContent = 'Sair da comunidade';
      button.disabled = false;
      setJoinStatus('Você faz parte desta comunidade.', 'success');
      return;
    }
    if (pending) {
      if (button.textContent !== 'Solicitação enviada ✓') button.textContent = 'Solicitação enviada ✓';
      button.disabled = true;
      setJoinStatus('Aguardando aprovação do dono ou de um moderador.', 'pending');
      return;
    }
    button.disabled = false;
    if (ctx.group.join_policy === 'approval') {
      if (button.textContent !== 'Solicitar entrada') button.textContent = 'Solicitar entrada';
      setJoinStatus('A entrada precisa ser aprovada pela comunidade.', 'pending');
    } else {
      if (button.textContent !== 'Entrar na comunidade') button.textContent = 'Entrar na comunidade';
      setJoinStatus('', '');
    }
  }

  async function syncOwnerRequests(ctx) {
    const old = q('.cc14-owner-request-note');
    if (!ctx || ctx.group.owner_profile_id !== ctx.profile.id) {
      old?.remove();
      return;
    }
    const { count, error } = await db.from('cosplay_community_join_requests')
      .select('profile_id', { count:'exact', head:true })
      .eq('community_id', ctx.group.id)
      .eq('status', 'pending');
    if (error) return;
    const total = Number(count || 0);
    if (!total) {
      old?.remove();
      return;
    }
    let note = old;
    if (!note) {
      note = document.createElement('button');
      note.type = 'button';
      note.className = 'cc14-owner-request-note';
      const actions = q('.group-side > .group-card:first-child .group-actions');
      actions?.insertAdjacentElement('afterend', note);
      note.addEventListener('click', () => {
        const admin = $('groupV13Admin');
        if (admin) admin.scrollIntoView({ behavior:'smooth', block:'center' });
      });
    }
    if (note) {
      note.replaceChildren();
      const text = document.createElement('span');
      text.textContent = `${total} ${total === 1 ? 'pedido de entrada aguardando' : 'pedidos de entrada aguardando'}`;
      const arrow = document.createElement('span');
      arrow.textContent = '→';
      note.append(text, arrow);
    }
    setTimeout(() => $('groupV13Admin')?.classList.add('cc14-has-requests'), 250);
  }

  async function handleJoin(button) {
    if (state.joinBusy) return;
    state.joinBusy = true;
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = 'Aguarde…';
    try {
      const ctx = await loadContext(true);
      if (ctx.group.owner_profile_id === ctx.profile.id) {
        applyJoinState(ctx);
        return;
      }

      if (ctx.membership) {
        if (!confirm('Sair desta comunidade? Você poderá entrar novamente depois, conforme as regras de acesso.')) return;
        button.textContent = 'Saindo…';
        const { error } = await db.from('cosplay_community_members')
          .delete()
          .eq('community_id', ctx.group.id)
          .eq('profile_id', ctx.profile.id);
        if (error) throw error;
        ctx.membership = null;
        ctx.request = null;
        toast('Você saiu da comunidade.');
        setTimeout(() => location.reload(), 650);
        return;
      }

      if (ctx.request?.status === 'pending') {
        toast('Seu pedido já foi enviado e está aguardando aprovação.');
        return;
      }

      button.textContent = ctx.group.join_policy === 'approval' ? 'Enviando pedido…' : 'Entrando…';
      const { data, error } = await db.rpc('cosplay_community_request_join', { p_community:ctx.group.id });
      if (error) throw error;

      if (data === 'pending') {
        ctx.request = {
          community_id:ctx.group.id,
          profile_id:ctx.profile.id,
          status:'pending',
          updated_at:new Date().toISOString()
        };
        toast('Pedido enviado. O dono da comunidade foi avisado.');
      } else if (data === 'joined' || data === 'member') {
        toast(data === 'joined' ? 'Você entrou na comunidade.' : 'Você já faz parte desta comunidade.');
        setTimeout(() => location.reload(), 650);
      } else {
        toast('Solicitação atualizada.');
      }
    } catch (error) {
      console.error('[CosplayChess community join]', error);
      toast(formatError(error), 'error');
    } finally {
      state.joinBusy = false;
      const ctx = state.ctx;
      if (ctx) applyJoinState(ctx);
      else {
        button.disabled = false;
        button.textContent = oldText;
      }
    }
  }

  function parseRules(source) {
    const text = String(source || '').replace(/\r/g, '').trim();
    if (!text) return [];
    const lines = text.split('\n');
    const rules = [];
    let current = null;
    const push = () => {
      if (!current) return;
      current.body = current.lines.join('\n').trim();
      delete current.lines;
      rules.push(current);
      current = null;
    };
    lines.forEach(raw => {
      const line = raw.trim();
      const match = line.match(/^(\d+)\s*[.)-]\s*(.+)$/);
      if (match) {
        push();
        current = { number:match[1], title:match[2].trim(), lines:[] };
        return;
      }
      if (!current) current = { number:String(rules.length + 1), title:'Regra da comunidade', lines:[] };
      current.lines.push(raw);
    });
    push();
    return rules.filter(rule => rule.title || rule.body);
  }

  function ensureRulesModal() {
    let modal = $('cc14RulesModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'cc14RulesModal';
    modal.className = 'cc14-rules-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'cc14RulesTitle');

    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'cc14-rules-backdrop';
    backdrop.setAttribute('aria-label', 'Fechar regras');

    const dialog = document.createElement('section');
    dialog.className = 'cc14-rules-dialog';
    const head = document.createElement('header');
    head.className = 'cc14-rules-dialog-head';
    const icon = document.createElement('div');
    icon.className = 'cc14-rules-icon';
    icon.textContent = '✦';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'cc14-rules-dialog-title';
    const kicker = document.createElement('span');
    kicker.textContent = 'REGRAS DA COMUNIDADE';
    const title = document.createElement('h2');
    title.id = 'cc14RulesTitle';
    title.textContent = 'Leia antes de participar';
    titleWrap.append(kicker, title);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'cc14-rules-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Fechar');
    head.append(icon, titleWrap, close);

    const list = document.createElement('div');
    list.id = 'cc14RulesList';
    list.className = 'cc14-rules-list';
    const foot = document.createElement('footer');
    foot.className = 'cc14-rules-dialog-foot';
    const done = document.createElement('button');
    done.type = 'button';
    done.className = 'btn gold';
    done.textContent = 'Entendi';
    foot.appendChild(done);
    dialog.append(head, list, foot);
    modal.append(backdrop, dialog);
    document.body.appendChild(modal);

    const closeModal = () => {
      modal.hidden = true;
      document.body.classList.remove('cc14-rules-open');
    };
    backdrop.addEventListener('click', closeModal);
    close.addEventListener('click', closeModal);
    done.addEventListener('click', closeModal);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !modal.hidden) closeModal();
    });
    return modal;
  }

  function renderRulesModal(rules) {
    const modal = ensureRulesModal();
    const list = $('cc14RulesList');
    if (!list) return modal;
    list.replaceChildren();
    rules.forEach((rule, index) => {
      const article = document.createElement('article');
      article.className = 'cc14-rule';
      const number = document.createElement('div');
      number.className = 'cc14-rule-number';
      number.textContent = rule.number || String(index + 1);
      const copy = document.createElement('div');
      copy.className = 'cc14-rule-copy';
      const title = document.createElement('h3');
      title.textContent = rule.title || `Regra ${index + 1}`;
      copy.appendChild(title);
      const parts = String(rule.body || '').split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
      if (!parts.length && rule.body) parts.push(rule.body);
      parts.forEach(part => {
        const p = document.createElement('p');
        p.textContent = part.replace(/\n+/g, ' ');
        copy.appendChild(p);
      });
      article.append(number, copy);
      list.appendChild(article);
    });
    return modal;
  }

  function openRules() {
    const modal = renderRulesModal(state.rules);
    modal.hidden = false;
    document.body.classList.add('cc14-rules-open');
    setTimeout(() => q('.cc14-rules-close', modal)?.focus(), 20);
  }

  function enhanceRules() {
    const card = $('groupV13Rules');
    if (!card) return;
    if (q('.cc14-rules-launch', card)) return;
    const original = q('.group-rules-text', card);
    const source = String(original?.textContent || state.rulesSource || '').trim();
    if (!source) return;
    const rules = parseRules(source);
    if (!rules.length) return;
    state.rulesSource = source;
    state.rules = rules;

    card.classList.add('cc14-rules-compact');
    card.replaceChildren();
    const summary = document.createElement('div');
    summary.className = 'cc14-rules-summary';
    const head = document.createElement('div');
    head.className = 'cc14-rules-summary-head';
    const icon = document.createElement('div');
    icon.className = 'cc14-rules-icon';
    icon.textContent = '✦';
    const copy = document.createElement('div');
    copy.className = 'cc14-rules-summary-copy';
    const kicker = document.createElement('span');
    kicker.className = 'kicker';
    kicker.textContent = 'REGRAS';
    const title = document.createElement('h3');
    title.textContent = 'Sobre esta comunidade';
    const desc = document.createElement('p');
    desc.textContent = 'Regras organizadas para leitura rápida.';
    copy.append(kicker, title, desc);
    const count = document.createElement('span');
    count.className = 'cc14-rules-count';
    count.textContent = String(rules.length);
    head.append(icon, copy, count);

    const peek = document.createElement('div');
    peek.className = 'cc14-rules-peek';
    rules.slice(0, 3).forEach(rule => {
      const row = document.createElement('span');
      row.textContent = `${rule.number}. ${rule.title}`;
      peek.appendChild(row);
    });

    const launch = document.createElement('button');
    launch.type = 'button';
    launch.className = 'cc14-rules-launch';
    launch.textContent = `Ver ${rules.length} ${rules.length === 1 ? 'regra' : 'regras'} →`;
    launch.addEventListener('click', openRules);
    summary.append(head, peek, launch);
    card.appendChild(summary);
  }

  function scheduleEnhanceRules() {
    clearTimeout(state.ruleTimer);
    state.ruleTimer = setTimeout(enhanceRules, 30);
  }

  function watchRules() {
    const root = $('groupContent');
    if (!root || state.ruleObserver) return;
    state.ruleObserver = new MutationObserver(scheduleEnhanceRules);
    state.ruleObserver.observe(root, { childList:true, subtree:true });
    enhanceRules();
  }

  function keepJoinStateStable() {
    const button = $('groupJoinButton');
    if (!button) return;
    const observer = new MutationObserver(() => {
      if (state.ctx && !state.joinBusy) applyJoinState(state.ctx);
    });
    observer.observe(button, { childList:true, attributes:true, attributeFilter:['disabled','class'] });
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#groupJoinButton');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handleJoin(button);
  }, true);

  async function init() {
    watchRules();
    keepJoinStateStable();
    try {
      const ctx = await loadContext();
      applyJoinState(ctx);
      await syncOwnerRequests(ctx);
    } catch (error) {
      console.warn('[CosplayChess community UX]', error);
    }
    [250, 700, 1400].forEach(ms => setTimeout(() => {
      enhanceRules();
      if (state.ctx) {
        applyJoinState(state.ctx);
        syncOwnerRequests(state.ctx);
      }
    }, ms));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
