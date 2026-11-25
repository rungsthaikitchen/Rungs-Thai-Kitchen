const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructDeliveryQuotes(root=path.join(__dirname,'..')){
 const e=JSON.parse(fs.readFileSync(path.join(root,'DELIVERY-QUOTES-EXTRACTION-2026-11-25.json'),'utf8'));
 const module=fs.readFileSync(path.join(root,'customer-delivery-quotes.js'),'utf8');assert.equal(hash(module),e.moduleSha256);
 let source=require('./checkout-reset-source.cjs').reconstructCheckoutReset(root);
 for(const r of e.regions){let reversed=r.after;for(const fn of e.functions)reversed=reversed.replaceAll('(0, context.'+fn+')',fn);for(const dep of e.dependencies)reversed=reversed.replaceAll('context.'+dep,dep);assert.equal(reversed,r.before);assert.ok(module.includes(r.after));assert.equal(source.split(r.wrapper).length,2);source=source.replace(r.wrapper,r.before);}
 assert.equal(source.split(e.initialization).length,2);source=source.replace(e.initialization,'');assert.equal(hash(source),e.originalSha256);return source;
}
module.exports={reconstructDeliveryQuotes};
