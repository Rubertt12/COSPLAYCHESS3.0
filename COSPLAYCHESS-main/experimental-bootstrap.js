const { app } = require('electron');

const REMOTE_ACTIONS = {
  F13: "typeof playWithFade==='function' && playWithFade('Ambiente')",
  F14: "typeof stopWithFade==='function' && stopWithFade('Ambiente')",
  F15: "typeof startBattle==='function' && startBattle()",
  F16: "typeof pauseGame==='function' && pauseGame()",
  F17: `(() => {
    const el = document.getElementById('v-master-dash') || document.getElementById('v-master');
    if (!el) return;
    el.value = String(Math.max(0, Number(el.value || 0) - 0.1));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    if (typeof updateMasterVolume === 'function') updateMasterVolume();
  })()`,
  F18: `(() => {
    const el = document.getElementById('v-master-dash') || document.getElementById('v-master');
    if (!el) return;
    el.value = String(Math.min(1, Number(el.value || 0) + 0.1));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    if (typeof updateMasterVolume === 'function') updateMasterVolume();
  })()`,
  F19: `(() => {
    document.querySelectorAll('audio').forEach(audio => {
      try { audio.pause(); audio.currentTime = 0; } catch (_) {}
    });
    if (typeof stopWithFade === 'function') {
      try { stopWithFade('Ambiente'); } catch (_) {}
    }
  })()`,
  F20: "typeof rollInitiative==='function' && rollInitiative()",
  F21: "typeof undoMove==='function' && undoMove()",
  F22: "typeof toggleMenu==='function' && toggleMenu()"
};

function installBluetoothRemoteReceiver(win) {
  const wc = win.webContents;
  wc.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.isAutoRepeat) return;
    const script = REMOTE_ACTIONS[input.key];
    if (!script) return;

    event.preventDefault();
    wc.executeJavaScript(script).catch((error) => {
      console.error(`[Bluetooth Remote] Falha no comando ${input.key}:`, error);
    });
  });

  wc.on('did-finish-load', () => {
    wc.executeJavaScript(`(() => {
      if (document.getElementById('bluetooth-remote-badge')) return;
      const badge = document.createElement('div');
      badge.id = 'bluetooth-remote-badge';
      badge.textContent = 'BT REMOTE • EXPERIMENTAL';
      Object.assign(badge.style, {
        position: 'fixed',
        right: '12px',
        bottom: '12px',
        zIndex: '15000',
        padding: '7px 10px',
        borderRadius: '999px',
        background: 'rgba(8, 8, 12, .86)',
        border: '1px solid rgba(0,229,255,.35)',
        color: 'var(--accent, #00e5ff)',
        font: '700 9px/1 Arial, sans-serif',
        letterSpacing: '1px',
        pointerEvents: 'none',
        backdropFilter: 'blur(8px)'
      });
      document.body.appendChild(badge);
    })()`).catch(() => {});
  });
}

app.on('browser-window-created', (_event, win) => {
  installBluetoothRemoteReceiver(win);
});

require('./bootstrap.js');
