const {test}=require('node:test'),assert=require('node:assert/strict');
const {createRefreshQueue}=require('../master-wok-payments-admin');
test('table rebuild during payment read queues another immediate refresh without overlap',async()=>{
 let calls=0,active=0,maxActive=0,release;
 const refresh=createRefreshQueue(async()=>{calls++;active++;maxActive=Math.max(maxActive,active);if(calls===1)await new Promise(r=>release=r);active--;});
 const pending=refresh();refresh();refresh();assert.equal(calls,1);release();await pending;
 assert.equal(calls,2);assert.equal(maxActive,1);await refresh();assert.equal(calls,3);
});
test('failed refresh releases the queue for the next table refresh',async()=>{
 let calls=0;const refresh=createRefreshQueue(async()=>{if(++calls===1)throw Error('offline');});
 await assert.rejects(refresh(),/offline/);await refresh();assert.equal(calls,2);
});
test('mounted Admin restores labels on rebuilt rows while payment list is still in flight',async()=>{
 const vm=require('node:vm'),fs=require('node:fs');let observer,timer,releaseList,listCalls=0;
 const makeRow=(id,status)=>{const button={textContent:'Mark paid'},pill={textContent:status};return {dataset:{orderId:id},textContent:'',button,closest:()=>({querySelector:selector=>selector==='.btn-paid'?button:pill})};};
 let nodes=[makeRow('old','CONFIRMED')];
 const element=()=>({textContent:'',style:{},setAttribute(){},addEventListener(){},querySelectorAll:()=>[]});
 const fields={billAmount:{addEventListener(){}},differenceReason:{},tipAmount:{},tipMethod:{}};
 const form={...element(),elements:fields,querySelector:()=>element()};
 const dialog={...element(),querySelector:selector=>selector==='form'?form:element()};
 const document={readyState:'complete',hidden:false,createElement:()=>dialog,body:{append(){}},getElementById:()=>({}),addEventListener(){},querySelectorAll:()=>nodes};
 const context={document,MutationObserver:class{constructor(cb){observer=cb;}observe(){}},setInterval(){},setTimeout:cb=>{timer=cb;return 1;},clearTimeout(){},AbortSignal,fetch:async url=>{
  if(url==='/api/payments')return {ok:true,json:async()=>({enabled:true})};
  listCalls++;if(listCalls===1)await new Promise(r=>releaseList=r);
  return {ok:true,json:async()=>({success:true,payments:[{order_id:'new-paid',paid:true,payment:{bill_amount:'37.00',bill_method:'card',tip_amount:'0.00'},balance:{underpayment:'0.00',overpayment:'0.00'}}]})};
 }};
 vm.runInNewContext(fs.readFileSync(require.resolve('../master-wok-payments-admin'),'utf8'),context);
 await new Promise(setImmediate);assert.equal(listCalls,1);
 nodes=[makeRow('new-completed','COMPLETED'),makeRow('new-active','CONFIRMED'),makeRow('new-paid','COMPLETED')];
 observer();assert.equal(nodes[0].button.textContent,'Record payment');assert.equal(nodes[1].button.textContent,'Take payment & complete');
 timer();releaseList();await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(listCalls,2);assert.equal(nodes[2].button.textContent,'Payment details');assert.match(nodes[2].textContent,/Received £37.00/);
 nodes=[makeRow('new-paid','COMPLETED')];observer();assert.equal(nodes[0].button.textContent,'Payment details');assert.match(nodes[0].textContent,/Received £37.00/);
});
