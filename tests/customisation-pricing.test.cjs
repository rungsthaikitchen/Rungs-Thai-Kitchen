const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create}=require('../customer-customisation-pricing'),catalogue=require('../customer-menu-catalogue'),e=require('../CUSTOMISATION-PRICING-EXTRACTION-2026-11-24.json');
class Element{constructor(){this.style={};this.children=[];this.textContent='';this.classes=[];this.classList={add:name=>this.classes.push(name)};}set innerHTML(value){this.children=[];}appendChild(child){this.children.push(child);}addEventListener(name,fn){this[name]=fn;}}
function fixture(){return {...catalogue.create(),document:{createElement:()=>new Element()},selectedExtras:[],currentAllowExtras:true,selectedMods:new Set(),extrasWrap:new Element(),extrasEl:new Element(),modalBase:{dataset:{price:'8'}},unitPriceEl:{textContent:''},formatCurrency:n=>'£'+(Math.round((n+Number.EPSILON)*100)/100).toFixed(2),roundToTwo:n=>Math.round((n+Number.EPSILON)*100)/100};}
const plain=x=>JSON.parse(JSON.stringify(x));
function old(f){return vm.runInNewContext(e.regions.map(r=>r.before).join('\n')+'\n({sumExtras,buildExtraChips,handleExtraClick,updateUnitPricePreview})',f);}
function snapshot(f){return plain({wrap:f.extrasWrap,chips:f.extrasEl,price:f.unitPriceEl,selected:f.selectedExtras});}
test('customisation pricing extraction reconstructs released menu bootstrap',()=>{require('./customisation-pricing-source.cjs').reconstructCustomisationPricing();});
test('registration and factory creation perform no DOM work',()=>{
 const blocked=()=>{throw Error('startup access');},window={};vm.runInNewContext(fs.readFileSync(require.resolve('../customer-customisation-pricing'),'utf8'),{window});create({document:new Proxy({},{get:blocked})});assert.equal(typeof window.RTKCustomisationPricing.create,'function');
});
test('actual extra chips and unit prices match released modifier/extra combinations',()=>{
 for(const allowed of [false,true,[],['extra-chicken'],['unknown']])for(const mods of [[],['chicken'],['prawn','fried-egg'],['unknown']])for(const extras of [[],[{id:'extra-beef',name:'Extra Beef',delta:2.5}]]){
  const f=fixture(),g=fixture();f.currentAllowExtras=g.currentAllowExtras=allowed;f.selectedMods=g.selectedMods=new Set(mods);f.selectedExtras=plain(extras);g.selectedExtras=plain(extras);
  const a=create(f),b=old(g);a.buildExtraChips();b.buildExtraChips();a.updateUnitPricePreview();b.updateUnitPricePreview();assert.deepEqual(snapshot(f),snapshot(g));assert.equal(a.sumExtras(),b.sumExtras());
 }
 const f=fixture();f.selectedMods.add('chicken');f.selectedExtras=[f.EXTRAS.find(x=>x.id==='extra-prawn')];create(f).updateUnitPricePreview();assert.equal(f.unitPriceEl.textContent,'£12.00');
});
test('extra click selects one option, replaces it and deselects on repeat with live price updates',()=>{
 const f=fixture(),g=fixture(),a=create(f),b=old(g);a.buildExtraChips();b.buildExtraChips();
 for(const index of [0,1,1]){f.extrasEl.children[index].click();g.extrasEl.children[index].click();assert.deepEqual(snapshot(f),snapshot(g));assert.ok(f.selectedExtras.length<=1);}
 assert.equal(f.selectedExtras.length,0);assert.equal(f.unitPriceEl.textContent,'£8.00');
 f.currentAllowExtras=false;a.updateUnitPricePreview();a.buildExtraChips();assert.equal(f.extrasWrap.style.display,'none');
 f.modalBase.dataset.price='9.005';f.currentAllowExtras=true;f.selectedMods=new Set(['beef']);a.updateUnitPricePreview();assert.equal(f.unitPriceEl.textContent,'£10.51');
 f.extrasWrap=null;assert.doesNotThrow(a.buildExtraChips);
});
