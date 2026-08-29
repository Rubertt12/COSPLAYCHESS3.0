(() => {
  const db=window.getCosplayChessDb?window.getCosplayChessDb():window.COSPLAYCHESS_DB;if(!db)return;
  const allowedThemes=new Set(['cosplay-dark','orkut-night','royal-purple','chess-gold']);
  const allowedAccents=new Set(['gold','blue','pink','purple']);
  const apply=(settings)=>{document.body.classList.remove('theme-orkut-night','theme-royal-purple','theme-chess-gold','accent-gold','accent-blue','accent-pink','accent-purple');const theme=allowedThemes.has(settings?.theme)?settings.theme:'cosplay-dark';const accent=allowedAccents.has(settings?.accent)?settings.accent:'gold';if(theme!=='cosplay-dark')document.body.classList.add(`theme-${theme}`);document.body.classList.add(`accent-${accent}`);};
  const init=async()=>{const slug=String(new URLSearchParams(location.search).get('slug')||'').trim();if(!slug)return apply(null);const{data:profile}=await db.from('cosplay_participant_profiles').select('id').eq('public_slug',slug).eq('profile_visible',true).maybeSingle();if(!profile)return apply(null);const{data}=await db.from('cosplay_profile_social_settings').select('theme,accent').eq('profile_id',profile.id).maybeSingle();apply(data||null);};
  init().catch(()=>apply(null));
})();