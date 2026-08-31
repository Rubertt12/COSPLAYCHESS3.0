(() => {
  'use strict';
  if (window.__CC_COMMUNITY_GROUP_V13__) return;
  window.__CC_COMMUNITY_GROUP_V13__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const $ = id => document.getElementById(id);
  const q = (s, r=document) => r.querySelector(s);
  const qa = (s, r=document) => [...r.querySelectorAll(s)];
  const state = {
    user:null, profile:null, group:null, membership:null,
    members:[], profiles:new Map(), topics:[], replies:[],
    polls:[], options:[], votes:[], requests:[], bans:[], busy:false
  };

  const safeUrl = value => { try { const u = new URL(String(value || ''), location.href); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const displayName = p => p?.display_name || p?.nick || 'Participante';
  const profileHref = p => p?.public_slug ? `./jogador.html?slug=${encodeURIComponent(p.public_slug)}` : '#';
  const fmt = value => { try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); } catch { return ''; } };
  const isOwner = () => state.group?.owner_profile_id === state.profile?.id;
  const isModerator = () => isOwner() || state.membership?.role === 'moderator';
  const isMember = () => Boolean(state.membership);
  const canDeleteTopic = topic => topic?.author_profile_id === state.profile?.id || isModerator();
  const canDeleteReply = reply => reply?.author_profile_id === state.profile?.id || isModerator();

  function avatarNode(profile, cls='topic-avatar') {
    const el = document.createElement('div');
    el.className = cls;
    const src = safeUrl(profile?.character_photo_url);
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `Foto de ${displayName(profile)}`;
      img.loading = 'lazy';
      el.appendChild(img);
    } else el.textContent = '♜';
    return el;
  }

  function setBusy(button, busy, text='') {
    if (!button) return;
    if (!button.dataset.ccOldText) button.dataset.ccOldText = button.textContent || '';
    button.disabled = busy;
    button.textContent = busy ? text || 'Aguarde…' : button.dataset.ccOldText;
    if (!busy) delete button.dataset.ccOldText;
  }

  async function loadProfile() {
    const { data:s } = await db.auth.getSession();
    state.user = s?.session?.user || null;
    if (!state.user) return false;
    const { data, error } = await db.from('cosplay_participant_profiles')
      .select('id,user_id,public_slug,display_name,nick,character_name,character_photo_url')
      .eq('user_id', state.user.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if (error || !data) return false;
    state.profile = data;
    state.profiles.set(data.id, data);
    return true;
  }

  async function loadGroup() {
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) return false;
    const { data, error } = await db.from('cosplay_communities')
      .select('id,owner_profile_id,name,slug,description,category,avatar_url,cover_url,visibility,join_policy,rules,created_at,updated_at,moderation_status')
      .eq('slug', slug)
      .maybeSingle();
    if (error || !data) return false;
    state.group = data;
    return true;
  }

  async function loadProfiles(ids) {
    const missing = [...new Set((ids || []).filter(Boolean))].filter(id => !state.profiles.has(id));
    if (!missing.length) return;
    const { data } = await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url')
      .in('id', missing);
    (data || []).forEach(p => state.profiles.set(p.id, p));
  }

  async function loadMembers() {
    const { data, error } = await db.from('cosplay_community_members')
      .select('community_id,profile_id,role,joined_at')
      .eq('community_id', state.group.id)
      .order('joined_at',{ascending:true});
    if (error) throw error;
    state.members = data || [];
    state.membership = state.members.find(m => m.profile_id === state.profile.id) || null;
    await loadProfiles([...state.members.map(m=>m.profile_id), state.group.owner_profile_id]);
    renderHeader();
    renderMembers();
  }

  function paintCommunityAvatar() {
    const root = $('groupAvatar');
    if (!root) return;
    root.replaceChildren();
    const src = safeUrl(state.group?.avatar_url);
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `Foto da comunidade ${state.group.name}`;
      root.appendChild(img);
    } else root.textContent = String(state.group?.name || 'C').trim().charAt(0).toUpperCase();
  }

  function renderHeader() {
    $('groupName').textContent = state.group.name;
    $('groupDescription').textContent = state.group.description || 'Esta comunidade ainda não possui descrição.';
    $('groupCategory').textContent = state.group.category || 'Geral';
    $('groupMemberCount').textContent = String(state.members.length);
    document.title = `${state.group.name} — CosplayChess`;
    paintCommunityAvatar();

    const cover = q('.group-cover');
    if (cover) {
      const src = safeUrl(state.group.cover_url);
      cover.style.backgroundImage = src ? `linear-gradient(180deg,rgba(4,9,16,.04),rgba(4,9,16,.62)),url("${src.replace(/"/g,'%22')}")` : '';
      cover.style.backgroundPosition = 'center';
      cover.style.backgroundSize = 'cover';
    }

    const join = $('groupJoinButton');
    if (join) {
      join.disabled = false;
      if (isOwner()) { join.textContent = 'Você é o dono'; join.disabled = true; }
      else if (isMember()) join.textContent = 'Sair da comunidade';
      else if (state.group.join_policy === 'approval') join.textContent = 'Solicitar entrada';
      else join.textContent = 'Entrar na comunidade';
    }
    $('groupNewTopicToggle').hidden = !isMember();
    $('groupNewPollToggle').hidden = !isMember();
    if ($('groupEditToggle')) $('groupEditToggle').hidden = !isOwner();

    const copy = q('.group-side>.group-card:first-child .group-copy');
    if (copy) {
      let privacy = q('.group-privacy-row', copy);
      if (!privacy) {
        privacy = document.createElement('div');
        privacy.className = 'group-privacy-row';
        copy.appendChild(privacy);
      }
      privacy.replaceChildren();
      const a = document.createElement('span');
      a.className = `group-privacy-chip${state.group.visibility === 'private' ? ' private' : ''}`;
      a.textContent = state.group.visibility === 'private' ? '🔒 Privada' : '🌐 Pública';
      const b = document.createElement('span');
      b.className = `group-privacy-chip${state.group.join_policy === 'approval' ? ' approval' : ''}`;
      b.textContent = state.group.join_policy === 'approval' ? 'Entrada por aprovação' : 'Entrada livre';
      privacy.append(a,b);
    }

    let rules = $('groupV13Rules');
    if (!rules) {
      rules = document.createElement('section');
      rules.id = 'groupV13Rules';
      rules.className = 'group-card group-rules-card';
      q('.group-nav')?.insertAdjacentElement('afterend', rules);
    }
    if (rules) {
      rules.replaceChildren();
      const box = document.createElement('div'); box.className = 'group-copy';
      const kicker = document.createElement('span'); kicker.className='kicker'; kicker.textContent='REGRAS';
      const h = document.createElement('h3'); h.textContent='Sobre esta comunidade';
      const text = document.createElement('div'); text.className='group-rules-text'; text.textContent = state.group.rules || 'Respeite os outros participantes, mantenha as conversas dentro do tema e ajude a comunidade a ser um espaço legal para todo mundo.';
      box.append(kicker,h,text); rules.appendChild(box);
    }

    const owner = state.profiles.get(state.group.owner_profile_id);
    const ownerRoot = $('groupOwner');
    if (ownerRoot) {
      ownerRoot.replaceChildren();
      const link = document.createElement('a');
      link.href = profileHref(owner);
      link.style.cssText = 'display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none';
      link.appendChild(avatarNode(owner,'member-avatar'));
      const name = document.createElement('b'); name.textContent = displayName(owner); link.appendChild(name);
      ownerRoot.appendChild(link);
    }
  }

  function memberRow(m, manage=false) {
    const p = state.profiles.get(m.profile_id);
    const row = document.createElement('div'); row.className='member-row';
    const a = document.createElement('a'); a.href=profileHref(p); a.appendChild(avatarNode(p,'member-avatar')); row.appendChild(a);
    const copy = document.createElement('a'); copy.href=profileHref(p); copy.className='member-copy'; copy.style.cssText='text-decoration:none;color:inherit';
    const b=document.createElement('b');b.textContent=displayName(p);const s=document.createElement('span');s.textContent=p?.character_name||'Participante CosplayChess';copy.append(b,s);row.appendChild(copy);
    const role=document.createElement('span');role.className='member-role';role.textContent=m.role==='owner'?'dono':m.role==='moderator'?'moderador':'membro';row.appendChild(role);
    if (manage && isOwner() && m.role !== 'owner') {
      const tools=document.createElement('div');tools.className='member-manage';
      const mod=document.createElement('button');mod.type='button';mod.textContent=m.role==='moderator'?'Remover mod':'Tornar mod';
      mod.addEventListener('click',async()=>{setBusy(mod,true);const{error}=await db.rpc('cosplay_community_set_member_role',{p_community:state.group.id,p_profile:m.profile_id,p_role:m.role==='moderator'?'member':'moderator'});if(!error)await loadMembers();else setBusy(mod,false);});
      const kick=document.createElement('button');kick.type='button';kick.textContent='Remover';
      kick.addEventListener('click',async()=>{if(!confirm(`Remover ${displayName(p)} da comunidade?`))return;setBusy(kick,true);const{error}=await db.from('cosplay_community_members').delete().eq('community_id',state.group.id).eq('profile_id',m.profile_id);if(!error)await loadMembers();else setBusy(kick,false);});
      tools.append(mod,kick);row.appendChild(tools);
    }
    return row;
  }

  function renderMembers() {
    const main=$('groupMembersMain'), rail=$('groupMembersRail');
    if (!main || !rail) return;
    main.replaceChildren(); rail.replaceChildren();
    if (!state.members.length) { main.innerHTML='<div class="group-empty">Nenhum membro.</div>'; rail.innerHTML='<div class="group-empty">Nenhum membro.</div>'; return; }
    const fragMain=document.createDocumentFragment(), fragRail=document.createDocumentFragment();
    state.members.forEach(m=>fragMain.appendChild(memberRow(m,true)));
    state.members.slice(0,8).forEach(m=>fragRail.appendChild(memberRow(m,false)));
    main.appendChild(fragMain); rail.appendChild(fragRail);
  }

  async function loadTopics() {
    const { data:topics, error } = await db.from('cosplay_community_topics')
      .select('id,community_id,author_profile_id,title,body,is_pinned,is_locked,created_at,updated_at')
      .eq('community_id', state.group.id)
      .order('is_pinned',{ascending:false})
      .order('created_at',{ascending:false});
    if (error) throw error;
    state.topics = topics || [];
    const ids = state.topics.map(t=>t.id);
    let replies=[];
    if (ids.length) {
      const { data, error:re } = await db.from('cosplay_community_topic_replies')
        .select('id,topic_id,author_profile_id,body,created_at,updated_at')
        .in('topic_id', ids)
        .order('created_at',{ascending:true});
      if (re) throw re;
      replies = data || [];
    }
    state.replies = replies;
    await loadProfiles([...state.topics.map(t=>t.author_profile_id), ...state.replies.map(r=>r.author_profile_id)]);
    renderTopics();
  }

  async function deleteTopic(topic, button) {
    if (!canDeleteTopic(topic)) return;
    if (!confirm(`Excluir o tópico “${topic.title}”? As respostas também serão excluídas.`)) return;
    setBusy(button,true,'Excluindo…');
    const { error } = await db.from('cosplay_community_topics').delete().eq('id',topic.id);
    if (error) { alert('Não foi possível excluir o tópico agora.'); setBusy(button,false); return; }
    state.topics = state.topics.filter(t=>t.id!==topic.id);
    state.replies = state.replies.filter(r=>r.topic_id!==topic.id);
    renderTopics();
  }

  async function deleteReply(reply, button) {
    if (!canDeleteReply(reply)) return;
    if (!confirm('Excluir esta resposta?')) return;
    setBusy(button,true,'…');
    const { error } = await db.from('cosplay_community_topic_replies').delete().eq('id',reply.id);
    if (error) { alert('Não foi possível excluir a resposta agora.'); setBusy(button,false); return; }
    state.replies = state.replies.filter(r=>r.id!==reply.id);
    renderTopics();
  }

  function renderTopics() {
    const root=$('groupTopics'); if(!root) return;
    root.replaceChildren();
    if (!state.topics.length) { root.innerHTML='<div class="group-empty">Nenhum tópico ainda. Membros podem começar a primeira conversa.</div>'; return; }
    const byTopic=new Map();
    state.replies.forEach(r=>{if(!byTopic.has(r.topic_id))byTopic.set(r.topic_id,[]);byTopic.get(r.topic_id).push(r);});
    const frag=document.createDocumentFragment();

    state.topics.forEach(t=>{
      const author=state.profiles.get(t.author_profile_id);
      const card=document.createElement('article');card.className='topic-card';card.dataset.topicId=t.id;
      const head=document.createElement('div');head.className='topic-head';head.appendChild(avatarNode(author));
      const copy=document.createElement('div');copy.className='topic-copy';
      const title=document.createElement('h3');title.textContent=t.title;
      const body=document.createElement('p');body.textContent=t.body||'';
      const small=document.createElement('small');small.textContent=`${displayName(author)} · ${fmt(t.created_at)}`;
      copy.append(title,body,small);head.appendChild(copy);
      const badges=document.createElement('div');badges.className='topic-badges';
      if(t.is_pinned){const x=document.createElement('span');x.textContent='fixado';badges.appendChild(x);}
      if(t.is_locked){const x=document.createElement('span');x.textContent='fechado';badges.appendChild(x);}
      head.appendChild(badges);card.appendChild(head);

      if (isModerator() || canDeleteTopic(t)) {
        const controls=document.createElement('div');controls.className='topic-controls';
        if(isModerator()){
          const pin=document.createElement('button');pin.type='button';pin.textContent=t.is_pinned?'Desafixar':'Fixar';pin.addEventListener('click',async()=>{setBusy(pin,true);const{error}=await db.from('cosplay_community_topics').update({is_pinned:!t.is_pinned,updated_at:new Date().toISOString()}).eq('id',t.id);if(!error)await loadTopics();else setBusy(pin,false);});
          const lock=document.createElement('button');lock.type='button';lock.textContent=t.is_locked?'Reabrir':'Fechar';lock.addEventListener('click',async()=>{setBusy(lock,true);const{error}=await db.from('cosplay_community_topics').update({is_locked:!t.is_locked,updated_at:new Date().toISOString()}).eq('id',t.id);if(!error)await loadTopics();else setBusy(lock,false);});
          controls.append(pin,lock);
        }
        if(canDeleteTopic(t)){
          const del=document.createElement('button');del.type='button';del.className='danger topic-delete';del.textContent='Excluir tópico';del.addEventListener('click',()=>deleteTopic(t,del));controls.appendChild(del);
        }
        card.appendChild(controls);
      }

      const replies=document.createElement('div');replies.className='topic-replies';
      (byTopic.get(t.id)||[]).forEach(r=>{
        const p=state.profiles.get(r.author_profile_id);const rr=document.createElement('div');rr.className='topic-reply';rr.appendChild(avatarNode(p));
        const bubble=document.createElement('div');bubble.className='topic-reply-body';const b=document.createElement('b');b.textContent=displayName(p);const text=document.createElement('p');text.textContent=r.body;const time=document.createElement('small');time.textContent=fmt(r.created_at);bubble.append(b,text,time);rr.appendChild(bubble);
        if(canDeleteReply(r)){const del=document.createElement('button');del.className='topic-reply-delete';del.type='button';del.title='Excluir resposta';del.textContent='Excluir';del.addEventListener('click',()=>deleteReply(r,del));rr.appendChild(del);}
        replies.appendChild(rr);
      });
      if(isMember()&&!t.is_locked){
        const form=document.createElement('form');form.className='reply-form';const input=document.createElement('input');input.maxLength=3000;input.required=true;input.placeholder='Responder ao tópico...';const send=document.createElement('button');send.className='btn dark';send.type='submit';send.textContent='Responder';form.append(input,send);
        form.addEventListener('submit',async e=>{e.preventDefault();const text=input.value.trim();if(!text)return;setBusy(send,true,'Enviando…');const{error}=await db.from('cosplay_community_topic_replies').insert({topic_id:t.id,author_profile_id:state.profile.id,body:text});if(!error)await loadTopics();else{setBusy(send,false);alert('Não foi possível responder agora.');}});
        replies.appendChild(form);
      }
      card.appendChild(replies);frag.appendChild(card);
    });
    root.appendChild(frag);
  }

  async function loadPolls() {
    const { data:polls, error } = await db.from('cosplay_community_polls')
      .select('id,community_id,author_profile_id,question,closes_at,created_at')
      .eq('community_id',state.group.id)
      .order('created_at',{ascending:false});
    if(error) throw error;
    state.polls=polls||[];
    const ids=state.polls.map(p=>p.id);
    if(!ids.length){state.options=[];state.votes=[];renderPolls();return;}
    const [{data:options,error:oe},{data:votes,error:ve}] = await Promise.all([
      db.from('cosplay_community_poll_options').select('id,poll_id,label,sort_order').in('poll_id',ids).order('sort_order',{ascending:true}),
      db.from('cosplay_community_poll_votes').select('poll_id,option_id,profile_id,created_at').in('poll_id',ids)
    ]);
    if(oe) throw oe;if(ve) throw ve;
    state.options=options||[];state.votes=votes||[];renderPolls();
  }

  function renderPolls(){
    const root=$('groupPolls');if(!root)return;root.replaceChildren();
    if(!state.polls.length){root.innerHTML='<div class="group-empty">Nenhuma enquete ainda.</div>';return;}
    const frag=document.createDocumentFragment();
    state.polls.forEach(p=>{const card=document.createElement('article');card.className='poll-card';const h=document.createElement('h3');h.textContent=p.question;card.appendChild(h);const opts=state.options.filter(o=>o.poll_id===p.id),total=state.votes.filter(v=>v.poll_id===p.id).length,mine=state.votes.find(v=>v.poll_id===p.id&&v.profile_id===state.profile.id);opts.forEach(o=>{const label=document.createElement('label');label.className='poll-option';const radio=document.createElement('input');radio.type='radio';radio.name=`poll-${p.id}`;radio.checked=mine?.option_id===o.id;radio.disabled=!isMember();radio.addEventListener('change',async()=>{radio.disabled=true;await db.from('cosplay_community_poll_votes').delete().eq('poll_id',p.id).eq('profile_id',state.profile.id);const{error}=await db.from('cosplay_community_poll_votes').insert({poll_id:p.id,option_id:o.id,profile_id:state.profile.id});if(!error)await loadPolls();else radio.disabled=false;});const span=document.createElement('span');span.textContent=o.label;const count=state.votes.filter(v=>v.option_id===o.id).length;const b=document.createElement('b');b.textContent=`${count}${total?` · ${Math.round(count/total*100)}%`:''}`;label.append(radio,span,b);card.appendChild(label);});const small=document.createElement('div');small.className='group-status';small.textContent=`${total} ${total===1?'voto':'votos'}`;card.appendChild(small);frag.appendChild(card);});
    root.appendChild(frag);
  }

  async function loadAdmin(){
    const old=$('groupV9Admin');old?.remove();const old2=$('groupV13Admin');old2?.remove();
    if(!isModerator()) return;
    const [{data:req},{data:bans}] = await Promise.all([
      db.from('cosplay_community_join_requests').select('community_id,profile_id,status,created_at').eq('community_id',state.group.id).eq('status','pending').order('created_at',{ascending:true}),
      db.from('cosplay_community_bans').select('community_id,profile_id,banned_by_profile_id,reason,created_at').eq('community_id',state.group.id).order('created_at',{ascending:false})
    ]);
    state.requests=req||[];state.bans=bans||[];
    await loadProfiles([...state.requests.map(x=>x.profile_id),...state.bans.map(x=>x.profile_id)]);
    renderAdmin();
  }

  function adminMini(profileId){const p=state.profiles.get(profileId);const src=safeUrl(p?.character_photo_url);const wrap=document.createElement('div');wrap.className='group-v9-admin-person';if(src){const img=document.createElement('img');img.src=src;img.alt='';wrap.appendChild(img);}else{const a=document.createElement('span');a.textContent='♜';wrap.appendChild(a);}const b=document.createElement('b');b.textContent=displayName(p);wrap.appendChild(b);return wrap;}

  function renderAdmin(){
    if(!isModerator())return;
    let root=$('groupV13Admin');if(!root){root=document.createElement('section');root.id='groupV13Admin';root.className='group-card group-v9-moderation';q('.group-right')?.appendChild(root);}root.replaceChildren();
    const copy=document.createElement('div');copy.className='group-copy';const k=document.createElement('span');k.className='kicker';k.textContent='MODERAÇÃO';copy.appendChild(k);
    const requests=document.createElement('section');requests.className='group-v9-admin-section';const rh=document.createElement('div');rh.className='group-v9-admin-head';rh.innerHTML=`<b>Pedidos de entrada</b><span>${state.requests.length}</span>`;requests.appendChild(rh);
    const rl=document.createElement('div');rl.className='group-v9-admin-list';if(!state.requests.length)rl.innerHTML='<div class="group-v9-admin-empty">Nenhum pedido pendente.</div>';state.requests.forEach(r=>{const row=document.createElement('div');row.className='group-v9-admin-row';row.appendChild(adminMini(r.profile_id));const tools=document.createElement('span');tools.className='group-v9-admin-actions';const yes=document.createElement('button');yes.className='primary';yes.type='button';yes.textContent='Aprovar';const no=document.createElement('button');no.type='button';no.textContent='Recusar';yes.addEventListener('click',()=>reviewJoin(r.profile_id,true,yes));no.addEventListener('click',()=>reviewJoin(r.profile_id,false,no));tools.append(yes,no);row.appendChild(tools);rl.appendChild(row);});requests.appendChild(rl);copy.appendChild(requests);

    const members=document.createElement('section');members.className='group-v9-admin-section';const mh=document.createElement('div');mh.className='group-v9-admin-head';mh.innerHTML=`<b>Gerenciar membros</b><span>${state.members.length}</span>`;members.appendChild(mh);const ml=document.createElement('div');ml.className='group-v9-admin-list';state.members.filter(m=>m.role!=='owner').forEach(m=>{const row=document.createElement('div');row.className='group-v9-admin-row';row.appendChild(adminMini(m.profile_id));const tools=document.createElement('span');tools.className='group-v9-admin-actions';if(isOwner()){const role=document.createElement('button');role.type='button';role.textContent=m.role==='moderator'?'Remover mod':'Tornar mod';role.addEventListener('click',()=>changeRole(m,role));tools.appendChild(role);}const ban=document.createElement('button');ban.type='button';ban.className='danger';ban.textContent='Banir';ban.addEventListener('click',()=>banMember(m.profile_id,ban));tools.appendChild(ban);row.appendChild(tools);ml.appendChild(row);});if(!ml.childNodes.length)ml.innerHTML='<div class="group-v9-admin-empty">Sem outros membros.</div>';members.appendChild(ml);copy.appendChild(members);root.appendChild(copy);
  }

  async function reviewJoin(profileId,approve,button){setBusy(button,true);const{error}=await db.rpc('cosplay_community_review_join',{p_community:state.group.id,p_profile:profileId,p_approve:approve});if(!error){await loadMembers();await loadAdmin();}else setBusy(button,false);}
  async function changeRole(m,button){setBusy(button,true);const{error}=await db.rpc('cosplay_community_set_member_role',{p_community:state.group.id,p_profile:m.profile_id,p_role:m.role==='moderator'?'member':'moderator'});if(!error){await loadMembers();await loadAdmin();}else setBusy(button,false);}
  async function banMember(profileId,button){const p=state.profiles.get(profileId);const reason=prompt(`Motivo do banimento de ${displayName(p)}:`, '');if(reason===null)return;setBusy(button,true);const{error}=await db.rpc('cosplay_community_ban_member',{p_community:state.group.id,p_profile:profileId,p_reason:reason});if(!error){await loadMembers();await loadAdmin();}else setBusy(button,false);}

  async function joinAction(){
    const b=$('groupJoinButton');if(!b||isOwner())return;setBusy(b,true);
    try{
      if(isMember()){
        const{error}=await db.from('cosplay_community_members').delete().eq('community_id',state.group.id).eq('profile_id',state.profile.id);if(error)throw error;
      } else {
        const{error}=await db.rpc('cosplay_community_request_join',{p_community:state.group.id});if(error)throw error;
      }
      await loadMembers();await Promise.all([loadTopics(),loadPolls(),loadAdmin()]);
    } catch { alert('Não foi possível atualizar sua participação agora.'); setBusy(b,false); }
  }

  function wireStaticActions(){
    $('groupJoinButton')?.addEventListener('click',joinAction);
    $('groupShareButton')?.addEventListener('click',async()=>{const url=location.href;try{if(navigator.share)await navigator.share({title:`${state.group.name} · CosplayChess`,text:state.group.description||'Comunidade CosplayChess',url});else{await navigator.clipboard.writeText(url);const b=$('groupShareButton');const old=b.textContent;b.textContent='Link copiado ✓';setTimeout(()=>b.textContent=old,1400);}}catch{}});
    $('groupNewTopicToggle')?.addEventListener('click',()=>{$('groupTopicForm').hidden=!$('groupTopicForm').hidden;});
    $('groupNewPollToggle')?.addEventListener('click',()=>{$('groupPollForm').hidden=!$('groupPollForm').hidden;});
    $('groupTopicForm')?.addEventListener('submit',async e=>{e.preventDefault();const title=$('groupTopicTitle').value.trim(),body=$('groupTopicBody').value.trim(),st=$('groupTopicStatus'),btn=e.currentTarget.querySelector('button[type="submit"]');if(!title)return;st.textContent='Publicando...';setBusy(btn,true,'Publicando…');const{error}=await db.from('cosplay_community_topics').insert({community_id:state.group.id,author_profile_id:state.profile.id,title,body});if(error){st.textContent='Não foi possível publicar.';setBusy(btn,false);return;}e.currentTarget.reset();e.currentTarget.hidden=true;st.textContent='';setBusy(btn,false);await loadTopics();});
    $('groupPollForm')?.addEventListener('submit',async e=>{e.preventDefault();const question=$('groupPollQuestion').value.trim(),options=qa('.groupPollOption').map(i=>i.value.trim()).filter(Boolean),st=$('groupPollStatus'),btn=e.currentTarget.querySelector('button[type="submit"]');if(!question||options.length<2){st.textContent='Informe uma pergunta e pelo menos 2 opções.';return;}st.textContent='Criando...';setBusy(btn,true,'Criando…');const{data,error}=await db.from('cosplay_community_polls').insert({community_id:state.group.id,author_profile_id:state.profile.id,question}).select('id').single();if(error){st.textContent='Não foi possível criar a enquete.';setBusy(btn,false);return;}const rows=options.map((label,i)=>({poll_id:data.id,label,sort_order:i}));const{error:oe}=await db.from('cosplay_community_poll_options').insert(rows);if(oe){st.textContent='Enquete criada, mas as opções falharam.';setBusy(btn,false);return;}e.currentTarget.reset();e.currentTarget.hidden=true;st.textContent='';setBusy(btn,false);await loadPolls();});
    qa('[data-group-view]').forEach(button=>button.addEventListener('click',()=>{const name=button.dataset.groupView;qa('[data-group-view]').forEach(x=>x.classList.toggle('active',x===button));qa('[data-group-panel]').forEach(panel=>panel.hidden=panel.dataset.groupPanel!==name);}));
  }

  async function init(){
    if(!db || !await loadProfile() || !await loadGroup()){
      const auth=$('groupAuth');if(auth){auth.hidden=false;auth.querySelector('h1').textContent='Comunidade indisponível';}return;
    }
    wireStaticActions();
    await loadMembers();
    await Promise.all([loadTopics(),loadPolls(),loadAdmin()]);
    $('groupContent').hidden=false;
    $('groupAuth').hidden=true;
  }

  init().catch(err=>{
    console.error('community-group-v13 failed',err);
    const auth=$('groupAuth');if(auth){auth.hidden=false;const h=auth.querySelector('h1');if(h)h.textContent='Não foi possível abrir a comunidade';}
  });
})();
