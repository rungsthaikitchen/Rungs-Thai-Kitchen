// Real DOM/checkout event test with all external providers intercepted. This
// checks browser integration; it is not deployed Cloudflare/Railway certification.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const root=path.resolve(__dirname,'..');
const mode=process.env.MW_TEST_MODE||'MASTER_WOK';
let bookings=[],legacyNotices=0;
const bridge=process.env.MW_TEST_BRIDGE_DIR;
const hosted=process.env.MW_TEST_HOSTED_CONFIG?JSON.parse(fs.readFileSync(process.env.MW_TEST_HOSTED_CONFIG,'utf8')):null;
let proxyHandlers,hostedReceipt;
async function proxy(req,res,body){
 const request=new Request('http://localhost'+req.url,{method:req.method,...(body?{body}:{}),headers:{'Content-Type':'application/json'}});
 const handler=req.method==='POST'?(req.url==='/api/booking-availability'?proxyHandlers.availability:proxyHandlers.booking).onRequestPost:proxyHandlers.mode.onRequestGet;
 const response=await handler({request,env:{RTK_ORDER_BACKEND_URL:hosted.backend,RTK_PROXY_SECRET:hosted.proxy}});
 const text=await response.text();
 if(req.method==='POST')hostedReceipt=JSON.parse(text);
 res.writeHead(response.status,{'Content-Type':'application/json'});res.end(text);
}
if(bridge)fs.mkdirSync(bridge,{recursive:true});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/api/booking-mode'){if(hosted)return proxy(req,res);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({mode}));return;}
 if(u.pathname==='/api/booking-availability'){
  let body='';for await(const chunk of req)body+=chunk;
  if(hosted)return proxy(req,res,body);
  if(process.env.MW_TEST_AVAILABILITY_FAILURE){res.writeHead(503,{'Content-Type':'application/json'});res.end('{}');return;}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:true,bookingApprovalAllowed:false,
   hints:JSON.parse(body).times.map((time,index)=>({time,available:index!==0}))}));return;
 }
 if(u.pathname==='/api/booking'){
  let body='';for await(const chunk of req)body+=chunk;
  const payload=JSON.parse(body);bookings.push(payload);
  if(hosted)return proxy(req,res,body);
  if(bridge){
   const serial=bookings.length;fs.writeFileSync(path.join(bridge,serial+'.request.json'),body);
   console.log('DB_REQUEST_READY:'+serial);
   const started=Date.now(),replyFile=path.join(bridge,serial+'.response.json');
   while(!fs.existsSync(replyFile)&&Date.now()-started<24000)await new Promise(r=>setTimeout(r,50));
   if(!fs.existsSync(replyFile)){res.writeHead(503);res.end('{}');return;}
   const reply=JSON.parse(fs.readFileSync(replyFile,'utf8'));
   res.writeHead(reply.status,{'Content-Type':'application/json'});res.end(JSON.stringify(reply.body));return;
  }
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:true,
   orderId:'00000000-0000-4000-8000-000000000001',orderRef:'RTK-123',customerId:'00000000-0000-4000-8000-000000000002',
   totals:{...payload.expectedTotals,discount_amount:0},notification_status:'queued'}));return;
 }
 if(u.pathname==='/api/service-state'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({effective_service_state:{mode:'normal',capacity_throttle:0}}));return;}
 if(['/customer-menu-basket.js','/customer-checkout.js'].includes(u.pathname)){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,u.pathname.slice(1))));return;}
 if(u.pathname==='/master-wok-checkout-client.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,'master-wok-checkout-client.js')));return;}
 if(u.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
});
(async()=>{
 if(hosted){
  const load=async name=>import('data:text/javascript;base64,'+fs.readFileSync(path.join(root,'functions/api/'+name+'.js')).toString('base64'));
  proxyHandlers={booking:await load('booking'),mode:await load('booking-mode'),availability:await load('booking-availability')};
 }
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'];
 if(process.env.MW_BROWSER_PACKAGE)args=(await import(process.env.MW_BROWSER_PACKAGE)).default.args;
 const browser=await chromium.launch({headless:true,executablePath:process.env.MW_BROWSER_EXECUTABLE||undefined,args});
 const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Europe/London'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',dialog=>dialog.dismiss());
 await page.addInitScript(()=>{
  const chain=()=>new Proxy(function(){return chain();},{get:(_t,key)=>key==='then'?undefined:()=>chain()});
  window.L=new Proxy({},{get:()=>()=>chain()});
  window.__sbWrites=[];
  const query=table=>{
   let action='read';
   const value=single=>({data:action==='read'?(single?null:[]):single?{id:'00000000-0000-4000-8000-000000000002'}:[],error:null});
   const proxy=new Proxy({}, {get(_target,key){
    if(key==='then')return (resolve,reject)=>Promise.resolve(value(false)).then(resolve,reject);
    if(key==='single'||key==='maybeSingle')return async()=>value(true);
    return (...args)=>{if(['insert','update','upsert','delete'].includes(key)){action=key;window.__sbWrites.push({table,action});}return proxy;};
   }});return proxy;
  };
  window.supabase={createClient:()=>({from:query,rpc:async()=>({data:{assigned:123},error:null})})};
 });
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='127.0.0.1')return route.continue();
  if(url.pathname.includes('send-order-confirmation'))legacyNotices++;
  if(url.pathname.includes('loyalty-balance'))return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,loyalty:{points_balance:0,reward_available:0}})});
  if(url.pathname.includes('supabase.js')||url.pathname.includes('jspdf'))return route.fulfill({contentType:'text/javascript',body:''});
  if(route.request().resourceType()==='image')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'});
  return route.fulfill({contentType:'application/json',body:JSON.stringify({data:[],success:true,ok:true})});
 });
 try{
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
   window.basket.push({name:'Green Curry',itemId:'green-curry',mods:[{id:'chicken',name:'Chicken',delta:1}],unitPrice:9,qty:1,img:'',spice:1});
   renderOrder();await window.openCheckout(9);
  });
  await page.locator('#cust-name').fill('Staging browser test');
  await page.locator('#cust-email').fill(process.env.MW_BROWSER_EMAIL||'browser@example.invalid');
  await page.locator('#cust-phone').fill('07700900123');
  await page.locator('#cust-preferred-date').fill('2026-11-04');
  await page.locator('#cust-preferred-date').dispatchEvent('change');
  if(process.env.MW_TEST_AVAILABILITY_FAILURE){
   await page.waitForFunction(()=>document.getElementById('cust-preferred-time-select').textContent.includes('Times unavailable'));
   assert.equal(await page.locator('#cust-preferred-time-select').isDisabled(),true);
   assert.equal(bookings.length,0);assert.equal(await page.evaluate(()=>window.__sbWrites.length),0);assert.deepEqual(errors,[]);
   console.log(JSON.stringify({status:'PASS',scope:'MOBILE_AVAILABILITY_FAILURE_NO_BOOKING_OR_DATABASE_WRITES'}));return;
  }
  await page.waitForFunction(()=>document.getElementById('cust-preferred-time-select').options.length>1);
  if(mode==='MASTER_WOK'&&!hosted)assert.equal(await page.locator('#cust-preferred-time-select option[value="17:00"]').isDisabled(),true);
  const choices=await page.locator('#cust-preferred-time-select').evaluate(el=>[...el.options].filter(o=>!o.disabled&&o.value).map(o=>({value:o.value,text:o.textContent})));
  assert.ok(choices.length,'No available time options');
  await page.locator('#cust-preferred-time-select').selectOption(choices.find(o=>o.text.includes('17:30'))?.value||choices[0].value);
  await page.locator('#checkout-submit').click();
  await page.waitForFunction(()=>window.basket.length===0||document.getElementById('checkout-msg').textContent.includes('failed'),null,{timeout:hosted?60000:30000});
  const result=await page.evaluate(()=>({basketCount:window.basket.length,message:document.getElementById('checkout-msg').textContent,writes:window.__sbWrites,totals:window.__lastOrderTotals}));
  assert.equal(result.basketCount,0,JSON.stringify({result,errors}));
  if(mode==='MASTER_WOK'){
   assert.equal(bookings.length,1);assert.equal(result.writes.length,0);assert.equal(legacyNotices,0);
   assert.equal(bookings[0].items[0].item_id,'green-curry');assert.equal(bookings[0].expectedTotals.total,9);
  }else{
   assert.equal(bookings.length,0);assert.ok(result.writes.some(w=>w.table==='orders'));
   assert.ok(result.writes.some(w=>w.table==='order_items'));assert.equal(legacyNotices,1);
  }
  assert.equal(result.totals.total,9);assert.deepEqual(errors,[]);
  if(process.env.MW_TEST_BRIDGE_DIR)fs.writeFileSync(path.join(bridge,'browser-result.json'),JSON.stringify(result));
  console.log(JSON.stringify({status:'PASS',scope:hosted?'MOBILE_BROWSER_LOCAL_PAGES_FUNCTIONS_TO_DEPLOYED_RAILWAY_AND_PRIVATE_STAGING_DATABASE':bridge?'MOBILE_BROWSER_TO_PRIVATE_STAGING_DATABASE_WITH_PROVIDER_FIXTURES':'MOBILE_BROWSER_WITH_INTERCEPTED_EXTERNAL_PROVIDERS',mode,
   newWriterRequests:bookings.length,supabaseWrites:result.writes.length,legacyNotificationRequests:legacyNotices,
   pageErrors:errors,...(hosted?{receipt:hostedReceipt}:{})}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);server.close();process.exitCode=1;});
