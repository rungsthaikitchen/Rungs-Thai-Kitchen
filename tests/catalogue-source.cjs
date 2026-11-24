const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructCatalogue(root=path.join(__dirname,'..')){
 const e=JSON.parse(fs.readFileSync(path.join(root,'MENU-CATALOGUE-EXTRACTION-2026-11-24.json'),'utf8'));
 const module=fs.readFileSync(path.join(root,'customer-menu-catalogue.js'),'utf8');assert.equal(hash(module),e.moduleSha256);assert.ok(module.includes(e.block));
 const source=require('./menu-rendering-source.cjs').reconstructMenuRendering(root);assert.equal(source.split(e.initialization).length,2);
 const original=source.replace(e.initialization,e.block);assert.equal(hash(original),e.originalSha256);return original;
}
module.exports={reconstructCatalogue};
