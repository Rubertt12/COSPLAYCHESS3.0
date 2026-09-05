(() => {
  const DB_NAME = 'WarEngine_v33_2';
  const STORE_NAME = 'assets';
  const KEY = 'all';

  function showImportStatus(message, error = false) {
    let el = document.getElementById('mobile-import-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mobile-import-status';
      Object.assign(el.style, {
        position: 'fixed',
        left: '14px',
        right: '14px',
        bottom: '88px',
        zIndex: '999999',
        padding: '12px 14px',
        borderRadius: '12px',
        font: '700 12px/1.35 system-ui, sans-serif',
        textAlign: 'center',
        background: error ? 'rgba(120,10,35,.96)' : 'rgba(5,24,36,.97)',
        border: error ? '1px solid rgba(255,80,120,.65)' : '1px solid rgba(18,221,255,.55)',
        color: '#fff',
        boxShadow: '0 10px 30px rgba(0,0,0,.45)'
      });
      document.body.appendChild(el);
    }
    el.style.background = error ? 'rgba(120,10,35,.96)' : 'rgba(5,24,36,.97)';
    el.style.borderColor = error ? 'rgba(255,80,120,.65)' : 'rgba(18,221,255,.55)';
    el.textContent = message;
  }

  function persistImportedData(data) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onerror = () => reject(req.error || new Error('Falha ao abrir banco local'));
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => {
        const db = req.result;
        const readTx = db.transaction(STORE_NAME, 'readonly');
        const getReq = readTx.objectStore(STORE_NAME).get(KEY);
        getReq.onerror = () => {
          db.close();
          reject(getReq.error || new Error('Falha ao ler dados atuais'));
        };
        getReq.onsuccess = () => {
          const current = getReq.result || {};
          const merged = { ...current };

          if (data.p && typeof data.p === 'object') merged.p = data.p;
          if (data.g && typeof data.g === 'object') merged.g = { ...(current.g || {}), ...data.g };
          if (Array.isArray(data.board)) merged.board = data.board;
          if (Array.isArray(data.graveyard)) merged.graveyard = data.graveyard;
          if (Array.isArray(data.log)) merged.log = data.log;

          const writeTx = db.transaction(STORE_NAME, 'readwrite');
          const putReq = writeTx.objectStore(STORE_NAME).put(merged, KEY);
          putReq.onerror = () => {
            db.close();
            reject(putReq.error || new Error('Falha ao gravar dados importados'));
          };
          writeTx.oncomplete = () => {
            db.close();
            resolve();
          };
          writeTx.onerror = () => {
            db.close();
            reject(writeTx.error || new Error('Falha ao finalizar importação'));
          };
        };
      };
    });
  }

  document.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== 'mobile-import-file') return;

    // Impede o importador antigo de executar em paralelo no APK.
    event.stopImmediatePropagation();

    const file = input.files?.[0];
    if (!file) return;

    showImportStatus('Importando dados do Cosplay Chess...');
    const reader = new FileReader();
    reader.onerror = () => showImportStatus('Não foi possível ler o arquivo JSON.', true);
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result || ''));
        if (!data || typeof data !== 'object' || (!data.p && !data.g && !data.board)) {
          throw new Error('JSON incompatível com o Cosplay Chess');
        }
        await persistImportedData(data);
        showImportStatus('Importação concluída. Recarregando peças, imagens e configurações...');
        input.value = '';
        setTimeout(() => window.location.reload(), 450);
      } catch (error) {
        console.error('[Android import]', error);
        showImportStatus(error?.message || 'Falha ao importar o JSON.', true);
      }
    };
    reader.readAsText(file);
  }, true);
})();
