import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Integration contract: real Cloudflare proxy handlers, synthetic backend transport.
// No customer data, deployed Cloudflare Access, or production infrastructure.
const origin='https://customer-verification-preview.example.test';
const orderId='00000000-0000-4000-8000-000000000001';
const env={
 MASTER_WOK_REVIEW_ACCESS_DOMAIN:'https://rtk.cloudflareaccess.com',
 MASTER_WOK_REVIEW_ACCESS_AUD:'staging-audience',
 MASTER_WOK_REVIEW_ADMIN_EMAILS:'staff@example.test',
 RTK_CUSTOMER_VERIFICATION_ADMIN_SECRET:'x'.repeat(40),
 RTK_CUSTOMER_VERIFICATION_PROXY_SECRET:'isolated-proxy-secret',
 RTK_CUSTOMER_VERIFICATION_BACKEND_URL:'https://customer-verification-api-staging.up.railway.app'
};
async function handler(path){
 const code=await readFile(new URL('../functions/admin-api/'+path,import.meta.url),'utf8');
 const isolated=code.replace(/^import cloudflareAccessPlugin from .*;\s*/,
                              'const cloudflareAccessPlugin=()=>()=>{};\n');
 return (await import('data:text/javascript;base64,'+Buffer.from(isolated).toString('base64'))).createHandler;
}
const createHistory=await handler('new-customer-history.js');
const createContact=await handler('new-customer-contact.js');
const verified=()=>async context=>{
 context.data.cloudflareAccess={JWT:{payload:{email:'staff@example.test',aud:['staging-audience']}}};
 return context.next();
};

test('verified Cloudflare proxy history -> contact -> history contract',async()=>{
 let saved=null;
 const calls=[];
 const fetch=async(url,options)=>{
  const path=new URL(url).pathname;
  calls.push({path,options});
  assert.equal(new URL(url).origin,env.RTK_CUSTOMER_VERIFICATION_BACKEND_URL);
  assert.equal(options.headers['x-rtk-proxy-secret'],env.RTK_CUSTOMER_VERIFICATION_PROXY_SECRET);
  assert.equal(options.headers['x-rtk-review-admin-secret'],env.RTK_CUSTOMER_VERIFICATION_ADMIN_SECRET);
  assert.equal(options.headers['x-rtk-review-actor'],'staff@example.test');
  assert.equal(options.redirect,'manual');
  const payload=JSON.parse(options.body);
  if(path==='/admin-new-customer-history'){
   assert.equal(payload.action,'classify');
   assert.deepEqual(payload.orderIds,[orderId]);
   return Response.json({success:true,
    classifications:[{order_id:orderId,classification:'new',reason:null}],
    contacts:saved?[saved]:[]});
  }
  if(path==='/admin-new-customer-contact'){
   assert.equal(payload.action,'record');
   assert.equal(payload.status,'contacted');
   assert.equal(payload.orderId,orderId);
   saved={order_id:orderId,status:payload.status,updated_by:'staff@example.test',
          updated_at:'2026-11-20T00:00:00Z'};
   return Response.json({success:true,contact:saved});
  }
  throw Error('Unexpected backend path');
 };
 const makeContext=(kind,body)=>({
  env,data:{},
  request:new Request(origin+'/admin-api/new-customer-'+kind,{
   method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
   body:JSON.stringify(body)
  })
 });
 const history=createHistory({validate:verified,fetch});
 const contact=createContact({validate:verified,fetch});
 const requestHistory=()=>history(makeContext('history',{action:'classify',orderIds:[orderId]}));
 const first=await requestHistory();
 assert.equal(first.status,200);
 assert.equal((await first.json()).contacts.length,0);
 const recorded=await contact(makeContext('contact',{
  action:'record',orderId,status:'contacted',staffActor:'forged@example.test'
 }));
 assert.equal(recorded.status,200);
 assert.equal((await recorded.json()).contact.updated_by,'staff@example.test');
 const second=await requestHistory();
 assert.equal(second.status,200);
 assert.equal((await second.json()).contacts[0].status,'contacted');
 assert.deepEqual(calls.map(c=>c.path),[
  '/admin-new-customer-history','/admin-new-customer-contact','/admin-new-customer-history'
 ]);
});
