const test=require('node:test'),assert=require('node:assert/strict');
const {createClient}=require('../master-wok-admin-client');
const response=data=>({ok:true,json:async()=>data});
test('legacy status control retains its existing path without a gateway write',async()=>{
 let posts=0;const c=createClient({fetch:async(_u,o)=>{if(o.method)posts++;return response({mode:'LEGACY'});}});
 assert.equal(await c.updateStatus('fixture','completed'),false);assert.equal(posts,0);
});
test('Master Wok status and completion use the existing authenticated admin gateway',async()=>{
 const payloads=[];const c=createClient({fetch:async(u,o)=>{
  if(u==='/api/booking-mode')return response({mode:'MASTER_WOK'});
  assert.equal(u,'/admin-api/order-action');payloads.push(JSON.parse(o.body));return response({success:true,notification_managed:true});
 }});
 assert.equal(await c.updateStatus('fixture','confirmed'),true);
 assert.equal(await c.updateStatus('fixture','completed'),true);
 assert.deepEqual(payloads.map(p=>p.action),['set_status','complete']);
 assert.equal((await c.submit({action:'accept',orderId:'fixture'})).notification_managed,true);
});
test('unknown mode and uncertain action outcomes cannot fall back to direct database writes',async()=>{
 let posts=0;const c=createClient({fetch:async()=>response({mode:'DRAINING'})});
 await assert.rejects(c.updateStatus('fixture','completed'));
 const failed=createClient({fetch:async u=>{if(u==='/api/booking-mode')return response({mode:'MASTER_WOK'});posts++;throw Error('lost response');}});
 await assert.rejects(failed.updateStatus('fixture','completed'));assert.equal(posts,1);
});
test('legacy action responses keep existing browser notification behavior',async()=>{
 const c=createClient({fetch:async u=>response(u==='/api/booking-mode'?{mode:'LEGACY'}:{success:true})});
 assert.equal((await c.submit({action:'accept'})).notification_managed,false);
});

test('actual admin status handler bypasses REST and legacy loyalty calls in Master Wok mode',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const html=fs.readFileSync(require('node:path').join(__dirname,'../admin.html'),'utf8');
 const start=html.indexOf('async function updateOrderStatus(');
 const source=html.slice(start,html.indexOf('// --- LOAD + RENDER',start));
 let direct=0,legacyLoyalty=0,mode='MASTER_WOK';
 const sandbox={console,alert:message=>{throw Error(message);},
  window:{MasterWokAdminClient:{updateStatus:async()=>mode==='MASTER_WOK'}},
  sb:{from:()=>({update:()=>{direct++;return {eq:async()=>({error:null})};}})},
  fetch:async()=>{legacyLoyalty++;return {json:async()=>({ok:true})};}};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 await sandbox.updateOrderStatus('fixture','completed');
 assert.equal(direct,0);assert.equal(legacyLoyalty,0);
 mode='LEGACY';await sandbox.updateOrderStatus('fixture','completed');
 assert.equal(direct,1);assert.equal(legacyLoyalty,1);
 assert.match(html,/<script src="\/master-wok-admin-client.js"><\/script>/);
 assert.equal((html.match(/if \(!result.notification_managed\) await notifyCustomer/g)||[]).length,3);
});
test('server notification ownership overrides an older legacy mode hint',async()=>{
 const c=createClient({fetch:async u=>response(u==='/api/booking-mode'?{mode:'LEGACY'}:{success:true,notification_managed:true})});
 assert.equal((await c.submit({action:'accept'})).notification_managed,true);
});

test('preview admin cannot fall back to live legacy status or loyalty writes',async()=>{
 let posts=0;const c=createClient({hostname:'review.rungsthaikitchen.pages.dev',fetch:async(_u,o)=>{if(o.method)posts++;return response({mode:'LEGACY'});}});
 await assert.rejects(c.updateStatus('fixture','completed'),/Preview admin changes are disabled/);
 await assert.rejects(c.submit({action:'accept',orderId:'fixture'}),/Preview admin changes are disabled/);assert.equal(posts,0);
});

test('Preview order list uses the staging gateway and never reads live Supabase',async()=>{
 let legacyReads=0;
 const c=createClient({hostname:'review.rtk.pages.dev',fetch:async(u,o)=>{
  if(u==='/api/booking-mode')return response({mode:'MASTER_WOK'});
  assert.equal(JSON.parse(o.body).action,'preview_list_orders');return response({success:true,notification_managed:true,orders:[{order_ref:'RTK-119'}]});
 }});
 assert.deepEqual((await c.loadOrders(()=>{legacyReads++;})).data,[{order_ref:'RTK-119'}]);assert.equal(legacyReads,0);
 const stopped=createClient({hostname:'review.rtk.pages.dev',fetch:async()=>response({mode:'LEGACY'})});
 await assert.rejects(stopped.loadOrders(()=>{legacyReads++;}));assert.equal(legacyReads,0);
 const live=createClient({hostname:'rungsthaikitchen.co.uk',fetch:async()=>{throw Error('unnecessary');}});
 assert.equal(await live.loadOrders(async()=>{legacyReads++;return 'existing read';}),'existing read');assert.equal(legacyReads,1);
});
