const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructCheckoutEvents(root=path.join(__dirname,'..')){
 const e=JSON.parse(fs.readFileSync(path.join(root,'CHECKOUT-EVENTS-EXTRACTION-2026-11-26.json'),'utf8'));
 const module=require('./checkout-pricing-events-source.cjs').reconstructEventsModule(root);assert.equal(hash(module),e.moduleSha256);assert.equal(e.after.replaceAll('deps.',''),e.before);assert.ok(module.includes(e.after));
 let source=require('./checkout-loyalty-phone-source.cjs').reconstructLoyaltyPhone(root);assert.equal(source.split(e.initialization).length,2);source=source.replace(e.initialization,e.before);assert.equal(hash(source),e.originalSha256);return source;
}
module.exports={reconstructCheckoutEvents};
