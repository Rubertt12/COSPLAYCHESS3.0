(() => {
  const $ = (id) => document.getElementById(id);
  const friendSource = $('communityFriends');
  const friendCountSource = $('communityFriendCount');
  const friendPreview = $('communityOrkutFriends');
  const friendCountMirror = $('communityOrkutFriendCount');

  const openView = (view) => {
    const button = document.querySelector(`[data-community-view="${view}"]`);
    if (!button) return;
    button.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  document.querySelectorAll('[data-orkut-open]').forEach((button) => {
    button.addEventListener('click', () => openView(button.dataset.orkutOpen));
  });

  const buildFriendPreview = () => {
    if (!friendPreview) return;
    const cards = [...(friendSource?.querySelectorAll('.community-person-card') || [])].slice(0, 6);
    friendPreview.replaceChildren();

    if (friendCountMirror) {
      friendCountMirror.textContent = friendCountSource?.textContent?.trim() || '0';
    }

    if (!cards.length) {
      const empty = document.createElement('div');
      empty.className = 'orkut-empty-mini';
      empty.textContent = 'Seus amigos vão aparecer aqui, como na clássica grade de amigos do Orkut.';
      friendPreview.appendChild(empty);
      return;
    }

    cards.forEach((sourceCard) => {
      const item = document.createElement('div');
      item.className = 'orkut-friend-preview';

      const sourceAvatar = sourceCard.querySelector('.community-person-avatar');
      const sourceName = sourceCard.querySelector('.community-person-copy b');
      if (sourceAvatar) {
        const avatar = sourceAvatar.cloneNode(true);
        item.appendChild(avatar);
      }
      const name = document.createElement('b');
      name.textContent = sourceName?.textContent?.trim() || 'Participante';
      item.appendChild(name);
      friendPreview.appendChild(item);
    });
  };

  buildFriendPreview();

  if (friendSource) {
    new MutationObserver(buildFriendPreview).observe(friendSource, { childList: true, subtree: true });
  }
  if (friendCountSource) {
    new MutationObserver(buildFriendPreview).observe(friendCountSource, { childList: true, characterData: true, subtree: true });
  }
})();
