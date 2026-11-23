const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {install}=require('../customer-checkout-confirmation');
const evidence=require('../CHECKOUT-CONFIRMATION-EXTRACTION-2026-11-23.json');
function fixture(missing=[]){
 const nodes=Object.fromEntries(['order-success','order-success-title','order-success-msg','order-success-items','order-success-total','order-success-download'].filter(id=>!missing.includes(id)).map(id=>[id,{textContent:'',innerHTML:'',style:{}}]));
 const alerts=[],downloads=[];
 const window={formatCurrency:n=>'£'+Number(n).toFixed(2),downloadReceipt(){},downloadReceiptPlain:(...args)=>downloads.push(args)};
 return {nodes,alerts,downloads,window,document:{getElementById:id=>nodes[id]||null},alert:s=>alerts.push(s),console:{error(){}}};
}
function original(f){vm.runInNewContext(evidence.block,f);}
function state(f){return JSON.parse(JSON.stringify({nodes:f.nodes,alerts:f.alerts,downloads:f.downloads,last:f.window.__lastOrderForPdf}));}
const items=[{name:'Green Curry 🌶️🌶️',mods:[{name:'Chicken'}],spice:1,qty:2,unitPrice:9},{name:'Rice',qty:1,unitPrice:2},{name:'Chips',mods:[],spice:7,qty:1,unitPrice:3}];
test('confirmation extraction reconstructs the complete released bootstrap',()=>{require('./confirmation-source.cjs').reconstructConfirmation();});
test('registration performs no DOM, receipt or confirmation work',()=>{
 const blocked=()=>{throw Error('unexpected startup effect');},window={};
 vm.runInNewContext(fs.readFileSync(require.resolve('../customer-checkout-confirmation'),'utf8'),{window,document:new Proxy({},{get:blocked}),alert:blocked,console:new Proxy({},{get:blocked})});
 assert.equal(typeof window.RTKCheckoutConfirmation.install,'function');
 assert.equal(window.showOrderSuccessNew,undefined);
});
test('actual module preserves collection/delivery, holding notices, item rendering and optional elements',()=>{
 for(const orderType of ['collection','delivery'])for(const holdingReviewRequired of [false,true])for(const time of ['', '25 Nov 2026, 18:30'])for(const missing of [[],['order-success-msg','order-success-title','order-success-items','order-success-total','order-success-download']]){
  const before=fixture(missing),after=fixture(missing);original(before);install(after);
  const summary={ref:'RTK-TEST',orderType,holdingReviewRequired,total:23};
  before.window.showOrderSuccessNew(summary,items,time);after.window.showOrderSuccessNew(summary,items,time);
  assert.deepEqual(state(after),state(before));
  assert.equal(after.nodes['order-success'].style.display,'flex');
 }
});
test('receipt button uses the latest order after repeated confirmations',()=>{
 const f=fixture();install(f);
 f.window.showOrderSuccessNew({ref:'FIRST',total:23},items,'18:30');
 const second={ref:'SECOND',total:2},secondItems=[items[1]];
 f.window.showOrderSuccessNew(second,secondItems,'19:00');f.nodes['order-success-download'].onclick();
 assert.deepEqual(f.downloads,[[second,secondItems,'19:00']]);
 assert.equal(f.window.__lastOrderForPdf.summary,second);
 delete f.window.downloadReceipt;f.nodes['order-success-download'].onclick();assert.equal(f.downloads.length,1);
});
test('missing popup retains the alert fallback without storing a receipt',()=>{
 const f=fixture(['order-success']);install(f);f.window.showOrderSuccessNew({ref:'RTK-TEST'},items,'');
 assert.deepEqual(f.alerts,['Order placed! RTK-TEST']);assert.equal(f.window.__lastOrderForPdf,null);
});
