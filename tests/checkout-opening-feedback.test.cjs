const {test}=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../customer-checkout-dialog');
for(const failure of [false,true])test('opening feedback is immediate, prevents duplicate opens and clears after '+(failure?'failure':'paused service'),async()=>{
 let release,reject;const gate=new Promise((yes,no)=>{release=yes;reject=no;}),feedback=[];
 const status={set hidden(value){feedback.push(!value);}},button={setAttribute(){}};
 const ctx={window:{},availabilityBasketKey:()=>'',console:{trace(){},warn(){}},document:{getElementById:id=>id==='checkout-opening-status'?status:null,querySelectorAll:()=>[button]},loadServiceState:()=>gate,SERVICE_STATE:{mode:'paused'},orderMsg:{style:{}}};
 const dialog=create(ctx),pending=dialog.open(10);
 assert.deepEqual(feedback,[true]);await dialog.open(10);assert.deepEqual(feedback,[true]);assert.equal(button.disabled,true);
 if(failure){reject(Error('offline'));await assert.rejects(pending,/offline/);}else{release();await pending;}
 assert.deepEqual(feedback,[true,false]);assert.equal(button.disabled,false);
});

test('checkout is visible while a reopened date is still being checked',async()=>{
 let release;const gate=new Promise(yes=>release=yes);
 const ctx={window:{},console:{trace(){},warn(){}},availabilityBasketKey:()=>'',document:{getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>({value:'collection'})},loadServiceState:async()=>{},SERVICE_STATE:{mode:'normal'},loadBlackouts:async()=>{},preferredDateInput:{value:'2026-11-14'},preferredTimeSelect:{value:'18:30',options:[{value:'18:30',disabled:false}],setAttribute(){}},preferredTimeHidden:{value:''},populatePreferredTimeSelect:()=>gate,showPreferredTimeMessage(){},recomputeCheckoutTotals(){},updateCheckoutSubmitButton(){},updateCheckoutOrderSummary(){},checkoutMsg:{style:{}},checkoutModal:{style:{display:'none'}}};
 const dialog=create(ctx),pending=dialog.open(104.50);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(ctx.checkoutModal.style.display,'flex');assert.equal(ctx.checkoutBaseSubtotal,104.50);
 release();await pending;assert.equal(ctx.preferredTimeHidden.value,'2026-11-14T18:30');
});
