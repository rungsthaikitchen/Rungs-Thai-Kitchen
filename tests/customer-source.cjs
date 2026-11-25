const fs=require('node:fs'),path=require('node:path');
// Focused policy tests use the hash-checked lexical reconstruction while
// actual factory state/dependency seams are covered by controller tests.
module.exports=function customerSource(file){
 const root=path.dirname(file);
 return fs.readFileSync(file,'utf8').replace(/<script src="\/(customer-(?:menu-overlay|order-success-compat|menu-catalogue|menu-rendering|basket-controls|customisation-pricing|customisation-selectors|customisation-dialog|menu-basket|checkout-availability|checkout-dialog|checkout-submission|checkout-pricing|checkout-confirmation|checkout-customer-data|checkout-display|checkout-service|checkout)\.js)\?[^"\n]+"><\/script>/g,(_,name)=>{
  if(name==='customer-menu-overlay.js'||name==='customer-order-success-compat.js'||name==='customer-customisation-dialog.js'||name==='customer-customisation-selectors.js'||name==='customer-customisation-pricing.js'||name==='customer-basket-controls.js'||name==='customer-menu-rendering.js'||name==='customer-menu-catalogue.js'||name==='customer-checkout-service.js'||name==='customer-checkout-display.js'||name==='customer-checkout-customer-data.js'||name==='customer-checkout-confirmation.js'||name==='customer-checkout-pricing.js'||name==='customer-checkout-availability.js'||name==='customer-checkout-submission.js')return '';
  const text=name==='customer-checkout.js'?require('./checkout-refactor-source.cjs').reconstruct(root):name==='customer-menu-basket.js'?require('./catalogue-source.cjs').reconstructCatalogue(root):fs.readFileSync(path.join(root,name),'utf8');
  return '<script>'+text+'</script>';
 });
};
