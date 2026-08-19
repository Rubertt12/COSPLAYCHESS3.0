const cfg = window.COSPLAYCHESS_CONFIG;
const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
const form = document.getElementById('signupForm');
const eventSelect = document.getElementById('eventSelect');
const statusBox = document.getElementById('formStatus');
const photoInput = document.getElementById('characterPhoto');
const preview = document.getElementById('photoPreview');
const piecePreference = document.getElementById('piecePreference');
const secondPiecePreference = document.getElementById('secondPiecePreference');
const gameRole = document.getElementById('gameRole');
const characterName = document.getElementById('characterName');
const photoFieldLabel = document.getElementById('photoFieldLabel');
const photoFieldHelp = document.getElementById('photoFieldHelp');
const gameRoleHelp = document.getElementById('gameRoleHelp');
let photoDataUrl = '';
let availableEvents = [];

function status(message,type=''){statusBox.className=`form-status ${type}`;statusBox.textContent=message;}

async function loadEvents(){
  const {data,error}=await db.from('cosplay_events').select('id,title,start_at,venue,city,registration_open').eq('published',true).order('start_at');
  if(error){eventSelect.innerHTML='<option value="">Erro ao carregar eventos</option>';return;}
  availableEvents=(data||[]).filter(e=>e.registration_open);
  eventSelect.innerHTML='<option value="">Selecione um evento</option>'+availableEvents.map(e=>`<option value="${e.id}">${e.title} — ${new Date(e.start_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</option>`).join('');
  const selected=new URLSearchParams(location.search).get('event');
  if(selected&&availableEvents.some(e=>e.id===selected))eventSelect.value=selected;
}

function resizeImage(file){return new Promise((resolve,reject)=>{const img=new Image(),reader=new FileReader();reader.onload=()=>{img.onload=()=>{const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.84));};img.onerror=reject;img.src=reader.result;};reader.onerror=reject;reader.readAsDataURL(file);});}

function currentRole(){return gameRole?.value||'piece';}
function isPlayerRole(){return currentRole()==='player1'||currentRole()==='player2';}

function syncGameRoleUI(){
  const role=currentRole();
  const player=isPlayerRole();
  form.querySelectorAll('[data-piece-only]').forEach(el=>{el.hidden=player;});
  if(characterName){
    characterName.required=!player;
    if(player) characterName.value='';
  }
  if(piecePreference){
    piecePreference.required=!player;
    if(player) piecePreference.value='Sem preferência';
  }
  if(secondPiecePreference&&player) secondPiecePreference.value='Sem segunda preferência';
  if(photoFieldLabel) photoFieldLabel.textContent=player?'Foto do Player *':'Foto do personagem *';
  if(photoFieldHelp) photoFieldHelp.textContent=player
    ? 'Envie uma foto clara do próprio Player. Nome e foto serão preenchidos automaticamente no jogo pelo JSON do evento.'
    : 'Envie uma foto clara do personagem/cosplay. JPG, PNG ou WEBP.';
  if(gameRoleHelp) gameRoleHelp.textContent=role==='player1'
    ? 'Player 1 comandará as Brancas. Esta vaga é única por evento.'
    : role==='player2'
      ? 'Player 2 comandará as Pretas. Esta vaga é única por evento.'
      : 'Peças humanas entram na escalação do tabuleiro e contam para o limite de participantes.';
  if(!photoDataUrl) preview.textContent=player?'Prévia da foto do Player':'Prévia da foto';
  syncSecondPieceOptions();
}

gameRole?.addEventListener('change',syncGameRoleUI);

photoInput.addEventListener('change',async()=>{
  const file=photoInput.files[0];
  if(!file){photoDataUrl='';syncGameRoleUI();return;}
  status('Otimizando foto...');
  try{
    photoDataUrl=await resizeImage(file);
    preview.style.backgroundImage=`url('${photoDataUrl}')`;
    preview.textContent='';
    status('Foto pronta.','success');
  }catch{
    status('Não foi possível processar essa imagem.','error');
  }
});

function syncSecondPieceOptions(){
  if(!piecePreference||!secondPiecePreference)return;
  const primary=piecePreference.value;
  [...secondPiecePreference.options].forEach(option=>{option.disabled=Boolean(primary&&option.value===primary&&primary!=='Sem preferência');});
  if(secondPiecePreference.selectedOptions[0]?.disabled)secondPiecePreference.value='Sem segunda preferência';
}
piecePreference?.addEventListener('change',syncSecondPieceOptions);

