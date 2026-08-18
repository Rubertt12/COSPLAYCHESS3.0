const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'apps', 'game');
const siteDir = path.join(root, 'apps', 'site');
const webGameDir = path.join(siteDir, 'jogo');
const landingFile = path.join(siteDir, 'index.html');

const excludedNames = new Set([
  'node_modules','dist','dist-installer','build','.git','.github','.gitattributes','.gitignore','package.json','package-lock.json','bootstrap.js','main.js','preload.js','installer.iss','installer.json','vercel.json','README.md'
]);

function copyWebFiles(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (excludedNames.has(entry.name)) continue;
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) copyWebFiles(sourcePath, destinationPath);
    else fs.copyFileSync(sourcePath, destinationPath);
  }
}

if (!fs.existsSync(gameDir)) throw new Error(`Game directory not found: ${gameDir}`);
fs.rmSync(webGameDir, { recursive: true, force: true });
copyWebFiles(gameDir, webGameDir);

const gameIndex = path.join(webGameDir, 'index.html');
if (fs.existsSync(gameIndex)) {
  let html = fs.readFileSync(gameIndex, 'utf8');
  html = html.replace(
    '<title>Cosplay Chess - Rubra Studios</title>',
    '<title>Cosplay Chess — Jogar no navegador</title>\n    <meta name="description" content="Versão web administrativa do CosplayChess.">'
  );

  const gate = `
    <style id="adminGameGateStyle">body{visibility:hidden}</style>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><\/script>
    <script>
      (async()=>{
        try{
          const sb=window.supabase.createClient('https://cotudgzjyzkljahnknuf.supabase.co','sb_publishable_FU4bO8phnJybvgQWgDrm8A_A-X8fz84');
          const {data:{session}}=await sb.auth.getSession();
          if(!session){location.replace('../admin.html');return;}
          const {data:admin,error}=await sb.from('cosplay_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
          if(error||!admin){location.replace('../admin.html');return;}
          const show=()=>{document.body.style.visibility='visible';document.getElementById('adminGameGateStyle')?.remove();};
          if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
        }catch(e){location.replace('../admin.html');}
      })();
    <\/script>`;

  if (!html.includes('adminGameGateStyle')) html = html.replace('</head>', `${gate}\n</head>`);
  html = html.replace('<body>', '<body data-runtime="web" data-admin-only="true">');
  fs.writeFileSync(gameIndex, html);
}

if (fs.existsSync(landingFile)) {
  let landing = fs.readFileSync(landingFile, 'utf8');
  landing = landing.replace(/<a class="btn ghost" href="\.\/jogo\/" aria-label="Jogar CosplayChess no navegador">Jogar no navegador<\/a>/g, '');
  landing = landing.replace(/\n\s*<a href="\.\/jogo\/" aria-label="Jogar CosplayChess no navegador">Jogar no navegador<\/a>/g, '');
  landing = landing.replace(/<a class="btn dark big" href="\.\/jogo\/" aria-label="Jogar CosplayChess no navegador">(?:🎮\s*)?Jogar no navegador<\/a>/g, '');
  fs.writeFileSync(landingFile, landing);
}

console.log(`CosplayChess web prepared at ${webGameDir}`);
