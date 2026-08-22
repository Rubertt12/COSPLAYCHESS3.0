(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const openHash=id=>{const a=$(`.v6-nav a[href="#${id}"]`);if(a){a.click();return;}history.replaceState({},'',`#${id}`);window.dispatchEvent(new HashChangeEvent('hashchange'));};
  function buildIndex(){
    const out=[];
    $$('.admin-event').forEach(el=>out.push({type:'Evento',view:'events',text:el.textContent,el}));
    $$('.registration-row').forEach(el=>out.push({type:'Inscrição',view:'registrations',text:el.textContent,el}));
    $$('#eventGalleryPanel .gallery-item,#eventGalleryPanel article').forEach(el=>out.push({type:'Galeria',view:'gallery',text:el.textContent,el}));
    $$('#partnersAdminPanel .partner-admin-card').forEach(el=>out.push({type:'Parceiro',view:'partners',text:el.textContent,el}));
    $$('.v6-nav a[href^="#"]').forEach(a=>{const id=(a.getAttribute('href')||'').slice(1);if(id)out.push({type:'Seção',view:id,text:a.textContent,el:a});});
    return out;
  }
  function ensureBox(input){
    if($('#v6SearchResults'))return $('#v6SearchResults');
    const box=document.createElement('div');box.id='v6SearchResults';box.className='v6-search-results';box.hidden=true;
    input.closest('.v6-search')?.appendChild(box) || input.parentElement?.appendChild(box);
    return box;
  }
  function search(q,input){
    const box=ensureBox(input),term=normalize(q.trim());
    if(!term){box.hidden=true;box.innerHTML='';return;}
    const rows=buildIndex().filter(x=>normalize(x.text).includes(term)).slice(0,12);
    box.innerHTML=rows.length?rows.map((r,i)=>`<button type="button" data-search-result="${i}"><span>${r.type}</span><b>${String(r.text).trim().replace(/\s+/g,' ').slice(0,90)}</b></button>`).join(''):'<div class="v6-search-empty">Nenhum resultado encontrado.</div>';
    box.hidden=false;
    box.querySelectorAll('[data-search-result]').forEach((b,i)=>b.onclick=()=>{const r=rows[i];openHash(r.view);box.hidden=true;input.value='';setTimeout(()=>{r.el?.scrollIntoView?.({behavior:'smooth',block:'center'});r.el?.classList?.add('v6-search-hit');setTimeout(()=>r.el?.classList?.remove('v6-search-hit'),1400);},180);});
  }
  function init(){const input=$('#v6Search');if(!input||input.dataset.searchV2)return;input.dataset.searchV2='1';input.placeholder='Buscar no painel...';input.addEventListener('input',e=>search(e.target.value,input));input.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';ensureBox(input).hidden=true;}if(e.key==='Enter'){const first=ensureBox(input).querySelector('[data-search-result]');if(first)first.click();}});document.addEventListener('click',e=>{const box=$('#v6SearchResults');if(box&&!e.target.closest('.v6-search'))box.hidden=true;});}
  setTimeout(init,250);setTimeout(init,900);
})();