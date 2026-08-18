(()=>{
const art=document.querySelector('.hero-art');if(!art)return;
const sourceLogo=art.querySelector(':scope > img');if(!sourceLogo)return;
if(art.dataset.heroSocialReady==='1')return;art.dataset.heroSocialReady='1';art.classList.add('hero-social-ready');
sourceLogo.style.cursor='pointer';sourceLogo.setAttribute('tabindex','0');sourceLogo.setAttribute('role','button');sourceLogo.setAttribute('aria-label','Mostrar Instagram do Fergorverse');
const coinWrap=document.createElement('div');coinWrap.className='hero-coin-wrap';coinWrap.setAttribute('aria-hidden','true');
const coin=document.createElement('div');coin.className='hero-coin';
const front=document.createElement('div');front.className='hero-coin-face hero-coin-front';
const back=document.createElement('div');back.className='hero-coin-face hero-coin-back';
const frontImg=sourceLogo.cloneNode();const backImg=sourceLogo.cloneNode();frontImg.removeAttribute('id');backImg.removeAttribute('id');frontImg.removeAttribute('tabindex');backImg.removeAttribute('tabindex');frontImg.removeAttribute('role');backImg.removeAttribute('role');front.appendChild(frontImg);back.appendChild(backImg);coin.append(front,back);coinWrap.appendChild(coin);art.appendChild(coinWrap);
const syncCoinImages=()=>{frontImg.src=sourceLogo.src;backImg.src=sourceLogo.src};
new MutationObserver(syncCoinImages).observe(sourceLogo,{attributes:true,attributeFilter:['src']});
const link='https://www.instagram.com/fergorverse/';
const card=document.createElement('div');card.className='hero-social-card';card.innerHTML=`<div class="hero-social-card-head"><span class="hero-social-avatar"><img src="./img/logofergoverse.png" alt="Fergorverse"></span><span><b>@fergorverse</b><small>Cosplay • Xadrez • Eventos</small></span></div><p>Siga o universo Fergorverse e acompanhe os próximos capítulos do CosplayChess.</p><a href="${link}" target="_blank" rel="noopener noreferrer">Abrir Instagram ↗</a>`;
const rain=document.createElement('div');rain.className='hero-piece-rain';rain.setAttribute('aria-hidden','true');
const hint=document.createElement('div');hint.className='hero-social-hint';hint.textContent='Descubra o Fergorverse';
art.append(rain,card,hint);
let active=false,touchTimer=null,sequenceTimer=null,cleanupTimer=null,pieceTimer=null;
let audioCtx=null,ringTimers=[];
const pieces=['♙','♖','♘','♗','♕','♔'];
function ensureAudio(){const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)return null;if(!audioCtx)audioCtx=new AudioContextClass();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return audioCtx}
function ringTone(){
  const ctx=ensureAudio();if(!ctx||ctx.state!=='running')return;
  const now=ctx.currentTime;
  const out=ctx.createGain();
  const filter=ctx.createBiquadFilter();
  filter.type='highpass';filter.frequency.setValueAtTime(520,now);filter.Q.setValueAtTime(.55,now);
  out.gain.setValueAtTime(.0001,now);
  out.gain.exponentialRampToValueAtTime(.17,now+.004);
  out.gain.exponentialRampToValueAtTime(.075,now+.055);
  out.gain.exponentialRampToValueAtTime(.0001,now+.245);
  filter.connect(out);out.connect(ctx.destination);

  const hit=(time,freq,amp=.7)=>{
    const bright=ctx.createOscillator();
    const body=ctx.createOscillator();
    const g=ctx.createGain();
    bright.type='square';body.type='triangle';
    bright.frequency.setValueAtTime(freq,time);
    bright.frequency.exponentialRampToValueAtTime(freq*1.055,time+.042);
    body.frequency.setValueAtTime(freq*.5,time);
    body.frequency.exponentialRampToValueAtTime(freq*.535,time+.055);
    g.gain.setValueAtTime(.0001,time);
    g.gain.exponentialRampToValueAtTime(amp,time+.0025);
    g.gain.exponentialRampToValueAtTime(.0001,time+.082);
    bright.connect(g);body.connect(g);g.connect(filter);
    bright.start(time);body.start(time);bright.stop(time+.09);body.stop(time+.09);
  };

  hit(now,1046.5,.48);
  hit(now+.047,1568,.38);

  const metal=ctx.createOscillator();
  const metalGain=ctx.createGain();
  metal.type='sine';
  metal.frequency.setValueAtTime(3136,now+.012);
  metal.frequency.exponentialRampToValueAtTime(2637,now+.18);
  metalGain.gain.setValueAtTime(.0001,now);
  metalGain.gain.exponentialRampToValueAtTime(.12,now+.012);
  metalGain.gain.exponentialRampToValueAtTime(.0001,now+.21);
  metal.connect(metalGain);metalGain.connect(filter);
  metal.start(now);metal.stop(now+.22);
}
function playRingSequence(){ringTimers.forEach(clearTimeout);ringTimers=[0,155,310,465].map(delay=>setTimeout(ringTone,delay))}
function clearRingSequence(){ringTimers.forEach(clearTimeout);ringTimers=[]}
window.addEventListener('pointerdown',ensureAudio,{once:true,capture:true});window.addEventListener('keydown',ensureAudio,{once:true,capture:true});
function settlePieces(){rain.replaceChildren();const count=14;for(let i=0;i<count;i++){const p=document.createElement('span');p.className='hero-piece';p.textContent=pieces[i%pieces.length];const side=i%2===0;const x=side?7+Math.random()*32:61+Math.random()*31;p.style.setProperty('--x',`${x}%`);p.style.setProperty('--size',`${18+Math.random()*15}px`);p.style.setProperty('--dur',`${3.2+Math.random()*1.6}s`);p.style.setProperty('--delay',`${Math.random()*1.1}s`);p.style.setProperty('--rot',`${-65+Math.random()*130}deg`);p.style.setProperty('--start',`${-(420+Math.random()*260)}px`);p.style.setProperty('--rest',`${-2-Math.random()*14}px`);rain.appendChild(p)}}
function open(){if(active)return;active=true;clearTimeout(sequenceTimer);clearTimeout(cleanupTimer);clearTimeout(pieceTimer);art.classList.add('hero-social-active');art.classList.remove('hero-social-card-ready');rain.replaceChildren();playRingSequence();sequenceTimer=setTimeout(()=>{if(!active)return;art.classList.add('hero-social-card-ready');pieceTimer=setTimeout(()=>{if(active)settlePieces()},360)},1050)}
function close(){if(!active)return;active=false;clearTimeout(sequenceTimer);clearTimeout(pieceTimer);clearTimeout(touchTimer);clearRingSequence();art.classList.remove('hero-social-active','hero-social-card-ready');cleanupTimer=setTimeout(()=>{if(!active)rain.replaceChildren()},560)}
art.addEventListener('mouseenter',open);art.addEventListener('mouseleave',e=>{if(!art.contains(e.relatedTarget))close()});
sourceLogo.addEventListener('focus',open);sourceLogo.addEventListener('blur',()=>setTimeout(()=>{if(!art.contains(document.activeElement))close()},0));
sourceLogo.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ensureAudio();active?close():open()}});
sourceLogo.addEventListener('click',e=>{if(matchMedia('(hover:none)').matches){e.preventDefault();ensureAudio();active?close():open();clearTimeout(touchTimer);if(!active)return;touchTimer=setTimeout(close,9000)}});
document.addEventListener('click',e=>{if(matchMedia('(hover:none)').matches&&active&&!art.contains(e.target))close()});
})();