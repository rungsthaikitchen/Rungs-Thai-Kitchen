const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructService(root=path.join(__dirname,'..')){
 const e=JSON.parse(fs.readFileSync(path.join(root,'CHECKOUT-SERVICE-EXTRACTION-2026-11-24.json'),'utf8'));
 const module=fs.readFileSync(path.join(root,'customer-checkout-service.js'),'utf8');assert.equal(hash(module),e.moduleSha256);
 let source=require('./legacy-kitchen-allocator-source.cjs').reconstructLegacyKitchenAllocator(root);
 for(const r of e.regions){
  assert.equal(r.after.replaceAll('context.',''),r.before,'only explicit dependency accesses');
  assert.ok(module.includes(r.after));assert.equal(source.split(r.wrapper).length,2);source=source.replace(r.wrapper,r.before);
 }
 assert.equal(source.split(e.initialization).length,2);source=source.replace(e.initialization,'');
 assert.equal(hash(source),e.originalSha256,'reconstruct published bootstrap');return source;
}
module.exports={reconstructService};
