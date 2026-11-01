const test=require('node:test'),assert=require('node:assert/strict');
const {createClient}=require('../master-wok-checkout-client');
const input=()=>({orderType:'collection',preferredTime:'2026-11-04T18:00:00Z',items:[{item_id:'green-curry',qty:1,modifiers:[{id:'chicken'}]}]});
const stored=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const ok=body=>({ok:true,status:200,json:async()=>body});
const success=()=>ok({success:true,orderId:'00000000-0000-4000-8000-000000000001',orderRef:'RTK-123',totals:{total:9},notification_status:'queued'});
test('availability is read-only, validates complete hints and never creates a pending booking key',async()=>{
 const storage=stored(),times=['2026-11-04T18:00:00.000Z'];let posts=0;
 const c=createClient({fetch:async(u,o)=>{
  if(u.includes('booking-mode'))return ok({mode:'MASTER_WOK'});
  assert.equal(u,'/api/booking-availability');posts++;
  return ok({success:true,bookingApprovalAllowed:false,hints:[{time:times[0],available:true}]});
 },storage,crypto});
 assert.equal((await c.availability({times,items:input().items})).route,'MASTER_WOK');
 assert.equal(posts,1);assert.equal(storage.getItem('rtk_master_wok_pending_checkout'),null);
 const bad=createClient({fetch:async u=>u.includes('booking-mode')?ok({mode:'MASTER_WOK'}):ok({success:true,bookingApprovalAllowed:false,hints:[]}),storage,crypto});
 await assert.rejects(bad.availability({times,items:input().items}));
});
test('explicit legacy mode never posts an order to the new writer',async()=>{
 let posts=0;const c=createClient({fetch:async(_u,o)=>{if(o.method)posts++;return ok({mode:'LEGACY'});},storage:stored(),crypto});
 assert.equal((await c.submit(input())).route,'LEGACY');assert.equal(posts,0);
});
test('switching schedulers after time selection requires refreshing hints before either writer',async()=>{
 let mode='MASTER_WOK',bookingPosts=0;const times=['2026-11-04T18:00:00.000Z'];
 const c=createClient({fetch:async(u)=>{
  if(u.includes('booking-mode'))return ok({mode});
  if(u.includes('booking-availability'))return ok({success:true,bookingApprovalAllowed:false,hints:[{time:times[0],available:true}]});
  bookingPosts++;return success();
 },storage:stored(),crypto});
 await c.availability({times,items:input().items});mode='LEGACY';
 await assert.rejects(c.submit(input()),/refresh/);assert.equal(bookingPosts,0);
});
test('unknown or unavailable mode cannot cause a legacy write',async()=>{
 for(const fetch of [async()=>{throw Error('offline');},async()=>ok({mode:'typo'})])
  await assert.rejects(createClient({fetch,storage:stored(),crypto}).submit(input()));
});
test('uncertain network outcome retries with the identical idempotency key',async()=>{
 const requests=[];const storage=stored();let first=true;
 const c=createClient({fetch:async(u,o)=>{
  if(u.includes('booking-mode'))return ok({mode:'MASTER_WOK'});
  requests.push(JSON.parse(o.body));if(first){first=false;throw Error('lost response');}return success();
 },storage,crypto});
 await assert.rejects(c.submit(input()));const r=await c.submit(input());
 assert.equal(r.route,'MASTER_WOK');assert.equal(requests[0].key,requests[1].key);
 assert.equal(storage.getItem('rtk_master_wok_pending_checkout'),null);
});
test('changing basket after an unknown outcome cannot silently create another order',async()=>{
 let posts=0;const c=createClient({fetch:async(u)=>{
  if(u.includes('booking-mode'))return ok({mode:'MASTER_WOK'});posts++;throw Error('offline');
 },storage:stored(),crypto});
 await assert.rejects(c.submit(input()));const changed=input();changed.items[0].qty=2;
 await assert.rejects(c.submit(changed));assert.equal(posts,1);
});
test('known rollback permits another selection, while ambiguous responses retain the attempt',async()=>{
 const storage=stored();const c=createClient({fetch:async(u)=>u.includes('booking-mode')?ok({mode:'MASTER_WOK'}):
  {ok:false,status:409,json:async()=>({committed:false,reason:'REVIEW_REQUIRED'})},storage,crypto});
 await assert.rejects(c.submit(input()),/another time/);assert.equal(storage.getItem('rtk_master_wok_pending_checkout'),null);
});
test('rolling back the feature cannot duplicate an uncertain previous checkout',async()=>{
 let mode='MASTER_WOK';const c=createClient({fetch:async(u)=>u.includes('booking-mode')?ok({mode}):Promise.reject(Error('offline')),storage:stored(),crypto});
 await assert.rejects(c.submit(input()));mode='LEGACY';await assert.rejects(c.submit(input()),/previous order/);
});
test('legacy rollback retains both pending Master Wok times across service dates',()=>{
 const {capacityRows}=require('../master-wok-checkout-client');
 const order={id:'order',status:'proposed',capacity_scheduler:'MASTER_WOK',
  preferred_time:'2026-11-04T18:00:00Z',proposed_time:'2026-11-05T19:00:00Z',is_test:false};
 assert.equal(capacityRows([order],'2026-11-04T00:00:00Z','2026-11-05T00:00:00Z').length,1);
 assert.equal(capacityRows([order],'2026-11-05T00:00:00Z','2026-11-06T00:00:00Z').length,1);
 const declined={...order,status:'customer_declined_time'};
 assert.equal(capacityRows([declined],'2026-11-04T00:00:00Z','2026-11-05T00:00:00Z').length,1);
 assert.equal(capacityRows([declined],'2026-11-05T00:00:00Z','2026-11-06T00:00:00Z').length,0);
});
test('imported legacy proposal behavior and terminal/test exclusions stay intact',()=>{
 const {capacityRows}=require('../master-wok-checkout-client');
 const order={id:'old',status:'pending',preferred_time:'2026-11-04T18:00:00Z',proposed_time:'2026-11-04T19:00:00Z'};
 const start='2026-11-04T00:00:00Z',end='2026-11-05T00:00:00Z';
 assert.deepEqual(capacityRows([order],start,end),[]);
 assert.equal(capacityRows([{...order,status:'proposed'}],start,end)[0].confirmed_time,'2026-11-04T19:00:00.000Z');
 assert.deepEqual(capacityRows([{...order,status:'cancelled'},{...order,is_test:true}],start,end),[]);
});
