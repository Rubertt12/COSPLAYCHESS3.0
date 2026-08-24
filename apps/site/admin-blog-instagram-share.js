(()=>{
  if(window.__COSPLAYCHESS_BLOG_IG_SHARE__)return;
  window.__COSPLAYCHESS_BLOG_IG_SHARE__=true;

  const $=(s,r=document)=>r.querySelector(s);
  const slugify=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90);

  function cardData(button){
    const card=button.closest('.cc-blog-card');
    if(!card)return null;
    const value=field=>card.querySelector(`[data-field="${field}"]`)?.value||'';
    const cover=card.querySelector('.cc-cover-preview img')?.src||'';
    return {
      title:value('title')||'CosplayChess',
      slug:value('slug')||slugify(value('title')),
      category:value('category')||'Novidades',
      excerpt:value('excerpt')||'',
      coverUrl:cover
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
    let line='';
    const lines=[];
    for(const word of words){
      const test=line?`${line} ${word}`:word;
      if(ctx.measureText(test).width>maxWidth&&line){
        lines.push(line);
        line=word;
        if(lines.length>=maxLines)break;
      }else line=test;
    }
    if(line&&lines.length<maxLines)lines.push(line);
    lines.forEach((item,index)=>ctx.fillText(item,x,y+index*lineHeight));
  }

  async function makeFile(post){
    const canvas=document.createElement('canvas');
    canvas.width=1080;
    canvas.height=1350;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#09070d';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    if(post.coverUrl){
      try{
        const img=await loadImage(post.coverUrl);
        const scale=Math.max(canvas.width/img.width,canvas.height/img.height);
        const width=img.width*scale;
        const height=img.height*scale;
        ctx.drawImage(img,(canvas.width-width)/2,(canvas.height-height)/2,width,height);
      }catch{}
    }

    const gradient=ctx.createLinearGradient(0,120,0,1350);
    gradient.addColorStop(0,'rgba(5,3,8,.08)');
    gradient.addColorStop(.48,'rgba(7,4,11,.42)');
    gradient.addColorStop(1,'rgba(7,4,11,.98)');
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,1080,1350);

    ctx.fillStyle='rgba(212,170,92,.95)';
    ctx.fillRect(72,92,10,76);
    ctx.font='700 28px Arial';
    ctx.fillStyle='#f6e2a4';
    ctx.fillText('FERGORVERSE',108,122);
    ctx.font='900 48px Arial';
    ctx.fillStyle='#fff';
    ctx.fillText('COSPLAY CHESS',108,166);

    ctx.fillStyle='rgba(212,170,92,.92)';
    ctx.fillRect(72,910,240,58);
    ctx.font='800 24px Arial';
    ctx.fillStyle='#16100c';
    ctx.fillText(String(post.category).toUpperCase().slice(0,24),96,948);

    ctx.font='900 68px Arial';
    ctx.fillStyle='#fff';
    wrap(ctx,post.title,72,1048,920,78,3);
    ctx.font='700 27px Arial';
    ctx.fillStyle='#e8cf91';
    ctx.fillText('@fergorverse',72,1285);
    ctx.textAlign='right';
    ctx.fillStyle='rgba(255,255,255,.75)';
    ctx.fillText('cosplaychess',1008,1285);
    ctx.textAlign='left';

    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png',.96));
    return new File([blob],`cosplaychess-${slugify(post.slug||post.title)||'noticia'}.png`,{type:'image/png'});
  }

  function download(file){
    const url=URL.createObjectURL(file);
    const link=document.createElement('a');
    link.href=url;
    link.download=file.name;
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  function decorate(){
    document.querySelectorAll('#blog [data-social-share]').forEach(button=>{
      button.textContent='Instagram — Feed / Story';
      button.title='Compartilha somente a imagem para aumentar a compatibilidade com Feed e Stories';
    });
    document.querySelectorAll('#blog .cc-social-note').forEach(note=>{
      note.textContent='O botão do Instagram envia somente a imagem. Depois escolha Feed, Story ou outra opção que o app oferecer. A legenda fica em “Copiar legenda”.';
    });
  }

  document.addEventListener('click',async event=>{
    const button=event.target.closest('#blog [data-social-share]');
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const post=cardData(button);
    if(!post)return;
    const old=button.textContent;
    button.disabled=true;
    button.textContent='Preparando imagem...';
    try{
      const file=await makeFile(post);
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        await navigator.share({files:[file]});
      }else{
        download(file);
        alert('Este navegador não permite compartilhar a imagem diretamente. O PNG foi baixado; abra o Instagram e escolha Novo post ou Story.');
      }
    }catch(error){
      if(error?.name!=='AbortError'){
        console.error('[Instagram Share]',error);
        alert(error?.message||'Não foi possível abrir o compartilhamento.');
      }
    }finally{
      button.disabled=false;
      button.textContent=old;
    }
  },true);

  decorate();
  new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});
})();
