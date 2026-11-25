const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {create}=require('../customer-checkout-reset'),e=require('../CHECKOUT-RESET-EXTRACTION-2026-11-25.json');
function fixture({missing=false,alternate=false,key='old-key'}={}){
 const f={appliedDiscountCode:'SAVE',appliedDiscountAmount:5,lastPreferredDate:'2026-11-25',window:{deliveryQuoteState:{fee:3},customerLat:53,customerLng:-1},calls:[],nodes:{},storage:new Map(key?[['checkout_idempotency_key',key],['unrelated','keep']]:[['unrelated','keep']])};
 if(!missing)for(const id of ['cust-name','cust-email','cust-phone','cust-address','cust-notes','cust-preferred-time','discount-code-message',...(alternate?[]:['discount-code'])])f.nodes[id]={value:'old',textContent:'old',className:'old'};
 f.alternate=alternate?{value:'old'}:null;f.nodes['cust-preferred-date']={value:'2026-11-25'};
 f.document={getElementById:id=>f.nodes[id]||null,querySelector:()=>f.alternate};f.console={log:()=>{}};f.hidePreferredTimeMessage=()=>f.calls.push('hide');f.localStorage={getItem:k=>f.storage.get(k)||null,setItem:(k,v)=>{f.calls.push(['set',k,v]);f.storage.set(k,v);},removeItem:k=>{f.calls.push(['remove',k]);f.storage.delete(k);}};f.crypto={randomUUID:()=>{f.calls.push('uuid');return 'new-key';}};return f;
}
function old(f){return vm.runInNewContext(e.regions.map(r=>r.before).join('\n')+'\n({resetCheckoutForNextOrder,getIdempotencyKey})',f);}
const plain=x=>JSON.parse(JSON.stringify(x));function state(f){return plain({nodes:f.nodes,alternate:f.alternate,window:f.window,code:f.appliedDiscountCode,amount:f.appliedDiscountAmount,date:f.lastPreferredDate,calls:f.calls,storage:[...f.storage]});}
test('reset extraction reconstructs released bootstrap and defers DOM/storage work',()=>{require('./checkout-reset-source.cjs').reconstructCheckoutReset();const window={};vm.runInNewContext(fs.readFileSync(require.resolve('../customer-checkout-reset'),'utf8'),{window});const blocked=new Proxy({},{get(){throw Error('startup access');}});create({document:blocked,localStorage:blocked,crypto:blocked});assert.equal(typeof window.RTKCheckoutReset.create,'function');});
test('actual reset preserves cleared fields, discounts, time message, public quote and unrelated data',()=>{
 for(const options of [{},{missing:true},{alternate:true}]){const a=fixture(options),b=fixture(options),x=create(a),y=old(b);x.resetCheckoutForNextOrder();y.resetCheckoutForNextOrder();assert.deepEqual(state(a),state(b));assert.equal(a.appliedDiscountCode,null);assert.equal(a.appliedDiscountAmount,0);assert.equal(a.lastPreferredDate,null);assert.deepEqual(a.window.deliveryQuoteState,{});assert.equal(a.storage.has('checkout_idempotency_key'),false);assert.equal(a.storage.get('unrelated'),'keep');assert.equal(a.nodes['cust-preferred-date'].value,'2026-11-25');assert.equal(a.window.customerLat,53);}
});
test('same checkout reuses its key while reset gives the next checkout a fresh key',()=>{
 const a=fixture(),b=fixture(),x=create(a),y=old(b);assert.equal(x.getIdempotencyKey(),y.getIdempotencyKey());assert.equal(x.getIdempotencyKey(),'old-key');assert.equal(a.calls.length,0);x.resetCheckoutForNextOrder();y.resetCheckoutForNextOrder();assert.equal(x.getIdempotencyKey(),y.getIdempotencyKey());assert.equal(x.getIdempotencyKey(),'new-key');assert.deepEqual(state(a),state(b));assert.equal(a.calls.filter(x=>x==='uuid').length,1);
});
test('storage failure is propagated without silently creating a different retry key',()=>{
 for(const key of ['old-key','']){const a=fixture({key}),b=fixture({key}),x=create(a),y=old(b);a.localStorage.getItem=b.localStorage.getItem=()=>{throw Error('storage unavailable');};assert.throws(()=>x.getIdempotencyKey(),/storage unavailable/);assert.throws(()=>y.getIdempotencyKey(),/storage unavailable/);assert.deepEqual(state(a),state(b));assert.equal(a.calls.includes('uuid'),false);}
});
