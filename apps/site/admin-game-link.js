(()=>{
  const dashboard=document.getElementById('dashboardPanel');
  const heading=dashboard?.querySelector('.admin-heading');
  if(!dashboard||!heading||heading.querySelector('[data-admin-game-link]'))return;

  const currentAction=heading.querySelector('#newEventBtn');
  const actions=document.createElement('div');
  actions.style.display='flex';
  actions.style.gap='8px';
  actions.style.flexWrap='wrap';
  actions.style.justifyContent='flex-end';

  const game=document.createElement('a');
  game.className='btn dark';
  game.href='./jogo/';
  game.target='_blank';
  game.rel='noopener';
  game.textContent='Jogar no navegador';
  game.dataset.adminGameLink='true';

  if(currentAction){
    heading.insertBefore(actions,currentAction);
    actions.append(game,currentAction);
  }else{
    actions.append(game);
    heading.append(actions);
  }
})();
