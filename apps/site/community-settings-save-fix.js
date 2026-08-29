(() => {
  if (window.__COSPLAY_SETTINGS_SAVE_FIX__) return;
  window.__COSPLAY_SETTINGS_SAVE_FIX__ = true;

  const db = window.getCosplayChessParticipantDb ? window.getCosplayChessParticipantDb() : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;
  let profileId = '';

  const loadProfileId = async () => {
    if (profileId) return profileId;
    const {data:s}=await db.auth.getSession();
    const user=s?.session?.user;
    if(!user)return '';
    const {data,error}=await db.from('cosplay_participant_profiles')
      .select('id')
      .eq('user_id',user.id)
      .neq('registration_status','cancelled')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(error||!data)return '';
    profileId=data.id;
    return profileId;
  };

  const applyTheme = (s) => {
    document.body.classList.remove('theme-orkut-night','theme-royal-purple','theme-chess-gold','accent-blue','accent-pink','accent-purple','accent-gold');
    const theme=['cosplay-dark','orkut-night','royal-purple','chess-gold'].includes(s?.theme)?s.theme:'cosplay-dark';
    const accent=['gold','blue','pink','purple'].includes(s?.accent)?s.accent:'gold';
    if(theme!=='cosplay-dark')document.body.classList.add(`theme-${theme}`);
    document.body.classList.add(`accent-${accent}`);
  };

  const booleanValue = (form,name,defaultValue=true) => form.elements[name] ? Boolean(form.elements[name].checked) : defaultValue;

  const save = async (form) => {
    const id=await loadProfileId();
    if(!id)throw new Error('profile-not-found');
    let settings={};
    let interests=null;
    let statusEl=null;

    if(form.id==='socialExtSettingsForm'){
      statusEl=document.getElementById('socialExtSettingsStatus');
      settings={
        theme:form.elements.theme.value,
        accent:form.elements.accent.value,
        birthday_day:form.elements.birthday_day.value?Number(form.elements.birthday_day.value):null,
        birthday_month:form.elements.birthday_month.value?Number(form.elements.birthday_month.value):null,
        show_birthday:Boolean(form.elements.show_birthday.checked)
      };
      interests={
        anime:String(form.elements.anime.value||'').trim(),
        games:String(form.elements.games.value||'').trim(),
        films_series:String(form.elements.films_series.value||'').trim(),
        music:String(form.elements.music.value||'').trim(),
        hobbies:String(form.elements.hobbies.value||'').trim()
      };
    }else{
      statusEl=document.getElementById('socialV2SettingsStatus');
      settings={
        status_message:String(form.elements.status_message?.value||'').trim(),
        allow_friend_requests:booleanValue(form,'allow_friend_requests'),
        allow_testimonials:booleanValue(form,'allow_testimonials'),
        allow_messages:form.elements.allow_messages?.value||'friends',
        allow_tags:booleanValue(form,'allow_tags'),
        record_visits:booleanValue(form,'record_visits'),
        show_visitors:booleanValue(form,'show_visitors'),
        show_online:booleanValue(form,'show_online')
      };
    }

    const submit=form.querySelector('[type="submit"]');
    if(submit)submit.disabled=true;
    if(statusEl)statusEl.textContent='Salvando...';
    const {data,error}=await db.rpc('cosplay_update_my_social_profile',{p_profile_id:id,p_settings:settings,p_interests:interests});
    if(submit)submit.disabled=false;
    if(error){
      if(statusEl)statusEl.textContent='Não foi possível salvar.';
      throw error;
    }
    if(statusEl)statusEl.textContent='Alterações salvas.';
    if(data?.settings)applyTheme(data.settings);
    setTimeout(()=>{if(statusEl?.textContent==='Alterações salvas.')statusEl.textContent='';},2200);
    return data;
  };

  document.addEventListener('submit',(event)=>{
    const form=event.target;
    if(!(form instanceof HTMLFormElement))return;
    if(!['socialExtSettingsForm','socialV2SettingsForm'].includes(form.id))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    save(form).catch(()=>{});
  },true);
})();