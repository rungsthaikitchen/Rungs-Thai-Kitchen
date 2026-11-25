const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructLegacyKitchenSchedule(root=path.join(__dirname,'..')){
 const e=JSON.parse(fs.readFileSync(path.join(root,'LEGACY-KITCHEN-SCHEDULE-EXTRACTION-2026-11-25.json'),'utf8'));
 const module=fs.readFileSync(path.join(root,'customer-legacy-kitchen-schedule.js'),'utf8');assert.equal(hash(module),e.moduleSha256);
 let source=fs.readFileSync(path.join(root,'customer-checkout.js'),'utf8');
 for(const r of e.regions){assert.ok(module.includes(r.before));assert.equal(source.split(r.wrapper).length,2);source=source.replace(r.wrapper,r.before);}
 assert.equal(source.split(e.initialization).length,2);source=source.replace(e.initialization,'');assert.equal(hash(source),e.originalSha256);return source;
}
module.exports={reconstructLegacyKitchenSchedule};
