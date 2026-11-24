const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../customer-checkout.js'),'utf8');
const {create}=require('../customer-checkout-display');
function fixture(){
 const f={orderType:'collection',address:{required:false},hint:{style:{}},listeners:{}};
 f.document={getElementById:id=>id==='cust-address'?f.address:id==='addr-required-hint'?f.hint:null,querySelector:()=>({value:f.orderType}),addEventListener:(event,fn)=>f.listeners[event]=fn};
 f.updateAddressRequirement=create({window:{},document:f.document}).updateAddressRequirement;return f;
}
test('startup synchronises the native address requirement for the selected type',()=>{
 const statement=source.match(/\/\/ END checkout-display boundary\n([^\n]+)/)[1];
 assert.equal(statement,'updateAddressRequirement();');
 const f=fixture();f.orderType='delivery';vm.runInNewContext(statement,f);assert.equal(f.address.required,true);assert.equal(f.hint.style.opacity,'1');
 f.orderType='collection';vm.runInNewContext(statement,f);assert.equal(f.address.required,false);assert.equal(f.hint.style.opacity,'0.6');
});
test('opening retained delivery and collection updates requirement before dialog awaits',async()=>{
 const f=fixture(),seen=[];f.checkoutDialog={open:async subtotal=>{seen.push({required:f.address.required,subtotal});return 'opened';}};
 vm.runInNewContext(source.match(/function openCheckout\(subtotal\)\{[^\n]+\}/)[0]+'\nthis.open=openCheckout;',f);
 f.orderType='delivery';assert.equal(await f.open(29),'opened');f.orderType='collection';await f.open(30);
 assert.deepEqual(seen,[{required:true,subtotal:29},{required:false,subtotal:30}]);
});
test('actual order-type listener updates native validation immediately in both directions',async()=>{
 const f=fixture();let release;const pending=new Promise(resolve=>release=resolve);
 Object.assign(f,{updateCheckoutSubmitButton(){},updateCheckoutOrderSummary(){},checkoutAvailability:{generation:0},availabilityContextKey:()=>'',window:{},clearPreferredTimeSelect(){},refreshCheckoutPricingAndRender:()=>pending,populatePreferredTimeSelect:async()=>{}});
 const start=source.indexOf("document.addEventListener('change', async (e) => {");const end=source.indexOf("document.addEventListener('DOMContentLoaded'",start);
 vm.runInNewContext(source.slice(start,end),f);
 const event={target:{matches:()=>true}};
 f.orderType='delivery';const first=f.listeners.change(event);assert.equal(f.address.required,true);
 f.orderType='collection';const second=f.listeners.change(event);assert.equal(f.address.required,false);assert.equal(f.hint.style.opacity,'0.6');
 release();await Promise.all([first,second]);
});
