const {test}=require('node:test'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
const modulePromise=import(pathToFileURL(path.resolve(__dirname,'../functions/api/payments.js')));
for(const mode of ['LEGACY','DRAINING','MASTER_WOK'])test('Admin writer capability follows '+mode,async()=>{
 const {createHandler}=await modulePromise;const h=createHandler({fetch:async()=>Response.json({mode})});const r=await h({env:{MASTER_WOK_PAYMENTS:'enabled'}});assert.equal((await r.json()).enabled,mode==='MASTER_WOK');assert.equal(r.headers.get('cache-control'),'no-store');
});
test('disabled or unavailable writers do not replace ordinary Admin controls',async()=>{
 const {createHandler}=await modulePromise;let calls=0;const h=createHandler({fetch:async()=>{calls++;throw Error('offline');}});assert.equal((await (await h({env:{}})).json()).enabled,false);assert.equal(calls,0);assert.equal((await (await h({env:{MASTER_WOK_PAYMENTS:'enabled'}})).json()).enabled,false);
});
