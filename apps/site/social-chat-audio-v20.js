(() => {
  'use strict';
  if (window.__CC_CHAT_AUDIO_V20__) return;
  window.__CC_CHAT_AUDIO_V20__ = true;

  const db = window.getCosplayChessParticipantDb
    ? window.getCosplayChessParticipantDb()
    : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!db) return;

  const BUCKET = 'cosplaychess-social-media';
  const q = (s, r = document) => r.querySelector(s);
  let recorder = null;
  let stream = null;
  let chunks = [];
  let audioBlob = null;
  let audioUrl = '';
  let startedAt = 0;
  let timer = null;
  let busy = false;

  const style = document.createElement('style');
  style.textContent = `
    .cc20-audio-tool.recording{background:rgba(239,68,68,.14)!important;color:#ef4444!important;border-color:rgba(239,68,68,.45)!important;animation:cc20AudioPulse 1s ease-in-out infinite}
    .cc20-audio-preview{display:flex;align-items:center;gap:10px;width:100%;padding:9px 12px;border-top:1px solid var(--line);background:var(--panel)}
    .cc20-audio-preview audio{width:min(360px,100%);height:34px}
    .cc20-audio-preview span{font-size:9px;color:var(--muted);font-weight:800;white-space:nowrap}
    .cc20-audio-preview button{margin-left:auto;width:28px;height:28px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--muted);cursor:pointer}
    .cc20-audio-time{font-size:8px!important;color:#ef4444!important;font-weight:900!important;white-space:nowrap}
    @keyframes cc20AudioPulse{50%{transform:scale(.94);opacity:.75}}
  `;
  document.head.appendChild(style);

  function toast(text) {
    let el = q('#cc20AudioToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cc20AudioToast';
      el.style.cssText = 'position:fixed;z-index:100000;left:50%;bottom:30px;transform:translateX(-50%);padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text);box-shadow:0 16px 45px rgba(0,0,0,.35);font:800 10px Inter,system-ui';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 2600);
  }

  function clearAudio() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioBlob = null;
    audioUrl = '';
    q('#cc20AudioPreview')?.remove();
  }

  function renderPreview() {
    q('#cc20AudioPreview')?.remove();
    if (!audioBlob) return;
    audioUrl = URL.createObjectURL(audioBlob);
    const bottom = q('.cc20-bottom');
    const compose = q('#cc20Compose');
    if (!bottom || !compose) return;
    const preview = document.createElement('div');
    preview.id = 'cc20AudioPreview';
    preview.className = 'cc20-audio-preview';
    preview.innerHTML = `<audio controls preload="metadata" src="${audioUrl}"></audio><span>Áudio pronto para enviar</span><button type="button" aria-label="Remover áudio">×</button>`;
    bottom.insertBefore(preview, compose);
    preview.querySelector('button').addEventListener('click', clearAudio);
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
    q('#cc20AudioTime')?.remove();
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast('Seu navegador não permite gravar áudio aqui.');
      return;
    }
    try {
      clearAudio();
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options = {};
      if (MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')) options = { mimeType: 'audio/webm;codecs=opus' };
      recorder = new MediaRecorder(stream, options);
      chunks = [];
      recorder.addEventListener('dataavailable', e => { if (e.data?.size) chunks.push(e.data); });
      recorder.addEventListener('stop', () => {
        const mime = String(recorder?.mimeType || 'audio/webm').split(';')[0];
        audioBlob = new Blob(chunks, { type: mime });
        stream?.getTracks().forEach(t => t.stop());
        stream = null;
        recorder = null;
        stopTimer();
        const btn = q('#cc20AudioBtn');
        if (btn) { btn.classList.remove('recording'); btn.textContent = '🎙️'; btn.title = 'Gravar áudio'; }
        if (audioBlob.size) renderPreview();
      });
      recorder.start(250);
      startedAt = Date.now();
      const btn = q('#cc20AudioBtn');
      if (btn) { btn.classList.add('recording'); btn.textContent = '■'; btn.title = 'Parar gravação'; }
      const time = document.createElement('span');
      time.id = 'cc20AudioTime';
      time.className = 'cc20-audio-time';
      q('#cc20Compose')?.insertBefore(time, q('.cc20-send'));
      const paint = () => {
        const sec = Math.floor((Date.now() - startedAt) / 1000);
        if (time) time.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
        if (sec >= 180) stopRecording();
      };
      paint();
      timer = setInterval(paint, 500);
    } catch {
      toast('Não consegui acessar o microfone. Verifique a permissão do navegador.');
    }
  }

  function stopRecording() {
    try { if (recorder?.state === 'recording') recorder.stop(); } catch {}
  }

  function ensureAudioButton() {
    const compose = q('#cc20Compose');
    if (!compose || q('#cc20AudioBtn', compose)) return;
    const send = q('.cc20-send', compose);
    const body = q('#cc20Body', compose);
    if (!send || !body) return;
    const btn = document.createElement('button');
    btn.id = 'cc20AudioBtn';
    btn.type = 'button';
    btn.className = 'cc20-tool cc20-audio-tool';
    btn.title = 'Gravar áudio';
    btn.setAttribute('aria-label', 'Gravar áudio');
    btn.textContent = '🎙️';
    compose.insertBefore(btn, body);
    btn.addEventListener('click', () => recorder?.state === 'recording' ? stopRecording() : startRecording());

    body.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        e.stopImmediatePropagation();
        compose.requestSubmit();
      }
    }, true);
  }

  async function currentIdentity() {
    const { data: sessionData } = await db.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;
    const { data: profile } = await db.from('cosplay_participant_profiles')
      .select('id')
      .eq('user_id', user.id)
      .neq('registration_status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return profile ? { user, profile } : null;
  }

  function currentPeer() {
    return q('.cc20-thread.active[data-peer]')?.dataset.peer || '';
  }

  async function uploadAudio(identity) {
    const mime = String(audioBlob?.type || 'audio/webm').split(';')[0];
    const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mpeg') ? 'mp3' : mime.includes('mp4') || mime.includes('m4a') ? 'm4a' : mime.includes('wav') ? 'wav' : 'webm';
    const path = `${identity.user.id}/${identity.profile.id}/messages/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const { error } = await db.storage.from(BUCKET).upload(path, audioBlob, { contentType: mime, cacheControl: '3600', upsert: false });
    if (error) throw error;
    return path;
  }

  async function sendAudio(event) {
    if (!audioBlob || busy) return false;
    const peer = currentPeer();
    if (!peer) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    busy = true;
    const sendBtn = q('.cc20-send');
    if (sendBtn) sendBtn.disabled = true;
    let path = '';
    try {
      if (audioBlob.size > 15 * 1024 * 1024) throw new Error('too-large');
      const identity = await currentIdentity();
      if (!identity) throw new Error('no-session');
      path = await uploadAudio(identity);
      const body = q('#cc20Body')?.value.trim() || '';
      const { error } = await db.from('cosplay_direct_messages').insert({
        sender_profile_id: identity.profile.id,
        recipient_profile_id: peer,
        body,
        attachment_path: path,
        attachment_type: 'audio',
        metadata: { recorded: true }
      });
      if (error) throw error;
      clearAudio();
      if (q('#cc20Body')) q('#cc20Body').value = '';
      toast('Áudio enviado.');
      setTimeout(() => {
        q(`.cc20-thread[data-peer="${CSS.escape(peer)}"]`)?.click();
      }, 180);
    } catch (err) {
      if (path) db.storage.from(BUCKET).remove([path]).catch(() => {});
      toast(err?.message === 'too-large' ? 'O áudio deve ter no máximo 15 MB.' : 'Não foi possível enviar o áudio.');
    } finally {
      busy = false;
      if (sendBtn) sendBtn.disabled = false;
    }
    return true;
  }

  document.addEventListener('submit', event => {
    if (event.target?.id !== 'cc20Compose' || !audioBlob) return;
    sendAudio(event);
  }, true);

  const observer = new MutationObserver(() => ensureAudioButton());
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('click', e => {
    if (e.target.closest?.('[data-community-view="messages"], .cc20-thread, .cc20-presence-person, .cc20-new-person')) {
      setTimeout(ensureAudioButton, 80);
      setTimeout(ensureAudioButton, 250);
    }
  });
  ensureAudioButton();
})();