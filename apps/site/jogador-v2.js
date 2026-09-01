(() => {
  'use strict';
  const publicDb = window.getCosplayChessDb ? window.getCosplayChessDb() : window.COSPLAYCHESS_DB;
  const participantDb = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  const BUCKET = 'cosplaychess-social-media';
  const $ = (id) => document.getElementById(id);
  const state = { profile:null, viewer:null, user:null, achievementCount:0 };

  const safeUrl = (value) => { try { const u = new URL(String(value || '')); return ['http:','https:'].includes(u.protocol) ? u.href : null; } catch { return null; } };
  const signed = async (path) => { if (!path) return null; const { data, error } = await publicDb.storage.from(BUCKET).createSignedUrl(path, 3600); return error ? null : data?.signedUrl || null; };
  const fmtDate = (value) => { try { return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(value)); } catch { return ''; } };
  const displayName = (p) => p?.display_name || p?.nick || 'Participante';
  const show = (el, yes = true) => { if (el) el.hidden = !yes; };

  async function loadProfile() {
    const slug = String(new URLSearchParams(location.search).get('slug') || '').trim();
    if (!slug || !publicDb) return null;
    const { data, error } = await publicDb.from('cosplay_participant_profiles')
      .select('id,registration_id,public_slug,display_name,nick,character_name,character_photo_url,cover_photo_url,cover_position_x,cover_position_y,bio,instagram_url,tiktok_url,facebook_url,youtube_url,profile_visible,user_id')
      .eq('public_slug', slug).eq('profile_visible', true).neq('registration_status','cancelled').maybeSingle();
    return error ? null : data || null;
  }

  async function loadViewer() {
    if (!participantDb?.auth) return;
    const { data } = await participantDb.auth.getSession();
    state.user = data?.session?.user || null;
    if (!state.user) return;
    const { data: mine } = await participantDb.from('cosplay_participant_profiles')
      .select('id,user_id,public_slug,display_name,nick').eq('user_id', state.user.id)
      .neq('registration_status','cancelled').order('created_at',{ascending:false}).limit(1).maybeSingle();
    state.viewer = mine || null;
  }

  function renderBase() {
    const p = state.profile; const name = displayName(p);
    $('displayName').textContent = name;
    $('sideName').textContent = name;
    $('characterName').textContent = p.character_name || 'Personagem';
    $('sideCharacter').textContent = p.character_name || 'Personagem';
    $('bio').textContent = String(p.bio || '').trim() || 'Este participante ainda não escreveu uma bio.';
    const nick = String(p.nick || '').trim().replace(/^@/,'');
    $('nick').textContent = nick ? `@${nick}` : '';
    show($('nick'), Boolean(nick));
    $('sideNick').textContent = nick ? `@${nick}` : '—';
    document.title = `${name} — CosplayChess`;

    const avatar = $('avatar'); avatar.replaceChildren();
    const src = safeUrl(p.character_photo_url);
    if (src) { const img = new Image(); img.src = src; img.alt = `Cosplay de ${name}`; avatar.appendChild(img); }
    else { const s = document.createElement('span'); s.textContent = '♜'; avatar.appendChild(s); }

    const cover = $('cover');
    const coverSrc = safeUrl(p.cover_photo_url);
    if (coverSrc) {
      cover.replaceChildren(); const img = new Image(); img.src = coverSrc; img.alt = `Capa de ${name}`;
      const x = Number.isFinite(Number(p.cover_position_x)) ? Math.max(0,Math.min(100,Number(p.cover_position_x))) : 50;
      const y = Number.isFinite(Number(p.cover_position_y)) ? Math.max(0,Math.min(100,Number(p.cover_position_y))) : 50;
      img.style.objectPosition = `${x}% ${y}%`; cover.appendChild(img);
    }

    const socials = $('socialLinks'); socials.replaceChildren();
    [['Instagram',p.instagram_url],['TikTok',p.tiktok_url],['Facebook',p.facebook_url],['YouTube',p.youtube_url]].forEach(([label,url]) => {
      const href = safeUrl(url); if (!href) return; const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = `${label} ↗`; socials.appendChild(a);
    });
  }

  async function renderVerificationAndPresence() {
    const p = state.profile;
    const [{ data: verification }, { data: settings }] = await Promise.all([
      publicDb.from('cosplay_profile_verifications').select('label').eq('profile_id',p.id).maybeSingle(),
      publicDb.from('cosplay_profile_social_settings').select('birthday_day,birthday_month,show_birthday,show_online,last_seen_at').eq('profile_id',p.id).maybeSingle()
    ]);
    if (verification) { $('verifiedBadge').textContent = `✓ ${verification.label || 'Verificado'}`; show($('verifiedBadge'), true); }
    if (settings?.show_birthday && settings.birthday_day && settings.birthday_month) {
      $('birthday').textContent = `🎂 ${String(settings.birthday_day).padStart(2,'0')}/${String(settings.birthday_month).padStart(2,'0')}`; show($('birthday'),true);
    }
    if (settings?.show_online && settings.last_seen_at && Date.now() - new Date(settings.last_seen_at).getTime() < 5*60*1000) {
      $('presence').textContent = '● online agora'; show($('presence'),true); $('sideStatus').textContent = 'Online agora';
    }
  }

  async function renderStats() {
    const [{ data }, { count: achievements }] = await Promise.all([
      publicDb.rpc('cosplay_public_profile_social_stats',{target_profile_id:state.profile.id}),
      publicDb.from('cosplay_cosplayer_achievements').select('achievement_id',{count:'exact',head:true}).eq('registration_id',state.profile.registration_id)
    ]);
    const row = Array.isArray(data) ? data[0] : data || {};
    state.achievementCount = achievements || 0;
    const values = [row.friend_count || 0,row.post_count || 0,row.photo_count || 0,state.achievementCount];
    [...$('stats').children].forEach((el,i) => { el.querySelector('b').textContent = String(values[i] || 0); });
    $('achievementCount').textContent = String(state.achievementCount);
  }

  async function renderPosts() {
    const root = $('posts');
    const { data, error } = await publicDb.from('cosplay_social_posts').select('id,body,image_path,created_at').eq('author_profile_id',state.profile.id).eq('visibility','public').order('created_at',{ascending:false}).limit(30);
    root.replaceChildren(); const posts = error ? [] : data || [];
    if (!posts.length) { root.innerHTML = '<div class="empty">Nenhuma publicação pública ainda.</div>'; return; }
    for (const post of posts) {
      const card = document.createElement('article'); card.className = 'post-card';
      if (post.image_path) {
        const url = await signed(post.image_path); if (url) { card.classList.add('has-image'); const wrap=document.createElement('div');wrap.className='post-image';const img=new Image();img.src=url;img.alt=post.body||'Publicação cosplay';wrap.appendChild(img);card.appendChild(wrap); }
      }
      const copy=document.createElement('div');copy.className='post-copy'; if(post.body){const p=document.createElement('p');p.textContent=post.body;copy.appendChild(p);} const t=document.createElement('time');t.textContent=fmtDate(post.created_at);copy.appendChild(t);card.appendChild(copy);root.appendChild(card);
    }
  }

  async function renderAchievements() {
    const root=$('achievements'), highlights=$('achievementHighlights');
    const { data: awards, error } = await publicDb.from('cosplay_cosplayer_achievements').select('achievement_id,note,awarded_at').eq('registration_id',state.profile.registration_id).order('awarded_at',{ascending:false});
    root.replaceChildren(); highlights.replaceChildren();
    if(error || !awards?.length){root.innerHTML='<div class="empty">Nenhuma conquista pública desbloqueada ainda.</div>';highlights.innerHTML='<div class="empty small">Nenhuma conquista ainda.</div>';return;}
    const ids=[...new Set(awards.map(a=>a.achievement_id).filter(Boolean))];
    const { data: defs }=await publicDb.from('cosplay_achievements').select('id,title,description,icon,tier').in('id',ids).eq('published',true);
    const map=new Map((defs||[]).map(x=>[x.id,x])); let added=0;
    awards.forEach((a,idx)=>{const d=map.get(a.achievement_id);if(!d)return;added++;const c=document.createElement('article');c.className='achievement-card';c.innerHTML=`<div class="achievement-icon"></div><div><b></b><p></p><small></small></div>`;c.querySelector('.achievement-icon').textContent=d.icon||'🏆';c.querySelector('b').textContent=d.title||'Conquista';c.querySelector('p').textContent=a.note||d.description||'';c.querySelector('small').textContent=String(d.tier||'conquista').toUpperCase();root.appendChild(c);if(idx<3){const m=document.createElement('div');m.className='mini-achievement';m.innerHTML='<i></i><div><b></b><span></span></div>';m.querySelector('i').textContent=d.icon||'🏆';m.querySelector('b').textContent=d.title||'Conquista';m.querySelector('span').textContent=String(d.tier||'conquista');highlights.appendChild(m);}});
    $('achievementCount').textContent=String(added); [...$('stats').children][3].querySelector('b').textContent=String(added);
  }

  async function renderGallery() {
    const root=$('gallery'), highlights=$('galleryHighlights'); root.replaceChildren(); highlights.replaceChildren(); const paths=[];
    const { data: posts }=await publicDb.from('cosplay_social_posts').select('image_path,created_at').eq('author_profile_id',state.profile.id).eq('visibility','public').not('image_path','is',null).order('created_at',{ascending:false}).limit(18);
    (posts||[]).forEach(p=>p.image_path&&paths.push({path:p.image_path,href:'#'}));
    const { data: albums }=await publicDb.from('cosplay_social_albums').select('id').eq('owner_profile_id',state.profile.id).eq('visibility','public').limit(12);
    if(albums?.length){const { data: photos }=await publicDb.from('cosplay_social_album_photos').select('album_id,image_path,created_at').in('album_id',albums.map(a=>a.id)).order('created_at',{ascending:false}).limit(30);(photos||[]).forEach(p=>p.image_path&&paths.push({path:p.image_path,href:`./album.html?id=${encodeURIComponent(p.album_id)}`}));}
    const unique=[]; const seen=new Set(); for(const item of paths){if(seen.has(item.path))continue;seen.add(item.path);unique.push(item);} if(!unique.length){root.innerHTML='<div class="empty">Nenhuma foto pública ainda.</div>';highlights.innerHTML='<div class="empty small">Sem fotos públicas.</div>';return;}
    for(let i=0;i<unique.length;i++){const item=unique[i],url=await signed(item.path);if(!url)continue;const a=document.createElement('a');a.className='gallery-item';a.href=item.href;const img=new Image();img.src=url;img.alt=`Foto de ${displayName(state.profile)}`;img.loading='lazy';a.appendChild(img);root.appendChild(a);if(i<6){const h=a.cloneNode(true);h.className='';highlights.appendChild(h);}}
  }

  async function renderInterests() {
    const root=$('interests'); const { data }=await publicDb.from('cosplay_profile_interests').select('anime,games,films_series,music,hobbies').eq('profile_id',state.profile.id).maybeSingle(); root.replaceChildren();
    const labels={anime:'Anime & mangá',games:'Games',films_series:'Filmes & séries',music:'Música',hobbies:'Hobbies'}; let any=false;
    Object.entries(labels).forEach(([key,label])=>{if(!data?.[key])return;any=true;const c=document.createElement('div');c.className='interest';const b=document.createElement('b');b.textContent=label;const s=document.createElement('span');s.textContent=data[key];c.append(b,s);root.appendChild(c);});
    if(!any)root.innerHTML='<div class="empty">Nenhum interesse público cadastrado.</div>';
  }

  async function setupFriend() {
    const btn=$('friendButton'); if(!participantDb || !state.viewer){btn.textContent='Entrar para adicionar';btn.onclick=()=>location.href='./participante.html';return;}
    if(state.viewer.id===state.profile.id){btn.textContent='Abrir minha comunidade';btn.onclick=()=>location.href='./comunidade.html';return;}
    const { data: rows }=await participantDb.from('cosplay_friendships').select('id,requester_profile_id,addressee_profile_id,status').or(`and(requester_profile_id.eq.${state.viewer.id},addressee_profile_id.eq.${state.profile.id}),and(requester_profile_id.eq.${state.profile.id},addressee_profile_id.eq.${state.viewer.id})`).order('created_at',{ascending:false}).limit(1);
    const r=rows?.[0]; if(r?.status==='accepted'){btn.textContent='✓ Amigos';btn.classList.remove('primary');btn.classList.add('ghost');btn.onclick=()=>location.href='./comunidade.html';return;} if(r?.status==='pending'){btn.textContent=r.addressee_profile_id===state.viewer.id?'Solicitação recebida':'Solicitação enviada ✓';btn.classList.remove('primary');btn.classList.add('ghost');btn.onclick=()=>location.href='./comunidade.html';return;}
    btn.onclick=async()=>{btn.disabled=true;const{error}=await participantDb.from('cosplay_friendships').insert({requester_profile_id:state.viewer.id,addressee_profile_id:state.profile.id,status:'pending'});btn.disabled=false;btn.textContent=error?'Tentar novamente':'Solicitação enviada ✓';};
  }

  function setupTabs(){document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('[data-panel]').forEach(p=>p.classList.toggle('active',p.dataset.panel===btn.dataset.tab));if(innerWidth<920)document.querySelector(`[data-panel="${btn.dataset.tab}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});}));}
  function setupShare(){ $('shareButton').addEventListener('click',async()=>{const title=`${displayName(state.profile)} no CosplayChess`,url=location.href;try{if(navigator.share)await navigator.share({title,url});else{await navigator.clipboard.writeText(url);$('shareButton').textContent='Link copiado ✓';setTimeout(()=>$('shareButton').textContent='Compartilhar',1600);}}catch{}}); }

  async function init(){
    state.profile=await loadProfile(); if(!state.profile){show($('stateLoading'),false);show($('stateError'),true);return;}
    await loadViewer(); renderBase(); setupTabs(); setupShare(); show($('stateLoading'),false); show($('profileApp'),true);
    await Promise.allSettled([renderVerificationAndPresence(),renderStats(),renderPosts(),renderAchievements(),renderGallery(),renderInterests(),setupFriend()]);
  }
  init();
})();
