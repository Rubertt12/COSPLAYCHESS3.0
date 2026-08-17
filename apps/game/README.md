<p align="center">
  <img src="img/favicon-Photoroom.png" width="150" alt="Rubra Studios Logo">
</p>

<h1 align="center">⚔️ COSPLAY CHESS ⚔️</h1>

<p align="center">
  <b>A Próxima Geração de Engines de Batalha para Palcos Geek</b><br>
  <i>Onde a estratégia do xadrez encontra a imersão dos animes.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/ENGINE-ELECTRON-00e5ff?style=for-the-badge&logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/DB-INDEXEDDB-ff0055?style=for-the-badge&logo=googlechrome" alt="DB">
  <img src="https://img.shields.io/badge/RELEASE-1.0.0_STABLE-ffd700?style=for-the-badge" alt="Version">
</p>

---

### 📥 [BAIXAR ÚLTIMA VERSÃO](https://github.com/Rubertt12/COSPLAYCHESS/releases/download/xadrez/Cosplay.Chess.Setup.1.0.2.exe) | 📖 [DOCUMENTAÇÃO](#) | 💬 [SUPORTE](#)

---

## 💎 A EXPERIÊNCIA RUBRA

O **Cosplay Chess** redefine a interação em palco. Desenvolvido para ser o coração técnico de apresentações de cosplay, ele remove a frieza do xadrez tradicional e entrega uma interface viva, responsiva e totalmente customizável.

### 🌑 Estética "Glassmorphism"
Interface baseada no **macOS Sequoia**, utilizando filtros de desfoque de fundo (*backdrop-filters*), bordas neon sutis e tipografia futurista. Cada janela e menu foi desenhado para não apenas funcionar, mas impressionar o público.

### 🔊 Core de Áudio Inteligente
* **Dual-Channel Arena:** Controle de áudio independente para o Atacante e o Defensor.
* **Mood Fade:** Transições suaves de volume entre o modo tabuleiro e o modo arena.
* **Master Control:** Painel de sistema para o técnico de som ajustar ganhos em tempo real.

### 🚀 Alta Performance & Persistência
Utilizamos o **IndexedDB** como motor de armazenamento. Diferentemente de outros apps, o Cosplay Chess armazena imagens e áudios em **Base64** dentro do banco local, garantindo que o app carregue instantaneamente mesmo sem internet.

---

## 🛠️ STACK TECNOLÓGICA

| Módulo | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Runtime** | `Electron JS` | Container desktop para execução de baixa latência. |
| **Rendering** | `CSS Grid/Flexbox` | Tabuleiro 100% responsivo para qualquer resolução de telão. |
| **Logic** | `Vanilla JS` | Motor de regras, sistema de turnos e gerenciamento de DOM. |
| **Storage** | `IndexedDB` | Persistência de assets pesados (Imagens/MP3). |
| **Automation**| `IPC Main` | Ponte de comunicação com o sistema operacional (Windows). |

---

## 🎮 MANUAL DO OPERADOR

> [!TIP]
> **Dica de Ouro:** Antes de começar o evento, teste todos os áudios individuais na aba **SISTEMA** para garantir que o som do palco está equalizado.

## ⚡ INSTALAÇÃO DO ELECTRON NO SISTEMA

Se você quiser rodar este projeto em modo desktop com Electron, siga estes passos no terminal:

```bash
cd C:\Users\Rubertt\COSPLAYCHESS3.0\COSPLAYCHESS-main
npm install
npm install electron --save-dev
npm start
```

Se o comando `npm` não estiver disponível, instale o Node.js primeiro:

- Baixe em: https://nodejs.org/
- Durante a instalação, marque a opção para adicionar o Node.js ao PATH.
- Depois, abra um novo terminal e rode os comandos acima.

Se quiser instalar o Electron globalmente para uso mais direto:

```bash
npm install -g electron
```

Para gerar um executável Windows:

```bash
npm run dist:win
```

> Observação: este projeto já está preparado para rodar com Electron usando o arquivo package.json.

### 1. Preparação (Pre-Game)
No **Menu Inicial**, selecione a resolução que casa com o seu telão (ex: 1920x1080). Isso evita que o tabuleiro fique esticado ou pixelado.

### 2. Customização de Peças
Na sidebar lateral, você pode clicar em qualquer peça para fazer o upload da foto do Cosplayer. O sistema aceita `.png`, `.jpg` e `.webp`.

### 3. A Arena de Combate
Quando um duelo começa, a música ambiente diminui e o foco vai para os competidores. Use os botões `▶` e `||` para sincronizar as falas dos cosplayers com a ação no palco.

---
