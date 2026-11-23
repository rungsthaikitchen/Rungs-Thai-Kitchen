const fs=require('node:fs'),path=require('node:path');
// Focused policy tests use the hash-checked lexical reconstruction while
// actual factory state/dependency seams are covered by controller tests.
module.exports=function customerSource(file){
 const root=path.dirname(file);
 return fs.readFileSync(file,'utf8').replace(/<script src="\/(customer-(?:menu-basket|checkout-availability|checkout-dialog|checkout-submission|checkout-pricing|checkout-confirmation|checkout)\.js)\?[^"\n]+"><\/script>/g,(_,name)=>{
  if(name==='customer-checkout-confirmation.js'||name==='customer-checkout-pricing.js'||name==='customer-checkout-availability.js'||name==='customer-checkout-submission.js')return '';
  const text=name==='customer-checkout.js'?require('./checkout-refactor-source.cjs').reconstruct(root):fs.readFileSync(path.join(root,name),'utf8');
  return '<script>'+text+'</script>';
 });
};
