(() => {
  'use strict';
  if (window.__CC_COMMUNITY_CREATE_V1__) return;
  window.__CC_COMMUNITY_CREATE_V1__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;
  const BUCKET = 'cosplaychess-character-photos';
  const allowed = new Set(['image/jpeg','image/png','image/webp']);
  let modal = null;
  let profile = null;
  let user = null;
  let previewUrl = '';

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  const loadIdentity = async () => {
    if (profile && user) return true;
    const { data: session } = await db.auth.getSession();
    user = session?.session?.user || null;
    if (!user) return false;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,user_id')
      .eq('user_id',user.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    profile = data || null;
    return !!profile;
  };

  const setStatus = (message = '', kind = '') => {
    const el = modal?.querySelector('[data-community-create-status]');
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
  };

  const ensureModal = () => {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'cc-community-create-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="cc-community-create-dialog" role="dialog" aria-modal="true" aria-labelledby="ccCommunityCreateTitle">
        <div class="cc-community-create-head">
          <div><span>COMUNIDADES COSPLAYCHESS</span><h2 id="ccCommunityCreateTitle">Criar comunidade</h2></div>
          <button type="button" data-community-create-close aria-label="Fechar">×</button>
        </div>
        <form class="cc-community-create-form">
          <div class="cc-community-create-avatar"><div data-community-avatar-preview>♙</div><label>Escolher foto<input type="file" name="avatar" accept="image/jpeg,image/png,image/webp"></label><small>JPG, PNG ou WebP · até 5 MB</small></div>
          <div class="cc-community-create-fields">
            <label><span>Nome da comunidade</span><input name="name" maxlength="80" minlength="3" required placeholder="Ex.: Cosplayers de Naruto"></label>
            <label><span>Categoria</span><select name="category"><option>Anime & Mangá</option><option>Cosplay</option><option>Games</option><option>Xadrez</option><option>Fotografia</option><option>Eventos</option><option>Filmes & Séries</option><option>Outros</option></select></label>
            <label class="wide"><span>Descrição</span><textarea name="description" maxlength="600" rows="5" placeholder="Conte para os participantes qual é o assunto desta comunidade."></textarea></label>
          </div>
          <div class="cc-community-create-actions"><span data-community-create-status></span><button class="btn dark" type="button" data-community-create-close>Cancelar</button><button class="btn gold" type="submit">Criar comunidade</button></div>
        </form>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelectorAll('[data-community-create-close]').forEach((button) => button.addEventListener('click',closeModal));
    modal.addEventListener('click',(event) => { if (event.target === modal) closeModal(); });
    modal.querySelector('input[name="avatar"]')?.addEventListener('change',previewAvatar);
    modal.querySelector('form')?.addEventListener('submit',submit);
    return modal;
  };

  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('cc-community-create-open');
    setStatus('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  };

  const openModal = async () => {
    ensureModal();
    if (!await loadIdentity()) {
      location.href = './participante.html';
      return;
    }
    modal.hidden = false;
    document.body.classList.add('cc-community-create-open');
    setStatus('');
    setTimeout(() => modal.querySelector('input[name="name"]')?.focus(),30);
  };

  const previewAvatar = (event) => {
    const file = event.currentTarget.files?.[0];
    const preview = modal.querySelector('[data-community-avatar-preview]');
    if (!file) { preview.textContent = '♙'; return; }
    if (!allowed.has(file.type) || file.size > 5 * 1024 * 1024) {
      event.currentTarget.value = '';
      preview.textContent = '♙';
      setStatus('Use JPG, PNG ou WebP com até 5 MB.','error');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${esc(previewUrl)}" alt="Prévia da comunidade">`;
    setStatus('');
  };

  const uploadAvatar = async (file) => {
    if (!file) return { path:null,url:null };
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const rand = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    const path = `${user.id}/community-avatars/${Date.now()}-${rand}.${ext}`;
    const { error } = await db.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if (error) throw error;
    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    return { path,url:data?.publicUrl || null };
  };

  async function submit(event) {
    event.preventDefault();
    if (!await loadIdentity()) return;
    const form = event.currentTarget;
    const name = form.elements.name.value.trim();
    const description = form.elements.description.value.trim();
    const category = form.elements.category.value;
    const avatar = form.elements.avatar.files?.[0] || null;
    const button = form.querySelector('button[type="submit"]');
    if (name.length < 3) { setStatus('Digite um nome com pelo menos 3 caracteres.','error'); return; }
    button.disabled = true;
    setStatus(avatar ? 'Enviando a foto...' : 'Criando comunidade...');
    let uploaded = null;
    try {
      uploaded = await uploadAvatar(avatar);
      setStatus('Criando comunidade...');
      const { data, error } = await db.from('cosplay_communities')
        .insert({owner_profile_id:profile.id,name,description,category,avatar_url:uploaded.url})
        .select('id,slug,name')
        .single();
      if (error) throw error;
      form.reset();
      closeModal();
      window.dispatchEvent(new CustomEvent('cosplay:community-created',{detail:{community:data}}));
      if (data?.slug) location.href = `./comunidade-grupo.html?slug=${encodeURIComponent(data.slug)}`;
      else document.querySelector('[data-community-view="communities"]')?.click();
    } catch (error) {
      if (uploaded?.path) await db.storage.from(BUCKET).remove([uploaded.path]).catch(() => {});
      setStatus(error?.code === '23505' ? 'Já existe uma comunidade com esse nome.' : 'Não foi possível criar a comunidade.','error');
    } finally {
      button.disabled = false;
    }
  }

  document.addEventListener('click',(event) => {
    const trigger = event.target.closest('#communityCreateGroupToggle,#communityCreateGroupMini,[data-create-community]');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    openModal().catch(() => {});
  },true);

  document.addEventListener('keydown',(event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
  });
})();