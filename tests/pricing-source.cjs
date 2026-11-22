const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructPricing(root=path.join(__dirname,'..')){
 const e=JSON.parse(fs.readFileSync(path.join(root,'CHECKOUT-PRICING-EXTRACTION-2026-11-22.json'),'utf8'));
 const module=fs.readFileSync(path.join(root,'customer-checkout-pricing.js'),'utf8');
 assert.equal(hash(module),e.moduleSha256,'pricing module drift');
 let source=fs.readFileSync(path.join(root,'customer-checkout.js'),'utf8');
 for(const r of e.regions){
  let original=r.after;
  for(const name of e.dependencies){original=original.replaceAll('(0, context.'+name+')',name).replaceAll('context.'+name,name);}
  assert.equal(original,r.before,'only explicit dependency access changes: '+r.name);
  assert.ok(module.includes('// BEGIN pricing '+r.name+'\n'+r.after+'\n// END pricing '+r.name+'\n'));
  assert.equal(source.split(r.wrapper).length,2,'pricing wrapper drift: '+r.name);
  source=source.replace(r.wrapper,r.before);
 }
 assert.equal(source.split(e.initialization).length,2);source=source.replace(e.initialization,'');
 assert.equal(hash(source),e.originalSha256,'pricing reconstruction must match published baseline');
 return source;
}
module.exports={reconstructPricing};
