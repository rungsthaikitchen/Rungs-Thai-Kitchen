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
test('a definite first-request closure allows a new date without retaining an uncertain attempt',async()=>{
 const sent=[];const {client,values}=setup(async(_url,options)=>{
  sent.push(JSON.parse(options.body));
  return sent.length===1?Response.json({success:false,reason:'REVIEW_TIME_CLOSED',bookingApprovalAllowed:false},{status:409}):Response.json({success:true,bookingApprovalAllowed:false,reviewId:'new-date'});
 });
 await assert.rejects(client.submit(payload),/closed at that time/);
 assert.equal(JSON.parse([...values.values()][0]).uncertain,false);
 await client.submit({...payload,preferredTime:'2026-11-13T20:15:00Z'});
 assert.notEqual(sent[0].requestKey,sent[1].requestKey);
});
test('a closure reply does not erase uncertainty from an earlier lost response',async()=>{
 let count=0;const {client,values}=setup(async()=>{
  if(++count===1)throw Error('lost reply');
  return Response.json({success:false,reason:'REVIEW_TIME_CLOSED',bookingApprovalAllowed:false},{status:409});
 });
 await assert.rejects(client.submit(payload),/lost reply/);
 await assert.rejects(client.submit(payload),/previous request still needs checking/);
 assert.equal(JSON.parse([...values.values()][0]).uncertain,true);
 await assert.rejects(client.submit({...payload,preferredTime:'2026-11-13T20:15:00Z'}),/previous request may have arrived/);
});
