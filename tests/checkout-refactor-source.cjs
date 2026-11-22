// Reconstruct the prior lexical bootstrap for existing focused policy tests.
// Live controller seams are exercised separately; reconstruction is hash-checked.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
function invert(text,edits){
 for(const edit of [...edits].reverse()){
  assert.equal(text.slice(edit.newStart,edit.newEnd),edit.to,'extracted source drift');
  text=text.slice(0,edit.newStart)+edit.from+text.slice(edit.newEnd);
 }
 return text;
}
function reconstruct(root=path.join(__dirname,'..')){
 const evidence=JSON.parse(fs.readFileSync(path.join(root,'CHECKOUT-CONTROLLERS-EXTRACTION-2026-11-19.json'),'utf8'));
 let current=require('./pricing-source.cjs').reconstructPricing(root);
 // Undo the documented subsequent message fix only for historical extraction
 // proofs. Current delivery messages are executable-tested separately.
 const messageChange=require('./delivery-message-change.json');
 assert.equal(hash(messageChange.after),messageChange.afterSha256);
 assert.equal(current.split(messageChange.after).length,2,'current delivery message block drift');
 current=current.replace(messageChange.after,messageChange.before);
 let source=invert(current,evidence.bridgeEdits);
 for(const name of ['availability','submission']){
  const module=fs.readFileSync(path.join(root,'customer-checkout-'+name+'.js'),'utf8');
  const start='// BEGIN extracted '+name+'\n',end='// END extracted '+name+'\n';
  let body=module.slice(module.indexOf(start)+start.length,module.indexOf(end));
  if(name==='submission')body=body.slice(0,-1); // module separator, not original body
  body=invert(body,evidence[name].edits);
  assert.equal(hash(body),evidence[name].originalSha256,name+' changed during extraction');
  if(name==='submission')body=evidence.submission.listenerPrefix+body+evidence.submission.listenerSuffix;
  const first='// BEGIN checkout-'+name+' boundary\n',last='// END checkout-'+name+' boundary\n';
  const a=source.indexOf(first),b=source.indexOf(last,a)+last.length;
  assert.ok(a>=0&&b>a);source=source.slice(0,a)+body+source.slice(b);
 }
 source=source.replace(evidence.submission.guardMarker,evidence.submission.originalGuard);
 assert.equal(hash(source),evidence.originalCheckoutSha256,'complete bootstrap reconstruction');
 return source;
}
module.exports={reconstruct,invert};
