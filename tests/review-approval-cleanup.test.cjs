const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
function setup(outcome){
 const values=new Map(),removed=[];
 const ctx={crypto:webcrypto,TextEncoder,AbortController,setTimeout,clearTimeout,
  location:{hostname:'fixture.pages.dev'},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},
  fetch:async url=>{
   if(url.includes('booking-mode'))return {ok:true,json:async()=>({mode:'MASTER_WOK'})};
   if(outcome==='uncertain')throw Error('lost response');
   if(outcome==='rejected')return {ok:false,status:409,json:async()=>({committed:false,error:'REVIEW_APPROVAL_MISMATCH'})};
   return {ok:true,status:200,json:async()=>({success:true,orderId:'fixture-order',orderRef:'RTK-FIXTURE',totals:{total:9},notification_status:'queued'})};
  },document:{readyState:'loading',addEventListener(){},
   getElementById:()=>({closest:()=>({remove:()=>removed.push('ack')})}),
   querySelector:()=>({remove:()=>removed.push('notice')})},addEventListener(){}};
 ctx.window=ctx;vm.createContext(ctx);
 for(const file of ['master-wok-review-return.js','master-wok-checkout-client.js'])
  vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),ctx);
 ctx.RTKApprovedReview={token:'fixture-token'};
 return {ctx,removed,values};
}
const input={orderType:'collection',preferredTime:'2026-11-20T19:30:00Z',items:[{item_id:'green-curry',qty:1}],reviewApprovalToken:'fixture-token'};
test('confirmed approved checkout clears the consumed grant and its controls before another basket',async()=>{
 const {ctx,removed,values}=setup('success');
 const result=await ctx.RTKBookingClient.submit(input);
 assert.equal(result.order.orderRef,'RTK-FIXTURE');assert.equal(ctx.RTKApprovedReview,null);
 assert.deepEqual(removed,['ack','notice']);assert.equal(values.size,0);
});
for(const outcome of ['uncertain','rejected'])test(outcome+' checkout retains the approval for safe retry',async()=>{
 const {ctx,removed,values}=setup(outcome);
 await assert.rejects(ctx.RTKBookingClient.submit(input),outcome==='rejected'?/Reopen your agreed-time link/:/retry the same order/);
 assert.equal(ctx.RTKApprovedReview.token,'fixture-token');assert.deepEqual(removed,[]);
 assert.equal(values.size,outcome==='uncertain'?1:0);
});

for(const cancel of [false,true])test('delivery approval waits for address verification'+(cancel?' and cannot restore after cancellation':''),async()=>{
 const events=[],listeners={},fields=new Map();let releaseQuote;
 const quote=new Promise(resolve=>{releaseQuote=resolve;});
 const node=()=>({dataset:{},style:{},setAttribute(){},prepend(){},append(){},before(){events.push('ack');},remove(){},click(){},closest(){return {remove(){}};},dispatchEvent(){}});
 for(const id of ['cust-name','cust-phone','cust-address','checkout-submit','order-success-close'])fields.set(id,node());
 const ctx={URLSearchParams,Event,AbortSignal,location:{hash:'#basket-review='+'a'.repeat(64),pathname:'/',search:''},history:{replaceState(){}},
  localStorage:{getItem:()=>null},document:{readyState:'loading',addEventListener(){},
   getElementById:id=>fields.get(id)||null,createElement:node,createTextNode:text=>({textContent:text}),querySelector:()=>node()},
  addEventListener:(name,fn)=>{listeners[name]=fn;},
  fetch:async()=>({ok:true,json:async()=>({success:true,review:{items:[],orderType:'delivery',preferredTime:'2026-11-20T20:30:00Z',
   customer:{name:'Fixture',phone:'07700900877',address:'Public fixture landmark'},maxHoldMinutes:20}})}),
  RTKRestoreReviewedBasket:()=>true,RTKOpenReviewedCheckout:async()=>{},
  RTKPrepareReviewedDelivery:async address=>{assert.equal(address,'Public fixture landmark');events.push('quote');await quote;},
  RTKApplyReviewedTime:async()=>events.push('time')};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../master-wok-review-return.js','utf8'),ctx);
 const pending=listeners.hashchange();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(events,['quote']);
 if(cancel)ctx.RTKClearApprovedReview();releaseQuote();await pending;
 assert.deepEqual(events,cancel?['quote']:['quote','ack','time']);
 if(cancel)assert.equal(ctx.RTKApprovedReview,null);
});
