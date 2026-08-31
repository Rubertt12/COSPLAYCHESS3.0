(() => {
  'use strict';
  if (window.__CC_COMMUNITY_CREATE_V2__) return;
  window.__CC_COMMUNITY_CREATE_V2__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;
  const BUCKET = 'cosplaychess-character-photos';
  const allowed = new Set(['image/jpeg','image/png','image/webp']);
  let modal = null;
  let profile = null;
  let user = null;
  let avatarPreviewUrl = '';
  let coverPreviewUrl = '';

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const loadIdentity = async () => {
    if (profile && user) return true;
    const { data: session } = await db.auth.getSession();
    user = session?.session?.user || null;
    if (!user) return false;
    const { data } = await db.from('cosplay_participant_profiles').select('id,user_id').eq('user_id',user.id).neq('registration_status','cancelled').order('created_at',{ascending:false}).limit(1).maybeSingle();
    profile = data || null;
    return !!profile;
  };
  const setStatus = (message = '', kind = '') => { const el = modal?.querySelector('[data-community-create-status]'); if (el) { el.textContent = message; el.dataset.kind = kind; } };

  const ensureModal = () => {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'cc-community-create-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="cc-community-create-dialog" role="dialog" aria-modal="true" aria-labelledby="ccCommunityCreateTitle">
        <div class="cc-community-create-head"><div><span>COMUNIDADES COSPLAYCHESS</span><h2 id="ccCommunityCreateTitle">Criar comunidade</h2></div><button type="button" data-community-create-close aria-label="Fechar">×</button></div>
        <form class="cc-community-create-form">
          <div class="cc-community-create-avatar"><div data-community-avatar-preview>♙</div><label>Escolher foto<input type="file" name="avatar" accept="image/jpeg,image/png,image/webp"></label><small>Avatar · até 5 MB</small><label style="margin-top:10px">Escolher capa<input type="file" name="cover" accept="image/jpeg,image/png,image/webp"></label><small>Capa · até 8 MB</small></div>
          <div class="cc-community-create-fields">
            <label><span>Nome da comunidade</span><input name="name" maxlength="80" minlength="3" required placeholder="Ex.: Cosplayers de Naruto"></label>
            <label><span>Categoria</span><select name="category"><option>Anime & Mangá</option><option>Cosplay</option><option>Games</option><option>Xadrez</option><option>Fotografia</option><option>Eventos</option><option>Filmes & Séries</option><option>Outros</option></select></label>
            <label><span>Visibilidade</span><select name="visibility"><option value="public">Pública</option><option value="private">Privada</option></select></label>
            <label><span>Entrada de membros</span><select name="join_policy"><option value="open">Entrada livre</option><option value="approval">Aprovação de dono/moderador</option></select></label>
            <label class="wide"><span>Descrição</span><textarea name="description" maxlength="600" rows="4" placeholder="Conte para os participantes qual é o assunto desta comunidade."></textarea></label>
            <label class="wide"><span>Regras</span><textarea name="rules" maxlength="3000" rows="4" placeholder="Regras, objetivo da comunidade e comportamento esperado."></textarea></label>
            <div class="wide" data-community-cover-preview style="height:100px;border:1px solid rgba(160,111,220,.25);border-radius:9px;background:linear-gradient(135deg,#19365c,#371849);background-size:cover;background-position:center"></div>
          </div>
          <div class="cc-community-create-actions"><span data-community-create-status></span><button class="btn dark" type="button" data-community-create-close>Cancelar</button><button class="btn gold" type="submit">Criar comunidade</button></div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-community-create-close]').forEach(button => button.addEventListener('click',closeModal));
    modal.addEventListener('click',(event) => { if (event.target === modal) closeModal(); });
    modal.querySelector('input[name="avatar"]')?.addEventListener('change',previewAvatar);
    modal.querySelector('input[name="cover"]')?.addEventListener('change',previewCover);
    modal.querySelector('form')?.addEventListener('submit',submit);
    return modal;
  };

  const cleanupPreviews = () => { if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl); if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl); avatarPreviewUrl='';coverPreviewUrl=''; };
  const closeModal = () => { if (!modal) return; modal.hidden = true; document.body.classList.remove('cc-community-create-open'); setStatus(''); cleanupPreviews(); };
  const openModal = async () => { ensureModal(); if (!await loadIdentity()) { location.href = './participante.html'; return; } modal.hidden = false; document.body.classList.add('cc-community-create-open'); setStatus(''); setTimeout(() => modal.querySelector('input[name="name"]')?.focus(),30); };
  const validFile = (file,max) => !file || (allowed.has(file.type) && file.size <= max);
  const previewAvatar = (event) => { const file=event.currentTarget.files?.[0],preview=modal.querySelector('[data-community-avatar-preview]');if(!file){preview.textContent='♙';return;}if(!validFile(file,5*1024*1024)){event.currentTarget.value='';preview.textContent='♙';setStatus('Avatar: use JPG, PNG ou WebP com até 5 MB.','error');return;}if(avatarPreviewUrl)URL.revokeObjectURL(avatarPreviewUrl);avatarPreviewUrl=URL.createObjectURL(file);preview.innerHTML=`<img src="${esc(avatarPreviewUrl)}" alt="Prévia da comunidade">`;setStatus(''); };
  const previewCover = (event) => { const file=event.currentTarget.files?.[0],preview=modal.querySelector('[data-community-cover-preview]');if(!file){preview.style.backgroundImage='';return;}if(!validFile(file,8*1024*1024)){event.currentTarget.value='';preview.style.backgroundImage='';setStatus('Capa: use JPG, PNG ou WebP com até 8 MB.','error');return;}if(coverPreviewUrl)URL.revokeObjectURL(coverPreviewUrl);coverPreviewUrl=URL.createObjectURL(file);preview.style.backgroundImage=`url("${coverPreviewUrl.replace(/"/g,'%22')}")`;setStatus(''); };
  const upload = async (file,folder,max) => { if(!file)return{path:null,url:null};if(!validFile(file,max))throw new Error('arquivo inválido');const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg',rand=crypto.randomUUID?.()||Math.random().toString(36).slice(2),path=`${user.id}/${folder}/${Date.now()}-${rand}.${ext}`;const{error}=await db.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(error)throw error;const{data}=db.storage.from(BUCKET).getPublicUrl(path);return{path,url:data?.publicUrl||null}; };

  async function submit(event) {
    event.preventDefault(); if (!await loadIdentity()) return;
    const form=event.currentTarget,name=form.elements.name.value.trim(),description=form.elements.description.value.trim(),category=form.elements.category.value,visibility=form.elements.visibility.value,join_policy=form.elements.join_policy.value,rules=form.elements.rules.value.trim(),avatar=form.elements.avatar.files?.[0]||null,cover=form.elements.cover.files?.[0]||null,button=form.querySelector('button[type="submit"]');
    if(name.length<3){setStatus('Digite um nome com pelo menos 3 caracteres.','error');return;}if(!validFile(avatar,5*1024*1024)||!validFile(cover,8*1024*1024)){setStatus('Verifique o tamanho/formato das imagens.','error');return;}
    button.disabled=true;setStatus('Criando comunidade...');let avatarUp=null,coverUp=null;
    try{
      avatarUp=await upload(avatar,'community-avatars',5*1024*1024);coverUp=await upload(cover,'community-covers',8*1024*1024);
      const {data,error}=await db.from('cosplay_communities').insert({owner_profile_id:profile.id,name,description,category,avatar_url:avatarUp.url,cover_url:coverUp.url,visibility,join_policy,rules}).select('id,slug,name').single();if(error)throw error;
      form.reset();closeModal();window.dispatchEvent(new CustomEvent('cosplay:community-created',{detail:{community:data}}));if(data?.slug)location.href=`./comunidade-grupo.html?slug=${encodeURIComponent(data.slug)}`;else document.querySelector('[data-community-view="communities"]')?.click();
    }catch(error){if(avatarUp?.path)await db.storage.from(BUCKET).remove([avatarUp.path]).catch(()=>{});if(coverUp?.path)await db.storage.from(BUCKET).remove([coverUp.path]).catch(()=>{});setStatus(error?.code==='23505'?'Já existe uma comunidade com esse nome.':'Não foi possível criar a comunidade.','error');}finally{button.disabled=false;}
  }
  document.addEventListener('click',(event)=>{const trigger=event.target.closest('#communityCreateGroupToggle,#communityCreateGroupMini,[data-create-community]');if(!trigger)return;event.preventDefault();event.stopPropagation();openModal().catch(()=>{});},true);
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&modal&&!modal.hidden)closeModal();});
})();
