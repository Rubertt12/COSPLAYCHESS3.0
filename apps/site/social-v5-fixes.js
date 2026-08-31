(() => {
  'use strict';
  if (window.__CC_SOCIAL_V5_FIXES__) return;
  window.__CC_SOCIAL_V5_FIXES__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const $ = (id) => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);

  const loadStyle = (href) => {
    if (document.querySelector(`link[href^="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${href}?v=20260831-2`;
    document.head.appendChild(link);
  };

  const loadScript = (src) => {
    if (document.querySelector(`script[src^="${src}"]`)) return Promise.resolve();
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `${src}?v=20260831-2`;
      script.async = true;
      script.onload = resolve;
      script.onerror = resolve;
      document.body.appendChild(script);
    });
  };

  const loadUnifiedProfile = () => {
    loadStyle('./social-network-v6.css');
    loadStyle('./social-photo-lightbox.css');
    loadStyle('./social-community-create-v1.css');
    return Promise.all([
      loadScript('./cosplay-profile-only.js'),
      loadScript('./social-profile-card-cover.js'),
      loadScript('./social-photo-lightbox.js'),
      loadScript('./social-community-create-v1.js')
    ]);
  };

  const openStaticView = (name) => q(`.community-nav [data-community-view="${name}"]`)?.click();

  const openComposer = () => {
    const field = $('communityPostBody');
    if (!field) return;
    const feedButton = q('.community-nav [data-community-view="feed"]');
    feedButton?.click();

    // Fallback caso algum módulo de navegação ainda não tenha terminado de inicializar.
    document.querySelectorAll('[data-community-panel]').forEach((panel) => {
      const active = panel.dataset.communityPanel === 'feed';
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    document.querySelectorAll('[data-community-view]').forEach((item) => {
      if (item.matches('.community-nav [data-community-view]')) {
        item.classList.toggle('active', item.dataset.communityView === 'feed');
      }
    });

    if (location.hash) history.replaceState(null, '', `${location.pathname}${location.search}`);
    const composer = field.closest('.community-composer');
    composer?.classList.add('cc-composer-attention');
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      field.focus({ preventScroll: true });
      composer?.classList.remove('cc-composer-attention');
    }, 220);
  };

  document.addEventListener('click', (event) => {
    const createPost = event.target.closest('#ccCreatePost');
    if (createPost) {
      event.preventDefault();
      openComposer();
      return;
    }

    const agenda = event.target.closest('.cc-event-post [data-community-view="events"]');
    if (agenda) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setTimeout(() => openStaticView('events'), 0);
      return;
    }

    const allStories = event.target.closest('#ccStoriesAll');
    if (allStories) {
      event.preventDefault();
      const first = q('#ccStories [data-cc-story-index]') || q('#ccStories [data-cc-story-add]');
      first?.click();
      return;
    }

    if (event.target.closest('[data-cc-open-settings]')) {
      document.body.dataset.ccView = 'social-settings';
      return;
    }

    const photoLabel = event.target.closest('label.community-file-btn');
    if (photoLabel?.querySelector('#communityPostImage')) {
      const active = q('[data-cc-rich-action].active');
      if (active) active.click();
    }
  }, true);

  const getOwnProfile = async () => {
    if (!db) return null;
    const { data: auth } = await db.auth.getSession();
    const userId = auth?.session?.user?.id;
    if (!userId) return null;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,public_slug')
      .eq('user_id', userId)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    return data || null;
  };

  const renderRealAchievements = async () => {
    const card = $('ccAchievementsCard');
    if (!card || !db) return;
    const root = q('.cc-achievements', card);
    if (!root) return;
    const profile = await getOwnProfile();
    if (!profile) return;

    const [{ data: awards, error: awardError }, { data: catalog, error: catalogError }] = await Promise.all([
      db.rpc('cosplay_community_profile_achievements',{ p_profile_id:profile.id }),
      db.from('cosplay_achievements').select('id,title,icon,tier,published').eq('published',true).order('sort_order',{ascending:true}).limit(50)
    ]);
    if (awardError || catalogError) return;

    const definitions = new Map((catalog || []).map((item) => [item.id,item]));
    const grouped = new Map();
    (awards || []).forEach((award) => {
      if (!award.achievement_id) return;
      const current = grouped.get(award.achievement_id);
      if (!current || new Date(award.awarded_at || 0) > new Date(current.awarded_at || 0)) grouped.set(award.achievement_id,award);
    });

    const unlocked = [...grouped.entries()]
      .map(([id,award]) => ({ definition:definitions.get(id), award }))
      .filter((row) => row.definition)
      .sort((a,b) => new Date(b.award.awarded_at || 0) - new Date(a.award.awarded_at || 0))
      .slice(0,3);

    root.replaceChildren();
    if (!unlocked.length) {
      const empty = document.createElement('div');
      empty.className = 'community-empty';
      empty.textContent = 'Suas conquistas desbloqueadas aparecerão aqui.';
      root.appendChild(empty);
      return;
    }

    unlocked.forEach(({definition}) => {
      const item = document.createElement('div');
      item.className = 'cc-ach';
      const badge = document.createElement('div');
      badge.className = 'cc-ach-badge';
      badge.textContent = definition.icon || '🏆';
      const title = document.createElement('span');
      title.textContent = definition.title || 'Conquista';
      const marker = document.createElement('i');
      item.append(badge,title,marker);
      root.appendChild(item);
    });
  };

  const init = () => {
    loadUnifiedProfile().catch(() => {});
    renderRealAchievements().catch(() => {});
    window.addEventListener('focus', () => renderRealAchievements().catch(() => {}), { passive:true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();