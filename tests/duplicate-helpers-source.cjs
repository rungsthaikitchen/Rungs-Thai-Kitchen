const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructDuplicateHelpers(root=path.join(__dirname,'..')){
 const e=JSON.parse(fs.readFileSync(path.join(root,'DUPLICATE-HELPERS-CLEANUP-2026-11-25.json'),'utf8'));
 let source=fs.readFileSync(path.join(root,'customer-menu-basket.js'),'utf8');assert.equal(hash(source),e.revisedSha256);
 for(const r of e.regions){assert.equal(source.split(r.replacement).length,2);source=source.replace(r.replacement,r.before);}
 assert.equal(hash(source),e.originalSha256);return source;
}
module.exports={reconstructDuplicateHelpers};
