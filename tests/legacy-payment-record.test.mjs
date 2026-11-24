import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../functions/admin-api/legacy-payment-record.js';

const env={
 LEGACY_PAYMENT_RECORDING:'enabled',
 MASTER_WOK_REVIEW_ADMIN_EMAILS:'staff@example.invalid',
 MASTER_WOK_REVIEW_ACCESS_DOMAIN:'https://team.cloudflareaccess.com',
 MASTER_WOK_REVIEW_ACCESS_AUD:'test-audience',
 MASTER_WOK_REVIEW_ADMIN_SECRET:'s'.repeat(40),
 RTK_PROXY_SECRET:'p'.repeat(40),
 RTK_ORDER_BACKEND_URL:'https://backend.example.invalid'
};
const identity='staff@example.invalid';
const validate=()=>async context=>{
 context.data.cloudflareAccess={JWT:{payload:{email:identity}}};
 return context.next();
};
function makeContext(payload={action:'record',orderId:'00000000-0000-4000-8000-000000000001'},extra={}){
 return {data:{},env:{...env,...extra.env},
  request:new Request('https://rungsthaikitchen.co.uk/admin-api/legacy-payment-record',{
   method:'POST',headers:{origin:'https://rungsthaikitchen.co.uk'},
   body:JSON.stringify(payload)})};
}
test('feature gate denies requests without reaching backend',async()=>{
 let called=false;
 const handler=createHandler({validate,fetch:async()=>{called=true;throw Error('unexpected')}});
 const response=await handler(makeContext(undefined,{env:{LEGACY_PAYMENT_RECORDING:'disabled'}}));
 assert.equal(response.status,503);
 assert.equal(called,false);
});
test('only signed allowlisted identity can proceed',async()=>{
 let called=false;
 const handler=createHandler({validate:()=>async context=>{
  context.data.cloudflareAccess={JWT:{payload:{email:'intruder@example.invalid'}}};
  return context.next();
 },fetch:async()=>{called=true;throw Error('unexpected')}});
 assert.equal((await handler(makeContext())).status,403);
 assert.equal(called,false);
});
test('rejects read action without contacting backend',async()=>{
 let called=false;
 const handler=createHandler({validate,fetch:async()=>{called=true;throw Error('unexpected')}});
 assert.equal((await handler(makeContext({action:'read',orderId:'abc'}))).status,400);
 assert.equal(called,false);
});
test('forwards authenticated record with server-side credentials only',async()=>{
 let url,init;
 const handler=createHandler({validate,fetch:async(u,i)=>{
  url=String(u);init=i;
  return Response.json({success:true,committed:false});
 }});
 const response=await handler(makeContext());
 assert.equal(response.status,200);
 assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.equal(url,'https://backend.example.invalid/admin-legacy-payment-record');
 assert.equal(init.headers['x-rtk-review-actor'],identity);
 assert.equal(init.headers['x-rtk-proxy-secret'],env.RTK_PROXY_SECRET);
 assert.equal(init.headers['x-rtk-review-admin-secret'],env.MASTER_WOK_REVIEW_ADMIN_SECRET);
 assert.equal(JSON.parse(init.body).action,'record');
 assert.equal(JSON.parse(init.body).staffActor,undefined);
});
test('rejects cross-origin request',async()=>{
 const context=makeContext();
 context.request=new Request('https://rungsthaikitchen.co.uk/admin-api/legacy-payment-record',{
  method:'POST',headers:{origin:'https://evil.example.invalid'},body:'{"action":"read","orderId":"abc"}'});
 const response=await createHandler({validate,fetch:async()=>{throw Error('unexpected')}})(context);
 assert.equal(response.status,403);
});
