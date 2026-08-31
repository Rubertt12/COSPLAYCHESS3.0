(() => {
  'use strict';
  if (window.__CC_SOCIAL_RICH_CONTENT_V1__) return;
  window.__CC_SOCIAL_RICH_CONTENT_V1__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const BUCKET = 'cosplaychess-social-media';
  const $ = (id) => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = {
    user: null,
    profile: null,
    mode: 'post',
    videoFile: null,
    profiles: new Map(),
    signed: new Map(),
    stories: [],
    storyIndex: 0,
    feedBusy: false,
    feedTimer: null,
  };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeImage = (value) => { try { const url = new URL(String(value || ''), location.href); return ['http:','https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
  const displayName = (profile) => profile?.display_name || profile?.nick || 'Participante';
  const fmtDate = (value) => { try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); } catch { return ''; } };
  const storyAge = (value) => { const minutes=Math.max(1,Math.round((Date.now()-new Date(value).getTime())/60000)); return minutes<60?`${minutes} min`:minutes<1440?`${Math.floor(minutes/60)} h`:`${Math.floor(minutes/1440)} d`; };

  const getMe = async () => {
    if (state.profile) return state.profile;
    const { data: auth } = await db.auth.getSession();
    state.user = auth?.session?.user || null;
    if (!state.user) return null;
    const { data, error } = await db.from('cosplay_participant_profiles')
      .select('id,user_id,public_slug,display_name,nick,character_name,character_photo_url,created_at')
      .eq('user_id',state.user.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    state.profile = data;
    state.profiles.set(data.id,data);
    return data;
  };

  const loadProfiles = async (ids) => {
    const missing=[...new Set((ids||[]).filter(Boolean))].filter((id)=>!state.profiles.has(id));
    if(!missing.length)return;
    const {data}=await db.from('cosplay_participant_profiles')
      .select('id,public_slug,display_name,nick,character_name,character_photo_url')
      .in('id',missing);
    (data||[]).forEach((profile)=>state.profiles.set(profile.id,profile));
  };

  const signedUrl = async (path) => {
    if (!path) return '';
    if (state.signed.has(path)) return state.signed.get(path);
    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path,3600);
    const url = error ? '' : data?.signedUrl || '';
    state.signed.set(path,url);
    return url;
  };

  const setComposerStatus = (message='',kind='') => {
    const el=$('communityPostStatus');
    if(!el)return;
    el.textContent=message;
    el.className=`community-status${kind?` ${kind}`:''}`;
  };

  const ensureRichPanel = () => {
    const form=$('communityPostForm');
    const body=$('communityPostBody');
    if(!form||!body)return null;
    let panel=$('ccRichComposerPanel');
    if(panel)return panel;
    panel=document.createElement('div');
    panel.id='ccRichComposerPanel';
    panel.className='cc-rich-composer-panel';
    panel.hidden=true;
    body.insertAdjacentElement('afterend',panel);
    return panel;
  };

  const resetRichMode = () => {
    state.mode='post';
    state.videoFile=null;
    const panel=$('ccRichComposerPanel');
    if(panel){panel.hidden=true;panel.replaceChildren();}
    qa('[data-cc-rich-action]').forEach((button)=>button.classList.remove('active'));
    const submit=$('communityPostSubmit');
    if(submit)submit.textContent='Publicar';
  };

  const setMode = (mode, trigger) => {
    const panel=ensureRichPanel();
    if(!panel)return;
    state.mode=mode;
    qa('[data-cc-rich-action]').forEach((button)=>button.classList.toggle('active',button===trigger));
    panel.hidden=false;
    panel.replaceChildren();
    const head=document.createElement('div');
    head.className='cc-rich-composer-head';
    head.innerHTML=`<b>${mode==='video'?'Vídeo':mode==='poll'?'Enquete':'Evento'}</b><button type="button" data-cc-rich-close aria-label="Cancelar">×</button>`;
    panel.appendChild(head);
    head.querySelector('[data-cc-rich-close]')?.addEventListener('click',resetRichMode);
    const submit=$('communityPostSubmit');
    if(submit)submit.textContent=mode==='event'?'Publicar evento':'Publicar';

    if(mode==='video'){
      const box=document.createElement('label');
      box.className='cc-rich-upload';
      box.innerHTML='<span>▣</span><div><b>Escolha um vídeo</b><small>MP4 ou WebM · até 25 MB</small></div><input id="ccPostVideo" type="file" accept="video/mp4,video/webm">';
      panel.appendChild(box);
      const preview=document.createElement('div');preview.id='ccVideoPreview';preview.className='cc-rich-preview';preview.hidden=true;panel.appendChild(preview);
      box.querySelector('input')?.addEventListener('change',(event)=>{
        const file=event.target.files?.[0]||null;
        state.videoFile=file;
        preview.replaceChildren();
        if(!file){preview.hidden=true;return;}
        if(!['video/mp4','video/webm'].includes(file.type)||file.size>25*1024*1024){state.videoFile=null;event.target.value='';setComposerStatus('Use MP4 ou WebM com até 25 MB.','error');return;}
        const url=URL.createObjectURL(file);const video=document.createElement('video');video.src=url;video.controls=true;video.muted=true;video.playsInline=true;video.onloadedmetadata=()=>URL.revokeObjectURL(url);preview.appendChild(video);preview.hidden=false;setComposerStatus('');
      });
    }

    if(mode==='poll'){
      const helper=document.createElement('p');helper.className='cc-rich-help';helper.textContent='Use o texto acima como pergunta e adicione de 2 a 6 opções.';panel.appendChild(helper);
      const options=document.createElement('div');options.id='ccPollOptions';options.className='cc-poll-options';
      options.innerHTML='<input maxlength="120" placeholder="Opção 1" required><input maxlength="120" placeholder="Opção 2" required>';
      panel.appendChild(options);
      const add=document.createElement('button');add.type='button';add.className='cc-rich-secondary';add.textContent='＋ Adicionar opção';panel.appendChild(add);
      add.addEventListener('click',()=>{if(options.children.length>=6)return;const input=document.createElement('input');input.maxLength=120;input.placeholder=`Opção ${options.children.length+1}`;options.appendChild(input);input.focus();if(options.children.length>=6)add.disabled=true;});
    }

    if(mode==='event'){
      const grid=document.createElement('div');grid.className='cc-event-composer';
      grid.innerHTML='<label class="wide"><span>Título do evento</span><input id="ccEventTitle" maxlength="120" required placeholder="Ex.: Encontro CosplayChess"></label><label><span>Data</span><input id="ccEventDate" type="date" required></label><label><span>Horário</span><input id="ccEventTime" type="time"></label><label class="wide"><span>Local</span><input id="ccEventLocation" maxlength="180" placeholder="Local ou cidade"></label><p class="wide">O texto da publicação acima será usado como descrição do evento.</p>';
      panel.appendChild(grid);
      const date=$('ccEventDate');if(date)date.min=new Date().toISOString().slice(0,10);
    }
  };

  const wireComposerButtons = () => {
    const controls=q('.community-composer-controls');
    if(!controls)return;
    const labels={Vídeo:'video',Enquete:'poll',Evento:'event'};
    qa('.community-file-btn[aria-disabled="true"]',controls).forEach((old)=>{
      const label=Object.keys(labels).find((name)=>(old.textContent||'').includes(name));
      if(!label)return;
      const button=document.createElement('button');
      button.type='button';button.className='community-file-btn';button.dataset.ccRichAction=labels[label];button.innerHTML=old.innerHTML;button.removeAttribute('aria-disabled');
      old.replaceWith(button);
      button.addEventListener('click',()=>{const mode=button.dataset.ccRichAction;if(state.mode===mode){resetRichMode();return;}setMode(mode,button);});
    });
  };

  const uploadVideo = async (file,folder='videos') => {
    if(!state.user||!state.profile||!file)return '';
    if(!['video/mp4','video/webm'].includes(file.type))throw new Error('Use vídeo MP4 ou WebM.');
    if(file.size>25*1024*1024)throw new Error('O vídeo pode ter no máximo 25 MB.');
    const ext=file.type==='video/webm'?'webm':'mp4';
    const path=`${state.user.id}/${state.profile.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
    const {error}=await db.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(error)throw error;
    return path;
  };

  const addTag = async (postId) => {
    const taggedId=String($('communityPostTag')?.value||'').trim();
    if(!taggedId)return;
    await db.from('cosplay_social_post_tags').insert({post_id:postId,profile_id:taggedId});
  };

  const publishRich = async (event) => {
    if(state.mode==='post')return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const me=await getMe();
    if(!me)return;
    const submit=$('communityPostSubmit');
    const body=String($('communityPostBody')?.value||'').trim();
    const visibility=$('communityPostVisibility')?.value==='public'?'public':'friends';
    if(submit)submit.disabled=true;
    setComposerStatus('Publicando...');
    let uploaded='';
    let personalEventId='';
    try{
      if(state.mode==='video'){
        if(!state.videoFile)throw new Error('Escolha um vídeo antes de publicar.');
        uploaded=await uploadVideo(state.videoFile,'videos');
        const {data,error}=await db.from('cosplay_social_posts').insert({author_profile_id:me.id,body:body||null,video_path:uploaded,post_type:'post',metadata:{media_kind:'video'},visibility}).select('id').single();
        if(error)throw error;await addTag(data.id);
      }else if(state.mode==='poll'){
        if(body.length<2)throw new Error('Escreva a pergunta da enquete.');
        const options=qa('#ccPollOptions input').map((input)=>input.value.trim()).filter(Boolean);
        const unique=[...new Set(options.map((value)=>value.toLocaleLowerCase('pt-BR')))];
        if(options.length<2)throw new Error('Adicione pelo menos duas opções.');
        if(unique.length!==options.length)throw new Error('As opções da enquete precisam ser diferentes.');
        const {data,error}=await db.from('cosplay_social_posts').insert({author_profile_id:me.id,body,post_type:'poll',metadata:{options},visibility}).select('id').single();
        if(error)throw error;await addTag(data.id);
      }else if(state.mode==='event'){
        const title=String($('ccEventTitle')?.value||'').trim();
        const eventDate=String($('ccEventDate')?.value||'');
        const startTime=String($('ccEventTime')?.value||'')||null;
        const location=String($('ccEventLocation')?.value||'').trim();
        if(title.length<2||!eventDate)throw new Error('Informe o título e a data do evento.');
        const {data:calendar,error:calendarError}=await db.from('cosplay_personal_calendar_events').insert({profile_id:me.id,title,event_date:eventDate,start_time:startTime,location,notes:body,updated_at:new Date().toISOString()}).select('id').single();
        if(calendarError)throw calendarError;
        personalEventId=calendar.id;
        const metadata={title,event_date:eventDate,start_time:startTime,location,calendar_event_id:calendar.id};
        const {data,error}=await db.from('cosplay_social_posts').insert({author_profile_id:me.id,body:body||null,post_type:'event',metadata,visibility}).select('id').single();
        if(error)throw error;await addTag(data.id);
      }
      $('communityPostForm')?.reset();
      const preview=$('communityPostPreview');if(preview){preview.hidden=true;preview.replaceChildren();}
      resetRichMode();
      setComposerStatus('Publicado com sucesso.','success');
      $('communityRefreshFeed')?.click();
      setTimeout(scheduleFeedEnhance,350);
    }catch(error){
      if(uploaded)await db.storage.from(BUCKET).remove([uploaded]).catch(()=>{});
      if(personalEventId)await db.from('cosplay_personal_calendar_events').delete().eq('id',personalEventId).catch(()=>{});
      setComposerStatus(String(error?.message||'Não foi possível publicar.'),'error');
    }finally{if(submit)submit.disabled=false;}
  };

  const pollVotes = async (postIds) => {
    const map=new Map();
    if(!postIds.length)return map;
    const {data}=await db.from('cosplay_social_poll_votes').select('post_id,profile_id,option_index').in('post_id',postIds);
    (data||[]).forEach((vote)=>{if(!map.has(vote.post_id))map.set(vote.post_id,[]);map.get(vote.post_id).push(vote);});
    return map;
  };

  let feedObserver=null;
  const observeFeed = () => {
    const feed=$('communityFeed');
    if(!feed)return;
    if(!feedObserver)feedObserver=new MutationObserver(()=>scheduleFeedEnhance());
    feedObserver.observe(feed,{childList:true});
  };

  const scheduleFeedEnhance = () => {
    clearTimeout(state.feedTimer);
    state.feedTimer=setTimeout(()=>enhanceFeed().catch(()=>{}),180);
  };

  const richInsertBeforeActions = (card,node) => {
    const actions=q('.community-post-actions',card);
    if(actions)card.insertBefore(node,actions);else card.appendChild(node);
  };

  const renderVideoBlock = async (card,post) => {
    if(!post.video_path)return;
    const url=await signedUrl(post.video_path);if(!url)return;
    const wrap=document.createElement('div');wrap.className='cc-rich-block cc-post-video';wrap.dataset.ccVideoPath=post.video_path;
    const video=document.createElement('video');video.src=url;video.controls=true;video.preload='metadata';video.playsInline=true;video.setAttribute('controlsList','nodownload');wrap.appendChild(video);richInsertBeforeActions(card,wrap);
  };

  const renderPollBlock = (card,post,votes) => {
    const options=Array.isArray(post.metadata?.options)?post.metadata.options.filter((value)=>typeof value==='string').slice(0,6):[];
    if(options.length<2)return;
    const own=votes.find((vote)=>vote.profile_id===state.profile?.id);
    const total=votes.length;
    const wrap=document.createElement('div');wrap.className='cc-rich-block cc-poll-card';
    const title=document.createElement('div');title.className='cc-poll-title';title.innerHTML=`<b>Enquete</b><span>${total} ${total===1?'voto':'votos'}</span>`;wrap.appendChild(title);
    const list=document.createElement('div');list.className='cc-poll-list';
    options.forEach((option,index)=>{
      const count=votes.filter((vote)=>Number(vote.option_index)===index).length;
      const percent=total?Math.round(count/total*100):0;
      const button=document.createElement('button');button.type='button';button.className=`cc-poll-option${own?.option_index===index?' selected':''}`;
      button.innerHTML=`<span class="cc-poll-bar" style="width:${percent}%"></span><span class="cc-poll-copy"><b>${esc(option)}</b><small>${count} · ${percent}%</small></span>`;
      button.addEventListener('click',async()=>{button.disabled=true;const {error}=await db.from('cosplay_social_poll_votes').upsert({post_id:post.id,profile_id:state.profile.id,option_index:index,updated_at:new Date().toISOString()},{onConflict:'post_id,profile_id'});if(error){button.disabled=false;return;}scheduleFeedEnhance();});
      list.appendChild(button);
    });
    wrap.appendChild(list);richInsertBeforeActions(card,wrap);
  };

  const renderEventBlock = (card,post) => {
    const meta=post.metadata||{};if(!meta.title||!meta.event_date)return;
    const date=new Date(`${meta.event_date}T12:00:00`);
    const dateText=Number.isNaN(date.getTime())?meta.event_date:new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(date);
    const wrap=document.createElement('div');wrap.className='cc-rich-block cc-event-post';
    wrap.innerHTML=`<div class="cc-event-date"><b>${esc(dateText.split(' ')[0]||'')}</b><span>${esc(dateText.split(' ').slice(1).join(' '))}</span></div><div class="cc-event-post-copy"><span>EVENTO</span><b>${esc(meta.title)}</b><small>${esc([meta.start_time?String(meta.start_time).slice(0,5):'',meta.location||''].filter(Boolean).join(' · ')||'Horário/local a definir')}</small></div><button type="button" data-community-view="events">Ver agenda</button>`;
    richInsertBeforeActions(card,wrap);
  };

  const rewriteSocialProfileLinks = (root) => {
    qa('.community-post-head a[href*="jogador.html?slug="]',root).forEach((link)=>{link.href=link.href.replace('/jogador.html?','/perfil-social.html?');});
  };

  const enhanceFeed = async () => {
    if(state.feedBusy)return;
    const me=await getMe();const feed=$('communityFeed');if(!me||!feed)return;
    state.feedBusy=true;
    feedObserver?.disconnect();
    try{
      const {data,error}=await db.from('cosplay_social_posts').select('id,post_type,video_path,metadata,created_at,author_profile_id').order('created_at',{ascending:false}).limit(60);
      if(error)return;
      const posts=data||[];const cards=qa(':scope > .community-post',feed);
      const polls=posts.filter((post)=>post.post_type==='poll').map((post)=>post.id);
      const votesByPost=await pollVotes(polls);
      for(let i=0;i<Math.min(cards.length,posts.length);i++){
        const card=cards[i],post=posts[i];
        card.dataset.ccPostId=post.id;card.dataset.ccPostType=post.post_type||'post';if(post.video_path)card.dataset.ccVideoPath=post.video_path;else delete card.dataset.ccVideoPath;
        qa(':scope > .cc-rich-block',card).forEach((node)=>node.remove());
        if(post.video_path)await renderVideoBlock(card,post);
        if(post.post_type==='poll')renderPollBlock(card,post,votesByPost.get(post.id)||[]);
        if(post.post_type==='event')renderEventBlock(card,post);
      }
      rewriteSocialProfileLinks(feed);
    }finally{state.feedBusy=false;observeFeed();}
  };

  const interceptRichDelete = () => {
    const feed=$('communityFeed');if(!feed)return;
    feed.addEventListener('click',async(event)=>{
      const button=event.target.closest('.community-delete-post');if(!button)return;
      const card=button.closest('.community-post');const videoPath=card?.dataset.ccVideoPath;if(!videoPath)return;
      event.preventDefault();event.stopImmediatePropagation();button.disabled=true;
      const id=card.dataset.ccPostId;if(!id){button.disabled=false;return;}
      const {error}=await db.from('cosplay_social_posts').delete().eq('id',id);
      if(error){button.disabled=false;return;}
      await db.storage.from(BUCKET).remove([videoPath]).catch(()=>{});state.signed.delete(videoPath);card.remove();
    },true);
  };

  const ensureStoryModal = () => {
    let modal=$('ccStoryModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='ccStoryModal';modal.className='cc-story-modal';modal.hidden=true;modal.innerHTML='<div class="cc-story-backdrop" data-cc-story-close></div><section class="cc-story-dialog"><button class="cc-story-close" type="button" data-cc-story-close aria-label="Fechar">×</button><div id="ccStoryViewer"></div></section>';
    document.body.appendChild(modal);qa('[data-cc-story-close]',modal).forEach((el)=>el.addEventListener('click',()=>{modal.hidden=true;const viewer=$('ccStoryViewer');viewer?.querySelector('video')?.pause();}));
    document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!modal.hidden)modal.hidden=true;});
    return modal;
  };

  const storyAvatar = (profile) => safeImage(profile?.character_photo_url);
  const storyItemsForRail = () => {
    const seen=new Set();const rows=[];
    for(const story of state.stories){if(seen.has(story.author_profile_id))continue;seen.add(story.author_profile_id);rows.push(story);}
    return rows.slice(0,8);
  };

  const storyRailHtml = () => {
    const me=state.profile;const mine=storyAvatar(me);
    const add=`<button class="cc-story cc-story-add" type="button" data-cc-story-add><span class="cc-story-avatar">${mine?`<img src="${esc(mine)}" alt="">`:'♜'}<i>＋</i></span><span>Adicionar</span></button>`;
    const rows=storyItemsForRail().map((story)=>{const profile=state.profiles.get(story.author_profile_id);const image=storyAvatar(profile);const index=state.stories.findIndex((row)=>row.id===story.id);return `<button class="cc-story" type="button" data-cc-story-index="${index}"><span class="cc-story-avatar">${image?`<img src="${esc(image)}" alt="">`:'♜'}</span><span>${esc(story.author_profile_id===state.profile.id?'Seu story':displayName(profile).split(' ')[0])}</span></button>`;}).join('');
    return add+rows;
  };

  const ensureMobileStoryRail = () => {
    const feedPanel=q('[data-community-panel="feed"]');const composer=q('.community-composer',feedPanel);if(!feedPanel||!composer)return null;
    let shell=$('ccMobileStories');if(shell)return shell;
    shell=document.createElement('section');shell.id='ccMobileStories';shell.className='cc-mobile-stories';shell.innerHTML='<div class="cc-card-head"><b>STORIES</b></div><div class="cc-stories"></div>';composer.insertAdjacentElement('beforebegin',shell);return shell;
  };

  const wireStoryRail = (root) => {
    if(!root)return;
    root.querySelector('[data-cc-story-add]')?.addEventListener('click',openStoryCreator);
    qa('[data-cc-story-index]',root).forEach((button)=>button.addEventListener('click',()=>openStory(Number(button.dataset.ccStoryIndex)||0)));
  };

  const renderStoryRails = () => {
    const right=$('ccStories');if(right){right.innerHTML=storyRailHtml();wireStoryRail(right);}
    const mobile=ensureMobileStoryRail();const list=mobile?.querySelector('.cc-stories');if(list){list.innerHTML=storyRailHtml();wireStoryRail(list);}
  };

  const loadStories = async () => {
    const me=await getMe();if(!me)return;
    const {data,error}=await db.from('cosplay_social_stories').select('id,author_profile_id,media_path,media_type,caption,visibility,created_at,expires_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(40);
    if(error){state.stories=[];renderStoryRails();return;}
    state.stories=data||[];await loadProfiles(state.stories.map((story)=>story.author_profile_id));renderStoryRails();
  };

  const markStoryViewed = async (story) => {
    if(!state.profile||!story||story.author_profile_id===state.profile.id)return;
    await db.from('cosplay_social_story_views').upsert({story_id:story.id,viewer_profile_id:state.profile.id,viewed_at:new Date().toISOString()},{onConflict:'story_id,viewer_profile_id'}).catch(()=>{});
  };

  const openStory = async (index) => {
    if(!state.stories.length)return;
    state.storyIndex=Math.max(0,Math.min(index,state.stories.length-1));
    const story=state.stories[state.storyIndex];const profile=state.profiles.get(story.author_profile_id)||{};const url=await signedUrl(story.media_path);if(!url)return;
    const modal=ensureStoryModal();const viewer=$('ccStoryViewer');
    const avatar=storyAvatar(profile);const own=story.author_profile_id===state.profile.id;
    viewer.innerHTML=`<div class="cc-story-view-head"><span class="cc-runtime-avatar">${avatar?`<img src="${esc(avatar)}" alt="">`:'♜'}</span><div><b>${esc(displayName(profile))}</b><span>${esc(storyAge(story.created_at))}</span></div>${own?'<button type="button" data-cc-delete-story>Excluir</button>':''}</div><div class="cc-story-media">${story.media_type==='video'?`<video src="${esc(url)}" controls autoplay playsinline></video>`:`<img src="${esc(url)}" alt="Story de ${esc(displayName(profile))}">`}</div>${story.caption?`<p class="cc-story-caption">${esc(story.caption)}</p>`:''}<button class="cc-story-prev" type="button" aria-label="Anterior">‹</button><button class="cc-story-next" type="button" aria-label="Próximo">›</button>`;
    viewer.querySelector('.cc-story-prev')?.addEventListener('click',()=>openStory((state.storyIndex-1+state.stories.length)%state.stories.length));
    viewer.querySelector('.cc-story-next')?.addEventListener('click',()=>openStory((state.storyIndex+1)%state.stories.length));
    viewer.querySelector('[data-cc-delete-story]')?.addEventListener('click',async(event)=>{const button=event.currentTarget;button.disabled=true;const {error}=await db.from('cosplay_social_stories').delete().eq('id',story.id);if(error){button.disabled=false;return;}await db.storage.from(BUCKET).remove([story.media_path]).catch(()=>{});state.signed.delete(story.media_path);modal.hidden=true;await loadStories();});
    modal.hidden=false;markStoryViewed(story);
  };

  const openStoryCreator = () => {
    const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp,video/mp4,video/webm';input.hidden=true;document.body.appendChild(input);
    input.addEventListener('change',()=>{const file=input.files?.[0];input.remove();if(file)showStoryPublish(file);},{once:true});input.click();
  };

  const showStoryPublish = (file) => {
    const isVideo=['video/mp4','video/webm'].includes(file.type);const isImage=['image/jpeg','image/png','image/webp'].includes(file.type);
    if(!isVideo&&!isImage){setComposerStatus('Formato de story não suportado.','error');return;}
    const max=isVideo?25*1024*1024:8*1024*1024;if(file.size>max){setComposerStatus(`O story pode ter no máximo ${isVideo?'25':'8'} MB.`,'error');return;}
    let modal=$('ccStoryPublishModal');if(modal)modal.remove();
    modal=document.createElement('div');modal.id='ccStoryPublishModal';modal.className='cc-story-modal';
    const url=URL.createObjectURL(file);
    modal.innerHTML=`<div class="cc-story-backdrop" data-cc-cancel-story></div><section class="cc-story-dialog cc-story-publish"><button class="cc-story-close" type="button" data-cc-cancel-story>×</button><h3>Novo story</h3><div class="cc-story-media">${isVideo?`<video src="${esc(url)}" controls playsinline></video>`:`<img src="${esc(url)}" alt="Prévia do story">`}</div><label><span>Legenda</span><input id="ccStoryCaption" maxlength="280" placeholder="Escreva algo..."></label><label><span>Quem pode ver</span><select id="ccStoryVisibility"><option value="friends">Amigos</option><option value="public">Participantes</option></select></label><div class="cc-story-publish-actions"><span id="ccStoryPublishStatus"></span><button class="btn gold" type="button" id="ccPublishStory">Publicar story</button></div></section>`;
    document.body.appendChild(modal);
    const close=()=>{URL.revokeObjectURL(url);modal.remove();};qa('[data-cc-cancel-story]',modal).forEach((el)=>el.addEventListener('click',close));
    $('ccPublishStory')?.addEventListener('click',async(event)=>{const me=await getMe();if(!me)return;const button=event.currentTarget;const status=$('ccStoryPublishStatus');button.disabled=true;status.textContent='Enviando...';let path='';try{let ext='jpg';if(file.type==='image/png')ext='png';else if(file.type==='image/webp')ext='webp';else if(file.type==='video/webm')ext='webm';else if(file.type==='video/mp4')ext='mp4';path=`${state.user.id}/${me.id}/stories/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;const {error:uploadError}=await db.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(uploadError)throw uploadError;const {error}=await db.from('cosplay_social_stories').insert({author_profile_id:me.id,media_path:path,media_type:isVideo?'video':'image',caption:String($('ccStoryCaption')?.value||'').trim(),visibility:$('ccStoryVisibility')?.value==='public'?'public':'friends'});if(error)throw error;close();await loadStories();}catch(error){if(path)await db.storage.from(BUCKET).remove([path]).catch(()=>{});status.textContent=String(error?.message||'Não foi possível publicar o story.');button.disabled=false;}});
  };

  const setViewState = () => {
    document.body.dataset.ccView='feed';
    document.addEventListener('click',(event)=>{const trigger=event.target.closest('[data-community-view]');if(!trigger)return;document.body.dataset.ccView=trigger.dataset.communityView||'feed';});
  };

  const restoreAppearance = async () => {
    const me=await getMe();if(!me)return;
    const {data}=await db.from('cosplay_profile_social_settings').select('theme,accent').eq('profile_id',me.id).maybeSingle();
    const theme=data?.theme||'cosplay-dark',accent=data?.accent||'gold';document.body.dataset.ccTheme=theme;document.body.dataset.ccAccent=accent;
    const accents={gold:['#f0b62f','#c98b12','#9747ff'],purple:['#c776ff','#9150c6','#9b4dff'],blue:['#65a9ff','#3674c5','#8c52ff'],pink:['#ff7bc8','#c54894','#9a49ff']};const palette=accents[accent]||accents.gold;document.body.style.setProperty('--gold',palette[0]);document.body.style.setProperty('--gold2',palette[1]);document.body.style.setProperty('--purple',palette[2]);
  };

  const init = async () => {
    if(!await getMe())return;
    setViewState();
    wireComposerButtons();
    ensureRichPanel();
    $('communityPostForm')?.addEventListener('submit',publishRich,true);
    interceptRichDelete();
    observeFeed();
    scheduleFeedEnhance();
    await Promise.all([loadStories(),restoreAppearance()]);
    window.addEventListener('focus',()=>loadStories().catch(()=>{}),{passive:true});
    setInterval(()=>loadStories().catch(()=>{}),5*60*1000);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch((error)=>console.error('rich social init failed',error)),{once:true});
  else init().catch((error)=>console.error('rich social init failed',error));
})();