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

test('Pages and GitHub previews cannot fall back to live legacy checkout or availability',async()=>{
 for(const hostname of ['review-master-wok-checkout-i.rungsthaikitchen.pages.dev','rungsthaikitchen.github.io']){
  let posts=0;const c=createClient({hostname,fetch:async(_u,o)=>{if(o.method)posts++;return ok({mode:'LEGACY'});},storage:stored(),crypto});
  await assert.rejects(c.availability({times:[],items:input().items}),/Preview ordering is disabled/);
  await assert.rejects(c.submit(input()),/Preview ordering is disabled/);assert.equal(posts,0);
 }
});
test('draining after a lost booking reply never claims the earlier order was not submitted',async()=>{
 let draining=false,posts=0;const storage=stored();
 const c=createClient({storage,crypto,fetch:async u=>{
  if(u.includes('booking-mode'))return draining?{ok:false,status:503}:ok({mode:'MASTER_WOK'});
  posts++;throw Error('lost reply');
 }});
 await assert.rejects(c.submit(input()),/confirm the result/);draining=true;
 await assert.rejects(c.submit(input()),error=>/earlier checkout/.test(error.message)&&!/not been submitted/.test(error.message));
 assert.equal(posts,1);assert.ok(storage.getItem('rtk_master_wok_pending_checkout'));
});
test('actual writer error field shows the expected changed-price review message',async()=>{
 const storage=stored();const c=createClient({storage,crypto,fetch:async u=>u.includes('booking-mode')?ok({mode:'MASTER_WOK'}):
  {ok:false,status:409,json:async()=>({committed:false,error:'CHECKOUT_PRICE_CHANGED'})}});
 await assert.rejects(c.submit(input()),/price or loyalty balance has changed/);
 assert.equal(storage.getItem('rtk_master_wok_pending_checkout'),null);
});
test('an agreed-time link displays only its granted time and can never fall through to legacy checkout',async()=>{
 const time='2026-11-28T20:15:00.000Z',token='a'.repeat(64),storage=stored();
 const client=createClient({storage,crypto,fetch:async url=>url.includes('booking-mode')?ok({mode:'MASTER_WOK'}):ok({success:true,review:{preferredTime:time}})});
 const result=await client.availability({times:[time,'2026-11-28T20:20:00.000Z'],reviewApprovalToken:token});
 assert.deepEqual(result.hints.map(h=>h.available),[true,false]);
 assert.equal(storage.getItem('rtk_master_wok_pending_checkout'),null);
 const legacy=createClient({storage:stored(),crypto,fetch:async()=>ok({mode:'LEGACY'})});
 await assert.rejects(legacy.submit({...input(),reviewApprovalToken:token}),/unavailable/);
});

test('a newer availability request aborts the older one and rejects a late response',async()=>{
 const times=['2026-11-13T18:30:00.000Z'];let releaseFirst,firstSignal,calls=0;
 const c=createClient({fetch:async(u,o)=>{
  if(u.includes('booking-mode'))return ok({mode:'MASTER_WOK'});
  if(++calls===1){firstSignal=o.signal;return new Promise(resolve=>releaseFirst=()=>resolve(ok({success:true,bookingApprovalAllowed:false,hints:[{time:times[0],available:false}]})));}
  return ok({success:true,bookingApprovalAllowed:false,hints:[{time:times[0],available:true}]});
 },storage:stored(),crypto});
 const first=c.availability({times,items:input().items});const rejected=assert.rejects(first,e=>e.name==='AbortError');await new Promise(setImmediate);
 const second=await c.availability({times,items:input().items});assert.equal(firstSignal.aborted,true);assert.equal(second.hints[0].available,true);releaseFirst();await rejected;
});
test('basket invalidation can cancel an outstanding availability request without a booking write',async()=>{
 const times=['2026-11-13T18:30:00.000Z'];let release,signal;
 const c=createClient({fetch:async(u,o)=>u.includes('booking-mode')?ok({mode:'MASTER_WOK'}):new Promise(resolve=>{signal=o.signal;release=()=>resolve(ok({success:true,bookingApprovalAllowed:false,hints:[{time:times[0],available:true}]}));}),storage:stored(),crypto});
 const pending=c.availability({times,items:input().items}),rejected=assert.rejects(pending,e=>e.name==='AbortError');await new Promise(setImmediate);c.cancelAvailability();assert.equal(signal.aborted,true);release();await rejected;
});

test('whole-day availability uses bounded parallel batches and reports complete progress',async()=>{
 const times=Array.from({length:61},(_,i)=>new Date(Date.UTC(2026,10,14,17,i*5)).toISOString());
 const batches=[],progress=[];let active=0,peak=0;
 const client=createClient({fetch:async(url,options)=>{
  if(url==='/api/booking-mode')return {ok:true,json:async()=>({mode:'MASTER_WOK'})};
  assert.equal(url,'/api/booking-availability');const input=JSON.parse(options.body);batches.push(input.times);active++;peak=Math.max(peak,active);
  await new Promise(resolve=>setTimeout(resolve,batches.length%2?3:1));active--;
  return {ok:true,json:async()=>({success:true,bookingApprovalAllowed:false,hints:input.times.map(time=>({time,available:true}))})};
 },storage:{},crypto:{}});
 const result=await client.availability({times,orderType:'collection',items:[]},{onProgress:p=>progress.push(p)});
 assert.ok(batches.every(batch=>batch.length<=6));assert.equal(peak,2);
 assert.deepEqual(result.hints.map(h=>h.time),times);assert.equal(progress[0].completed,0);assert.equal(progress.at(-1).completed,61);
 assert.ok(progress.every(p=>p.total===61));
});
test('a failed availability batch cancels sibling checks and returns no partial list',async()=>{
 const times=Array.from({length:25},(_,i)=>new Date(Date.UTC(2026,10,14,17,i*5)).toISOString());let siblingSignal;
 const client=createClient({fetch:async(url,options)=>{
  if(url==='/api/booking-mode')return {ok:true,json:async()=>({mode:'MASTER_WOK'})};
  const input=JSON.parse(options.body);
  if(input.times[0]===times[0])return {ok:false,json:async()=>({error:'unavailable'})};
  siblingSignal=options.signal;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true}));
 },storage:{},crypto:{}});
 await assert.rejects(client.availability({times,items:[]}),/could not be checked/);assert.equal(siblingSignal.aborted,true);
});

test('a transient availability worker failure retries the same read-only batch once',async()=>{
 const requests=[],times=['2026-11-14T18:00:00Z'];
 const c=createClient({fetch:async(url,options)=>{
  if(url==='/api/booking-mode')return ok({mode:'MASTER_WOK'});
  requests.push(options.body);
  return requests.length===1?{ok:false,status:503,json:async()=>({error:'worker unavailable'})}:ok({success:true,bookingApprovalAllowed:false,hints:times.map(time=>({time,available:true}))});
 },storage:{},crypto:{}});
 const result=await c.availability({times,items:[]});assert.equal(result.hints[0].available,true);
 assert.equal(requests.length,2);assert.equal(requests[0],requests[1]);
});
test('persistent availability failure stops after one retry and never submits a booking',async()=>{
 let attempts=0;
 const c=createClient({fetch:async(url)=>{
  if(url==='/api/booking-mode')return ok({mode:'MASTER_WOK'});
  assert.equal(url,'/api/booking-availability');attempts++;
  return {ok:false,status:503,json:async()=>({error:'unavailable'})};
 },storage:{},crypto:{}});
 await assert.rejects(c.availability({times:['2026-11-14T18:00:00Z'],items:[]}),/could not be checked/);assert.equal(attempts,2);
});
