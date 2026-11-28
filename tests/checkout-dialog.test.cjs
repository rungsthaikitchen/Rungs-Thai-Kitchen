const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {create}=require('../customer-checkout-dialog');
const evidence=require('../CHECKOUT-DIALOG-EXTRACTION-2026-11-19.json');
const bootstrap=require('./checkout-refactor-source.cjs').reconstruct(),currentModuleSource=fs.readFileSync(require.resolve('../customer-checkout-dialog.js'),'utf8');
const quoteChange=require('./quote-refresh-change.json');
assert.equal(currentModuleSource.split(quoteChange.after).length,2);
const moduleSource=require('./reviewed-checkout-handoff-source.cjs')
 .removeCheckoutFocus(currentModuleSource).replace(quoteChange.after,quoteChange.before);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
test('the extracted lifecycle reconstructs the live baseline byte for byte',()=>{
 const parts={};
 for(const name of Object.keys(evidence.extractedRegions)){
  const marker='// BEGIN extracted '+name+'\n',end='// END extracted '+name+'\n';
  let text=moduleSource.slice(moduleSource.indexOf(marker)+marker.length,moduleSource.indexOf(end));
  for(const fn of evidence.functionDependencies)text=text.replaceAll('(0, context.'+fn+')',fn);
  for(const value of evidence.valueDependencies)text=text.replaceAll('context.'+value,value);
  assert.equal(hash(text),evidence.extractedRegions[name],name);parts[name]=text;
 }
 const start='// BEGIN checkout-dialog boundary\n',end='// END checkout-dialog boundary\n';
 const boundary=bootstrap.slice(bootstrap.indexOf(start),bootstrap.indexOf(end)+end.length);
 const availability=boundary.slice(start.length,boundary.indexOf('const checkoutDialog ='));
 const reconstructed=bootstrap.replace(boundary,parts['opening state']+availability+parts['opening function']).replace('// safe listeners',parts['closing function']+'// safe listeners');
 assert.equal(hash(reconstructed),evidence.originalCheckoutSha256);
});
test('loading the factory does not touch DOM, storage or network',()=>{
 const window={},blocked=()=>{throw Error('unexpected side effect');};
 vm.runInNewContext(moduleSource,{window,document:new Proxy({}, {get:blocked}),fetch:blocked,localStorage:new Proxy({}, {get:blocked})});
 assert.equal(typeof window.RTKCheckoutDialog.create,'function');assert.deepEqual(Object.keys(window),['RTKCheckoutDialog']);
});
function fixture(){
 const calls=[],buttons=[{setAttribute(k,v){this[k]=v;}},{setAttribute(k,v){this[k]=v;}}],status={hidden:true};
 let mode='delivery',key='same';
 const context={window:{RTKRefreshLoyalty:async()=>{calls.push('loyalty');}},console:{trace(){},warn(){}},
  document:{getElementById:id=>id==='checkout-opening-status'?status:null,querySelectorAll:()=>buttons,querySelector:selector=>selector.includes(':checked')?(mode?{value:mode}:null):{set checked(value){if(value)mode='collection';}}},
  availabilityBasketKey:()=>key,loadServiceState:async()=>{calls.push('service');},SERVICE_STATE:{mode:'normal'},orderMsg:{style:{}},
  loadBlackouts:async()=>{calls.push('closures');},preferredDateInput:{value:'2026-11-19'},preferredTimeSelect:{value:'20:00',options:[]},preferredTimeHidden:{value:''},
  populatePreferredTimeSelect:async()=>{calls.push('times');context.preferredTimeSelect.options=[{value:'20:00',disabled:false}];},
  showPreferredTimeMessage:text=>calls.push(text),recomputeCheckoutTotals:()=>calls.push('totals'),updateCheckoutSubmitButton:()=>calls.push('button'),updateCheckoutOrderSummary:()=>calls.push('summary'),
  checkoutMsg:{style:{}},checkoutModal:{style:{display:'none'}},checkoutBaseSubtotal:0,lastPreferredDate:null};
 context.window.refreshCheckoutPricingAndRender=async()=>{context.recomputeCheckoutTotals();context.updateCheckoutSubmitButton();context.updateCheckoutOrderSummary();};
 return {context,dialog:create(context),calls,buttons,status,setKey:value=>key=value,get mode(){return mode;}};
}
test('retained delivery, loyalty refresh and still-valid time survive opening and closing',async()=>{
 const f=fixture();await f.dialog.open(104.50);
 assert.equal(f.mode,'delivery');assert.equal(f.context.checkoutBaseSubtotal,104.50);
 assert.equal(f.context.preferredTimeHidden.value,'2026-11-19T20:00');
 assert.deepEqual(f.calls,['service','loyalty','closures','times','totals','button','summary']);
 assert.equal(f.context.checkoutModal.style.display,'flex');assert.equal(f.status.hidden,true);
 assert.ok(f.buttons.every(b=>b.disabled===false&&b['aria-busy']==='false'));
 f.dialog.close();assert.equal(f.context.checkoutModal.style.display,'none');
});
test('a disabled previous time is cleared and newer state is read after asynchronous work',async()=>{
 const f=fixture();f.context.populatePreferredTimeSelect=async()=>{f.context.preferredTimeSelect.options=[{value:'20:00',disabled:true}];};
 await f.dialog.open(29);assert.equal(f.context.preferredTimeSelect.value,'');assert.equal(f.context.preferredTimeHidden.value,'');
 assert.ok(f.calls.some(text=>text.includes('no longer available')));
});
test('opening waits for loyalty and discards a changed basket before displaying totals',async()=>{
 const f=fixture();let release,began;const started=new Promise(r=>began=r),wait=new Promise(r=>release=r);
 f.context.window.RTKRefreshLoyalty=()=>wait;f.context.populatePreferredTimeSelect=async()=>began();
 const opening=f.dialog.open(103);await started;
 assert.equal(f.context.checkoutModal.style.display,'none');assert.ok(f.buttons.every(b=>b.disabled));
 f.setKey('changed');release();await opening;
 assert.equal(f.context.checkoutModal.style.display,'none');assert.ok(!f.calls.includes('totals'));assert.equal(f.status.hidden,true);
});
test('controller creation itself makes no requests and empty baskets cannot start loading data',async()=>{
 const f=fixture();assert.deepEqual(f.calls,[]);await f.dialog.open(0);assert.deepEqual(f.calls,[]);assert.equal(f.status.hidden,true);
});
test('opening refreshes pricing from the new subtotal and waits before showing checkout',async()=>{
 const f=fixture();let finish,began;const started=new Promise(r=>began=r),waiting=new Promise(r=>finish=r);
 f.context.window.refreshCheckoutPricingAndRender=async()=>{assert.equal(f.context.checkoutBaseSubtotal,30);began();await waiting;};
 const opening=f.dialog.open(30);await started;assert.equal(f.context.checkoutModal.style.display,'none');
 finish();await opening;assert.equal(f.context.checkoutModal.style.display,'flex');assert.equal(f.status.hidden,true);
});
test('a basket changed during the price refresh is not shown with an old subtotal',async()=>{
 const f=fixture();let finish,began;const started=new Promise(r=>began=r),waiting=new Promise(r=>finish=r);
 f.context.window.refreshCheckoutPricingAndRender=()=>{began();return waiting;};
 const opening=f.dialog.open(30);await started;f.setKey('changed-during-quote');finish();await opening;
 assert.equal(f.context.checkoutModal.style.display,'none');assert.equal(f.status.hidden,true);
});

test('checkout moves focus after opening and restores it only when dismissed', async () => {
 const {context, dialog} = fixture();
 const doc = context.document;
 doc.body = {};
 const focusable = () => ({focus() { doc.activeElement = this; }});
 const close = focusable();
 const proceed = focusable();
 const menuLink = focusable();
 const getElement = doc.getElementById;
 doc.getElementById = id => ({'checkout-close': close, 'open-checkout': proceed}[id] ?? getElement(id));

 for (const opener of [proceed, menuLink, doc.body]) {
  doc.activeElement = opener;
  await dialog.open(8);
  assert.equal(doc.activeElement, close);
  dialog.close();
  assert.equal(doc.activeElement, opener === doc.body ? proceed : opener);
  const other = focusable();
  other.focus();
  dialog.close();
  assert.equal(doc.activeElement, other);
 }
});
