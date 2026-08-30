(() => {
  const content = document.getElementById('playerContent');
  if (!content) return;

  const buildAbout = () => {
    if (content.querySelector('.player-reference-about')) return;
    const achievements = content.querySelector('.player-achievements-section');
    if (!achievements) return;

    const card = document.createElement('section');
    card.className = 'player-reference-about';
    card.innerHTML = `
      <span class="kicker">SOBRE MIM</span>
      <h3>Perfil do participante</h3>
      <dl>
        <div><dt>Personagem</dt><dd class="about-accent" data-ref-character>Personagem</dd></div>
        <div><dt>Identidade</dt><dd data-ref-nick>Participante CosplayChess</dd></div>
        <div><dt>Estilo</dt><dd>Estratégico / Criativo</dd></div>
        <div><dt>Status</dt><dd class="player-reference-status">Em busca de desafios</dd></div>
      </dl>`;
    achievements.parentElement.insertBefore(card, achievements);

    const sync = () => {
      const character = document.getElementById('playerCharacter')?.textContent?.trim();
      const nick = document.getElementById('playerNick')?.textContent?.trim();
      const name = document.getElementById('playerName')?.textContent?.trim();
      const charTarget = card.querySelector('[data-ref-character]');
      const nickTarget = card.querySelector('[data-ref-nick]');
      if (charTarget) charTarget.textContent = character || 'Personagem';
      if (nickTarget) nickTarget.textContent = nick || name || 'Participante CosplayChess';
    };
    sync();
    setTimeout(sync, 500);
    setTimeout(sync, 1500);
  };

  const observer = new MutationObserver(() => {
    if (!content.hidden && content.querySelector('.player-social-tabs')) buildAbout();
  });
  observer.observe(content, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
  if (!content.hidden) buildAbout();
})();
