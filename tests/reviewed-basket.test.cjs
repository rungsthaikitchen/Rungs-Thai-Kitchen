const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {create}=require('../customer-basket-controls'),e=require('../REVIEWED-BASKET-EXTRACTION-2026-11-25.json');
const plain=x=>JSON.parse(JSON.stringify(x));
const items=[{item_id:'green-curry',name:'Green Curry',modifiers:[{id:'chicken',name:'Chicken',delta:1}],unit_price:9,qty:2,img:'curry.png',spice:2,item_note:'No beans'},{item_id:'rice',name:'Rice',modifiers:[],unit_price:2,qty:1,spice:null}];
function fixture(nonempty=false,accept=true){const f={basket:nonempty?[{name:'Existing',unitPrice:5,qty:1}]:[],window:{},calls:[]};f.confirm=message=>{f.calls.push(['confirm',message]);return accept;};f.renderOrder=()=>f.calls.push(['render',plain(f.basket)]);return f;}
function old(f){vm.runInNewContext(e.before,f);return f.window.RTKRestoreReviewedBasket;}
test('reviewed basket extraction reconstructs both released bootstrap and basket module',()=>{const p=require('./reviewed-basket-source.cjs');p.reconstructReviewedBasket();p.reconstructBasketModule();});
test('actual restore preserves confirmation, full reviewed payload, render order and shared array identity',()=>{
 for(const nonempty of [false,true])for(const accept of [false,true]){const a=fixture(nonempty,accept),b=fixture(nonempty,accept),x=create(a),y=old(b),shared=a.basket;assert.equal(x.restoreReviewedBasket(items),y(items));assert.deepEqual(plain(a.basket),plain(b.basket));assert.deepEqual(a.calls,b.calls);assert.equal(a.basket,shared);if(!nonempty||accept){assert.equal(a.basket[0].item_note,'No beans');assert.equal(a.basket[1].img,'');assert.equal(a.calls.at(-1)[0],'render');}else{assert.equal(a.basket[0].name,'Existing');assert.equal(a.calls.length,1);}}
});
test('global compatibility wrapper restores into the current basket and forwards the result',()=>{
 const f=fixture();const api=create(f);vm.runInNewContext(e.wrapper,{window:f.window,basketControls:api});const replacement=[];f.basket=replacement;assert.equal(f.window.RTKRestoreReviewedBasket(items),true);assert.equal(replacement.length,2);assert.equal(f.calls.length,1);
});
test('invalid reviewed payload retains the released exception without changing the basket',()=>{
 const a=fixture(true),b=fixture(true),x=create(a),y=old(b);assert.throws(()=>x.restoreReviewedBasket(null),TypeError);assert.throws(()=>y(null));assert.deepEqual(plain(a.basket),plain(b.basket));assert.deepEqual(a.calls,b.calls);
});
