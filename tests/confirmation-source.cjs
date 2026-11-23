const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reconstructConfirmation(root=path.join(__dirname,'..')){
 const evidence=JSON.parse(fs.readFileSync(path.join(root,'CHECKOUT-CONFIRMATION-EXTRACTION-2026-11-23.json'),'utf8'));
 const module=fs.readFileSync(path.join(root,'customer-checkout-confirmation.js'),'utf8');
 assert.equal(hash(module),evidence.moduleSha256);
 assert.ok(module.includes(evidence.block),'confirmation body must remain unchanged');
 const source=require('./customer-data-source.cjs').reconstructCustomerData(root);
 assert.equal(source.split(evidence.initialization).length,2);
 const reconstructed=source.replace(evidence.initialization,evidence.block);
 assert.equal(hash(reconstructed),evidence.originalSha256,'reconstruct complete published bootstrap');
 return reconstructed;
}
module.exports={reconstructConfirmation};
