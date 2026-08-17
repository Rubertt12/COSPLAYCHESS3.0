(()=>{
const art=document.querySelector('.hero-art');if(!art)return;
const logo=art.querySelector(':scope > img');if(!logo)return;
if(art.dataset.heroSocialReady==='1')return;art.dataset.heroSocialReady='1';art.classList.add('hero-social-ready');
const link='https://www.instagram.com/fergorverse/';
const card=document.createElement('div');card.className='hero-social-card';card.innerHTML=`<div class="hero-social-card-head"><span class="hero-social-avatar"><img src="./img/logofergoverse.png" alt="Fergorverse"></span><span><b>@fergorverse</b><small>Cosplay • Xadrez • Eventos</small></span></div><p>Siga o universo Fergorverse e acompanhe os próximos capítulos do CosplayChess.</p><a href="${link}" target="_blank" rel="noopener noreferrer">Abrir Instagram ↗</a>`;
const rain=document.createElement('div');rain.className='hero-piece-rain';rain.setAttribute('aria-hidden','true');
const hint=document.createElement('div');hint.className='hero-social-hint';hint.textContent='Descubra o Fergorverse';
art.append(rain,card,hint);
let active=false,touchTimer=null,sequenceTimer=null,cleanupTimer=null;
const pieces=['♙','♖','♘','♗','♕','♔'];
function settlePieces(){rain.replaceChildren();const count=14;for(let i=0;i<count;i++){const p=document.createElement('span');p.className='hero-piece';p.textContent=pieces[i%pieces.length];const side=i%2===0;const x=side?8+Math.random()*31:61+Math.random()*30;p.style.setProperty('--x',`${x}%`);p.style.setProperty('--size',`${18+Math.random()*15}px`);p.style.setProperty('--dur',`${2.8+Math.random()*1.4}s`);p.style.setProperty('--delay',`${Math.random()*.9}s`);p.style.setProperty('--rot',`${-65+Math.random()*130}deg`);p.style.setProperty('--start',`${-(390+Math.random()*240)}px`);p.style.setProperty('--rest',`${-2-Math.random()*14}px`);rain.appendChild(p)}}
function open(){if(active)return;active=true;clearTimeout(sequenceTimer);clearTimeout(cleanupTimer);art.classList.add('hero-social-active');art.classList.remove('hero-social-card-ready');rain.replaceChildren();sequenceTimer=setTimeout(()=>{if(!active)return;art.classList.add('hero-social-card-ready');setTimeout(()=>{if(active)settlePieces()},280)},820)}
function close(){if(!active)return;active=false;clearTimeout(sequenceTimer);clearTimeout(touchTimer);art.classList.remove('hero-social-active','hero-social-card-ready');cleanupTimer=setTimeout(()=>{if(!active)rain.replaceChildren()},520)}
art.addEventListener('mouseenter',open);art.addEventListener('mouseleave',e=>{if(!art.contains(e.relatedTarget))close()});
logo.style.cursor='pointer';logo.setAttribute('tabindex','0');logo.setAttribute('role','button');logo.setAttribute('aria-label','Mostrar Instagram do Fergorverse');
logo.addEventListener('focus',open);logo.addEventListener('blur',()=>setTimeout(()=>{if(!art.contains(document.activeElement))close()},0));
logo.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();active?close():open()}});
logo.addEventListener('click',e=>{if(matchMedia('(hover:none)').matches){e.preventDefault();active?close():open();clearTimeout(touchTimer);if(!active)return;touchTimer=setTimeout(close,8500)}});
document.addEventListener('click',e=>{if(matchMedia('(hover:none)').matches&&active&&!art.contains(e.target))close()});
})();