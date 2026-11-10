const {test}=require('node:test'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const {createClient,londonTime}=require('../master-wok-basket-review-client');
function setup(fetch){const values=new Map();return {values,client:createClient({fetch,crypto:webcrypto,
 storage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)}})};}
const payload={customer:{name:'Test',phone:'07123456789'},items:[{item_id:'chips',qty:1}],preferredTime:'2026-11-12T20:15:00Z'};
test('review retry after lost reply reuses key and prevents changed uncertain basket',async()=>{
 const sent=[];let fail=true;
 const {client,values}=setup(async(_url,options)=>{sent.push(JSON.parse(options.body));if(fail)throw Error('offline');return Response.json({success:true,bookingApprovalAllowed:false,reviewId:'saved'});});
 await assert.rejects(client.submit(payload));
 await assert.rejects(client.submit({...payload,items:[]}),/previous request may have arrived/);
 assert.equal(sent.length,1);fail=false;
 await client.submit(payload);assert.equal(sent[0].requestKey,sent[1].requestKey);
 const stored=[...values.values()].join();assert.ok(!stored.includes('07123456789'));assert.ok(!stored.includes('chips'));
});
test('review success is never inferred from a booking approval or ambiguous receipt',async()=>{
 const {client}=setup(async()=>Response.json({success:true,bookingApprovalAllowed:true,reviewId:'order'}));
 await assert.rejects(client.submit(payload),/could not confirm receipt/);
});
test('unavailable feature quietly keeps the telephone fallback',async()=>{
 assert.equal(await setup(async()=>{throw Error('offline');}).client.enabled(),false);
 assert.equal(await setup(async()=>Response.json({enabled:false})).client.enabled(),false);
});
test('preferred time uses UK daylight saving independently from browser timezone',()=>{
 assert.equal(londonTime('2026-11-12','20:15'),'2026-11-12T20:15:00.000Z');
 assert.equal(londonTime('2027-07-10','20:15'),'2027-07-10T19:15:00.000Z');
 assert.throws(()=>londonTime('2027-02-30','20:15'),/valid UK time/);
});
