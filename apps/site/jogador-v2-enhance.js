(() => {
  'use strict';
  const db = window.getCosplayChessDb ? window.getCosplayChessDb() : window.COSPLAYCHESS_DB;
  if (!db) return;
  const $ = id => document.getElementById(id);
  const safe = value => { try { const u = new URL(String(value || '')); return ['http:','https:'].includes(u.protocol) ? u.href : null; } catch { return null; } };
  const fmt = value => { try { return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(value)); } catch { return '—'; } };

  async function init(){
    const slug = String(new URLSearchParams(location.search).get('slug') || '').trim();
    if (!slug) return;
    const { data:p } = await db.from('cosplay_participant_profiles')
      .select('id,event_id,display_name,nick,character_name,bio,instagram_url,tiktok_url,facebook_url,youtube_url,created_at,registration_status')
      .eq('public_slug',slug).eq('profile_visible',true).maybeSingle();
    if (!p) return;

    const { data:socialSettings } = await db.from('cosplay_profile_social_settings')
      .select('social_bio').eq('profile_id',p.id).maybeSingle();
    const socialBio = String(socialSettings?.social_bio || '').trim();
    const profileBio = socialBio || String(p.bio || '').trim();
    const summaryBio = $('bio');
    if (summaryBio) summaryBio.textContent = profileBio || 'Este participante ainda não escreveu o Sobre mim.';

    let eventTitle = '—';
    if (p.event_id) {
      const { data:event } = await db.from('cosplay_events').select('title').eq('id',p.event_id).maybeSingle();
      if (event?.title) eventTitle = event.title;
    }

    const aboutPanel = document.querySelector('[data-panel="about"]');
    if (aboutPanel) {
      const interests = $('interests');
      const wrap = document.createElement('div'); wrap.className='about-layout';
      const story = document.createElement('section'); story.className='about-story';
      story.innerHTML = '<span class="side-kicker">MINHA HISTÓRIA</span><h3>Sobre mim</h3><p></p>';
      story.querySelector('p').textContent = profileBio || 'Este participante ainda não escreveu o Sobre mim.';
      if (!profileBio) story.querySelector('p').className='empty-about';

      const facts = document.createElement('section'); facts.className='about-facts';
      facts.innerHTML = '<span class="side-kicker">PERFIL</span><h3>Informações</h3>';
      const rows = [['Personagem',p.character_name||'—'],['Usuário',p.nick?`@${String(p.nick).replace(/^@/,'')}`:'—'],['Evento',eventTitle],['Membro desde',fmt(p.created_at)],['Status',p.registration_status==='confirmed'?'Inscrição confirmada':'Participante ativo']];
      rows.forEach(([label,value])=>{const row=document.createElement('div');row.className='about-fact';const s=document.createElement('span');s.textContent=label;const b=document.createElement('b');b.textContent=value;row.append(s,b);facts.appendChild(row);});
      const socials=document.createElement('div');socials.className='about-socials';
      [['Instagram',p.instagram_url],['TikTok',p.tiktok_url],['Facebook',p.facebook_url],['YouTube',p.youtube_url]].forEach(([label,url])=>{const href=safe(url);if(!href)return;const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=`${label} ↗`;socials.appendChild(a);});
      if(socials.children.length) facts.appendChild(socials);
      wrap.append(story,facts);
      const heading=aboutPanel.querySelector('.section-heading');
      if(interests){const interestTitle=document.createElement('div');interestTitle.className='section-heading';interestTitle.style.marginTop='22px';interestTitle.innerHTML='<span>GOSTOS & REFERÊNCIAS</span><h2>Interesses</h2>';aboutPanel.insertBefore(wrap,interests);aboutPanel.insertBefore(interestTitle,interests);} else if(heading) heading.insertAdjacentElement('afterend',wrap);
    }

    const sideCard=document.querySelector('.side-column .side-card');
    if(sideCard){sideCard.classList.add('profile-detail-card');const dl=sideCard.querySelector('dl');if(dl){const add=(label,value)=>{const d=document.createElement('div');const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=value;d.append(dt,dd);dl.appendChild(d);};add('Evento',eventTitle);add('Membro desde',fmt(p.created_at));}}
    const summary=document.querySelector('.summary-main');
    if(summary&&!summary.querySelector('.profile-extra-strip')){const strip=document.createElement('div');strip.className='profile-extra-strip';[['Evento',eventTitle],['Membro desde',fmt(p.created_at)],['Personagem',p.character_name||'—'],['Perfil','Público']].forEach(([label,value])=>{const d=document.createElement('div');const s=document.createElement('span');s.textContent=label;const b=document.createElement('b');b.textContent=value;d.append(s,b);strip.appendChild(d);});summary.appendChild(strip);}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,60)); else setTimeout(init,60);
})();
