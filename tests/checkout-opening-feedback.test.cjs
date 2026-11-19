const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create:createDialog}=require('../customer-checkout-dialog');
for(const failure of [false,true])test('opening feedback is immediate, prevents duplicate opens and clears after '+(failure?'failure':'paused service'),async()=>{
 let release,reject;const gate=new Promise((yes,no)=>{release=yes;reject=no;}),feedback=[];
 const ctx={checkoutOpening:false,setCheckoutOpening:value=>feedback.push(value),availabilityBasketKey:()=>'',console:{trace(){},warn(){}},document:{querySelectorAll:()=>[],getElementById:id=>id==='checkout-opening-status'?{set hidden(value){feedback.push(!value);}}:null},loadServiceState:()=>gate,SERVICE_STATE:{mode:'paused'},orderMsg:{style:{}}};
 const dialog=createDialog(ctx);const pending=dialog.open(10);
 assert.deepEqual(feedback,[true]);await dialog.open(10);assert.deepEqual(feedback,[true]);
 if(failure){reject(Error('offline'));await assert.rejects(pending,/offline/);}else{release();await pending;}
 assert.deepEqual(feedback,[true,false]);
});
