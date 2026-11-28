const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructMenuOverlay(root=path.join(__dirname,'..')){
 const e=JSON.parse(fs.readFileSync(path.join(root,'MENU-OVERLAY-EXTRACTION-2026-11-25.json'),'utf8'));
 const module=fs.readFileSync(path.join(root,'customer-menu-overlay.js'),'utf8');
 const extractionModule=module
  .replace('let menuOpener;\n\n', '')
  .replace('openMenuOverlay(trigger = document.activeElement)', 'openMenuOverlay()')
  .replace(" || context.menuOverlay.classList.contains('show')", '')
  .replaceAll('openMenuOverlay(e.currentTarget);', 'openMenuOverlay();')
  .replace(/^[\t ]*(?:menuOpener = (?:trigger|null);|menuOpener\?\.focus\(\);|context\.menuClose\?\.focus\(\);)\r?\n/gm, '')
  .replace(/^[\t ]*context\.menuOverlay\.setAttribute\('aria-hidden', 'false'\);\r?\n/m, '')
  .replace(/^[\t ]*context\.menuOverlay\.setAttribute\('aria-hidden', 'true'\);\r?\n/m, '');
 assert.equal(hash(extractionModule),e.moduleSha256);
 let source=require('./page-controls-source.cjs').reconstructPageControls(root);
 for(const r of e.regions){let reversed=r.after;for(const fn of e.functions)reversed=reversed.replaceAll('(0, context.'+fn+')',fn);for(const dep of e.dependencies)reversed=reversed.replaceAll('context.'+dep,dep);assert.equal(reversed,r.before);assert.ok(extractionModule.includes(r.exported));assert.equal(source.split(r.wrapper).length,2);source=source.replace(r.wrapper,r.before);}
 assert.equal(source.split(e.initialization).length,2);source=source.replace(e.initialization,'');assert.equal(hash(source),e.originalSha256);return source;
}
module.exports={reconstructMenuOverlay};
