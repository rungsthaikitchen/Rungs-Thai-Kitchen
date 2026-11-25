const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function evidence(root){return JSON.parse(fs.readFileSync(path.join(root,'REVIEWED-BASKET-EXTRACTION-2026-11-25.json'),'utf8'));}
function reconstructReviewedBasket(root=path.join(__dirname,'..')){
 const e=evidence(root);let source=fs.readFileSync(path.join(root,'customer-menu-basket.js'),'utf8');assert.equal(hash(source),e.revisedSha256);assert.equal(source.split(e.wrapper).length,2);source=source.replace(e.wrapper,e.before);assert.equal(source.split(e.marker+e.addition).length,2);source=source.replace(e.marker+e.addition,e.marker);assert.equal(hash(source),e.originalSha256);return source;
}
function reconstructBasketModule(root=path.join(__dirname,'..')){
 const e=evidence(root);let source=fs.readFileSync(path.join(root,'customer-basket-controls.js'),'utf8');assert.equal(hash(source),e.moduleSha256);assert.equal(source.split(e.after+'\n'+e.newReturn).length,2);source=source.replace(e.after+'\n'+e.newReturn,e.oldReturn);assert.equal(hash(source),e.oldModuleSha256);return source;
}
module.exports={reconstructReviewedBasket,reconstructBasketModule};
