(()=>{
  const cfg=window.COSPLAYCHESS_CONFIG;
  const db=window.COSPLAYCHESS_DB||window.getCosplayChessDb?.()||window.supabase?.createClient?.(cfg?.supabaseUrl,cfg?.supabaseKey);
  if(!cfg||!db)return;
  document.documentElement.dataset.teamMascotsVersion='20260824-team2';
  const style=document.createElement('style');
  style.id='teamMascotCardStyles';
  style.textContent=`
    .member-card{isolation:isolate}
    .member-card.has-mascot{min-height:320px;padding-right:43%;background:radial-gradient(circle at 85% 78%,rgba(213,167,82,.08),transparent 36%),linear-gradient(160deg,#17131c,#0d0c11)}
    .member-card.has-mascot .member-head,.member-card.has-mascot>p{position:relative;z-index:3}
    .member-mascot{position:absolute;z-index:2;right:0;bottom:0;width:43%;height:94%;object-fit:contain;object-position:center bottom;pointer-events:none;user-select:none;filter:drop-shadow(0 16px 20px rgba(0,0,0,.48));border-radius:0 0 18px 0;mask-image:linear-gradient(to left,#000 0,#000 78%,transparent 100%);-webkit-mask-image:linear-gradient(to left,#000 0,#000 78%,transparent 100%)}
    .member-card.has-mascot:before{content:"";position:absolute;z-index:1;right:-12%;bottom:-34%;width:62%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(215,174,89,.12),transparent 68%);pointer-events:none}
    @media(max-width:980px){.member-card.has-mascot{padding-right:40%;min-height:325px}.member-mascot{width:40%}}
    @media(max-width:700px){.member-card.has-mascot{min-height:300px;padding-right:39%}.member-mascot{width:39%;height:90%}}
    @media(max-width:480px){.member-card.has-mascot{padding-right:24px;padding-bottom:225px;min-height:0}.member-mascot{width:58%;height:225px;right:4px;opacity:.92;mask-image:linear-gradient(to bottom,transparent 0,#000 16%,#000 100%);-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 16%,#000 100%)}}
  `;
  if(!document.getElementById(style.id))document.head.appendChild(style);
  let cache=null;
  async function rows(){if(cache)return cache;const {data,error}=await db.from('cosplay_team_members').select('id,name,mascot_url,sort_order,published').eq('published',true).order('sort_order');cache=error?[]:(data||[]);return cache}
  async function decorate(root){const cards=[...root.querySelectorAll('.member-card')];if(!cards.length||root.dataset.mascotsApplied==='1')return;const team=await rows();cards.forEach((card,i)=>{const m=team[i];if(!m)return;card.dataset.teamId=m.id;card.querySelector('.member-mascot')?.remove();card.classList.toggle('has-mascot',!!m.mascot_url);if(m.mascot_url){const img=document.createElement('img');img.className='member-mascot';img.src=m.mascot_url;img.alt=`Mascote de ${m.name||'integrante da equipe'}`;img.loading='lazy';img.decoding='async';card.appendChild(img)}});root.dataset.mascotsApplied='1'}
  function scan(){document.querySelectorAll('[data-team-grid]').forEach(root=>{if(root.querySelector('.member-card'))decorate(root)})}
  scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});setTimeout(scan,250);setTimeout(scan,800);setTimeout(scan,1600);
})();
