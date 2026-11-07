// Local browser integration only. No production database or notification calls.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"],...(process.env.MW_CHROMIUM_EXECUTABLE?{executablePath:process.env.MW_CHROMIUM_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage();let sent=[];
  await page.route('https://review.example.invalid/**',async route=>{
   const request=route.request();
   if(request.url().endsWith('/api/basket-review')){
    if(request.method()==='GET')return route.fulfill({json:{enabled:true}});
    sent.push(request.postDataJSON());
    return route.fulfill({json:{success:true,reviewId:'saved',bookingApprovalAllowed:false}});
   }
   return route.fulfill({contentType:'text/html',body:'<input id="cust-name" value="Test Customer"><input id="cust-phone" value="07123456789"><input id="cust-preferred-date" value="2026-11-12"><input name="order-type" type="radio" value="collection" checked>'});
  });
  await page.goto('https://review.example.invalid/');
  await page.addScriptTag({path:path.join(root,'master-wok-basket-review-client.js')});
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const start=html.indexOf('function showUnavailableBasketDialog() {');
  const end=html.indexOf('async function populatePreferredTimeSelect',start);
  await page.addScriptTag({content:'const basket=[{itemId:"pork-dumplings",qty:3,mods:[],item_note:"Keep sauce separate"}];'+html.slice(start,end)});
  await page.evaluate(()=>showUnavailableBasketDialog());
  await page.locator('[data-review-form]').waitFor();
  await page.locator('[name="time"]').fill('20:15');
  await page.getByRole('button',{name:'Send basket for review'}).click();
  await page.getByRole('button',{name:'Basket sent',exact:true}).waitFor();
  assert.equal(sent.length,1);assert.equal(sent[0].items[0].qty,3);
  assert.equal(sent[0].items[0].item_note,'Keep sauce separate');
  assert.equal(sent[0].preferredTime,'2026-11-12T20:15:00.000Z');
  assert.match(await page.locator('[data-review-form] [role="status"]').textContent(),/not confirmed/);
  assert.equal(await page.evaluate(()=>basket.length),1);
  await page.getByRole('button',{name:'Back to checkout'}).click();
  assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);
  // Admin must render basket/customer text without executing HTML from storage.
  await page.route('**/admin-api/basket-reviews',route=>route.fulfill({json:{success:true,reviews:[{
   id:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',customer_name:'<img src=x onerror="window.injected=true">',customer_phone:'07123456789',status:'pending',
   order_type:'collection',preferred_time:'2026-11-12T20:15:00Z',basket:[{qty:3,name:'Dumplings',item_note:'<script>bad()</script>'}]}]}}));
  await page.addScriptTag({path:path.join(root,'master-wok-basket-review-admin.js')});
  await page.getByText('1 active review requests').waitFor();
  assert.equal(await page.evaluate(()=>window.injected),undefined);
  assert.equal(await page.locator('article img').count(),0);
  assert.match(await page.locator('article').textContent(),/Dumplings/);
  console.log('PASS customer review form, basket preservation, unconfirmed receipt, close and Admin text escaping');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
