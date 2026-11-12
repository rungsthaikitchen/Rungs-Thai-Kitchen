const {test}=require('node:test'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');const path=require('node:path');
const env={MASTER_WOK_PAYMENTS:'enabled',MASTER_WOK_REVIEW_ACCESS_DOMAIN:'https://rtk-test.cloudflareaccess.com',
 MASTER_WOK_REVIEW_ACCESS_AUD:'test-app',MASTER_WOK_REVIEW_ADMIN_EMAILS:'owner@example.invalid',
 RTK_PROXY_SECRET:'proxy',MASTER_WOK_REVIEW_ADMIN_SECRET:'x'.repeat(32),RTK_ORDER_BACKEND_URL:'https://staging.example.invalid'};
const context=(overrides={})=>({env,data:{},request:new Request('https://review.pages.dev/admin-api/payments',{
 method:'POST',headers:{Origin:'https://review.pages.dev'},body:'{"action":"list"}'}),...overrides});
const modulePromise=import(pathToFileURL(path.resolve(__dirname,'../functions/admin-api/payments.js')));
test('missing configuration and nonstaff identity cannot forward payment requests',async()=>{
 const {createHandler}=await modulePromise;let calls=0;
 const handler=createHandler({fetch:async()=>{calls++;},validate:()=>async c=>{c.data.cloudflareAccess={JWT:{payload:{email:'customer@example.invalid'}}};return c.next();}});
 assert.equal((await handler(context({env:{}}))).status,503);
 assert.equal((await handler(context())).status,403);assert.equal(calls,0);
});
test('verified staff uses private upstream credentials; cross-origin action is rejected',async()=>{
 const {createHandler}=await modulePromise;let forwarded;
 const handler=createHandler({fetch:async(url,options)=>{forwarded={url:String(url),options};return Response.json({success:true,reviews:[]});},
 validate:()=>async c=>{c.data.cloudflareAccess={JWT:{payload:{email:'owner@example.invalid'}}};return c.next();}});
 const response=await handler(context());assert.equal(response.status,200);
 assert.equal(forwarded.url,'https://staging.example.invalid/admin-payments');
 assert.equal(forwarded.options.headers['x-rtk-review-admin-secret'],env.MASTER_WOK_REVIEW_ADMIN_SECRET);
 assert.equal(response.headers.get('Cache-Control'),'no-store');
 forwarded=null;
 assert.equal((await handler(context({request:new Request('https://review.pages.dev/admin-api/payments',{method:'POST',body:'{}'})}))).status,403);
 assert.equal(forwarded,null);
});
test('actual Access validator rejects missing or forged assertion before upstream fetch',async()=>{
 const {createHandler}=await modulePromise;let calls=0;
 const handler=createHandler({fetch:async()=>{calls++;}});
 for(const token of ['', 'e30.e30.fake']){
  const c=context();if(token)c.request.headers.set('Cf-Access-Jwt-Assertion',token);
  const response=await handler(c);assert.ok([302,403,503].includes(response.status));
 }
 assert.equal(calls,0);
});
test('payment actions bind the signed Access identity instead of a browser actor',async()=>{
 const {createHandler}=await modulePromise;let forwarded;
 const handler=createHandler({fetch:async(_url,options)=>{forwarded=options;return Response.json({success:true});},
  validate:()=>async c=>{c.data.cloudflareAccess={JWT:{payload:{email:'owner@example.invalid'}}};return c.next();}});
 const request=new Request('https://review.pages.dev/admin-api/payments',{method:'POST',headers:{Origin:'https://review.pages.dev'},body:JSON.stringify({action:'approve_agreed_time',staffActor:'forged@example.invalid'})});
 assert.equal((await handler(context({request}))).status,200);
 assert.equal(JSON.parse(forwarded.body).staffActor,'owner@example.invalid');
 assert.equal(forwarded.headers['x-rtk-review-actor'],'owner@example.invalid');
});
