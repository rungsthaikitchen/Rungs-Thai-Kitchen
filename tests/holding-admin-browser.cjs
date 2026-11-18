// Isolated component integration test: synthetic DOM and mocked HTTP only.
// Does not open the live Admin, local site files, or make external requests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<button id="refresh">Refresh</button><table><tbody id="tbody"><tr><td class="actions"><button class="btn-accept" data-order-id="flagged">Accept flagged</button></td></tr><tr><td class="actions"><button class="btn-accept" data-order-id="normal">Accept normal</button></td></tr></tbody></table>');
  await page.evaluate(()=>{
   window.oldAccepts=0;window.requests=[];window.refreshed=0;window.saved=false;window.attempts=0;
   document.addEventListener('click',e=>{if(e.target.closest('.btn-accept'))window.oldAccepts++;});
   document.getElementById('refresh').onclick=()=>window.refreshed++;
   const warning=minutes=>({id:'flagged@time',estimatedMinutes:minutes,dishes:[{itemId:'pad-thai',name:'Pad Thai <img src=x>',minutes}],...(window.saved?{acknowledgement:{staffActor:'staff@example.invalid'}}:{})});
   window.fetch=async(url,options)=>{
    if(url==='/api/payments')return {ok:true,json:async()=>({enabled:true})};
    if(url!=='/admin-api/payments')throw Error('unexpected external request');
    const p=JSON.parse(options.body);window.requests.push(p);
    if(p.action==='holding_list')return {ok:true,json:async()=>({success:true,holding:p.orderIds.map(id=>({orderId:id,warnings:id==='flagged'?[warning(window.attempts?31:29)]:[],warningToken:window.attempts?'updated':'initial'}))})};
    if(p.action==='holding_accept'){
     if(++window.attempts===1)return {ok:false,json:async()=>({success:false,reason:'EXTENDED_HOLDING_REVIEW_REQUIRED',holdingWarnings:[warning(31)],warningToken:'updated'})};
     if(p.holdingWarningToken!=='updated')throw Error('stale token');window.saved=true;return {ok:true,json:async()=>({success:true})};
    }
    throw Error('unexpected operation');
   };
  });
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../master-wok-holding-admin.js'),'utf8')});
  await page.locator('[data-holding-warning] summary').filter({hasText:'29 min'}).waitFor();
  await page.getByRole('button',{name:'Accept normal',exact:true}).click();assert.equal(await page.evaluate(()=>window.oldAccepts),1);
  await page.getByRole('button',{name:'Accept flagged',exact:true}).click();await page.locator('dialog[open]').waitFor();assert.equal(await page.evaluate(()=>window.oldAccepts),1);
  assert.equal(await page.locator('dialog img').count(),0);assert.match(await page.locator('dialog [data-dishes]').textContent(),/Pad Thai <img src=x>/);
  await page.getByRole('button',{name:'Accept order',exact:true}).click();assert.equal(await page.evaluate(()=>window.attempts),0);
  await page.locator('dialog input[type=checkbox]').check();await page.getByRole('button',{name:'Accept order',exact:true}).click();
  await page.locator('dialog [data-status]').filter({hasText:'warning changed'}).waitFor();assert.equal(await page.locator('dialog input[type=checkbox]').isChecked(),false);assert.match(await page.locator('dialog [data-dishes]').textContent(),/31 min/);
  await page.locator('dialog input[type=checkbox]').check();await page.getByRole('button',{name:'Accept order',exact:true}).click();
  await page.waitForFunction(()=>window.saved&&window.refreshed===1);assert.equal(await page.locator('dialog[open]').count(),0);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',checks:['normal accept unchanged','flagged accept intercepted','warning text escaped','acknowledgement required','stale warning re-reviewed','acceptance refreshes rows'],externalRequests:0}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
