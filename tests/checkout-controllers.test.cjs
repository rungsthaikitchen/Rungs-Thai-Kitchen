const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create:createSubmission}=require('../customer-checkout-submission');
test('loading responsibility modules does not read the DOM, storage or network before explicit initialization',()=>{
 for(const [file,name] of [['availability','RTKCheckoutAvailability'],['dialog','RTKCheckoutDialog'],['submission','RTKCheckoutSubmission']]){
  const window={};const blocked=()=>{throw Error('Unexpected startup side effect');};
  vm.runInNewContext(fs.readFileSync(__dirname+'/../customer-checkout-'+file+'.js','utf8'),{window,document:new Proxy({}, {get:blocked}),fetch:blocked,localStorage:new Proxy({}, {get:blocked})});
  assert.equal(typeof window[name].create,'function');assert.deepEqual(Object.keys(window),[name]);
 }
});
function fixture(submit){
 const fields=new Map(Object.entries({'cust-preferred-date':'2026-11-14','cust-preferred-time-select':'18:30','cust-preferred-time':'2026-11-14T18:30','cust-name':'Synthetic Customer','cust-email':'fixture@example.invalid','cust-phone':'07000000000','cust-address':'','cust-notes':''}).map(([k,value])=>[k,{value,focus(){this.focused=true;}}]));
 const calls={legacy:0,render:0,reset:0,success:[]},button={disabled:false},message={style:{}};
 const noLegacy=()=>{calls.legacy++;throw Error('Legacy writer must not run');};
 const context={document:{getElementById:id=>fields.get(id)||null,querySelector:selector=>selector.includes('order-type')?{value:'collection'}:null},window:{RTKBookingClient:{submit}},console:{warn(){},log(){},error(){}},SERVICE_STATE:{mode:'normal'},OPEN_WINDOW:{end:'21:00'},loadServiceState:async()=>{},refreshKitchenSlotMap:async()=>{},isAllowed:()=>true,isAllowedForAlternativeFulfilment:()=>true,toYMD:d=>d.toISOString().slice(0,10),validatePreferredTime:()=>true,checkoutForm:{querySelector:()=>button},checkoutMsg:message,checkoutModal:{style:{display:'flex'}},applyWedThuDiscount:subtotal=>({discountedSubtotal:subtotal,discount:0}),appliedDiscountAmount:0,appliedDiscountCode:null,basket:[{itemId:'stir-pepper',name:'Black pepper chicken',unitPrice:8.5,qty:1,mods:[{id:'chicken'}],spice:1}],recomputeCheckoutTotals:()=>({subtotal:8.5,total:8.5,delivery_fee:0,loyalty_discount:0}),getOrCreateCustomer:noLegacy,getNextOrderRef:noLegacy,sb:new Proxy({}, {get:noLegacy}),renderOrder:()=>{calls.render++;},showOrderSuccess:(...args)=>calls.success.push(args),resetCheckoutForNextOrder:()=>{calls.reset++;}};
 return {context,fields,calls,button,message,handler:createSubmission(context)};
}
const response=()=>({route:'MASTER_WOK',order:{orderId:'fixture-order',orderRef:'RTK-FIXTURE',customerId:'fixture-customer',totals:{subtotal:8.5,total:8.5,delivery_fee:0,discount_amount:0}}});
const event=()=>({preventDefault(){}});
test('submission controller uses the authoritative writer once, preserves its payload and clears only after success',async()=>{
 let started,finish;const began=new Promise(resolve=>started=resolve),wait=new Promise(resolve=>finish=resolve),payloads=[];
 const f=fixture(async input=>{payloads.push(input);started();await wait;return response();});
 const first=f.handler(event());await began;await f.handler(event());assert.equal(payloads.length,1);assert.equal(f.button.disabled,true);
 assert.equal(payloads[0].items[0].item_id,'stir-pepper');assert.deepEqual(payloads[0].expectedTotals,{subtotal:8.5,total:8.5,delivery_fee:0,loyalty_discount:0,discount:0});
 finish();await first;
 assert.equal(f.calls.legacy,0);assert.equal(f.calls.success.length,1);assert.equal(f.calls.success[0][0],'RTK-FIXTURE');assert.equal(f.context.basket.length,0);assert.equal(f.calls.reset,1);assert.equal(f.button.disabled,false);
});
test('uncertain submission keeps the basket and allows the same writer to retry without legacy fallback',async()=>{
 let attempts=0;const f=fixture(async()=>{if(++attempts===1)throw Error('Result uncertain; retry the same order');return response();});
 await f.handler(event());assert.equal(f.context.basket.length,1);assert.equal(f.calls.reset,0);assert.equal(f.calls.success.length,0);assert.equal(f.button.disabled,false);
 await f.handler(event());assert.equal(attempts,2);assert.equal(f.calls.success.length,1);assert.equal(f.calls.legacy,0);
});
test('submission with no selected date cannot reach any writer',async()=>{
 let writes=0;const f=fixture(async()=>{writes++;return response();});f.fields.get('cust-preferred-date').value='';await f.handler(event());
 assert.equal(writes,0);assert.match(f.message.textContent,/select a date/);assert.equal(f.fields.get('cust-preferred-date').focused,true);
});
