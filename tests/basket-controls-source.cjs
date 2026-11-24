const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructBasketControls(root=path.join(__dirname,'..')){
 const e=JSON.parse(fs.readFileSync(path.join(root,'BASKET-CONTROLS-EXTRACTION-2026-11-24.json'),'utf8'));
 const module=fs.readFileSync(path.join(root,'customer-basket-controls.js'),'utf8');assert.equal(hash(module),e.moduleSha256);
 let source=require('./customisation-pricing-source.cjs').reconstructCustomisationPricing(root);
 for(const r of e.regions){let reversed=r.after.replaceAll('context.basket','basket');
  for(const name of ['formatCurrency','roundToTwo','nameWithoutChillies','chilliIcons','refreshAppliedDiscountCode'])reversed=reversed.replaceAll('(0, context.'+name+')',name);
  if(r.name==='bindControls')reversed=reversed.slice('function bindControls(){\n'.length,-2);
  assert.equal(reversed,r.before);assert.ok(module.includes(r.after));assert.equal(source.split(r.wrapper).length,2);source=source.replace(r.wrapper,r.before);
 }
 assert.equal(source.split(e.initialization).length,2);source=source.replace(e.initialization,'');assert.equal(hash(source),e.originalSha256);return source;
}
module.exports={reconstructBasketControls};
