const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const legacyRoot = path.resolve(mobileRoot, '..');
const repoRoot = path.resolve(legacyRoot, '..');
const gameRoot = path.join(repoRoot, 'apps', 'game');
const outDir = path.join(mobileRoot, 'www');

if (!fs.existsSync(gameRoot)) {
  throw new Error(`Jogo principal do Windows não encontrado: ${gameRoot}`);
}

const excludedDirs = new Set([
  'node_modules', 'dist', 'dist-installer', 'build', '.git', '.github'
]);

const excludedFiles = new Set([
  'package.json', 'package-lock.json', 'bootstrap.js', 'main.js', 'preload.js',
  'installer.iss', 'installer.json', 'latest.yml'
]);

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const name = path.basename(src);
    if (excludedDirs.has(name)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  const name = path.basename(src);
  if (excludedFiles.has(name)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const entry of fs.readdirSync(gameRoot)) {
  if (excludedDirs.has(entry) || excludedFiles.has(entry)) continue;
  copyRecursive(path.join(gameRoot, entry), path.join(outDir, entry));
}

const indexPath = path.join(outDir, 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('index.html do jogo principal não foi copiado para o APK.');
let html = fs.readFileSync(indexPath, 'utf8');

function injectHead(marker, markup) {
  if (!html.includes(marker)) html = html.replace('</head>', `    ${markup}\n</head>`);
}
function injectBody(marker, markup) {
  if (!html.includes(marker)) html = html.replace('</body>', `    ${markup}\n</body>`);
}

injectHead('mobile/mobile.css', '<link rel="stylesheet" href="mobile/mobile.css">');
injectHead('mobile/mobile-menu-fix.css', '<link rel="stylesheet" href="mobile/mobile-menu-fix.css">');
injectHead('mobile/mobile-settings.css', '<link rel="stylesheet" href="mobile/mobile-settings.css">');
injectHead('mobile/mobile-ui-enhancements.css', '<link rel="stylesheet" href="mobile/mobile-ui-enhancements.css">');

injectBody('custom-pieces.js', '<script src="custom-pieces.js"></script>');
injectBody('piece-name-editor-fix.js', '<script src="piece-name-editor-fix.js"></script>');
injectBody('piece-board-placement.js', '<script src="piece-board-placement.js"></script>');
injectBody('mobile/mobile.js', '<script src="mobile/mobile.js"></script>');
injectBody('mobile/mobile-import-fix.js', '<script src="mobile/mobile-import-fix.js"></script>');
injectBody('mobile/mobile-ui-enhancements.js', '<script src="mobile/mobile-ui-enhancements.js"></script>');

fs.writeFileSync(indexPath, html, 'utf8');

fs.mkdirSync(path.join(outDir, 'mobile'), { recursive: true });
for (const file of [
  'mobile.css',
  'mobile-menu-fix.css',
  'mobile-settings.css',
  'mobile-ui-enhancements.css',
  'mobile.js',
  'mobile-import-fix.js',
  'mobile-ui-enhancements.js'
]) {
  fs.copyFileSync(path.join(mobileRoot, file), path.join(outDir, 'mobile', file));
}

const required = [
  'style.css',
  'script.js',
  'participant-experience.js',
  'custom-pieces.js',
  'piece-name-editor-fix.js',
  'piece-board-placement.js',
  path.join('mobile', 'mobile-ui-enhancements.css'),
  path.join('mobile', 'mobile-ui-enhancements.js'),
  path.join('img', 'favicon', 'cosplaychess-app.png')
];
for (const file of required) {
  if (!fs.existsSync(path.join(outDir, file))) {
    throw new Error(`Recurso obrigatório ausente no APK: ${file}`);
  }
}

console.log('Android bundle sincronizado com apps/game e com menu/configurações móveis aprimorados.');
