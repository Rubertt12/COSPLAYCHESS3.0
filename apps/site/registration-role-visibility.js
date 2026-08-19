(()=>{
  if(window.__cosplayRegistrationRoleVisibilityLoaded)return;
  window.__cosplayRegistrationRoleVisibilityLoaded=true;

  const form=document.getElementById('signupForm');
  const roleSelect=document.getElementById('gameRole');
  if(!form||!roleSelect)return;

  const characterName=document.getElementById('characterName');
  const piecePreference=document.getElementById('piecePreference');
  const secondPiecePreference=document.getElementById('secondPiecePreference');
  const photoFieldLabel=document.getElementById('photoFieldLabel');
  const photoFieldHelp=document.getElementById('photoFieldHelp');
  const gameRoleHelp=document.getElementById('gameRoleHelp');
  const preview=document.getElementById('photoPreview');

  function isPlayer(){return roleSelect.value==='player1'||roleSelect.value==='player2';}

  function setPieceBlockVisibility(block,hidden){
    block.hidden=hidden;
    if(hidden){
      block.style.setProperty('display','none','important');
      block.setAttribute('aria-hidden','true');
    }else{
      block.style.removeProperty('display');
      block.removeAttribute('aria-hidden');
    }
    block.querySelectorAll('input,select,textarea').forEach(control=>{
      control.disabled=hidden;
    });
  }

  function apply(){
    const player=isPlayer();
    const role=roleSelect.value;

    form.querySelectorAll('[data-piece-only]').forEach(block=>setPieceBlockVisibility(block,player));

    if(characterName){
      characterName.required=!player;
      if(player)characterName.value='';
    }
    if(piecePreference){
      piecePreference.required=!player;
      if(player)piecePreference.value='Sem preferência';
    }
    if(secondPiecePreference&&player)secondPiecePreference.value='Sem segunda preferência';

    if(photoFieldLabel)photoFieldLabel.textContent=player?'Foto do Player *':'Foto do personagem *';
    if(photoFieldHelp)photoFieldHelp.textContent=player
      ?'Envie uma foto clara do próprio Player. Ela será levada automaticamente ao jogo pelo JSON do evento.'
      :'Envie uma foto clara do personagem/cosplay. JPG, PNG ou WEBP.';

    if(gameRoleHelp)gameRoleHelp.textContent=role==='player1'
      ?'Player 1 comandará as Brancas. Personagem, peça, lado e música não precisam ser preenchidos.'
      :role==='player2'
        ?'Player 2 comandará as Pretas. Personagem, peça, lado e música não precisam ser preenchidos.'
        :'Peças humanas entram na escalação do tabuleiro e preenchem personagem, preferências de peça, lado e música normalmente.';

    if(preview&&!preview.style.backgroundImage)preview.textContent=player?'Prévia da foto do Player':'Prévia da foto';
  }

  roleSelect.addEventListener('change',apply);
  roleSelect.addEventListener('input',apply);
  apply();
})();
