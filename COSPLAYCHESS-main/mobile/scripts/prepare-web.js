const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(mobileRoot, '..');
const outDir = path.join(mobileRoot, 'www');

const excludedDirs = new Set([
  'mobile', 'node_modules', 'dist', 'dist-installer', 'build', '.git', '.github'
]);

const excludedFiles = new Set([
  'package.json', 'package-lock.json', 'bootstrap.js', 'main.js', 'preload.js',
  'installer.iss', 'installer.json'
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

for (const entry of fs.readdirSync(projectRoot)) {
  if (excludedDirs.has(entry) || excludedFiles.has(entry)) continue;
  copyRecursive(path.join(projectRoot, entry), path.join(outDir, entry));
}

const indexPath = path.join(outDir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

if (!html.includes('mobile/mobile.css')) {
  html = html.replace('</head>', '    <link rel="stylesheet" href="mobile/mobile.css">\n</head>');
}
if (!html.includes('mobile/mobile-menu-fix.css')) {
  html = html.replace('</head>', '    <link rel="stylesheet" href="mobile/mobile-menu-fix.css">\n</head>');
}
if (!html.includes('mobile/mobile-settings.css')) {
  html = html.replace('</head>', '    <link rel="stylesheet" href="mobile/mobile-settings.css">\n</head>');
}
if (!html.includes('mobile/mobile.js')) {
  html = html.replace('</body>', '    <script src="mobile/mobile.js"></script>\n</body>');
}
if (!html.includes('mobile/mobile-import-fix.js')) {
  html = html.replace('</body>', '    <script src="mobile/mobile-import-fix.js"></script>\n</body>');
}

fs.writeFileSync(indexPath, html, 'utf8');

fs.mkdirSync(path.join(outDir, 'mobile'), { recursive: true });
fs.copyFileSync(path.join(mobileRoot, 'mobile.css'), path.join(outDir, 'mobile', 'mobile.css'));
fs.copyFileSync(path.join(mobileRoot, 'mobile-menu-fix.css'), path.join(outDir, 'mobile', 'mobile-menu-fix.css'));
fs.copyFileSync(path.join(mobileRoot, 'mobile-settings.css'), path.join(outDir, 'mobile', 'mobile-settings.css'));
fs.copyFileSync(path.join(mobileRoot, 'mobile.js'), path.join(outDir, 'mobile', 'mobile.js'));
fs.copyFileSync(path.join(mobileRoot, 'mobile-import-fix.js'), path.join(outDir, 'mobile', 'mobile-import-fix.js'));

console.log('Android web bundle prepared at mobile/www');
