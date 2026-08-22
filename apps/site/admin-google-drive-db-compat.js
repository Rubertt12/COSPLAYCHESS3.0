(()=>{
  if (window.__cosplayGoogleDriveDbCompat) return;
  window.__cosplayGoogleDriveDbCompat = true;

  const db = window.COSPLAYCHESS_DB;
  if (!db || typeof db.from !== 'function') return;

  const originalFrom = db.from.bind(db);

  db.from = function(table){
    const query = originalFrom(table);
    if (table !== 'cosplay_event_photos' || !query || typeof query.upsert !== 'function') return query;

    const originalUpsert = query.upsert.bind(query);
    query.upsert = function(values, options){
      const conflict = String(options?.onConflict || '').replace(/\s+/g, '');
      if (conflict === 'event_id,source_provider,source_file_id') {
        // O fluxo do Google Drive já consulta source_file_id antes de importar.
        // Evita depender de ON CONFLICT/constraint no PostgREST e faz INSERT simples.
        return query.insert(values);
      }
      return originalUpsert(values, options);
    };
    return query;
  };
})();
