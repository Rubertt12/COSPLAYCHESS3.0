(() => {
  const cfg = window.COSPLAYCHESS_CONFIG;
  const db = window.getCosplayChessDb ? window.getCosplayChessDb() : window.COSPLAYCHESS_DB;
  const loginView = document.querySelector('[data-participant-login]');
  const dashboardView = document.querySelector('[data-participant-dashboard]');
  const loginForm = document.getElementById('participantLoginForm');
  const loginStatus = document.getElementById('participantLoginStatus');
  const createAccountBtn = document.getElementById('participantCreateAccount');
  const forgotPasswordBtn = document.getElementById('participantForgotPassword');
  const accountStatus = document.getElementById('participantAccountStatus');
  const dashboardContent = document.getElementById('participantDashboardContent');
  const profileForm = document.getElementById('participantProfileForm');
  const profilePicker = document.getElementById('participantProfilePicker');
  const profilePickerWrap = document.getElementById('participantProfilePickerWrap');
  const achievementsEl = document.getElementById('participantAchievements');
  const achievementCountEl = document.getElementById('participantAchievementCount');
  const nameEl = document.getElementById('participantName');
  const greetingEl = document.getElementById('participantGreeting');
  const emailEl = document.getElementById('participantEmail');
  const logoutBtn = document.getElementById('participantLogout');
  const saveStatus = document.getElementById('participantSaveStatus');
  const photoPreview = document.getElementById('participantPhotoPreview');
  const photoFile = document.getElementById('participantPhotoFile');
  const publicLink = document.getElementById('participantPublicLink');
  const publicHint = document.getElementById('participantPublicHint');
  const shareProfileBtn = document.getElementById('participantShareProfile');

  let currentUser = null;
  let profiles = [];
  let currentProfile = null;
  let eventNames = new Map();
  let handlingSession = false;

  const setStatus = (el, message = '', kind = '') => {
    if (!el) return;
    el.textContent = message;
    el.className = `participant-status${kind ? ` ${kind}` : ''}`;
  };

  const friendlyError = (error, fallback) => {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('invalid login')) return 'E-mail ou senha inválidos.';
    if (msg.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
    if (msg.includes('user already registered')) return 'Este e-mail já possui uma conta. Use Entrar ou Esqueci minha senha.';
    if (msg.includes('password should be')) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (msg.includes('rate limit')) return 'Muitas tentativas em pouco tempo. Tente novamente mais tarde.';
    return fallback;
  };

  const escapeCss = (value) => window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, '');

  const profileUrl = (profile = currentProfile) => {
    if (!profile?.public_slug) return '';
    return new URL(`./jogador.html?slug=${encodeURIComponent(profile.public_slug)}`, location.href).href;
  };

  const safeUrl = (raw, network = '') => {
    let value = String(raw || '').trim();
    if (!value) return null;
    if (value.startsWith('@')) {
      const handle = value.slice(1).replace(/[^a-zA-Z0-9._-]/g, '');
      if (!handle) return null;
      if (network === 'instagram') value = `https://www.instagram.com/${handle}/`;
      else if (network === 'tiktok') value = `https://www.tiktok.com/@${handle}`;
      else return null;
    } else if (!/^https?:\/\//i.test(value)) {
      value = `https://${value}`;
    }
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      return url.href;
    } catch {
      return null;
    }
  };

  const renderPhoto = (url) => {
    if (!photoPreview) return;
    photoPreview.replaceChildren();
    if (!url) {
      const span = document.createElement('span');
      span.textContent = 'Sem foto';
      photoPreview.appendChild(span);
      return;
    }
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Foto atual do cosplay';
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      photoPreview.replaceChildren();
      const span = document.createElement('span');
      span.textContent = 'Foto indisponível';
      photoPreview.appendChild(span);
    }, { once:true });
    photoPreview.appendChild(img);
  };

  const renderPublicActions = () => {
    const url = profileUrl();
    const visible = !!currentProfile?.profile_visible && !!url;
    if (publicLink) {
      publicLink.href = visible ? url : '#';
      publicLink.setAttribute('aria-disabled', visible ? 'false' : 'true');
    }
    if (shareProfileBtn) shareProfileBtn.disabled = !visible;
    if (publicHint) publicHint.textContent = visible
      ? 'Sua página está pública. Você pode abrir ou compartilhar o link agora.'
      : 'Ative a visibilidade do perfil e salve para liberar o link público.';
  };

  const fillProfileForm = (profile) => {
    currentProfile = profile || null;
    if (!profileForm || !profile) return;
    const fields = ['display_name','nick','character_name','bio','instagram_url','tiktok_url','facebook_url','youtube_url'];
    fields.forEach((field) => {
      const input = profileForm.elements.namedItem(field);
      if (input) input.value = profile[field] || '';
    });
    const visible = profileForm.elements.namedItem('profile_visible');
    if (visible) visible.checked = !!profile.profile_visible;
    if (photoFile) photoFile.value = '';
    renderPhoto(profile.character_photo_url);
    renderPublicActions();
    if (nameEl) nameEl.textContent = profile.display_name || profile.nick || 'Participante';
    if (greetingEl) greetingEl.textContent = `Olá, ${profile.display_name || profile.nick || 'Participante'}`;
  };

  const loadEvents = async (rows) => {
    const ids = [...new Set(rows.map((p) => p.event_id).filter(Boolean))];
    eventNames = new Map();
    if (!ids.length) return;
    const { data } = await db.from('cosplay_events').select('id,title,start_at').in('id', ids);
    (data || []).forEach((event) => eventNames.set(event.id, event.title || 'Evento CosplayChess'));
  };

  const renderProfilePicker = () => {
    if (!profilePicker || !profilePickerWrap) return;
    profilePicker.replaceChildren();
    profiles.forEach((profile) => {
      const option = document.createElement('option');
      option.value = profile.id;
      const eventName = eventNames.get(profile.event_id) || 'Participação CosplayChess';
      option.textContent = `${eventName} — ${profile.character_name || 'Personagem'}`;
      profilePicker.appendChild(option);
    });
    profilePickerWrap.hidden = profiles.length < 2;
    if (currentProfile) profilePicker.value = currentProfile.id;
  };

  const loadAchievements = async (profile) => {
    if (!achievementsEl || !achievementCountEl || !profile) return;
    achievementsEl.innerHTML = '<div class="participant-empty">Carregando conquistas...</div>';
    const { data: awards, error } = await db
      .from('cosplay_cosplayer_achievements')
      .select('achievement_id,note,awarded_at,character_name')
      .eq('registration_id', profile.registration_id)
      .order('awarded_at', { ascending:false });
    if (error) {
      achievementsEl.innerHTML = '<div class="participant-empty">Não foi possível carregar suas conquistas.</div>';
      achievementCountEl.textContent = '0';
      return;
    }
    if (!awards?.length) {
      achievementsEl.innerHTML = '<div class="participant-empty">Nenhuma conquista desbloqueada ainda. Sua jornada está só começando. ♜</div>';
      achievementCountEl.textContent = '0';
      return;
    }
    const ids = [...new Set(awards.map((award) => award.achievement_id).filter(Boolean))];
    const { data: defs } = ids.length
      ? await db.from('cosplay_achievements').select('id,title,description,icon,tier').in('id', ids)
      : { data:[] };
    const definitions = new Map((defs || []).map((item) => [item.id, item]));
    achievementsEl.replaceChildren();
    awards.forEach((award) => {
      const def = definitions.get(award.achievement_id);
      if (!def) return;
      const article = document.createElement('article');
      article.className = 'participant-achievement';
      const icon = document.createElement('div');
      icon.className = 'participant-achievement-icon';
      icon.textContent = def.icon || '🏆';
      const copy = document.createElement('div');
      const title = document.createElement('b');
      title.textContent = def.title || 'Conquista';
      const description = document.createElement('span');
      description.textContent = award.note || def.description || '';
      const tier = document.createElement('small');
      tier.textContent = String(def.tier || 'conquista').toUpperCase();
      copy.append(title, description, tier);
      article.append(icon, copy);
      achievementsEl.appendChild(article);
    });
    achievementCountEl.textContent = String(achievementsEl.children.length);
  };

  const loadProfiles = async () => {
    if (!currentUser) return;
    const { data, error } = await db
      .from('cosplay_participant_profiles')
      .select('id,registration_id,event_id,user_id,public_slug,display_name,nick,character_name,character_photo_url,registration_status,bio,instagram_url,tiktok_url,facebook_url,youtube_url,profile_visible,created_at,updated_at')
      .eq('user_id', currentUser.id)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending:false });
    if (error) throw error;
    profiles = data || [];
    await loadEvents(profiles);
    currentProfile = profiles[0] || null;
    renderProfilePicker();
    if (!currentProfile) {
      if (dashboardContent) dashboardContent.hidden = true;
      setStatus(accountStatus, 'Nenhuma inscrição foi vinculada a esta conta. Confirme se você usou exatamente o mesmo e-mail informado na inscrição.', 'error');
      return;
    }
    setStatus(accountStatus, 'Conta vinculada com segurança à sua inscrição.', 'success');
    if (dashboardContent) dashboardContent.hidden = false;
    fillProfileForm(currentProfile);
    await loadAchievements(currentProfile);
  };

  const claimProfiles = async () => {
    const { error } = await db.rpc('claim_cosplay_participant_profiles');
    if (error && !String(error.message || '').includes('Nenhuma inscrição confirmada')) throw error;
  };

  const handleSession = async (session) => {
    if (handlingSession) return;
    handlingSession = true;
    try {
      currentUser = session?.user || null;
      const logged = !!currentUser;
      if (loginView) loginView.hidden = logged;
      if (dashboardView) dashboardView.hidden = !logged;
      if (!logged) {
        profiles = [];
        currentProfile = null;
        if (dashboardContent) dashboardContent.hidden = true;
        return;
      }
      if (emailEl) emailEl.textContent = currentUser.email || '';
      setStatus(accountStatus, 'Verificando sua inscrição...');
      try { await claimProfiles(); }
      catch (error) {
        setStatus(accountStatus, friendlyError(error, 'Não foi possível vincular sua inscrição automaticamente.'), 'error');
      }
      await loadProfiles();
    } catch (error) {
      setStatus(accountStatus, friendlyError(error, 'Não foi possível carregar sua área agora.'), 'error');
    } finally {
      handlingSession = false;
    }
  };

  const getCredentials = () => {
    const data = new FormData(loginForm);
    return { email:String(data.get('email') || '').trim(), password:String(data.get('password') || '') };
  };

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = loginForm.querySelector('[data-auth-action="login"]');
    const { email, password } = getCredentials();
    if (!email || !password) return;
    setStatus(loginStatus, 'Entrando...');
    if (submit) submit.disabled = true;
    try {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setStatus(loginStatus, 'Acesso liberado.', 'success');
      await handleSession(data?.session || null);
      loginForm.reset();
    } catch (error) {
      setStatus(loginStatus, friendlyError(error, 'Não foi possível entrar. Confira seus dados e tente novamente.'), 'error');
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  createAccountBtn?.addEventListener('click', async () => {
    const { email, password } = getCredentials();
    if (!email || !password) {
      setStatus(loginStatus, 'Informe o e-mail da inscrição e uma senha com pelo menos 6 caracteres.', 'error');
      return;
    }
    createAccountBtn.disabled = true;
    setStatus(loginStatus, 'Criando seu acesso...');
    try {
      const redirect = new URL('./participante.html', location.href).href;
      const { data, error } = await db.auth.signUp({ email, password, options:{ emailRedirectTo:redirect } });
      if (error) throw error;
      if (data?.session) {
        setStatus(loginStatus, 'Conta criada e acesso liberado.', 'success');
        await handleSession(data.session);
      } else {
        setStatus(loginStatus, 'Conta criada. Confira seu e-mail e clique no link de confirmação para liberar o acesso.', 'success');
      }
    } catch (error) {
      setStatus(loginStatus, friendlyError(error, 'Não foi possível criar sua conta agora.'), 'error');
    } finally {
      createAccountBtn.disabled = false;
    }
  });

  forgotPasswordBtn?.addEventListener('click', async () => {
    const { email } = getCredentials();
    if (!email) {
      setStatus(loginStatus, 'Informe seu e-mail primeiro.', 'error');
      return;
    }
    forgotPasswordBtn.disabled = true;
    try {
      const redirect = new URL('./participante.html', location.href).href;
      const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo:redirect });
      if (error) throw error;
      setStatus(loginStatus, 'Enviamos o link de recuperação para seu e-mail.', 'success');
    } catch (error) {
      setStatus(loginStatus, friendlyError(error, 'Não foi possível enviar a recuperação agora.'), 'error');
    } finally {
      forgotPasswordBtn.disabled = false;
    }
  });

  profilePicker?.addEventListener('change', async () => {
    const selected = profiles.find((profile) => profile.id === profilePicker.value);
    if (!selected) return;
    fillProfileForm(selected);
    await loadAchievements(selected);
  });

  photoFile?.addEventListener('change', () => {
    const file = photoFile.files?.[0];
    if (!file) return renderPhoto(currentProfile?.character_photo_url);
    if (!file.type.startsWith('image/')) return;
    const objectUrl = URL.createObjectURL(file);
    renderPhoto(objectUrl);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  });

  const uploadPhoto = async (file) => {
    if (!file || !currentUser || !currentProfile) return currentProfile?.character_photo_url || null;
    if (file.size > 5 * 1024 * 1024) throw new Error('A foto deve ter no máximo 5 MB.');
    const allowed = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' };
    const ext = allowed[file.type];
    if (!ext) throw new Error('Use uma imagem JPG, PNG ou WebP.');
    const unique = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `${currentUser.id}/${currentProfile.id}/${unique}.${ext}`;
    const { error } = await db.storage.from('cosplaychess-character-photos').upload(path, file, { contentType:file.type, upsert:false });
    if (error) throw error;
    const { data } = db.storage.from('cosplaychess-character-photos').getPublicUrl(path);
    return data?.publicUrl || null;
  };

  profileForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentProfile) return;
    const saveBtn = document.getElementById('participantSaveProfile');
    if (saveBtn) saveBtn.disabled = true;
    setStatus(saveStatus, 'Salvando...');
    try {
      const data = new FormData(profileForm);
      const file = photoFile?.files?.[0] || null;
      const photoUrl = file ? await uploadPhoto(file) : currentProfile.character_photo_url;
      const instagram = safeUrl(data.get('instagram_url'), 'instagram');
      const tiktok = safeUrl(data.get('tiktok_url'), 'tiktok');
      const facebookRaw = String(data.get('facebook_url') || '').trim();
      const youtubeRaw = String(data.get('youtube_url') || '').trim();
      const facebook = facebookRaw ? safeUrl(facebookRaw) : null;
      const youtube = youtubeRaw ? safeUrl(youtubeRaw) : null;
      if (facebookRaw && !facebook) throw new Error('Link do Facebook inválido.');
      if (youtubeRaw && !youtube) throw new Error('Link do YouTube inválido.');
      const updates = {
        display_name:String(data.get('display_name') || '').trim().slice(0,80),
        nick:String(data.get('nick') || '').trim().slice(0,60),
        character_name:String(data.get('character_name') || '').trim().slice(0,120),
        bio:String(data.get('bio') || '').trim().slice(0,600),
        instagram_url:instagram,
        tiktok_url:tiktok,
        facebook_url:facebook,
        youtube_url:youtube,
        profile_visible:data.get('profile_visible') === 'on',
        character_photo_url:photoUrl
      };
      if (!updates.character_name) throw new Error('Informe o personagem/cosplay.');
      const { data: saved, error } = await db
        .from('cosplay_participant_profiles')
        .update(updates)
        .eq('id', currentProfile.id)
        .eq('user_id', currentUser.id)
        .select('id,registration_id,event_id,user_id,public_slug,display_name,nick,character_name,character_photo_url,registration_status,bio,instagram_url,tiktok_url,facebook_url,youtube_url,profile_visible,created_at,updated_at')
        .single();
      if (error) throw error;
      const index = profiles.findIndex((profile) => profile.id === saved.id);
      if (index >= 0) profiles[index] = saved;
      fillProfileForm(saved);
      renderProfilePicker();
      setStatus(saveStatus, 'Alterações salvas. Seu cosplay foi sincronizado com a inscrição do evento.', 'success');
    } catch (error) {
      setStatus(saveStatus, String(error?.message || 'Não foi possível salvar as alterações.'), 'error');
      renderPhoto(currentProfile?.character_photo_url);
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  shareProfileBtn?.addEventListener('click', async () => {
    const url = profileUrl();
    if (!url || !currentProfile?.profile_visible) return;
    const title = `${currentProfile.display_name || currentProfile.nick || 'Participante'} no CosplayChess`;
    const text = `Veja meu perfil e minhas conquistas no CosplayChess! 🎭♜`;
    try {
      if (navigator.share) await navigator.share({ title, text, url });
      else {
        await navigator.clipboard.writeText(url);
        setStatus(saveStatus, 'Link do perfil copiado.', 'success');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setStatus(saveStatus, 'Não foi possível compartilhar agora.', 'error');
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    if (!db?.auth) return;
    logoutBtn.disabled = true;
    try { await db.auth.signOut(); }
    finally { logoutBtn.disabled = false; }
  });

  const init = async () => {
    if (!cfg || !db?.auth) {
      setStatus(loginStatus, 'Não foi possível iniciar o acesso agora.', 'error');
      return;
    }
    const { data } = await db.auth.getSession();
    await handleSession(data?.session || null);
    db.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => handleSession(session), 0);
    });
  };

  init();
})();
