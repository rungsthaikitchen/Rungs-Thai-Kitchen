const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create}=require('../customer-basket-controls'),e=require('../BASKET-CONTROLS-EXTRACTION-2026-11-24.json');
class Element{constructor(tag){this.tag=tag;this.style={};this.children=[];this.html='';this.textContent='';this.events={};}set innerHTML(v){this.html=v;this.children=[];}get innerHTML(){return this.html;}appendChild(child){this.children.push(child);}addEventListener(name,fn){this.events[name]=fn;}}
function fixture(basket=[]){
 const nodes={'order-list':new Element('div'),'order-total':new Element('div'),'order-panel':new Element('div')},calls=[];
 return {basket,nodes,calls,document:{getElementById:id=>nodes[id],createElement:tag=>new Element(tag)},window:{dispatchEvent:event=>calls.push(event.type)},CustomEvent:class{constructor(type){this.type=type;}},formatCurrency:n=>'£'+(Math.round((n+Number.EPSILON)*100)/100).toFixed(2),roundToTwo:n=>Math.round((n+Number.EPSILON)*100)/100,nameWithoutChillies:s=>s.replace(/🌶️+/g,'').trim(),chilliIcons:n=>'🌶️'.repeat(Math.max(0,Math.min(3,n||0))),refreshAppliedDiscountCode:async()=>calls.push('discount')};
}
const plain=x=>JSON.parse(JSON.stringify(x));
function old(f){return vm.runInNewContext(e.regions.find(r=>r.name==='renderOrder').before+'\n({renderOrder,bindControls(){'+e.regions.find(r=>r.name==='bindControls').before+'}})',f);}
const rows=[{name:'Chicken🌶️',mods:[{name:'Extra Chicken'}],spice:2,qty:2,unitPrice:9,img:'images/example.jpg'},{name:'Rice',mods:[],spice:null,qty:1,unitPrice:2,img:''}];
test('basket controls extraction reconstructs released menu bootstrap',()=>{require('./basket-controls-source.cjs').reconstructBasketControls();});
test('registration and factory creation have no DOM, event or database effects',()=>{
 const blocked=()=>{throw Error('startup access');},window={};vm.runInNewContext(fs.readFileSync(require.resolve('../customer-basket-controls'),'utf8'),{window});create({window,document:new Proxy({},{get:blocked})});assert.equal(typeof window.RTKBasketControls.create,'function');
});
test('actual basket renderer preserves populated and empty markup, totals and availability events',()=>{
 for(const basket of [[],rows,[{...rows[1],qty:3,unitPrice:2.335}]]){
  const f=fixture(plain(basket)),g=fixture(plain(basket));create(f).renderOrder();old(g).renderOrder();assert.deepEqual(plain(f.nodes),plain(g.nodes));assert.deepEqual(f.calls,g.calls);assert.deepEqual(f.calls,['rtk:basket-changed']);
 }
});
test('actual controls preserve quantity floor, removal, array identity and refresh order',async()=>{
 const f=fixture(plain(rows)),g=fixture(plain(rows)),a=create(f),b=old(g),reference=f.basket;a.bindControls();b.bindControls();
 for(const [action,idx] of [['inc',0],['dec',0],['dec',1],['remove',0],['remove',0]]){
  const event={target:{closest:()=>({dataset:{action,idx:String(idx)}})}};
  await f.nodes['order-panel'].events.click(event);await g.nodes['order-panel'].events.click(event);
  assert.deepEqual(f.basket,g.basket);assert.equal(f.basket,reference);assert.deepEqual(plain(f.nodes),plain(g.nodes));assert.deepEqual(f.calls,g.calls);
 }
 assert.equal(f.nodes['order-total'].textContent,'£0.00');assert.deepEqual(f.calls.slice(-2),['rtk:basket-changed','discount']);
});
test('live basket replacement and unrelated clicks preserve existing behaviour',async()=>{
 const f=fixture(),a=create(f);a.bindControls();
 await f.nodes['order-panel'].events.click({target:{closest:()=>null}});assert.deepEqual(f.calls,[]);
 await f.nodes['order-panel'].events.click({target:{closest:()=>({dataset:{}})}});assert.deepEqual(f.calls,[]);
 f.basket=plain(rows);a.renderOrder();assert.equal(f.nodes['order-total'].textContent,'£20.00');
});
