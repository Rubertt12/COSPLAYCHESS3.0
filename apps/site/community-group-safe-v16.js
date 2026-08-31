(() => {
  'use strict';
  if (window.__CC_COMMUNITY_GROUP_SAFE_V16__) return;
  window.__CC_COMMUNITY_GROUP_SAFE_V16__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const $ = id => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);
  const state = { ctx:null, loading:null, joinBusy:false, rulesSource:'', rules:[] };

  function toast(message, tone='success') {
    let stack = $('cc14ToastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'cc14ToastStack';
      stack.setAttribute('aria-live','polite');
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
    setTimeout(() => item.remove(), 4200);
  }

  function friendlyError(error) {
    const raw = String(error?.message || error?.details || error || '').toLocaleLowerCase('pt-BR');
    if (raw.includes('acesso bloqueado')) return 'Seu acesso a esta comunidade está bloqueado pela moderação.';
    if (raw.includes('participante não encontrado')) return 'Não encontrei seu perfil de participante. Entre novamente na sua conta.';
    if (raw.includes('comunidade indisponível')) return 'Esta comunidade não está disponível para novas entradas agora.';
    if (raw.includes('jwt') || raw.includes('auth')) return 'Sua sessão expirou. Entre novamente e tente de novo.';
    return 'Não foi possível concluir a ação agora. Tente novamente.';
  }

  async function loadContext(refresh=false) {
    if (!db) throw new Error('Banco indisponível');
    if (refresh) { state.ctx = null; state.loading = null; }
    if (state.ctx) return state.ctx;
    if (state.loading) return state.loading;

    state.loading = (async () => {
      const { data:sessionData, error:sessionError } = await db.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData?.session?.user;
      if (!user) throw new Error('auth session missing');

      const { data:profile, error:profileError } = await db.from('cosplay_participant_profiles')
        .select('id,user_id,display_name,nick')
        .eq('user_id',user.id)
        .neq('registration_status','cancelled')
        .order('created_at',{ascending:false})
        .limit(1)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new Error('participante não encontrado');

      const slug = new URLSearchParams(location.search).get('slug');
      if (!slug) throw new Error('comunidade indisponível');
      const { data:group, error:groupError } = await db.from('cosplay_communities')
        .select('id,name,slug,owner_profile_id,join_policy,visibility,moderation_status')
        .eq('slug',slug)
        .maybeSingle();
      if (groupError) throw groupError;
      if (!group) throw new Error('comunidade indisponível');

      const [memberResult, requestResult] = await Promise.all([
        db.from('cosplay_community_members')
          .select('community_id,profile_id,role,joined_at')
          .eq('community_id',group.id)
          .eq('profile_id',profile.id)
          .maybeSingle(),
        db.from('cosplay_community_join_requests')
          .select('community_id,profile_id,status,created_at,updated_at')
          .eq('community_id',group.id)
          .eq('profile_id',profile.id)
          .maybeSingle()
      ]);
      if (memberResult.error) throw memberResult.error;
      if (requestResult.error) throw requestResult.error;
      state.ctx = { user, profile, group, membership:memberResult.data || null, request:requestResult.data || null };
      return state.ctx;
    })();

    try { return await state.loading; }
    finally { state.loading = null; }
  }

  function ensureJoinStatus() {
    let status = $('cc14JoinStatus');
    if (status) return status;
    const actions = q('.group-side > .group-card:first-child .group-actions');
    if (!actions) return null;
    status = document.createElement('div');
    status.id = 'cc14JoinStatus';
    status.hidden = true;
    actions.insertAdjacentElement('afterend',status);
    return status;
  }

  function setJoinStatus(message='', tone='') {
    const status = ensureJoinStatus();
    if (!status) return;
    if (status.textContent !== message) status.textContent = message;
    if (status.className !== tone) status.className = tone;
    status.hidden = !message;
  }

  function applyJoinState(ctx) {
    const button = $('groupJoinButton');
    if (!button || !ctx || state.joinBusy) return;
    const owner = ctx.group.owner_profile_id === ctx.profile.id;
    const pending = ctx.request?.status === 'pending' && !ctx.membership;
    button.classList.toggle('cc14-pending',pending);

    if (owner) {
      button.textContent = 'Você é o dono';
      button.disabled = true;
      setJoinStatus('','');
      return;
    }
    if (ctx.membership) {
      button.textContent = 'Sair da comunidade';
      button.disabled = false;
      setJoinStatus('Você faz parte desta comunidade.','success');
      return;
    }
    if (pending) {
      button.textContent = 'Solicitação enviada ✓';
      button.disabled = true;
      setJoinStatus('Aguardando aprovação do dono ou de um moderador.','pending');
      return;
    }
    button.disabled = false;
    if (ctx.group.join_policy === 'approval') {
      button.textContent = 'Solicitar entrada';
      setJoinStatus('A entrada precisa ser aprovada pela comunidade.','pending');
    } else {
      button.textContent = 'Entrar na comunidade';
      setJoinStatus('','');
    }
  }

  async function syncOwnerRequests(ctx) {
    const existing = q('.cc14-owner-request-note');
    if (!ctx || ctx.group.owner_profile_id !== ctx.profile.id) { existing?.remove(); return; }
    const { count, error } = await db.from('cosplay_community_join_requests')
      .select('profile_id',{count:'exact',head:true})
      .eq('community_id',ctx.group.id)
      .eq('status','pending');
    if (error) return;
    const total = Number(count || 0);
    if (!total) { existing?.remove(); return; }
    let note = existing;
    if (!note) {
      note = document.createElement('button');
      note.type = 'button';
      note.className = 'cc14-owner-request-note';
      q('.group-side > .group-card:first-child .group-actions')?.insertAdjacentElement('afterend',note);
      note.addEventListener('click',() => $('groupV13Admin')?.scrollIntoView({behavior:'smooth',block:'center'}));
    }
    const text = `${total} ${total === 1 ? 'pedido de entrada aguardando' : 'pedidos de entrada aguardando'}`;
    if (note.dataset.countText !== text) {
      note.dataset.countText = text;
      note.innerHTML = '';
      const a = document.createElement('span'); a.textContent = text;
      const b = document.createElement('span'); b.textContent = '→';
      note.append(a,b);
    }
    $('groupV13Admin')?.classList.add('cc14-has-requests');
  }

  async function handleJoin(button) {
    if (state.joinBusy) return;
    state.joinBusy = true;
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = 'Aguarde…';
    try {
      const ctx = await loadContext(true);
      if (ctx.group.owner_profile_id === ctx.profile.id) return;
      if (ctx.membership) {
        if (!confirm('Sair desta comunidade? Você poderá entrar novamente depois, conforme as regras de acesso.')) return;
        button.textContent = 'Saindo…';
        const { error } = await db.from('cosplay_community_members').delete().eq('community_id',ctx.group.id).eq('profile_id',ctx.profile.id);
        if (error) throw error;
        toast('Você saiu da comunidade.');
        setTimeout(() => location.reload(),450);
        return;
      }
      if (ctx.request?.status === 'pending') {
        toast('Seu pedido já foi enviado e está aguardando aprovação.');
        return;
      }
      button.textContent = ctx.group.join_policy === 'approval' ? 'Enviando pedido…' : 'Entrando…';
      const { data, error } = await db.rpc('cosplay_community_request_join',{p_community:ctx.group.id});
      if (error) throw error;
      if (data === 'pending') {
        ctx.request = {community_id:ctx.group.id,profile_id:ctx.profile.id,status:'pending',updated_at:new Date().toISOString()};
        toast('Pedido enviado. O dono da comunidade foi avisado.');
      } else if (data === 'joined' || data === 'member') {
        toast(data === 'joined' ? 'Você entrou na comunidade.' : 'Você já faz parte desta comunidade.');
        setTimeout(() => location.reload(),450);
      }
    } catch (error) {
      console.error('[CosplayChess community safe v16]',error);
      toast(friendlyError(error),'error');
    } finally {
      state.joinBusy = false;
      if (state.ctx) applyJoinState(state.ctx);
      else { button.disabled = false; button.textContent = oldText; }
    }
  }

  function parseRules(source) {
    const text = String(source || '').replace(/\r/g,'').trim();
    if (!text) return [];
    const rules = [];
    let current = null;
    const push = () => {
      if (!current) return;
      current.body = current.lines.join('\n').trim();
      delete current.lines;
      rules.push(current);
      current = null;
    };
    text.split('\n').forEach(raw => {
      const line = raw.trim();
      const match = line.match(/^(\d+)\s*[.)-]\s*(.+)$/);
      if (match) { push(); current = {number:match[1],title:match[2].trim(),lines:[]}; return; }
      if (!current) current = {number:String(rules.length+1),title:'Regra da comunidade',lines:[]};
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
    modal.innerHTML = '<button type="button" class="cc14-rules-backdrop" aria-label="Fechar regras"></button><section class="cc14-rules-dialog" role="dialog" aria-modal="true" aria-labelledby="cc14RulesTitle"><header class="cc14-rules-dialog-head"><div class="cc14-rules-icon">✦</div><div class="cc14-rules-dialog-title"><span>REGRAS DA COMUNIDADE</span><h2 id="cc14RulesTitle">Leia antes de participar</h2></div><button type="button" class="cc14-rules-close" aria-label="Fechar">×</button></header><div id="cc14RulesList" class="cc14-rules-list"></div><footer class="cc14-rules-dialog-foot"><button type="button" class="btn gold" data-cc14-rules-done>Entendi</button></footer></section>';
    document.body.appendChild(modal);
    const close = () => { modal.hidden = true; document.body.classList.remove('cc14-rules-open'); };
    q('.cc14-rules-backdrop',modal)?.addEventListener('click',close);
    q('.cc14-rules-close',modal)?.addEventListener('click',close);
    q('[data-cc14-rules-done]',modal)?.addEventListener('click',close);
    document.addEventListener('keydown',event => { if (event.key === 'Escape' && !modal.hidden) close(); });
    return modal;
  }

  function openRules() {
    const modal = ensureRulesModal();
    const list = $('cc14RulesList');
    if (!list) return;
    list.replaceChildren();
    state.rules.forEach((rule,index) => {
      const article = document.createElement('article'); article.className='cc14-rule';
      const number = document.createElement('div'); number.className='cc14-rule-number'; number.textContent=rule.number || String(index+1);
      const copy = document.createElement('div'); copy.className='cc14-rule-copy';
      const title = document.createElement('h3'); title.textContent=rule.title || `Regra ${index+1}`; copy.appendChild(title);
      String(rule.body || '').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).forEach(part => {
        const p = document.createElement('p'); p.textContent = part.replace(/\n+/g,' '); copy.appendChild(p);
      });
      article.append(number,copy); list.appendChild(article);
    });
    modal.hidden = false;
    document.body.classList.add('cc14-rules-open');
    setTimeout(() => q('.cc14-rules-close',modal)?.focus(),20);
  }

  function enhanceRulesOnce() {
    const card = $('groupV13Rules');
    if (!card || q('.cc14-rules-launch',card)) return false;
    const original = q('.group-rules-text',card);
    const source = String(original?.textContent || state.rulesSource || '').trim();
    if (!source) return false;
    const rules = parseRules(source);
    if (!rules.length) return false;
    state.rulesSource = source;
    state.rules = rules;
    card.classList.add('cc14-rules-compact');
    card.replaceChildren();

    const summary = document.createElement('div'); summary.className='cc14-rules-summary';
    const head = document.createElement('div'); head.className='cc14-rules-summary-head';
    const icon = document.createElement('div'); icon.className='cc14-rules-icon'; icon.textContent='✦';
    const copy = document.createElement('div'); copy.className='cc14-rules-summary-copy';
    const kicker = document.createElement('span'); kicker.className='kicker'; kicker.textContent='REGRAS';
    const h = document.createElement('h3'); h.textContent='Sobre esta comunidade';
    const p = document.createElement('p'); p.textContent='Regras organizadas para leitura rápida.';
    copy.append(kicker,h,p);
    const count = document.createElement('span'); count.className='cc14-rules-count'; count.textContent=String(rules.length);
    head.append(icon,copy,count);
    const peek = document.createElement('div'); peek.className='cc14-rules-peek';
    rules.slice(0,3).forEach(rule => { const row=document.createElement('span'); row.textContent=`${rule.number}. ${rule.title}`; peek.appendChild(row); });
    const launch = document.createElement('button'); launch.type='button'; launch.className='cc14-rules-launch'; launch.textContent=`Ver ${rules.length} ${rules.length===1?'regra':'regras'} →`; launch.addEventListener('click',openRules);
    summary.append(head,peek,launch); card.appendChild(summary);
    return true;
  }

  function scheduleRulesRefresh() {
    [80,260,700].forEach(ms => setTimeout(enhanceRulesOnce,ms));
  }

  document.addEventListener('click',event => {
    const join = event.target.closest?.('#groupJoinButton');
    if (join) {
      event.preventDefault();
      event.stopImmediatePropagation();
      handleJoin(join);
      return;
    }
    if (event.target.closest?.('#groupV13Admin')) scheduleRulesRefresh();
  },true);

  async function init() {
    scheduleRulesRefresh();
    try {
      const ctx = await loadContext();
      applyJoinState(ctx);
      await syncOwnerRequests(ctx);
      [220,650,1300].forEach(ms => setTimeout(() => { if (state.ctx) applyJoinState(state.ctx); },ms));
    } catch (error) {
      console.warn('[CosplayChess community safe v16]',error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
