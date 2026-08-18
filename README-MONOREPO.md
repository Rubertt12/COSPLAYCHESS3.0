# CosplayChess 3.0 — Monorepo

Este repositório passa a concentrar os dois produtos do CosplayChess:

- `apps/game`: aplicativo operacional do tabuleiro (Electron), usado durante os eventos.
- `apps/site`: site público, inscrições, administração, Universo Fergorverse, Hall da Fama, ranking e conquistas.

Durante a migração, a estrutura antiga `COSPLAYCHESS-main/` permanece no repositório para compatibilidade e rollback. Depois de validar app, instalador, Vercel e integrações, ela pode ser removida em uma etapa separada.

## Deploy

- Vercel: o `vercel.json` da raiz executa `node scripts/prepare-web.js` e publica `apps/site`.
- Navegador: o script de preparação copia/integra a versão web do jogo no site antes do deploy.
- Desktop: executar/buildar o Electron a partir de `apps/game`.
