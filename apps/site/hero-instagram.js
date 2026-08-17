(()=>{
const art=document.querySelector('.hero-art');if(!art)return;
const logo=art.querySelector(':scope > img');if(!logo)return;
if(art.dataset.heroSocialReady==='1')return;art.dataset.heroSocialReady='1';art.classList.add('hero-social-ready');
const link='https://www.instagram.com/fergorverse/';
const card=document.createElement('div');card.className='hero-social-card';card.innerHTML=`<div class="hero-social-card-head"><span class="hero-social-avatar"><img src="./img/logofergoverse.png" alt="Fergorverse"></span><span><b>@fergorverse</b><small>Cosplay • Xadrez • Eventos</small></span></div><p>Siga o universo Fergorverse e acompanhe os próximos capítulos do CosplayChess.</p><a href="${link}" target="_blank" rel="noopener noreferrer">Abrir Instagram ↗</a>`;
const rain=document.createElement('div');rain.className='hero-piece-rain';rain.setAttribute('aria-hidden','true');
const hint=document.createElement('div');hint.className='hero-social-hint';hint.textContent='Descubra o Fergorverse';
art.append(rain,card,hint);
let active=false,touchTimer=null,lastBurst=0;
const pieces=['♙','♖','♘','♗','♕','♔'];
function burst(){const now=Date.now();if(now-lastBurst<650)return;lastBurst=now;rain.replaceChildren();const count=12;for(let i=0;i<count;i++){const p=document.createElement('span');p.className='hero-piece';p.textContent=pieces[i%pieces.length];p.style.setProperty('--x',`${7+Math.random()*86}%`);p.style.setProperty('--size',`${18+Math.random()*15}px`);p.style.setProperty('--dur',`${1.15+Math.random()*.8}s`);p.style.setProperty('--delay',`${Math.random()*.24}s`);p.style.setProperty('--rot',`${-55+Math.random()*110}deg`);rain.appendChild(p)}setTimeout(()=>rain.replaceChildren(),2400)}
function open(){if(active)return;active=true;art.classList.add('hero-social-active');burst()}
function close(){active=false;art.classList.remove('hero-social-active')}
art.addEventListener('mouseenter',open);art.addEventListener('mouseleave',e=>{if(!art.contains(e.relatedTarget))close()});
logo.style.cursor='pointer';logo.setAttribute('tabindex','0');logo.setAttribute('role','button');logo.setAttribute('aria-label','Mostrar Instagram do Fergorverse');
logo.addEventListener('focus',open);logo.addEventListener('blur',()=>setTimeout(()=>{if(!art.contains(document.activeElement))close()},0));
logo.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();active?close():open()}});
logo.addEventListener('click',e=>{if(matchMedia('(hover:none)').matches){e.preventDefault();active?close():open();clearTimeout(touchTimer);if(!active)return;touchTimer=setTimeout(close,6000)}});
document.addEventListener('click',e=>{if(matchMedia('(hover:none)').matches&&active&&!art.contains(e.target))close()});
})();