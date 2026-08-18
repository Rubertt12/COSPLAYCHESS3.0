const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'apps', 'game');
const siteDir = path.join(root, 'apps', 'site');
const webGameDir = path.join(siteDir, 'jogo');
const landingFile = path.join(siteDir, 'index.html');
const assetVersion = String(process.env.VERCEL_GIT_COMMIT_SHA || Date.now()).slice(0, 12);

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

  const dataManagementPattern = /\n\s*<div class="unit-card" style="background: rgba\(0,229,255,0\.05\); border-color: rgba\(0,229,255,0\.2\);">\s*<b[^>]*>💾 GESTÃO DE DADOS<\/b>\s*<div[^>]*>\s*<button[^>]*onclick="exportSquadData\(\)"[^>]*>EXPORTAR<\/button>\s*<button[^>]*onclick="document\.getElementById\('import-file'\)\.click\(\)"[^>]*>IMPORTAR<\/button>\s*<input type="file" id="import-file"[^>]*onchange="importSquadData\(this\)"[^>]*>\s*<\/div>\s*<\/div>\s*/;

  const dataManagementSettings = `
                <div class="unit-card" id="json-data-settings" style="margin-top:14px; background:rgba(0,229,255,0.06); border:1px solid rgba(0,229,255,0.28); padding:12px; border-radius:8px;">
                    <b style="display:block; color:var(--accent); font-size:10px; letter-spacing:1px; margin-bottom:6px;">💾 ELENCO DO EVENTO (JSON DO SITE)</b>
                    <div class="json-settings-help" style="font-size:9px; color:#aaa; line-height:1.45; margin-bottom:10px;">
                        Importe o arquivo gerado em “Exportar para o app” no painel do site. Depois use “Acionar JSON” para distribuir o elenco automaticamente; o Modo Edição continua disponível para ajustes manuais.
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        <button class="btn-play-sm" style="width:100%; font-size:9px; padding:10px 6px;" onclick="document.getElementById('import-file').click()">IMPORTAR JSON DO SITE</button>
                        <button class="btn-play-sm" style="width:100%; font-size:9px; padding:10px 6px;" onclick="exportSquadData()">EXPORTAR JSON</button>
                        <input type="file" id="import-file" style="display:none" accept="application/json,.json">
                    </div>
                </div>
`;

  html = html.replace(dataManagementPattern, '\n');
  if (!html.includes('id="json-data-settings"')) {
    html = html.replace(
      '<button class="btn btn-back" onmouseenter="playUISound(\'hover\')" onclick="closeStartMenuSettings()" style="width:100%; margin-top:20px; font-size:10px;">VOLTAR</button>',
      `${dataManagementSettings}                <button class="btn btn-back" onmouseenter="playUISound('hover')" onclick="closeStartMenuSettings()" style="width:100%; margin-top:20px; font-size:10px;">VOLTAR</button>`
    );
  }

  html = html.replace(
    'MODO EDIÇÃO (UPLOAD/REMOVER)',
    'MODO EDIÇÃO (REVISAR ESCALAÇÃO)'
  );

  if (!html.includes('src="roster-editor.js"')) {
    html = html.replace(
      '<script src="script.js"></script>',
      '<script src="script.js"></script>\n<script src="roster-editor.js"></script>\n<script src="roster-guard.js"></script>\n<script src="site-roster-import.js"></script>'
    );
  } else {
    if (!html.includes('src="roster-guard.js"')) {
      html = html.replace(
        '<script src="roster-editor.js"></script>',
        '<script src="roster-editor.js"></script>\n<script src="roster-guard.js"></script>'
      );
    }
    if (!html.includes('src="site-roster-import.js"')) {
      html = html.replace(
        '<script src="roster-guard.js"></script>',
        '<script src="roster-guard.js"></script>\n<script src="site-roster-import.js"></script>'
      );
    }
  }

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
  landing = landing.replace(/\.\/site-cms\.js(?:\?v=[^"']*)?/g, `./site-cms.js?v=${assetVersion}`);
  fs.writeFileSync(landingFile, landing);
}

console.log(`CosplayChess web prepared at ${webGameDir} (asset ${assetVersion})`);