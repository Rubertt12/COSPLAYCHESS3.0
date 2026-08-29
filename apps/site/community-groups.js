(() => {
  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const $ = (id) => document.getElementById(id);
  const AVATAR_BUCKET = 'cosplaychess-character-photos';
  const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg','image/png','image/webp']);
  const state = { profileId: null, userId: null, groups: [], members: [], membership: new Map(), memberCounts: new Map() };

  const groupsEl = $('communityGroups');
  const searchEl = $('communityGroupSearch');
  const filterEl = $('communityGroupFilter');
  const form = $('communityGroupCreateForm');
  const toggle = $('communityCreateGroupToggle');
  const miniToggle = $('communityCreateGroupMini');
  const close = $('communityGroupCreateClose');
  const nameEl = $('communityGroupName');
  const categoryEl = $('communityGroupCategory');
  const descriptionEl = $('communityGroupDescription');
  const avatarFileEl = $('communityGroupAvatar');
  const avatarPreviewEl = $('communityGroupAvatarPreview');
  const statusEl = $('communityGroupStatus');
  const railEl = $('communityGroupRail');
  const countEl = $('communityGroupCount');
  const interestsEl = $('communityInterestTags');
  let avatarObjectUrl = '';

  const escapeInitial = (value) => String(value || '?').trim().charAt(0).toUpperCase() || '?';
  const safeImage = (value) => { try { const url=new URL(String(value||'')); return ['http:','https:'].includes(url.protocol) ? url.href : null; } catch { return null; } };

  const setStatus = (message = '', kind = '') => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `community-status${kind ? ` ${kind}` : ''}`;
  };

  const paintAvatar = (container, group) => {
    if (!container) return;
    container.replaceChildren();
    const url = safeImage(group?.avatar_url);
    if (url) {
      const img=document.createElement('img'); img.src=url; img.alt=`Foto de ${group?.name || 'comunidade'}`; img.loading='lazy'; container.appendChild(img);
    } else container.textContent=escapeInitial(group?.name);
  };

  const resetAvatarPreview = () => {
    if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl);
    avatarObjectUrl='';
    if (avatarPreviewEl) { avatarPreviewEl.replaceChildren(); avatarPreviewEl.textContent='◉'; }
    if (avatarFileEl) avatarFileEl.value='';
  };

  avatarFileEl?.addEventListener('change', () => {
    const file=avatarFileEl.files?.[0];
    if (!file) { resetAvatarPreview(); return; }
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) { setStatus('Use uma foto JPG, PNG ou WebP.', 'error'); resetAvatarPreview(); return; }
    if (file.size > 5 * 1024 * 1024) { setStatus('A foto da comunidade deve ter no máximo 5 MB.', 'error'); resetAvatarPreview(); return; }
    setStatus('');
    if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl);
    avatarObjectUrl=URL.createObjectURL(file);
    avatarPreviewEl?.replaceChildren();
    if (avatarPreviewEl) { const img=document.createElement('img'); img.src=avatarObjectUrl; img.alt='Prévia da foto da comunidade'; avatarPreviewEl.appendChild(img); }
  });

  const uploadCommunityAvatar = async (file) => {
    if (!file) return null;
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) throw new Error('Use JPG, PNG ou WebP.');
    if (file.size > 5 * 1024 * 1024) throw new Error('A foto deve ter no máximo 5 MB.');
    if (!state.userId) throw new Error('Sessão inválida para enviar a foto.');
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const rand = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
    const path = `${state.userId}/community-avatars/${Date.now()}-${rand}.${ext}`;
    const { error } = await db.storage.from(AVATAR_BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if (error) throw error;
    const { data } = db.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    return { path, url:data?.publicUrl || null };
  };

  const switchView = (view) => {
    document.querySelectorAll('[data-community-view]').forEach((button) => button.classList.toggle('active', button.dataset.communityView === view));
    document.querySelectorAll('[data-community-panel]').forEach((panel) => { const active = panel.dataset.communityPanel === view; panel.hidden = !active; panel.classList.toggle('active', active); });
    if (view === 'communities') loadGroups().catch(() => {});
  };

  document.querySelectorAll('[data-community-view]').forEach((button) => button.addEventListener('click', () => { if (button.dataset.communityView === 'communities') switchView('communities'); }));

  const openCreate = () => { switchView('communities'); if (form) form.hidden = false; setStatus(''); setTimeout(() => nameEl?.focus(), 40); };
  toggle?.addEventListener('click', openCreate); miniToggle?.addEventListener('click', openCreate);
  close?.addEventListener('click', () => { if (form) form.hidden = true; setStatus(''); resetAvatarPreview(); });

  const loadProfile = async () => {
    const { data: sessionData } = await db.auth.getSession();
    if (!sessionData?.session) return false;
    const { data: userData, error: userError } = await db.auth.getUser();
    if (userError || !userData?.user) return false;
    state.userId = userData.user.id;
    const { data, error } = await db.from('cosplay_participant_profiles').select('id').eq('user_id', userData.user.id).neq('registration_status', 'cancelled').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error || !data) return false;
    state.profileId = data.id;
    return true;
  };

  const rebuildMembership = () => {
    state.membership.clear(); state.memberCounts.clear();
    state.members.forEach((row) => { state.memberCounts.set(row.community_id, (state.memberCounts.get(row.community_id) || 0) + 1); if (row.profile_id === state.profileId) state.membership.set(row.community_id, row); });
  };

  const filteredGroups = () => {
    const term = String(searchEl?.value || '').trim().toLowerCase(); const mode = filterEl?.value || 'all';
    return state.groups.filter((group) => { const match = !term || `${group.name || ''} ${group.category || ''} ${group.description || ''}`.toLowerCase().includes(term); if (!match) return false; const member = state.membership.get(group.id); if (mode === 'mine') return Boolean(member); if (mode === 'owned') return group.owner_profile_id === state.profileId; return true; });
  };

  const actionFor = (group) => {
    const member = state.membership.get(group.id); const button = document.createElement('button'); button.type = 'button'; button.className = 'community-group-action';
    if (group.owner_profile_id === state.profileId) { button.textContent = 'Criada por você'; button.disabled = true; return button; }
    if (member) { button.textContent = 'Sair'; button.addEventListener('click', async () => { button.disabled = true; const { error } = await db.from('cosplay_community_members').delete().eq('community_id', group.id).eq('profile_id', state.profileId); if (error) { button.disabled = false; button.textContent = 'Tentar novamente'; return; } await loadGroups(); }); return button; }
    button.classList.add('join'); button.textContent = 'Entrar'; button.addEventListener('click', async () => { button.disabled = true; const { error } = await db.from('cosplay_community_members').insert({ community_id: group.id, profile_id: state.profileId, role: 'member' }); if (error) { button.disabled = false; button.textContent = error.code === '23505' ? 'Já é membro' : 'Tentar novamente'; return; } await loadGroups(); }); return button;
  };

  const groupCard = (group) => {
    const card = document.createElement('article'); card.className = 'community-group-card';
    const avatar = document.createElement('div'); avatar.className = 'community-group-avatar'; paintAvatar(avatar,group);
    const copy = document.createElement('div'); copy.className = 'community-group-copy';
    const top = document.createElement('div'); top.className = 'community-group-topline'; const title = document.createElement('b'); title.textContent = group.name; top.appendChild(title);
    const member = state.membership.get(group.id); if (member) { const role = document.createElement('span'); role.className = 'community-group-role'; role.textContent = member.role === 'owner' ? 'dono' : 'membro'; top.appendChild(role); }
    const category = document.createElement('span'); category.className = 'community-group-category'; category.textContent = group.category || 'Geral'; copy.append(top, category);
    const description = document.createElement('p'); description.className = 'community-group-description'; description.textContent = group.description || 'Esta comunidade ainda não possui descrição.';
    const meta = document.createElement('div'); meta.className = 'community-group-meta'; const members = document.createElement('span'); members.className = 'community-group-members'; const count = state.memberCounts.get(group.id) || 0; members.innerHTML = `<b>${count}</b> ${count === 1 ? 'membro' : 'membros'}`; meta.append(members, actionFor(group));
    card.append(avatar, copy, description, meta); return card;
  };

  const renderGroups = () => {
    if (!groupsEl) return; const rows = filteredGroups(); groupsEl.replaceChildren();
    if (!rows.length) { const empty = document.createElement('div'); empty.className = 'community-empty'; empty.textContent = state.groups.length ? 'Nenhuma comunidade corresponde a este filtro.' : 'Ainda não existem comunidades. Você pode criar a primeira.'; groupsEl.appendChild(empty); return; }
    rows.forEach((group) => groupsEl.appendChild(groupCard(group)));
  };

  const renderRail = () => {
    if (countEl) countEl.textContent = String(state.groups.length);
    if (railEl) {
      railEl.replaceChildren(); const rows = [...state.groups].sort((a, b) => (state.memberCounts.get(b.id) || 0) - (state.memberCounts.get(a.id) || 0)).slice(0, 4);
      if (!rows.length) { const empty = document.createElement('div'); empty.className = 'orkut-empty-mini'; empty.textContent = 'Nenhuma comunidade ainda. Crie a primeira!'; railEl.appendChild(empty); }
      else rows.forEach((group) => { const item = document.createElement('button'); item.type = 'button'; item.className = 'community-group-rail-item'; const icon = document.createElement('span'); icon.className = 'community-group-rail-icon'; paintAvatar(icon,group); const copy = document.createElement('span'); copy.className = 'community-group-rail-copy'; const name = document.createElement('b'); name.textContent = group.name; const info = document.createElement('span'); const total = state.memberCounts.get(group.id) || 0; info.textContent = `${group.category || 'Geral'} · ${total} ${total === 1 ? 'membro' : 'membros'}`; copy.append(name, info); item.append(icon, copy); item.addEventListener('click', () => { if (group.slug) location.href=`./comunidade-grupo.html?slug=${encodeURIComponent(group.slug)}`; else { switchView('communities'); if (searchEl) searchEl.value = group.name; renderGroups(); } }); railEl.appendChild(item); });
    }
    if (interestsEl) { interestsEl.replaceChildren(); const counts = new Map(); state.groups.forEach((group) => counts.set(group.category || 'Geral', (counts.get(group.category || 'Geral') || 0) + 1)); const categories = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6); if (!categories.length) { const span = document.createElement('span'); span.textContent = 'Nenhum interesse ainda'; interestsEl.appendChild(span); } else categories.forEach(([category, total]) => { const chip = document.createElement('span'); chip.textContent = `${category} · ${total}`; interestsEl.appendChild(chip); }); }
  };

  const loadGroups = async () => {
    if (!state.profileId) return;
    const [{ data: groups, error: groupError }, { data: members, error: memberError }] = await Promise.all([
      db.from('cosplay_communities').select('id,owner_profile_id,name,slug,description,category,avatar_url,created_at,updated_at').order('created_at', { ascending: false }).limit(200),
      db.from('cosplay_community_members').select('community_id,profile_id,role,joined_at').limit(3000),
    ]);
    if (groupError || memberError) { if (groupsEl) groupsEl.innerHTML = '<div class="community-empty">Não foi possível carregar as comunidades agora.</div>'; return; }
    state.groups = groups || []; state.members = members || []; rebuildMembership(); renderGroups(); renderRail();
    window.dispatchEvent(new CustomEvent('cosplay:communities-loaded',{detail:{groups:state.groups,members:state.members,profileId:state.profileId}}));
  };

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = String(nameEl?.value || '').trim(); const category = String(categoryEl?.value || 'Outros').trim(); const description = String(descriptionEl?.value || '').trim(); const avatarFile=avatarFileEl?.files?.[0] || null;
    if (name.length < 3) { setStatus('Digite um nome com pelo menos 3 caracteres.', 'error'); return; }
    const submit = form.querySelector('button[type="submit"]'); if (submit) submit.disabled = true; setStatus(avatarFile ? 'Enviando foto da comunidade...' : 'Criando comunidade...');
    let uploaded=null;
    try {
      uploaded=await uploadCommunityAvatar(avatarFile);
      if (avatarFile) setStatus('Criando comunidade...');
      const { error } = await db.from('cosplay_communities').insert({ owner_profile_id: state.profileId, name, description, category, avatar_url:uploaded?.url || null });
      if (error) throw error;
      form.reset(); form.hidden = true; resetAvatarPreview(); setStatus(''); await loadGroups(); switchView('communities');
    } catch (error) {
      if (uploaded?.path) await db.storage.from(AVATAR_BUCKET).remove([uploaded.path]).catch(()=>{});
      setStatus(error?.message?.includes('5 MB') || error?.message?.includes('JPG') ? error.message : 'Não foi possível criar a comunidade. Tente novamente.', 'error');
    } finally { if (submit) submit.disabled = false; }
  });

  searchEl?.addEventListener('input', renderGroups); filterEl?.addEventListener('change', renderGroups);
  const init = async () => { const ok = await loadProfile(); if (!ok) return; await loadGroups(); };
  init().catch(() => {});
})();