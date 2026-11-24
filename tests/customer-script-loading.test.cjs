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
 assert.ok(html.indexOf('window.sb =')<menu&&menu<availability&&availability<dialog&&dialog<submission&&submission<checkout);
 for(const file of ['customer-menu-basket.js','customer-checkout-availability.js','customer-checkout-dialog.js','customer-checkout-submission.js','customer-checkout-pricing.js','customer-checkout-confirmation.js','customer-checkout-customer-data.js','customer-checkout-display.js','customer-checkout-service.js','customer-checkout.js']){
  assert.equal((html.match(new RegExp('<script src="/'+file.replaceAll('.','\\.')+'\\?','g'))||[]).length,1);
  const tag=html.match(new RegExp('<script[^>]+src="/'+file.replaceAll('.','\\.')+'[^>]+>'))[0];assert.doesNotMatch(tag,/\s(?:async|defer|type)(?:\s|=|>)/);
  assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}));
 }
});
