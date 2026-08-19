(()=>{
  if(window.__cosplayCollectibleAdminPanelLoaded)return;
  window.__cosplayCollectibleAdminPanelLoaded=true;

  const cfg=window.COSPLAYCHESS_CONFIG;
  if(!cfg||!window.supabase)return;
  const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  let latest=null;
  let panel=null;

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';

  async function isAdmin(){
    const {data:{session}}=await db.auth.getSession();
    if(!session)return false;
    const {data}=await db.from('cosplay_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
    return !!data;
  }

  function ensurePanel(){
    if(panel?.isConnected)return panel;
    const anchor=document.querySelector('.auto-results-card');
    if(!anchor)return null;
    panel=document.createElement('section');
    panel.id='collectibleAdminControl';
    panel.className='panel-card collectible-admin-control';
    anchor.insertAdjacentElement('afterend',panel);
    return panel;
  }

  async function loadLatest(){
    const {data,error}=await db
      .from('cosplay_matches')
      .select('id,event_id,match_label,played_at,winner_player,winner_side,winner_cosplayer,player1_name,player2_name,collectible_enabled,source_result_id,cosplay_events(title)')
      .not('source_result_id','is',null)
      .order('played_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(error)throw error;
    latest=data||null;
    render();
  }

  function championName(m){
    if(!m)return '';
    const n=Number(m.winner_player);
    return String((n===1?m.player1_name:n===2?m.player2_name:'')||m.winner_cosplayer||`Player ${n||''}`).trim();
  }

  function render(){
    const root=ensurePanel();
    if(!root)return;

    if(!latest){
      root.innerHTML=`<div class="collectible-admin-copy"><span class="kicker">CARDS COLECIONÁVEIS</span><h2>Controle dos cards</h2><p class="hint">Nenhum resultado/JSON oficial foi recebido ainda. O card só poderá ser ativado depois que uma partida oficial chegar ao site.</p></div><div class="collectible-admin-state locked"><strong>BLOQUEADO</strong><span>Aguardando JSON oficial</span></div>`;
      return;
    }

    const enabled=!!latest.collectible_enabled;
    root.innerHTML=`
      <div class="collectible-admin-copy">
        <span class="kicker">CARDS COLECIONÁVEIS</span>
        <h2>Card do campeão atual</h2>
        <p class="hint">Este é o controle principal. Ele não remove o resultado do Hall da Fama ou do Ranking; controla apenas o card colecionável que aparece no site.</p>
        <div class="collectible-current-match">
          <b>${esc(championName(latest)||'Campeão')}</b>
          <span>${esc(latest.cosplay_events?.title||'CosplayChess')} • ${esc(latest.match_label||'Partida oficial')} • ${esc(fmt(latest.played_at))}</span>
        </div>
      </div>
      <div class="collectible-admin-actions">
        <div class="collectible-admin-state ${enabled?'on':'off'}"><strong>${enabled?'ATIVADO':'DESATIVADO'}</strong><span>${enabled?'Card disponível no site':'Card não aparece publicamente'}</span></div>
        <button class="btn ${enabled?'dark':'gold'}" type="button" data-master-toggle-card>${enabled?'DESATIVAR CARD':'ATIVAR CARD'}</button>
      </div>`;

    root.querySelector('[data-master-toggle-card]')?.addEventListener('click',toggleLatest);
  }

  async function toggleLatest(event){
    if(!latest)return;
    const button=event.currentTarget;
    const next=!latest.collectible_enabled;
    button.disabled=true;
    button.textContent=next?'ATIVANDO...':'DESATIVANDO...';
    try{
      const {data,error}=await db
        .from('cosplay_matches')
        .update({collectible_enabled:next,updated_at:new Date().toISOString()})
        .eq('id',latest.id)
        .select('collectible_enabled')
        .single();
      if(error)throw error;
      latest.collectible_enabled=!!data.collectible_enabled;
      render();
      window.dispatchEvent(new CustomEvent('cosplaychess:collectible-toggle',{detail:{matchId:latest.id,enabled:latest.collectible_enabled}}));
    }catch(error){
      alert(error.message||'Não foi possível alterar o card colecionável.');
      render();
    }
  }

  function addStyles(){
    if(document.getElementById('collectibleAdminPanelStyles'))return;
    const style=document.createElement('style');
    style.id='collectibleAdminPanelStyles';
    style.textContent=`
      .collectible-admin-control{display:flex;align-items:center;justify-content:space-between;gap:24px;margin:16px 0;padding:22px 24px;border-color:rgba(224,190,119,.36);background:linear-gradient(145deg,rgba(93,31,57,.22),rgba(12,10,15,.98))}
      .collectible-admin-copy{min-width:0}.collectible-admin-copy h2{margin:5px 0 8px;font-family:Georgia,serif;font-size:26px;color:#f1e8dc}.collectible-admin-copy .hint{max-width:760px;margin:0;color:#aaa1ad;line-height:1.55}.collectible-current-match{display:grid;gap:3px;margin-top:13px;padding:11px 13px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:rgba(0,0,0,.18)}.collectible-current-match b{color:#e8c579;font-family:Georgia,serif;font-size:17px}.collectible-current-match span{font-size:10px;color:#817984}
      .collectible-admin-actions{display:grid;justify-items:stretch;gap:9px;min-width:190px}.collectible-admin-state{padding:10px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.08);text-align:center;background:#0c0b10}.collectible-admin-state strong,.collectible-admin-state span{display:block}.collectible-admin-state strong{font-size:12px;letter-spacing:1px}.collectible-admin-state span{font-size:9px;margin-top:3px;color:#827a85}.collectible-admin-state.on{border-color:rgba(111,213,145,.38);background:rgba(42,111,65,.12)}.collectible-admin-state.on strong{color:#89e0a4}.collectible-admin-state.off strong,.collectible-admin-state.locked strong{color:#e0b867}.collectible-admin-actions .btn{width:100%;justify-content:center}
      @media(max-width:700px){.collectible-admin-control{display:grid;padding:18px}.collectible-admin-actions{min-width:0;width:100%;grid-template-columns:1fr 1fr;align-items:stretch}.collectible-admin-actions .btn{min-height:48px}.collectible-admin-state{display:grid;align-content:center}.collectible-current-match span{font-size:11px}}
      @media(max-width:430px){.collectible-admin-actions{grid-template-columns:1fr}.collectible-admin-copy h2{font-size:23px}}
    `;
    document.head.appendChild(style);
  }

  async function init(){
    if(!await isAdmin())return;
    addStyles();
    ensurePanel();
    await loadLatest();
    db.channel('collectible-admin-panel')
      .on('postgres_changes',{event:'*',schema:'public',table:'cosplay_matches'},()=>loadLatest().catch(console.error))
      .subscribe();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error),{once:true});
  else init().catch(console.error);
})();
