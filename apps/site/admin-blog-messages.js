(()=>{
  if(window.__COSPLAYCHESS_BLOG_MESSAGES__) return;
  window.__COSPLAYCHESS_BLOG_MESSAGES__=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const slugify=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90);
  const status=(text,type='')=>{
    const el=$('#blog .cc-blog-status');
    if(!el)return;
    el.textContent=text;
    el.className=`cc-blog-status ${type}`.trim();
  };

  function postFromCard(card){
    const val=field=>card.querySelector(`[data-field="${field}"]`)?.value||'';
    return {
      title:val('title'),
      slug:val('slug')||slugify(val('title')),
      excerpt:val('excerpt'),
      category:val('category')||'Novidades',
      coverUrl:card.querySelector('.cc-cover-preview img')?.src||''
    };
  }

  function loadImage(src){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.crossOrigin='anonymous';
      img.onload=()=>resolve(img);
      img.onerror=reject;
      img.src=src;
    });
  }

  function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=6){
    const words=String(text||'').split(/\s+/);
    let line='',lines=[];
    for(const w of words){
      const test=line?`${line} ${w}`:w;
      if(ctx.measureText(test).width>maxWidth&&line){
        lines.push(line);line=w;
        if(lines.length>=maxLines)break;
      }else line=test;
    }
    if(line&&lines.length<maxLines)lines.push(line);
    lines.forEach((l,n)=>ctx.fillText(l,x,y+n*lineHeight));
  }

  async function makeSocial(card){
    const p=postFromCard(card);
    const c=document.createElement('canvas');
    c.width=1080;c.height=1350;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#09070d';ctx.fillRect(0,0,c.width,c.height);

    if(p.coverUrl){
      try{
        const img=await loadImage(p.coverUrl);
        const scale=Math.max(c.width/img.width,c.height/img.height);
        const w=img.width*scale,h=img.height*scale;
        ctx.drawImage(img,(c.width-w)/2,(c.height-h)/2,w,h);
      }catch{}
    }

    const grad=ctx.createLinearGradient(0,120,0,1350);
    grad.addColorStop(0,'rgba(5,3,8,.08)');
    grad.addColorStop(.48,'rgba(7,4,11,.42)');
    grad.addColorStop(1,'rgba(7,4,11,.98)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1350);
    ctx.fillStyle='rgba(212,170,92,.95)';ctx.fillRect(72,92,10,76);
    ctx.font='700 28px Arial';ctx.fillStyle='#f6e2a4';ctx.fillText('FERGORVERSE',108,122);
    ctx.font='900 48px Arial';ctx.fillStyle='#fff';ctx.fillText('COSPLAY CHESS',108,166);
    ctx.fillStyle='rgba(212,170,92,.92)';ctx.fillRect(72,910,240,58);
    ctx.font='800 24px Arial';ctx.fillStyle='#16100c';ctx.fillText(String(p.category).toUpperCase().slice(0,24),96,948);
    ctx.font='900 68px Arial';ctx.fillStyle='#fff';wrap(ctx,p.title||'CosplayChess',72,1048,920,78,3);
    ctx.font='700 27px Arial';ctx.fillStyle='#e8cf91';ctx.fillText('@fergorverse',72,1285);
    ctx.textAlign='right';ctx.fillStyle='rgba(255,255,255,.75)';ctx.fillText('cosplaychess',1008,1285);ctx.textAlign='left';

    const blob=await new Promise(r=>c.toBlob(r,'image/png',.96));
    return new File([blob],`cosplaychess-${p.slug||'noticia'}.png`,{type:'image/png'});
  }

  function caption(p){
    const url=`${location.origin}${location.pathname.replace(/admin\.html$/,'noticias.html')}?slug=${encodeURIComponent(p.slug||slugify(p.title))}`;
    return `${p.title}\n\n${p.excerpt||''}\n\nLeia mais: ${url}\n\n#CosplayChess #Fergorverse #Cosplay #Xadrez`;
  }

  async function shareMessages(card){
    const p=postFromCard(card);
    const file=await makeSocial(card);
    try{
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        await navigator.share({title:p.title||'CosplayChess',text:caption(p),files:[file]});
        status('Compartilhamento com imagem + informações aberto. Escolha Instagram Messages.','success');
      }else{
        status('Este navegador não suporta compartilhar imagem + texto juntos.','error');
      }
    }catch(e){
      if(e?.name!=='AbortError') status(e.message||'Não foi possível compartilhar no Messages.','error');
    }
  }

  function inject(){
    $$('#blog .cc-blog-card').forEach(card=>{
      const actions=$('.cc-social-actions',card);
      if(!actions||actions.querySelector('[data-social-messages]'))return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='cc-blog-btn ghost';
      btn.dataset.socialMessages='1';
      btn.textContent='Instagram Messages';
      const copy=actions.querySelector('[data-copy-caption]');
      actions.insertBefore(btn,copy||null);
    });
    $$('#blog .cc-social-note').forEach(note=>{
      note.textContent='Feed / Story envia só a imagem. Instagram Messages envia a imagem junto com título, resumo, link e hashtags.';
    });
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-social-messages]');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const card=btn.closest('.cc-blog-card');
    if(card)shareMessages(card);
  },true);

  const obs=new MutationObserver(inject);
  obs.observe(document.body,{childList:true,subtree:true});
  inject();
})();