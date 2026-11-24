import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../functions/admin-api/legacy-payment-preflight.js';

const env={
 LEGACY_PAYMENT_PREFLIGHT:'enabled',
 MASTER_WOK_REVIEW_ADMIN_EMAILS:'staff@example.invalid',
 MASTER_WOK_REVIEW_ACCESS_DOMAIN:'https://team.cloudflareaccess.com',
 MASTER_WOK_REVIEW_ACCESS_AUD:'contract-test',
 MASTER_WOK_REVIEW_ADMIN_SECRET:'s'.repeat(40),
 RTK_PROXY_SECRET:'p'.repeat(40),
 RTK_ORDER_BACKEND_URL:'http://127.0.0.1:18765'
};
const validate=()=>async context=>{
 context.data.cloudflareAccess={JWT:{payload:{email:'staff@example.invalid'}}};
 return context.next();
};
function context(payload){
 return {data:{},env,request:new Request('https://rungsthaikitchen.co.uk/admin-api/legacy-payment-preflight',{
  method:'POST',headers:{origin:'https://rungsthaikitchen.co.uk'},
  body:JSON.stringify(payload)})};
}
test('Cloudflare proxy to real Flask route preserves authenticated read-only contract',async()=>{
 const handler=createHandler({validate});
 const id='00000000-0000-4000-8000-000000000001';
 const result=await handler(context({action:'read',orderId:id}));
 assert.equal(result.status,200);
 assert.equal(result.headers.get('Cache-Control'),'no-store');
 const body=await result.json();
 assert.equal(body.success,true);
 assert.equal(body.orderId,id);
 assert.equal(body.methodUnknown,true);
 assert.equal(body.committed,false);
});
test('write attempt is blocked at Cloudflare before reaching Flask',async()=>{
 const result=await createHandler({validate})(context({action:'record',orderId:'x'}));
 assert.equal(result.status,400);
});
test('invalid order identity fails closed in Flask',async()=>{
 const result=await createHandler({validate})(context({action:'read',orderId:'not-a-uuid'}));
 assert.equal(result.status,400);
 assert.equal((await result.json()).reason,'INVALID_ORDER_ID');
});
