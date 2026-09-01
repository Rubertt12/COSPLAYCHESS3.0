(() => {
  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const $ = (id) => document.getElementById(id);
  if (!db) return;

  let premiumProfiles = [];
  let activePremiumProfile = null;
  let refreshTimer = 0;

  const setText = (id, value, fallback = '—') => {
    const el = $(id);
    if (el) el.textContent = value || fallback;
  };

  const syncHeroPhoto = () => {
    const source = $('participantPhotoPreview')?.querySelector('img');
    const avatar = $('participantHeroAvatar');
    const backdrop = $('participantHeroBackdrop');
    if (!avatar || !backdrop) return;
    avatar.replaceChildren();
    if (source?.src) {
      const img = document.createElement('img');
      img.src = source.src;
      img.alt = '';
      avatar.appendChild(img);
      backdrop.style.backgroundImage = `url("${source.src.replace(/"/g, '%22')}")`;
    } else {
      avatar.textContent = '♜';
      backdrop.style.backgroundImage = '';
    }
  };

  const syncIdentityFromForm = () => {
    const form = $('participantProfileForm');
    if (!form) return;
    const displayName = String(form.elements.namedItem('display_name')?.value || $('participantName')?.textContent || 'Participante').trim();
    const character = String(form.elements.namedItem('character_name')?.value || '').trim();
    const greeting = $('participantGreeting');
    if (greeting) greeting.innerHTML = `Olá, <strong>${displayName || 'Participante'}</strong>`;
    setText('participantHeroCharacter', character, 'Personagem');
  };

  const selectedProfileId = () => {
    const picker = $('participantProfilePicker');
    return picker?.value || activePremiumProfile?.id || premiumProfiles[0]?.id || '';
  };

  const renderLatestPost = (post) => {
    const box = $('participantLatestPost');
    if (!box) return;
    box.replaceChildren();
    if (!post) {
      const div = document.createElement('div');
      div.innerHTML = '<b>Nenhuma publicação ainda.</b><br><span>Mostre seu trabalho e inspire a comunidade!</span>';
      box.appendChild(div);
      return;
    }
    const wrap = document.createElement('div');
    const title = document.createElement('b');
    title.textContent = post.image_path ? 'Sua publicação mais recente com foto' : 'Sua publicação mais recente';
    const copy = document.createElement('span');
    const body = String(post.body || '').trim();
    copy.textContent = body ? (body.length > 105 ? `${body.slice(0,105)}…` : body) : 'Foto compartilhada na comunidade.';
    wrap.append(title, document.createElement('br'), copy);
    box.appendChild(wrap);
  };

  const loadSocialSummary = async (profileId) => {
    if (!profileId) return;
    try {
      const [friendResult, postResult] = await Promise.all([
        db.from('cosplay_friendships')
          .select('id,status,requester_profile_id,addressee_profile_id')
          .or(`requester_profile_id.eq.${profileId},addressee_profile_id.eq.${profileId}`),
        db.from('cosplay_social_posts')
          .select('id,body,image_path,created_at')
          .eq('author_profile_id', profileId)
          .order('created_at', { ascending:false })
          .limit(1)
      ]);
      const friendships = friendResult.data || [];
      const accepted = friendships.filter((item) => item.status === 'accepted').length;
      const pending = friendships.filter((item) => item.status === 'pending').length;
      setText('participantFriendCount', String(accepted), '0');
      setText('participantFriendPending', pending ? `${pending} solicitação${pending === 1 ? '' : 'ões'} pendente${pending === 1 ? '' : 's'}` : 'Nenhuma solicitação pendente');
      renderLatestPost(postResult.data?.[0] || null);
    } catch {
      setText('participantFriendCount', '0', '0');
      setText('participantFriendPending', 'Abra a comunidade para ver seus amigos');
      renderLatestPost(null);
    }
  };

  const loadPremiumData = async () => {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(async () => {
      const { data: sessionData } = await db.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) return;
      const { data: rows, error } = await db
        .from('cosplay_participant_profiles')
        .select('id,event_id,display_name,nick,character_name,character_photo_url,profile_visible,registration_status')
        .eq('user_id', user.id)
        .neq('registration_status','cancelled')
        .order('created_at',{ ascending:false });
      if (error || !rows?.length) return;
      premiumProfiles = rows;
      const targetId = selectedProfileId();
      activePremiumProfile = rows.find((row) => row.id === targetId) || rows[0];
      setText('participantProgressEvents', String(rows.length), '0');
      if (activePremiumProfile?.event_id) {
        const { data: event } = await db.from('cosplay_events').select('title').eq('id',activePremiumProfile.event_id).maybeSingle();
        setText('participantHeroEvent', event?.title, 'Evento CosplayChess');
      }
      setText('participantHeroCharacter', activePremiumProfile.character_name, 'Personagem');
      await loadSocialSummary(activePremiumProfile.id);
      syncIdentityFromForm();
      syncHeroPhoto();
    }, 180);
  };

  const bind = () => {
    const profileForm = $('participantProfileForm');
    const aboutField = profileForm?.elements.namedItem('bio');
    if (aboutField) {
      const label = aboutField.closest('label');
      const title = label?.querySelector(':scope > span');
      if (title) title.textContent = 'Sobre mim';
      aboutField.placeholder = 'Conte sobre você, sua história com cosplay, personagens favoritos e o que quiser mostrar no seu perfil...';
    }
    profileForm?.elements.namedItem('display_name')?.addEventListener('input', syncIdentityFromForm);
    profileForm?.elements.namedItem('character_name')?.addEventListener('input', syncIdentityFromForm);

    const picker = $('participantProfilePicker');
    picker?.addEventListener('change', () => {
      window.setTimeout(() => {
        syncIdentityFromForm();
        syncHeroPhoto();
        loadPremiumData();
      }, 250);
    });

    const preview = $('participantPhotoPreview');
    if (preview) new MutationObserver(syncHeroPhoto).observe(preview,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    $('participantPhotoFile')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const avatar = $('participantHeroAvatar');
      if (avatar) {
        avatar.replaceChildren();
        const img = document.createElement('img');
        img.src = url; img.alt=''; avatar.appendChild(img);
      }
      const backdrop = $('participantHeroBackdrop');
      if (backdrop) backdrop.style.backgroundImage = `url("${url}")`;
    });

    const count = $('participantAchievementCount');
    const progress = $('participantProgressAchievements');
    const copyAchievementCount = () => { if (progress && count) progress.textContent = count.textContent || '0'; };
    if (count) new MutationObserver(copyAchievementCount).observe(count,{childList:true,subtree:true,characterData:true});
    copyAchievementCount();

    $('participantFriendSearch')?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const q = String(event.currentTarget.value || '').trim();
      location.href = `./comunidade.html${q ? `?q=${encodeURIComponent(q)}` : ''}`;
    });
    $('participantAddFriend')?.addEventListener('click', () => { location.href = './comunidade.html#amigos'; });
    $('participantExploreCommunity')?.addEventListener('click', () => { location.href = './comunidade.html'; });
    $('participantShareJourney')?.addEventListener('click', () => { location.href = './comunidade.html#publicar'; });
    $('participantInviteFriends')?.addEventListener('click', async () => {
      const url = new URL('./comunidade.html', location.href).href;
      const data = { title:'Comunidade CosplayChess', text:'Vem para a Comunidade CosplayChess!', url };
      try {
        if (navigator.share) await navigator.share(data);
        else {
          await navigator.clipboard.writeText(url);
          const btn = $('participantInviteFriends');
          const old = btn?.textContent;
          if (btn) btn.textContent = 'Link copiado!';
          window.setTimeout(() => { if (btn) btn.textContent = old || 'Convidar amigos'; }, 1600);
        }
      } catch {}
    });

    const dashboard = document.querySelector('[data-participant-dashboard]');
    if (dashboard) {
      new MutationObserver(() => {
        if (!dashboard.hidden) loadPremiumData();
      }).observe(dashboard,{attributes:true,attributeFilter:['hidden']});
    }
    window.setTimeout(() => { syncIdentityFromForm(); syncHeroPhoto(); loadPremiumData(); }, 700);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true });
  else bind();
})();
