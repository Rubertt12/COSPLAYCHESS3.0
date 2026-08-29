(() => {
  if(window.__COSPLAY_COMMUNITY_APPEARANCE__)return;
  window.__COSPLAY_COMMUNITY_APPEARANCE__=true;

  const db=window.getCosplayChessParticipantDb?window.getCosplayChessParticipantDb():window.COSPLAYCHESS_PARTICIPANT_DB;
  if(!db)return;

  const THEMES=['cosplay-dark','orkut-night','royal-purple','chess-gold','white-mode'];
  const ACCENTS=['gold','blue','pink','purple'];
  const BACKGROUNDS=['classic','chessboard','nebula','sakura','minimal','stars'];
  const THEME_CLASSES=THEMES.filter(x=>x!=='cosplay-dark').map(x=>`theme-${x}`);
  const ACCENT_CLASSES=ACCENTS.map(x=>`accent-${x}`);
  const BG_CLASSES=BACKGROUNDS.map(x=>`community-bg-${x}`);
  let settings={theme:'cosplay-dark',accent:'gold',community_background:'classic'};

  const apply=(next={})=>{
    settings={...settings,...next};
    const theme=THEMES.includes(settings.theme)?settings.theme:'cosplay-dark';
    const accent=ACCENTS.includes(settings.accent)?settings.accent:'gold';
    const bg=BACKGROUNDS.includes(settings.community_background)?settings.community_background:'classic';
    document.body.classList.remove(...THEME_CLASSES,...ACCENT_CLASSES,...BG_CLASSES);
    if(theme!=='cosplay-dark')document.body.classList.add(`theme-${theme}`);
    document.body.classList.add(`accent-${accent}`,`community-bg-${bg}`);
    document.documentElement.dataset.communityTheme=theme;
  };

  const load=async()=>{
    const{data,error}=await db.rpc('cosplay_my_social_settings');
    if(!error&&data&&typeof data==='object')apply(data);
    ensureControls();
  };

  const ensureControls=()=>{
    const form=document.getElementById('socialExtSettingsForm');
    if(!form)return false;
    const theme=form.elements.theme;
    if(theme&&!theme.querySelector('option[value="white-mode"]')){
      theme.appendChild(new Option('White Mode','white-mode'));
    }
    if(theme){
      theme.value=THEMES.includes(settings.theme)?settings.theme:'cosplay-dark';
      if(theme.dataset.appearanceBound!=='1'){
        theme.dataset.appearanceBound='1';
        theme.addEventListener('change',()=>apply({theme:theme.value}));
      }
    }
    const accent=form.elements.accent;
    if(accent){
      accent.value=ACCENTS.includes(settings.accent)?settings.accent:'gold';
      if(accent.dataset.appearanceBound!=='1'){
        accent.dataset.appearanceBound='1';
        accent.addEventListener('change',()=>apply({accent:accent.value}));
      }
    }
    let bg=form.elements.community_background;
    if(!bg){
      const grid=form.querySelector('.social-ext-settings-grid');
      if(grid){
        const label=document.createElement('label');
        label.className='social-ext-field community-background-field';
        label.innerHTML='<span>Plano de fundo da comunidade</span><select name="community_background"><option value="classic">Clássico</option><option value="chessboard">Tabuleiro</option><option value="nebula">Nebulosa</option><option value="sakura">Sakura</option><option value="minimal">Minimalista</option><option value="stars">Céu estrelado</option></select><small>Altera somente a aparência da sua Comunidade.</small>';
        const birthday=grid.querySelector('[name="birthday_day"]')?.closest('label');
        if(birthday)grid.insertBefore(label,birthday);else grid.prepend(label);
        bg=label.querySelector('select');
      }
    }
    if(bg){
      bg.value=BACKGROUNDS.includes(settings.community_background)?settings.community_background:'classic';
      if(bg.dataset.appearanceBound!=='1'){
        bg.dataset.appearanceBound='1';
        bg.addEventListener('change',()=>apply({community_background:bg.value}));
      }
    }
    return true;
  };

  const scheduleControls=()=>{
    [0,180,500,1000,1900].forEach(ms=>setTimeout(()=>ensureControls(),ms));
  };

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-community-view="social-settings"]'))scheduleControls();
  },true);
  window.addEventListener('cosplay:social-settings-saved',e=>{
    if(e.detail?.settings)apply(e.detail.settings);
    scheduleControls();
  });
  window.addEventListener('cosplay:social-shell-ready',scheduleControls);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{load();scheduleControls();},{once:true});
  else{load();scheduleControls();}
})();