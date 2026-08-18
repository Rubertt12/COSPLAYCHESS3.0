const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'apps', 'game');
const siteDir = path.join(root, 'apps', 'site');
const webGameDir = path.join(siteDir, 'jogo');
const landingFile = path.join(siteDir, 'index.html');

const excludedNames = new Set([
  'node_modules',
  'dist',
  'dist-installer',
  'build',
  '.git',
  '.github',
  '.gitattributes',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'bootstrap.js',
  'main.js',
  'preload.js',
  'installer.iss',
  'installer.json',
  'vercel.json',
  'README.md'
]);

function copyWebFiles(source, destination) {
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (excludedNames.has(entry.name)) continue;

    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyWebFiles(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

if (!fs.existsSync(gameDir)) {
  throw new Error(`Game directory not found: ${gameDir}`);
}

fs.rmSync(webGameDir, { recursive: true, force: true });
copyWebFiles(gameDir, webGameDir);

// Browser metadata + small compatibility marker.
const gameIndex = path.join(webGameDir, 'index.html');
if (fs.existsSync(gameIndex)) {
  let html = fs.readFileSync(gameIndex, 'utf8');
  html = html.replace(
    '<title>Cosplay Chess - Rubra Studios</title>',
    '<title>Cosplay Chess — Jogar no navegador</title>\n    <meta name="description" content="Jogue e experimente o CosplayChess diretamente no navegador.">'
  );
  html = html.replace(
    '<body>',
    '<body data-runtime="web">'
  );
  fs.writeFileSync(gameIndex, html);
}

// Add the browser-game action to the desktop and mobile navigation.
if (fs.existsSync(landingFile)) {
  let landing = fs.readFileSync(landingFile, 'utf8');

  // Normalize any previous build-time hero CTA so the game action lives only in the navbar.
  landing = landing.replace(
    '<div class="hero-actions"><a class="btn gold big" href="#eventos">Ver próximos eventos</a><a class="btn dark big" href="./cadastro.html">Entrar no tabuleiro</a><a class="btn dark big" href="./jogo/" aria-label="Jogar CosplayChess no navegador">🎮 Jogar no navegador</a></div>',
    '<div class="hero-actions"><a class="btn gold big" href="#eventos">Ver próximos eventos</a><a class="btn dark big" href="./cadastro.html">Entrar no tabuleiro</a></div>'
  );

  const desktopMarker = '<div class="top-actions"><a class="btn ghost" href="./admin.html">Admin</a><a class="btn gold" href="./cadastro.html">Faça parte do Espetáculo!</a></div>';
  const desktopReplacement = '<div class="top-actions"><a class="btn ghost" href="./jogo/" aria-label="Jogar CosplayChess no navegador">Jogar no navegador</a><a class="btn ghost" href="./admin.html">Admin</a><a class="btn gold" href="./cadastro.html">Faça parte do Espetáculo!</a></div>';

  if (landing.includes(desktopMarker) && !landing.includes('href="./jogo/" aria-label="Jogar CosplayChess no navegador">Jogar no navegador</a>')) {
    landing = landing.replace(desktopMarker, desktopReplacement);
  }

  const mobileMarker = '<div class="mobile-menu-divider"></div>\n      <a href="./admin.html">Admin</a>';
  const mobileReplacement = '<div class="mobile-menu-divider"></div>\n      <a href="./jogo/" aria-label="Jogar CosplayChess no navegador">Jogar no navegador</a>\n      <a href="./admin.html">Admin</a>';

  if (landing.includes(mobileMarker) && !landing.includes('<a href="./jogo/" aria-label="Jogar CosplayChess no navegador">Jogar no navegador</a>')) {
    landing = landing.replace(mobileMarker, mobileReplacement);
  }

  fs.writeFileSync(landingFile, landing);
}

console.log(`CosplayChess web prepared at ${webGameDir}`);
