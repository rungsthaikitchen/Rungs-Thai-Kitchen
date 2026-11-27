const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructCompatibilityCleanup(root=path.join(__dirname,'..')){const e=JSON.parse(fs.readFileSync(path.join(root,'CHECKOUT-COMPATIBILITY-CLEANUP-2026-11-27.json'),'utf8'));let source=fs.readFileSync(path.join(root,'customer-checkout.js'),'utf8');assert.equal(hash(source),e.revisedSha256);for(const r of [...e.regions].reverse())source=source.slice(0,r.newStart)+r.before+source.slice(r.newStart);assert.equal(hash(source),e.originalSha256);return source;}
module.exports={reconstructCompatibilityCleanup};
