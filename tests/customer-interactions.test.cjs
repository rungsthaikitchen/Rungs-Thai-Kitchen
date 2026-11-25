const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {create}=require('../customer-interactions'),e=require('../CUSTOMER-INTERACTIONS-EXTRACTION-2026-11-25.json');
function node(){return {dataset:{},listeners:{},addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}};}
function fixture({missing=false,bound=false,fallback=false,modal='flex',checkout='flex',callbacks=true}={}){
 const f={window:{},calls:[],list:missing?null:node(),document:node(),modal:{style:{display:modal}},checkoutModal:{style:{display:checkout}}};if(f.list&&bound)f.list.dataset.customBound='1';f.document.getElementById=()=>f.list;
 f.window.openCustomise=id=>f.calls.push(['window-open',id]);if(!fallback)f.openCustomise=id=>f.calls.push(['open',id]);
 if(callbacks){f.closeModal=()=>f.calls.push('modal');f.closeCheckout=()=>f.calls.push('checkout');f.hideOrderSuccess=()=>f.calls.push('success');}return f;
}
function old(f){return vm.runInNewContext(e.regions.map(r=>'function '+r.name+'(){'+r.before+'}').join('\n')+'\n({'+e.regions.map(r=>r.name).join(',')+'})',f);}
function click(list,id,kind='button'){const target={closest(selector){if(kind==='none'||(selector==='button[data-id]'&&kind!=='button'))return null;return {dataset:{id},getAttribute:()=>id};}};for(const fn of list?.listeners.click||[])fn({target});}
const plain=x=>JSON.parse(JSON.stringify(x));
function state(f){return plain({calls:f.calls,dataset:f.list?.dataset,count:f.list?.listeners.click?.length||0,keyCount:f.document.listeners.keydown?.length||0});}
test('interaction extraction reconstructs released bootstrap and defers all binding until requested',()=>{require('./customer-interactions-source.cjs').reconstructCustomerInteractions();const window={};vm.runInNewContext(fs.readFileSync(require.resolve('../customer-interactions'),'utf8'),{window});create({document:new Proxy({},{get(){throw Error('startup binding');}})});assert.equal(typeof window.RTKCustomerInteractions.create,'function');});
test('actual delegated handlers preserve duplicate calls, card/button targets and bind guard',()=>{
 for(const options of [{},{missing:true},{bound:true}]){const a=fixture(options),b=fixture(options),x=create(a),y=old(b);x.bindCustomiseEarly();y.bindCustomiseEarly();x.bindCustomiseEarly();y.bindCustomiseEarly();x.bindCustomiseLate();y.bindCustomiseLate();assert.deepEqual(state(a),state(b));for(const kind of ['button','card','none'])for(const id of ['dish','']){click(a.list,id,kind);click(b.list,id,kind);assert.deepEqual(state(a),state(b));}if(!options.missing&&!options.bound)assert.equal(a.list.listeners.click.length,2);}
});
test('early handler preserves global opener fallback',()=>{const a=fixture({fallback:true}),b=fixture({fallback:true}),x=create(a),y=old(b);x.bindCustomiseEarly();y.bindCustomiseEarly();click(a.list,'dish');click(b.list,'dish');assert.deepEqual(state(a),state(b));assert.deepEqual(a.calls,[['window-open','dish']]);});
test('Escape preserves visibility gates, optional callbacks and close order',()=>{
 for(const modal of ['flex','none'])for(const checkout of ['flex','none'])for(const callbacks of [true,false]){const a=fixture({modal,checkout,callbacks}),b=fixture({modal,checkout,callbacks}),x=create(a),y=old(b);x.bindEscape();y.bindEscape();for(const key of ['Enter','Escape']){for(const fn of a.document.listeners.keydown)fn({key});for(const fn of b.document.listeners.keydown)fn({key});assert.deepEqual(state(a),state(b));}if(callbacks&&modal==='flex'&&checkout==='flex')assert.deepEqual(a.calls,['modal','checkout','success']);}
});
