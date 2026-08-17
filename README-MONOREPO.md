# CosplayChess 3.0 — Monorepo

Este repositório passa a concentrar os dois produtos do CosplayChess:

- `apps/game`: aplicativo operacional do tabuleiro (Electron), usado durante os eventos.
- `apps/site`: site público, inscrições, administração, Universo Fergorverse, Hall da Fama, ranking e conquistas.

Durante a migração, a estrutura antiga `COSPLAYCHESS-main/` permanece no repositório para compatibilidade e rollback. Depois de validar app, instalador, Vercel e integrações, ela pode ser removida em uma etapa separada.

## Deploy

- Site: configurar a Root Directory da Vercel como `apps/site`.
- Game: executar/buildar a partir de `apps/game`.
