const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructOrderSuccessCompat(root=path.join(__dirname,'..')){
 const e=JSON.parse(fs.readFileSync(path.join(root,'ORDER-SUCCESS-COMPAT-EXTRACTION-2026-11-25.json'),'utf8'));
 const module=fs.readFileSync(path.join(root,'customer-order-success-compat.js'),'utf8');assert.equal(hash(module),e.moduleSha256);assert.ok(module.includes(e.before));
 const source=fs.readFileSync(path.join(root,'customer-menu-basket.js'),'utf8');assert.equal(source.split(e.wrapper).length,2);const original=source.replace(e.wrapper,e.before);assert.equal(hash(original),e.originalSha256);return original;
}
module.exports={reconstructOrderSuccessCompat};
