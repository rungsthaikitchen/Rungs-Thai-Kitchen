const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructDisplay(root=path.join(__dirname,'..')){
 const e=JSON.parse(fs.readFileSync(path.join(root,'CHECKOUT-DISPLAY-EXTRACTION-2026-11-24.json'),'utf8'));
 const module=require('./checkout-validation-alerts-source.cjs').reconstructDisplayModule(root);
 assert.equal(hash(module),e.moduleSha256);
 let source=require('./service-source.cjs').reconstructService(root);
 // Undo the separately tested address-required wiring fix for historical source proofs.
 for(const edit of [...require('./address-requirement-change.json').edits].reverse()){
  assert.equal(source.split(edit.after).length,2);source=source.replace(edit.after,edit.before);
 }
 for(const r of e.regions){
  assert.equal(r.after.replaceAll('context.checkoutForm','checkoutForm').replaceAll('context.deliveryQuoteState','deliveryQuoteState'),r.before);
  assert.ok(module.includes(r.after));assert.equal(source.split(r.wrapper).length,2);source=source.replace(r.wrapper,r.before);
 }
 assert.equal(source.split(e.initialization).length,2);source=source.replace(e.initialization,'');
 assert.equal(hash(source),e.originalSha256,'reconstruct complete published bootstrap');return source;
}
module.exports={reconstructDisplay};
