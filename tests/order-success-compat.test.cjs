const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {create}=require('../customer-order-success-compat'),{install:installConfirmation}=require('../customer-checkout-confirmation'),e=require('../ORDER-SUCCESS-COMPAT-EXTRACTION-2026-11-25.json');
function element(){return {textContent:'',innerHTML:'',style:{},children:[],listeners:{},addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);},appendChild(el){this.children.push(el);}};}
function fixture(missing=[]){
 const ids=['order-success','order-success-x','order-success-close','order-success-title','order-success-msg','order-success-type','order-success-time','order-success-items','order-success-total','order-success-download'];
 const f={nodes:Object.fromEntries(ids.filter(id=>!missing.includes(id)).map(id=>[id,element()])),window:{},alerts:[],timers:[],observers:[]};
 f.document={getElementById:id=>f.nodes[id]||null,createElement:()=>element()};f.alert=s=>f.alerts.push(s);f.console={log(){},trace(){},error(){}};f.setTimeout=fn=>f.timers.push(fn);f.MutationObserver=class{observe(el,options){f.observers.push({options});}};f.formatCurrency=n=>'£'+Number(n).toFixed(2);f.window.formatCurrency=f.formatCurrency;return f;
}
function old(f){vm.runInNewContext(e.before,f);}
const plain=x=>JSON.parse(JSON.stringify(x));
function state(f){return plain({nodes:f.nodes,window:f.window,alerts:f.alerts,observers:f.observers,timers:f.timers.length});}
const items=[{name:'Curry',mods:[{name:'Chicken'}],spice:2,qty:2,unitPrice:9},{name:'Rice',qty:1,unitPrice:2}];
test('compatibility extraction preserves the entire released bootstrap and defers DOM work',()=>{
 require('./order-success-compat-source.cjs').reconstructOrderSuccessCompat();const window={};vm.runInNewContext(fs.readFileSync(require.resolve('../customer-order-success-compat'),'utf8'),{window});create({document:new Proxy({},{get(){throw Error('startup DOM access');}})});assert.equal(typeof window.RTKOrderSuccessCompat.create,'function');
});
test('actual compatibility popup preserves rendering, totals precedence and deferred total correction',()=>{
 for(const orderType of ['collection','delivery'])for(const holdingReviewRequired of [false,true])for(const time of ['', '18:30'])for(const totals of [{},{__checkoutTotals:{total:21}},{__lastOrderTotals:{total:17},__checkoutTotals:{total:21}},{__lastOrderTotals:{total:'invalid'}}]){
 const a=fixture(),b=fixture();Object.assign(a.window,totals);Object.assign(b.window,totals);create(a).install();old(b);
 const summary={ref:'RTK-TEST',orderType,holdingReviewRequired,total:23};a.window.showOrderSuccessNew(summary,items,time);b.window.showOrderSuccessNew(summary,items,time);assert.deepEqual(state(a),state(b));a.timers.forEach(fn=>fn());b.timers.forEach(fn=>fn());assert.deepEqual(state(a),state(b));assert.equal(a.nodes['order-success'].style.display,'flex');
 }
});
test('compatibility aliases, fallback alerts and duplicate dismiss listeners remain equivalent',()=>{
 for(const missing of [[],['order-success','order-success-x','order-success-close'],['order-success-title','order-success-msg','order-success-total','order-success-items']]){
 const a=fixture(missing),b=fixture(missing);create(a).install();old(b);a.window.showOrderSuccess(42,items,23,'delivery','18:30',true);b.window.showOrderSuccess(42,items,23,'delivery','18:30',true);assert.deepEqual(state(a),state(b));
 for(const id of ['order-success-x','order-success-close','order-success'])if(a.nodes[id]){for(const fn of a.nodes[id].listeners.click||[])fn({target:a.nodes[id]});for(const fn of b.nodes[id].listeners.click||[])fn({target:b.nodes[id]});assert.deepEqual(state(a),state(b));}
 delete a.window.showOrderSuccessNew;delete b.window.showOrderSuccessNew;a.window.showOrderSuccess('RTK-TEST');b.window.showOrderSuccess('RTK-TEST');assert.deepEqual(state(a),state(b));
 }
});
test('new checkout confirmation still takes over and receipt button uses the latest order',()=>{
 const f=fixture();create(f).install();const legacy=f.window.showOrderSuccessNew;installConfirmation(f);assert.notEqual(f.window.showOrderSuccessNew,legacy);
 f.window.showOrderSuccess('RTK-TEST',items,23,'delivery','18:30',true);assert.equal(f.nodes['order-success-title'].textContent,'Order received — RTK-TEST');assert.equal(f.nodes['order-success-total'].textContent,'£23.00');assert.equal(f.timers.length,0);assert.equal(f.observers.length,0);assert.equal(f.window.__lastOrderReceipt,undefined);
 const received=[];f.window.downloadReceipt=()=>{};f.window.downloadReceiptPlain=(...args)=>received.push(args);const summary={ref:'LATEST',total:2};f.window.showOrderSuccessNew(summary,[items[1]],'19:00');f.nodes['order-success-download'].onclick();assert.deepEqual(received,[[summary,[items[1]],'19:00']]);
});
