(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;
  const db=window.getCosplayChessDb?.()||window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status=(text,type='')=>{const el=document.getElementById('teamStatus');if(!el)return;el.className=`form-status ${type}`;el.textContent=text;};
  let team=[];

  async function requireAdmin(){
    const {data:{session}}=await db.auth.getSession();
    if(!session){location.href='./admin.html';return false;}
    const {data:admin,error}=await db.from('cosplay_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
    if(error||!admin){location.href='./admin.html';return false;}
    document.getElementById('teamLoading').hidden=true;
    document.getElementById('teamPanel').hidden=false;
    return true;
  }

  async function loadTeam(){
    const {data,error}=await db.from('cosplay_team_members').select('*').order('sort_order');
    if(error)throw error;
    team=data||[];
    renderTeam();
  }

  function renderTeam(){
    const root=document.getElementById('teamEditor');
    root.innerHTML=team.length?team.map(m=>`<div class="team-editor-row" data-team-id="${m.id}">
      <div class="two"><input data-field="name" value="${esc(m.name)}" placeholder="Nome"><input data-field="role" value="${esc(m.role||'')}" placeholder="Função"></div>
      <input data-field="photo_url" value="${esc(m.photo_url||'')}" placeholder="URL da foto (opcional)">
      <textarea data-field="bio" placeholder="Bio">${esc(m.bio||'')}</textarea>
      <div class="row-actions"><label class="hint"><input type="checkbox" data-field="published" ${m.published?'checked':''}> Publicado no site</label><button class="mini-btn" data-save-team="${m.id}">Salvar</button><button class="mini-btn danger" data-delete-team="${m.id}">Excluir</button></div>
    </div>`).join(''):'<div class="empty-card">Nenhuma pessoa cadastrada.</div>';
    root.querySelectorAll('[data-save-team]').forEach(b=>b.onclick=()=>saveTeam(b.dataset.saveTeam));
    root.querySelectorAll('[data-delete-team]').forEach(b=>b.onclick=()=>deleteTeam(b.dataset.deleteTeam));
  }

  async function saveTeam(id){
    const row=document.querySelector(`[data-team-id="${id}"]`);if(!row)return;
    const get=f=>row.querySelector(`[data-field="${f}"]`);
    const payload={name:get('name').value.trim(),role:get('role').value.trim(),photo_url:get('photo_url').value.trim()||null,bio:get('bio').value.trim(),published:get('published').checked,updated_at:new Date().toISOString()};
    status('Salvando...');
    const {error}=await db.from('cosplay_team_members').update(payload).eq('id',id);
    if(error)return status(error.message,'error');
    Object.assign(team.find(x=>x.id===id)||{},payload);
    status('Pessoa atualizada com sucesso.','success');
  }

  async function deleteTeam(id){
    if(!confirm('Remover esta pessoa da equipe pública?'))return;
    const {error}=await db.from('cosplay_team_members').delete().eq('id',id);
    if(error)return status(error.message,'error');
    team=team.filter(x=>x.id!==id);renderTeam();status('Pessoa removida.','success');
  }

  document.getElementById('addTeamMemberBtn').onclick=async()=>{
    status('Criando novo cadastro...');
    const {data,error}=await db.from('cosplay_team_members').insert({name:'Nova pessoa',role:'Fergorverse',bio:'',sort_order:(team.at(-1)?.sort_order||0)+10,published:false}).select().single();
    if(error)return status(error.message,'error');
    team.push(data);renderTeam();status('Novo cadastro criado. Preencha os dados e salve.','success');
  };

  (async()=>{if(!await requireAdmin())return;try{await loadTeam();}catch(err){document.getElementById('teamPanel').innerHTML=`<div class="empty-card">Erro ao carregar equipe: ${esc(err.message)}</div>`;}})();
})();