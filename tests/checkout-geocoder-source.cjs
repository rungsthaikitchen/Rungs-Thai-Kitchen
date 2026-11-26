const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function evidence(root){return JSON.parse(fs.readFileSync(path.join(root,'CHECKOUT-GEOCODER-EXTRACTION-2026-11-26.json'),'utf8'));}
function reconstructDeliveryModule(root=path.join(__dirname,'..')){const e=evidence(root);let source=fs.readFileSync(path.join(root,'customer-delivery-quotes.js'),'utf8');assert.equal(hash(source),e.moduleSha256);assert.ok(source.includes(e.before));assert.equal(source.split(e.addition+e.newExport).length,2);source=source.replace(e.addition+e.newExport,e.oldExport);assert.equal(hash(source),e.oldModuleSha256);return source;}
function reconstructGeocoder(root=path.join(__dirname,'..')){const e=evidence(root);reconstructDeliveryModule(root);let source=fs.readFileSync(path.join(root,'customer-checkout.js'),'utf8');assert.equal(source.split(e.initialization+e.wrapper).length,2);source=source.replace(e.initialization+e.wrapper,e.before);assert.equal(hash(source),e.originalSha256);return source;}
module.exports={reconstructGeocoder,reconstructDeliveryModule};
