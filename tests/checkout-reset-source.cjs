const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructCheckoutReset(root=path.join(__dirname,'..')){
 const e=JSON.parse(fs.readFileSync(path.join(root,'CHECKOUT-RESET-EXTRACTION-2026-11-25.json'),'utf8'));
 const module=require('./checkout-reset-compat-source.cjs').reconstructResetModule(root);assert.equal(hash(module),e.moduleSha256);
 let source=require('./duplicate-helpers-source.cjs').reconstructDuplicateHelpers(root);
 for(const r of e.regions){let reversed=r.after.replaceAll('(0, context.hidePreferredTimeMessage)','hidePreferredTimeMessage');for(const k of ['appliedDiscountCode','appliedDiscountAmount','lastPreferredDate'])reversed=reversed.replaceAll('context.'+k,k);assert.equal(reversed,r.before);assert.ok(module.includes(r.after));assert.equal(source.split(r.wrapper).length,2);source=source.replace(r.wrapper,r.before);}
 assert.equal(source.split(e.initialization).length,2);source=source.replace(e.initialization,'');assert.equal(hash(source),e.originalSha256);return source;
}
module.exports={reconstructCheckoutReset};
