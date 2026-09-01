(() => {
  if (window.__cosplayPlayerPhotoSyncLoaded) return;
  window.__cosplayPlayerPhotoSyncLoaded = true;

  const originalFetch = window.fetch.bind(window);
  const INGEST_MARKER = 'cosplaychess-ingest-result';
  const PHOTO_MARKER = 'cosplaychess-player-photos';

  function syncConfig() {
    const sync = store?.g?.resultSync;
    return sync && typeof sync === 'object' ? sync : null;
  }

  function resultPayloadFrom(init) {
    if (!init?.body || typeof init.body !== 'string') return null;
    try {
      const parsed = JSON.parse(init.body);
      return parsed?.type === 'cosplaychess-result' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function rawAvatar(side) {
    const value = store?.g?.[`avatar${side}`];
    return typeof value === 'string' ? value.trim() : '';
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(reader.error || new Error('Falha ao converter a foto do Player.'));
      reader.readAsDataURL(blob);
    });
  }

  async function avatarToDataUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.startsWith('data:image/')) return raw;
    if (!/^https?:\/\//i.test(raw)) return '';

    const response = await originalFetch(raw, { cache: 'no-store', mode: 'cors' });
    if (!response.ok) throw new Error(`Não foi possível carregar a foto do Player (${response.status}).`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('A foto do Player não é uma imagem válida.');
    if (blob.size > 4 * 1024 * 1024) throw new Error('A foto do Player é muito grande.');
    return blobToDataUrl(blob);
  }

  function compactAvatar(dataUrl) {
    if (!dataUrl) return Promise.resolve('');
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        try {
          const max = 800;
          const ratio = Math.min(1, max / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
          const width = Math.max(1, Math.round((image.naturalWidth || image.width) * ratio));
          const height = Math.max(1, Math.round((image.naturalHeight || image.height) * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#0b0b0d';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressed && compressed.length < dataUrl.length ? compressed : dataUrl);
        } catch (_) {
          resolve(dataUrl);
        }
      };
      image.onerror = () => resolve(dataUrl);
      image.src = dataUrl;
    });
  }

  function photoEndpoint(resultEndpoint) {
    const cfg = syncConfig();
    if (cfg?.photoEndpoint) return cfg.photoEndpoint;
    return String(resultEndpoint || cfg?.endpoint || '').replace(/cosplaychess-ingest-result\/?(?:\?.*)?$/i, PHOTO_MARKER);
  }

  function setPhotoSyncState(status, error = null) {
    try {
      const rt = store?.g?.matchRuntime;
      if (!rt) return;
      if (!rt.sync) rt.sync = {};
      rt.sync.photoStatus = status;
      rt.sync.photoError = error;
      if (status === 'sent') rt.sync.photosSyncedAt = new Date().toISOString();
      save?.();
    } catch (_) {}
  }

  async function sendPlayerPhotos(resultEndpoint, payload) {
    const avatarB = rawAvatar('B');
    const avatarP = rawAvatar('P');
    if (!avatarB && !avatarP) {
      setPhotoSyncState('none');
      return { ok: true, skipped: true };
    }

    setPhotoSyncState('sending');
    const [player1Raw, player2Raw] = await Promise.all([
      avatarToDataUrl(avatarB),
      avatarToDataUrl(avatarP)
    ]);
    const [player1Photo, player2Photo] = await Promise.all([
      compactAvatar(player1Raw),
      compactAvatar(player2Raw)
    ]);

    const cfg = syncConfig() || {};
    const endpoint = photoEndpoint(resultEndpoint);
    if (!endpoint || endpoint === resultEndpoint) throw new Error('Endpoint de fotos não configurado.');

    const headers = {
      'Content-Type': 'application/json',
      'x-cosplay-result-token': cfg.token || ''
    };
    if (cfg.apiKey) headers.apikey = cfg.apiKey;

    const response = await originalFetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eventId: payload.event?.id,
        sourceResultId: payload.matchId,
        players: {
          player1: { photoDataUrl: player1Photo },
          player2: { photoDataUrl: player2Photo }
        }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) throw new Error(data?.error || `Falha HTTP ${response.status} ao sincronizar fotos.`);
    setPhotoSyncState('sent');
    return data;
  }

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    const payload = url.includes(INGEST_MARKER) ? resultPayloadFrom(init) : null;
    if (!payload) return originalFetch(input, init);

    const response = await originalFetch(input, init);
    if (!response.ok) return response;

    let resultData = null;
    try { resultData = await response.clone().json(); } catch (_) {}
    if (!resultData?.ok) return response;

    try {
      await sendPlayerPhotos(url, payload);
      return response;
    } catch (error) {
      const message = error?.message || String(error);
      setPhotoSyncState('error', message);
      console.warn('[CosplayChess] Resultado salvo, mas as fotos dos Players não sincronizaram:', message);
      return new Response(JSON.stringify({
        error: `A partida foi salva, mas as fotos dos Players não foram enviadas: ${message}. Tente sincronizar novamente.`
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
  };
})();