function collectExtraFields(){
  const extra={};
  form.querySelectorAll('[data-dynamic-field]').forEach(el=>{
    const key=el.dataset.fieldKey||el.name;
    if(!key)return;
    extra[key]=el.type==='checkbox'?Boolean(el.checked):el.value;
  });
  return extra;
}

function participantPayload(data){
  const role=data.gameRole||'piece';
  const player=role==='player1'||role==='player2';
  return{
    gameRole:role,
    fullName:data.fullName,
    nick:data.nick,
    email:data.email,
    whatsapp:data.whatsapp,
    city:data.city,
    age:data.age,
    chessLevel:data.chessLevel,
    participationType:player?'Jogador':data.participationType,
    sidePreference:role==='player1'?'Brancas':role==='player2'?'Pretas':data.sidePreference,
    piecePreference:player?'Não se aplica':data.piecePreference,
    secondPiecePreference:player?'Não se aplica':data.secondPiecePreference,
    characterName:player?'':data.characterName,
    musicName:player?'':(data.musicName||''),
    musicUrl:player?'':(data.musicUrl||''),
    notes:data.notes,
    extraFields:collectExtraFields()
  };
}

async function sendRegistration(eventId,participant){
  const response=await fetch(`${cfg.functionsBase}/cosplaychess-register`,{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':cfg.supabaseKey},
    body:JSON.stringify({eventId,participant,photo:{dataUrl:photoDataUrl}})
  });
  const result=await response.json();
  return{response,result};
}
function nextEventPrompt(nextEvent,limit){const when=nextEvent?.start_at?new Date(nextEvent.start_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';return`As ${limit||32} vagas de peças deste evento já foram preenchidas.\n\nQuer se inscrever na próxima edição${nextEvent?.title?` — ${nextEvent.title}`:''}${when?` (${when})`:''}?`;}

form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!photoDataUrl){status(isPlayerRole()?'Escolha uma foto do Player.':'Escolha uma foto do personagem.','error');return;}
  const button=document.getElementById('submitButton');button.disabled=true;status('Enviando inscrição...');
  const data=Object.fromEntries(new FormData(form));
  const player=data.gameRole==='player1'||data.gameRole==='player2';
  if(!player&&!data.piecePreference){button.disabled=false;status('Escolha qual peça você quer ser.','error');return;}
  if(!player&&data.secondPiecePreference===data.piecePreference&&data.piecePreference!=='Sem preferência'){
    button.disabled=false;status('A segunda preferência precisa ser diferente da primeira.','error');return;
  }
  const participant=participantPayload(data);
  let submittedEventId=data.eventId;
  try{
    let{response,result}=await sendRegistration(submittedEventId,participant);
    if(!response.ok&&result.code==='EVENT_FULL'){
      if(!result.nextEvent){status(`As ${result.limit||32} vagas de peças deste evento já foram preenchidas. A próxima edição ainda não está com inscrições abertas.`,'error');return;}
      const wantsNext=confirm(nextEventPrompt(result.nextEvent,result.limit));
      if(!wantsNext){status(`As ${result.limit||32} vagas de peças deste evento já foram preenchidas. Sua inscrição não foi enviada.`,'error');return;}
      submittedEventId=result.nextEvent.id;
      if([...eventSelect.options].some(o=>o.value===submittedEventId))eventSelect.value=submittedEventId;
      status(`Enviando sua inscrição para ${result.nextEvent.title}...`);
      ({response,result}=await sendRegistration(submittedEventId,participant));
    }
    if(!response.ok)throw new Error(result.error||'Erro ao enviar inscrição.');
    const selectedEvent=availableEvents.find(ev=>ev.id===submittedEventId)||{id:submittedEventId,title:result.eventTitle||''};
    status(result.message||'Inscrição confirmada.','success');
    window.dispatchEvent(new CustomEvent('cosplaychess:registration-success',{detail:{participant,event:selectedEvent,result}}));
    form.reset();
    photoDataUrl='';
    preview.style.backgroundImage='';
    syncGameRoleUI();
  }catch(err){status(err.message||String(err),'error');}
  finally{button.disabled=false;}
});

syncGameRoleUI();
loadEvents();
