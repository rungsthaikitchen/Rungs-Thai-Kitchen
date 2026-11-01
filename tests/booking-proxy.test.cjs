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
