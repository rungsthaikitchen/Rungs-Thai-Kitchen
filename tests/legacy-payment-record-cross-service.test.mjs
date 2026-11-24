import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../functions/admin-api/legacy-payment-record.js';

const env={
 LEGACY_PAYMENT_RECORDING:'enabled',
 MASTER_WOK_REVIEW_ADMIN_EMAILS:'staff@example.invalid',
 MASTER_WOK_REVIEW_ACCESS_DOMAIN:'https://team.cloudflareaccess.com',
 MASTER_WOK_REVIEW_ACCESS_AUD:'contract-test',
 MASTER_WOK_REVIEW_ADMIN_SECRET:'s'.repeat(40),
 RTK_PROXY_SECRET:'p'.repeat(40),
 RTK_ORDER_BACKEND_URL:'http://127.0.0.1:18766'
};
const validate=()=>async context=>{
 context.data.cloudflareAccess={JWT:{payload:{email:'staff@example.invalid'}}};
 return context.next();
};
const orderId='00000000-0000-4000-8000-000000000001';
const payment={action:'record',orderId,idempotencyKey:'00000000-0000-4000-8000-000000000002',
 billAmount:'32.50',billMethod:'card',tipAmount:'2.00',tipMethod:'cash'};
function context(payload=payment,overrides={}){
 return {data:{},env:{...env,...overrides},
 request:new Request('https://rungsthaikitchen.co.uk/admin-api/legacy-payment-record',{
  method:'POST',headers:{origin:'https://rungsthaikitchen.co.uk'},body:JSON.stringify(payload)})};
}
test('Cloudflare to Flask to PostgreSQL records once and replays same idempotency key',async()=>{
 const handler=createHandler({validate});
 const first=await handler(context());
 assert.equal(first.status,200,await first.clone().text());
 assert.equal(first.headers.get('Cache-Control'),'no-store');
 const recorded=await first.json();
 assert.equal(recorded.success,true);
 assert.equal(recorded.committed,true);
 const retry=await handler(context());
 assert.equal(retry.status,200,await retry.clone().text());
 const replay=await retry.json();
 assert.equal(replay.replayed,true);
 assert.equal(replay.committed,false);
 assert.equal(replay.paymentId,recorded.paymentId);
});
test('different idempotency key cannot record second payment',async()=>{
 const handler=createHandler({validate});
 const result=await handler(context({...payment,idempotencyKey:'00000000-0000-4000-8000-000000000003'}));
 assert.equal(result.status,409);
 assert.equal((await result.json()).reason,'PAYMENT_ALREADY_RECORDED');
});
test('disabled Cloudflare gate rejects before backend',async()=>{
 const result=await createHandler({validate})(context(payment,{LEGACY_PAYMENT_RECORDING:'disabled'}));
 assert.equal(result.status,503);
});
