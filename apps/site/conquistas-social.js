(() => {
  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const $ = id => document.getElementById(id);
  const state = { target:null, awards:[], catalog:[], filter:'all' };
  const slug = String(new URLSearchParams(location.search).get('slug') || '').trim();

  const safeUrl = raw => {
    try {
      const url = new URL(String(raw || ''));
      return ['http:','https:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  };

  const fmt = value => {
    try {
      return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value));
    } catch {
      return '';
    }
  };

  const tier = value => String(value || 'bronze').toLowerCase().replace(/[^a-z0-9_-]/g,'');
  const ownerName = () => state.target?.display_name || state.target?.nick || 'Participante';
  const firstRow = data => Array.isArray(data) ? (data[0] || null) : (data || null);
  const normalizeProfile = row => row ? { ...row, id:row.profile_id || row.id } : null;

  const setState = name => {
    $('achievementsAuth').hidden = name !== 'auth';
    $('achievementsUnavailable').hidden = name !== 'unavailable';
    $('achievementsContent').hidden = name !== 'content';
  };

  const applyAppearance = async () => {
    try {
      const { data } = await db.rpc('cosplay_my_social_settings');
      if (data?.theme === 'white-mode') document.body.classList.add('theme-white-mode');
    } catch (_) {}
  };

  const resolveOwnProfileFallback = async user => {
    const { data, error } = await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url,cover_photo_url')
      .eq('user_id', user.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return normalizeProfile(data);
  };

  const resolveTarget = async user => {
    if (slug) {
      const { data, error } = await db.rpc('cosplay_community_profile_by_slug',{ p_slug:slug });
      if (error) {
        console.warn('[CosplayChess] Falha ao resolver perfil social por slug:', error);
        return null;
      }
      return normalizeProfile(firstRow(data));
    }

    const { data, error } = await db.rpc('cosplay_my_achievement_profile');
    if (!error) {
      const own = normalizeProfile(firstRow(data));
      if (own?.id) return own;
    } else {
      console.warn('[CosplayChess] Falha ao resolver perfil próprio de conquistas:', error);
    }

    return resolveOwnProfileFallback(user);
  };

  const loadData = async () => {
    const [awardsResult,catalogResult] = await Promise.all([
      db.rpc('cosplay_community_profile_achievements',{ p_profile_id:state.target.id }),
      db.from('cosplay_achievements')
        .select('id,slug,title,description,icon,tier,criteria_text,sort_order,published')
        .eq('published',true)
        .order('sort_order',{ascending:true})
        .order('title',{ascending:true})
    ]);

    if (awardsResult.error) throw awardsResult.error;
    state.awards = Array.isArray(awardsResult.data) ? awardsResult.data : [];
    state.catalog = catalogResult.error ? [] : (catalogResult.data || []);
  };

  const groupedAwards = () => {
    const map = new Map();
    state.awards.forEach(award => {
      const key = award.achievement_id;
      if (!key) return;
      const current = map.get(key) || { count:0, latest:null, events:new Set(), award };
      current.count += 1;
      if (award.event_title) current.events.add(award.event_title);
      if (!current.latest || new Date(award.awarded_at) > new Date(current.latest.awarded_at)) current.latest = award;
      current.award = current.latest || award;
      map.set(key,current);
    });
    return map;
  };

  const paintHero = () => {
    $('achievementOwnerName').textContent = ownerName();
    $('achievementOwnerCharacter').textContent = state.target?.character_name
      ? `${state.target.character_name} · histórico de troféus em partidas oficiais do CosplayChess.`
      : 'Histórico de troféus desbloqueados em partidas oficiais do CosplayChess.';

    const avatar = $('achievementOwnerAvatar');
    avatar.replaceChildren();
    const src = safeUrl(state.target?.character_photo_url);
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `Foto de ${ownerName()}`;
      avatar.appendChild(img);
    } else {
      avatar.textContent = '♕';
    }
  };

  const updateProgress = grouped => {
    const total = state.catalog.length;
    const unlocked = [...grouped.keys()].filter(id => state.catalog.some(item => item.id === id)).length;
    const percent = total ? Math.round((unlocked / total) * 100) : 0;

    $('achievementProgressText').textContent = `${unlocked} de ${total}`;
    $('achievementProgressPercent').textContent = `${percent}% da coleção`;
    $('achievementProgressBar').style.width = `${percent}%`;
    $('achievementAwardCount').textContent = `${state.awards.length} desbloqueio${state.awards.length === 1 ? '' : 's'}`;

    const events = new Set(state.awards.map(award => award.event_id).filter(Boolean));
    $('achievementEventCount').textContent = `${events.size} evento${events.size === 1 ? '' : 's'}`;
  };

  const shareAchievement = async definition => {
    const href = new URL(location.href);
    href.search = slug ? `?slug=${encodeURIComponent(slug)}` : '';
    const text = `${ownerName()} desbloqueou “${definition.title}” no CosplayChess! ${definition.icon || '🏆'}`;
    try {
      if (navigator.share) {
        await navigator.share({ title:`${definition.title} — CosplayChess`, text, url:href.href });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${href.href}`);
      alert('Conquista copiada para compartilhar.');
    } catch (_) {}
  };

  const makeCard = (definition, grouped) => {
    const unlock = grouped.get(definition.id) || null;
    const latest = unlock?.latest || unlock?.award || null;
    const unlocked = !!unlock;

    const card = document.createElement('article');
    card.className = `social-achievement-card${unlocked ? ' unlocked' : ' locked'}`;
    card.dataset.tier = tier(definition.tier);
    card.dataset.state = unlocked ? 'unlocked' : 'locked';

    const top = document.createElement('div');
    top.className = 'social-achievement-card-top';
    const icon = document.createElement('div');
    icon.className = 'social-achievement-card-icon';
    icon.textContent = unlocked ? (definition.icon || '🏆') : '◇';
    const badge = document.createElement('span');
    badge.className = 'social-achievement-badge';
    badge.textContent = unlocked ? String(definition.tier || 'bronze').toUpperCase() : 'BLOQUEADA';
    top.append(icon,badge);

    const title = document.createElement('h2');
    title.textContent = definition.title || 'Conquista';

    const copy = document.createElement('div');
    const description = document.createElement('p');
    description.textContent = definition.description || 'Conquista do CosplayChess.';
    copy.appendChild(description);
    if (definition.criteria_text) {
      const criteria = document.createElement('p');
      criteria.className = 'criteria';
      criteria.textContent = `Como desbloquear: ${definition.criteria_text}`;
      copy.appendChild(criteria);
    }

    const meta = document.createElement('div');
    meta.className = 'social-achievement-meta';
    if (unlocked) {
      const when = document.createElement('b');
      when.textContent = `✓ Desbloqueada${unlock.count > 1 ? ` ${unlock.count}x` : ''}`;
      const detail = document.createElement('span');
      const eventNames = [...unlock.events];
      detail.textContent = [latest?.event_title || eventNames[0] || '',fmt(latest?.awarded_at),latest?.character_name || ''].filter(Boolean).join(' · ');
      meta.append(when,detail);
      if (latest?.note && latest.note !== definition.description) {
        const note = document.createElement('span');
        note.textContent = latest.note;
        meta.appendChild(note);
      }
    } else {
      const locked = document.createElement('b');
      locked.textContent = 'Ainda não desbloqueada';
      const hint = document.createElement('span');
      hint.textContent = 'Continue participando de partidas oficiais para completar a coleção.';
      meta.append(locked,hint);
    }

    card.append(top,title,copy,meta);
    if (unlocked) {
      const actions = document.createElement('div');
      actions.className = 'social-achievement-actions';
      const share = document.createElement('button');
      share.type = 'button';
      share.textContent = '↗ COMPARTILHAR';
      share.addEventListener('click',() => shareAchievement(definition));
      actions.appendChild(share);
      card.appendChild(actions);
    }

    return card;
  };

  const render = () => {
    const grouped = groupedAwards();
    updateProgress(grouped);

    const root = $('socialAchievementsGrid');
    root.replaceChildren();

    let definitions = state.catalog.slice();
    if (state.filter === 'unlocked') definitions = definitions.filter(item => grouped.has(item.id));
    if (state.filter === 'locked') definitions = definitions.filter(item => !grouped.has(item.id));

    if (!definitions.length) {
      root.innerHTML = '<div class="social-achievements-empty">Nenhuma conquista nesta categoria.</div>';
      return;
    }

    definitions.forEach(definition => root.appendChild(makeCard(definition,grouped)));
  };

  const bindFilters = () => {
    document.querySelectorAll('[data-achievement-filter]').forEach(button => {
      button.addEventListener('click',() => {
        state.filter = button.dataset.achievementFilter || 'all';
        document.querySelectorAll('[data-achievement-filter]').forEach(item => item.classList.toggle('active',item === button));
        render();
      });
    });
  };

  const init = async () => {
    await applyAppearance();

    const { data:sessionData, error:sessionError } = await db.auth.getSession();
    if (sessionError) console.warn('[CosplayChess] Falha ao recuperar sessão de participante:', sessionError);
    const user = sessionData?.session?.user;
    if (!user) {
      setState('auth');
      return;
    }

    state.target = await resolveTarget(user);
    if (!state.target?.id) {
      setState('unavailable');
      return;
    }

    try {
      await loadData();
    } catch (error) {
      console.warn('[CosplayChess] Falha ao carregar coleção social:', error);
      setState('unavailable');
      return;
    }

    paintHero();
    bindFilters();
    render();
    setState('content');
  };

  init().catch(error => {
    console.warn('[CosplayChess] Falha ao iniciar conquistas sociais:', error);
    setState('unavailable');
  });
})();
