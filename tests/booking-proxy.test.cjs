const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url');
const file=p=>import(pathToFileURL(path.resolve(__dirname,'..',p)).href);
test('preview without an explicit backend cannot use production booking or legacy mode',async()=>{
 const old=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw Error('MUST_NOT_CONTACT_PRODUCTION');};
 try{
  const context={env:{},request:new Request('https://review.rtk.pages.dev/api/booking')};
  assert.equal((await(await file('functions/api/booking.js')).onRequestPost(context)).status,503);
  assert.equal((await(await file('functions/api/booking-mode.js')).onRequestGet(context)).status,503);
  assert.equal((await(await file('functions/api/booking-availability.js')).onRequestPost(context)).status,503);
  assert.equal(calls,0);
 }finally{global.fetch=old;}
});
test('configured staging proxy forwards exact body and server secret without exposing the secret',async()=>{
 const old=global.fetch;let forwarded;
 global.fetch=async(url,options)=>{forwarded={url:String(url),options};return Response.json({success:true});};
 try{
  const raw=JSON.stringify({key:'request-key',items:[{item_id:'green-curry',qty:1}]});
  const response=await(await file('functions/api/booking.js')).onRequestPost({
   env:{RTK_ORDER_BACKEND_URL:'https://staging.example.invalid',RTK_PROXY_SECRET:'server-secret'},
   request:new Request('https://review.rtk.pages.dev/api/booking',{method:'POST',body:raw})});
  assert.equal(forwarded.url,'https://staging.example.invalid/book-order');
  assert.equal(forwarded.options.body,raw);assert.equal(forwarded.options.headers['x-rtk-proxy-secret'],'server-secret');
  assert.deepEqual(await response.json(),{success:true});assert.equal(response.headers.get('Cache-Control'),'no-store');
 }finally{global.fetch=old;}
});

test('all Pages proxies use Workers-compatible redirects and refuse redirects without leaking Location',async()=>{
 const old=global.fetch;let calls=0;
 global.fetch=async(_url,options)=>{calls++;assert.equal(options.redirect,'manual');
  return new Response(null,{status:302,headers:{Location:'https://unexpected.example.invalid'}});};
 try{
  const env={RTK_ORDER_BACKEND_URL:'https://staging.example.invalid',RTK_PROXY_SECRET:'server-secret'};
  for(const [name,method] of [['booking','onRequestPost'],['booking-mode','onRequestGet'],['booking-availability','onRequestPost']]){
   const response=await(await file('functions/api/'+name+'.js'))[method]({env,
    request:new Request('https://review.rtk.pages.dev/api/'+name,{method:method==='onRequestGet'?'GET':'POST',...(method==='onRequestPost'?{body:'{}'}:{})})});
   assert.equal(response.status,503);assert.equal(response.headers.get('Location'),null);
  }
  assert.equal(calls,3);
 }finally{global.fetch=old;}
});

test('admin proxies isolate Preview routing and refuse redirected secret-bearing requests',async()=>{
 const old=global.fetch;let calls=0,seen;
 global.fetch=async(url,options)=>{calls++;seen={url:String(url),options};return Response.json({success:true});};
 try{
  for(const [name,endpoint] of [['order-action','admin-order-action'],['service-control','admin-service-control']]){
   const handler=(await file('functions/admin-api/'+name+'.js')).onRequestPost;
   const request=()=>new Request('https://review.rtk.pages.dev/admin-api/'+name,{method:'POST',body:'{"action":"test"}'});
   let before=calls;assert.equal((await handler({request:request(),env:{RTK_PROXY_SECRET:'fixture'}})).status,503);assert.equal(calls,before);
   const env={RTK_ORDER_BACKEND_URL:'https://staging.example.invalid',RTK_PROXY_SECRET:'fixture'};
   assert.equal((await handler({request:request(),env})).status,200);
   assert.equal(seen.url,'https://staging.example.invalid/'+endpoint);assert.equal(seen.options.redirect,'manual');
   assert.equal(seen.options.headers['x-rtk-proxy-secret'],'fixture');
   const saved=global.fetch;global.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://wrong.example.invalid'}});
   const refused=await handler({request:request(),env});assert.equal(refused.status,503);assert.equal(refused.headers.get('Location'),null);global.fetch=saved;
  }
 }finally{global.fetch=old;}
});

test('customer service-state read uses staging control contract without touching production',async()=>{
 const old=global.fetch;let calls=0;
 global.fetch=async(url,options)=>{calls++;assert.equal(String(url),'https://staging.example.invalid/admin-service-control');
  assert.equal(options.method,'POST');assert.equal(JSON.parse(options.body).action,'get_service_state');assert.equal(options.redirect,'manual');
  return Response.json({ok:true,effective_service_state:{mode:'busy'}});};
 try{
  const handler=(await file('functions/api/service-state.js')).onRequestGet;
  const request=new Request('https://review.rtk.pages.dev/api/service-state');
  assert.equal((await handler({request,env:{}})).status,503);assert.equal(calls,0);
  const result=await handler({request,env:{RTK_ORDER_BACKEND_URL:'https://staging.example.invalid',RTK_PROXY_SECRET:'fixture'}});
  assert.equal(result.status,200);assert.equal((await result.json()).effective_service_state.mode,'busy');assert.equal(calls,1);
 }finally{global.fetch=old;}
});

test('review proxy is gated separately and isolates Preview from production',async()=>{
 const api=await file('functions/api/basket-review.js');
 const old=global.fetch;let forwarded;
 global.fetch=async(url,options)=>{forwarded={url:String(url),options};return Response.json({success:true,bookingApprovalAllowed:false});};
 const request=()=>new Request('https://review.rtk.pages.dev/api/basket-review',{method:'POST',body:'{"requestKey":"same-key"}'});
 try{
  assert.deepEqual(await(await api.onRequestGet({env:{}})).json(),{enabled:false});
  assert.equal((await api.onRequestPost({env:{},request:request()})).status,503);
  assert.equal((await api.onRequestPost({env:{MASTER_WOK_BASKET_REVIEWS:'enabled'},request:request()})).status,503);
  assert.equal(forwarded,undefined);
  const response=await api.onRequestPost({env:{MASTER_WOK_BASKET_REVIEWS:'enabled',RTK_ORDER_BACKEND_URL:'https://staging.example.invalid',RTK_PROXY_SECRET:'secret'},request:request()});
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal(forwarded.url,'https://staging.example.invalid/basket-review');
  assert.equal(JSON.parse(forwarded.options.body).requestKey,'same-key');
  assert.equal(forwarded.options.redirect,'manual');
 }finally{global.fetch=old;}
});
