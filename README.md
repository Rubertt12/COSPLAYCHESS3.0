# CosplayChess 3.0

Plataforma completa do CosplayChess em um único repositório.

## Estrutura

- `apps/site` — landing page, inscrições, administração, galeria, Universo Fergorverse, Hall da Fama, ranking e conquistas.
- `apps/game` — aplicativo Electron usado para operar o tabuleiro e o espetáculo durante os eventos.
- `COSPLAYCHESS-main` — cópia legada temporária do app, mantida durante a migração para rollback.

## Deploy do site

Configure o projeto da Vercel para usar `apps/site` como **Root Directory**.

## Aplicativo

```bash
npm run game:start
npm run game:build
```

Depois da validação de Vercel, instalador e atualização automática, a pasta legada poderá ser removida em uma alteração separada.

<!-- production redeploy trigger: 2026-08-29 10:30 BRT -->
