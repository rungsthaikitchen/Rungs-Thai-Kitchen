const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../customer-checkout.js','utf8');
const opener=source.slice(source.indexOf('async function openCheckout(subtotal)'),source.indexOf('// Ensure other code can call it'));
for(const failure of [false,true])test('opening feedback is immediate, prevents duplicate opens and clears after '+(failure?'failure':'paused service'),async()=>{
 let release,reject;const gate=new Promise((yes,no)=>{release=yes;reject=no;}),feedback=[];
 const ctx={checkoutOpening:false,setCheckoutOpening:value=>feedback.push(value),availabilityBasketKey:()=>'',console:{trace(){},warn(){}},document:{getElementById:()=>null},loadServiceState:()=>gate,SERVICE_STATE:{mode:'paused'},orderMsg:{style:{}}};
 vm.runInNewContext(opener,ctx);const pending=ctx.openCheckout(10);
 assert.deepEqual(feedback,[true]);await ctx.openCheckout(10);assert.deepEqual(feedback,[true]);
 if(failure){reject(Error('offline'));await assert.rejects(pending,/offline/);}else{release();await pending;}
 assert.deepEqual(feedback,[true,false]);assert.equal(ctx.checkoutOpening,false);
});
