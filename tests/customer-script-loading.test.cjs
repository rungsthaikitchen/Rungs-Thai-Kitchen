const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('customer classic scripts load once in the original dependency order',()=>{
 const menu=html.indexOf('<script src="/customer-menu-basket.js?'),availability=html.indexOf('<script src="/customer-checkout-availability.js?'),submission=html.indexOf('<script src="/customer-checkout-submission.js?'),dialog=html.indexOf('<script src="/customer-checkout-dialog.js?'),checkout=html.indexOf('<script src="/customer-checkout.js?');
 const pricing=html.indexOf('<script src="/customer-checkout-pricing.js?');
 const confirmation=html.indexOf('<script src="/customer-checkout-confirmation.js?');
 const customerData=html.indexOf('<script src="/customer-checkout-customer-data.js?');
 const display=html.indexOf('<script src="/customer-checkout-display.js?');
 const service=html.indexOf('<script src="/customer-checkout-service.js?');
 assert.ok(submission<pricing&&pricing<service&&service<display&&display<customerData&&customerData<confirmation&&confirmation<checkout);
 const catalogue=html.indexOf('<script src="/customer-menu-catalogue.js?');
 const rendering=html.indexOf('<script src="/customer-menu-rendering.js?');
 const controls=html.indexOf('<script src="/customer-basket-controls.js?');
 const customisation=html.indexOf('<script src="/customer-customisation-pricing.js?');
 const selectors=html.indexOf('<script src="/customer-customisation-selectors.js?');
 const customDialog=html.indexOf('<script src="/customer-customisation-dialog.js?');
 const successCompat=html.indexOf('<script src="/customer-order-success-compat.js?');
 const overlay=html.indexOf('<script src="/customer-menu-overlay.js?');
 const deliveryQuotes=html.indexOf('<script src="/customer-delivery-quotes.js?');
 const pageControls=html.indexOf('<script src="/customer-page-controls.js?');
 assert.ok(selectors<customDialog&&customDialog<successCompat&&successCompat<overlay&&overlay<pageControls&&pageControls<deliveryQuotes&&deliveryQuotes<menu);
 assert.ok(catalogue>=0&&catalogue<rendering&&rendering<controls&&controls<customisation&&customisation<selectors&&selectors<menu);
 assert.ok(html.indexOf('window.sb =')<menu&&menu<availability&&availability<dialog&&dialog<submission&&submission<checkout);
 for(const file of ['customer-delivery-quotes.js','customer-page-controls.js','customer-menu-overlay.js','customer-order-success-compat.js','customer-customisation-dialog.js','customer-customisation-selectors.js','customer-customisation-pricing.js','customer-basket-controls.js','customer-menu-rendering.js','customer-menu-catalogue.js','customer-menu-basket.js','customer-checkout-availability.js','customer-checkout-dialog.js','customer-checkout-submission.js','customer-checkout-pricing.js','customer-checkout-confirmation.js','customer-checkout-customer-data.js','customer-checkout-display.js','customer-checkout-service.js','customer-checkout.js']){
  assert.equal((html.match(new RegExp('<script src="/'+file.replaceAll('.','\\.')+'\\?','g'))||[]).length,1);
  const tag=html.match(new RegExp('<script[^>]+src="/'+file.replaceAll('.','\\.')+'[^>]+>'))[0];assert.doesNotMatch(tag,/\s(?:async|defer|type)(?:\s|=|>)/);
  assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}));
 }
});
