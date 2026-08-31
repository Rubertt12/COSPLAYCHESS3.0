(() => {
  if (window.__CC_FRIEND_PROFILE_ACCESS_V13__) return;
  window.__CC_FRIEND_PROFILE_ACCESS_V13__ = true;

  const participantClient = window.getCosplayChessParticipantDb
    ? window.getCosplayChessParticipantDb()
    : window.COSPLAYCHESS_PARTICIPANT_DB;
  if (!participantClient) return;

  const wrapBuilder = (builder) => {
    if (!builder || (typeof builder !== 'object' && typeof builder !== 'function')) return builder;
    let proxy;
    proxy = new Proxy(builder, {
      get(target, prop) {
        const value = Reflect.get(target, prop, target);
        if (prop === 'eq' && typeof value === 'function') {
          return (column, expected, ...rest) => {
            // A privacidade real é decidida pelo RLS. Ignoramos apenas o filtro
            // legado que impedia amigos aceitos de abrir perfis ocultos ao público.
            if (column === 'profile_visible' && expected === true) return proxy;
            return wrapBuilder(value.call(target, column, expected, ...rest));
          };
        }
        if (typeof value !== 'function') return value;
        if (prop === 'then' || prop === 'catch' || prop === 'finally') return value.bind(target);
        return (...args) => {
          const result = value.apply(target, args);
          return result && (typeof result === 'object' || typeof result === 'function')
            ? wrapBuilder(result)
            : result;
        };
      }
    });
    return proxy;
  };

  const client = new Proxy(participantClient, {
    get(target, prop) {
      if (prop === 'from') {
        return (table) => {
          const query = target.from(table);
          return table === 'cosplay_participant_profiles' ? wrapBuilder(query) : query;
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });

  // Nesta página usamos a sessão do participante. Sem login, o mesmo cliente
  // continua operando como anon e o RLS mantém apenas perfis públicos visíveis.
  window.COSPLAYCHESS_DB = client;
  window.getCosplayChessDb = () => client;
  window.COSPLAYCHESS_PARTICIPANT_DB = client;
  window.getCosplayChessParticipantDb = () => client;
})();
