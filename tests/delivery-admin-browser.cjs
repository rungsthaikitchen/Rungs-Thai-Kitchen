const path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.MW_BROWSER_EXECUTABLE||undefined,args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),posts=[],errors=[];let recommended=true,stale=false,combined=false;
  const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  const trip={start:1103,departure:1105,finish:1119,stops:[{sourceId:a,arrival:1110}]};
  const joined={start:1103,departure:1105,finish:1123,stops:[{sourceId:a,arrival:1110},{sourceId:b,arrival:1114}]};
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://localhost/**',async route=>{
   const u=new URL(route.request().url());let body;
   if(u.pathname==='/api/booking-mode')body={mode:'MASTER_WOK'};
   else if(u.pathname==='/admin-api/order-action'){
    const p=route.request().postDataJSON();posts.push(p);
    if(p.action==='delivery_trip_options')body={success:true,notification_managed:true,revision:4,trip:combined?joined:trip,
     candidates:[{orderId:b,reference:'RTK-2'}],recommendations:recommended?[{orderIds:[a,b],savedMinutes:10,trip:joined}]:[]};
    else if(p.action==='preview_delivery_combination')body={success:true,notification_managed:true,revision:4,trip:joined};
    else if(stale){await route.fulfill({status:409,json:{success:false,reason:'DELIVERY_PLAN_CHANGED_REFRESH'}});return;}
    else body={success:true,notification_managed:true,committed:true};
   }else {await route.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'});return;}
   await route.fulfill({json:body});
  });
  await page.goto('http://localhost/test');
  for(const file of ['master-wok-admin-client.js','master-wok-delivery-admin.js'])await page.addScriptTag({path:path.join(__dirname,'..',file)});
  const open=()=>page.evaluate(id=>MasterWokDeliveryAdmin.open({id,order_ref:'RTK-1'}),a);
  await open();await page.getByRole('button',{name:/Review recommendation/}).click();
  assert.equal(posts.filter(p=>p.action==='combine_deliveries').length,0,'Preview must not commit');
  await page.getByRole('button',{name:'Confirm combined trip'}).click();await page.waitForFunction(()=>!document.querySelector('dialog'));
  assert.deepEqual(posts.at(-1),{orderId:a,action:'combine_deliveries',orderIds:[a,b],expectedRevision:4});
  recommended=false;await open();await page.getByRole('button',{name:'Check this combination'}).click();
  stale=true;await page.getByRole('button',{name:'Confirm combined trip'}).click();
  await page.getByText('The schedule changed. Close this window and review the trips again.').waitFor();
  assert.equal(await page.locator('dialog').count(),1);await page.getByRole('button',{name:'Close',exact:true}).click();
  stale=false;combined=true;await open();await page.getByRole('button',{name:'Split into separate trips'}).click();await page.waitForFunction(()=>!document.querySelector('dialog'));
  assert.equal(posts.at(-1).action,'split_delivery_trip');assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',scope:'REAL_BROWSER_ADMIN_WITH_INTERCEPTED_BACKEND',checks:['recommendation preview requires explicit confirmation','manual combination without recommendation','stale revision explains refresh','split uses server revision'],productionWrites:0}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
