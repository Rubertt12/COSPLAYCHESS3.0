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

// Inject the web-game CTA into the landing page at build time.
if (fs.existsSync(landingFile)) {
  let landing = fs.readFileSync(landingFile, 'utf8');
  const marker = '<div class="hero-actions"><a class="btn gold big" href="#eventos">Ver próximos eventos</a><a class="btn dark big" href="./cadastro.html">Entrar no tabuleiro</a></div>';
  const replacement = '<div class="hero-actions"><a class="btn gold big" href="#eventos">Ver próximos eventos</a><a class="btn dark big" href="./cadastro.html">Entrar no tabuleiro</a><a class="btn dark big" href="./jogo/" aria-label="Jogar CosplayChess no navegador">🎮 Jogar no navegador</a></div>';

  if (landing.includes(marker)) {
    landing = landing.replace(marker, replacement);
    fs.writeFileSync(landingFile, landing);
  } else {
    console.warn('Landing CTA marker not found; game was published but CTA was not injected.');
  }
}

console.log(`CosplayChess web prepared at ${webGameDir}`);
