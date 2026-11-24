const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create}=require('../customer-customisation-selectors'),catalogue=require('../customer-menu-catalogue'),e=require('../CUSTOMISATION-SELECTORS-EXTRACTION-2026-11-24.json');
class Element{constructor(){this.style={};this.children=[];this.dataset={};this.attributes={};this.textContent='';this.className='';this.classes=[];this.animations=0;this.classList={add:n=>this.classes.push(n),remove:n=>this.classes=this.classes.filter(x=>x!==n)};}set innerHTML(v){this.html=v;this.children=[];}appendChild(c){this.children.push(c);}querySelectorAll(){return this.children;}setAttribute(k,v){this.attributes[k]=v;}addEventListener(name,fn){this[name]=fn;}animate(){this.animations++;}}
function fixture(){
 const f={...catalogue.create(),modsEl:new Element(),selectedMods:new Set(),currentAllowedMods:null,currentRequires:false,currentMulti:false,currentMax:null,modRequiredNote:new Element(),modalAdd:{disabled:false},modLimitNote:new Element(),spiceWrap:new Element(),spiceButtons:new Element(),currentSpice:null,updates:0};
 f.document={createElement:()=>new Element(),getElementById:id=>f.spiceWrap.children.find(c=>c.id===id)};
 f.formatCurrency=n=>'£'+n.toFixed(2);f.updateUnitPricePreview=()=>f.updates++;return f;
}
const plain=x=>JSON.parse(JSON.stringify(x));
function old(f){return vm.runInNewContext(e.regions.map(r=>r.before).join('\n')+'\n({buildModifierChips,buildSpiceSelector})',f);}
function snapshot(f){return plain({mods:f.modsEl,selected:[...f.selectedMods],allowed:f.currentAllowedMods,required:f.currentRequires,multi:f.currentMulti,max:f.currentMax,note:f.modRequiredNote,limit:f.modLimitNote,add:f.modalAdd,spice:f.spiceButtons,wrap:f.spiceWrap,currentSpice:f.currentSpice,updates:f.updates});}
test('selector extraction reconstructs released menu bootstrap',()=>{require('./customisation-selectors-source.cjs').reconstructCustomisationSelectors();});
test('registration and factory creation have no DOM side effects',()=>{
 const blocked=()=>{throw Error('startup access');},window={};vm.runInNewContext(fs.readFileSync(require.resolve('../customer-customisation-selectors'),'utf8'),{window});create({document:new Proxy({},{get:blocked})});assert.equal(typeof window.RTKCustomisationSelectors.create,'function');
});
test('actual modifier selector preserves required choices, single/multiple selection, caps and toggles',()=>{
 for(const required of [false,true])for(const multi of [false,true])for(const max of [null,1,2]){
  const f=fixture(),g=fixture(),a=create(f),b=old(g);a.buildModifierChips(['chicken','prawn','tofu'],required,multi,max);b.buildModifierChips(['chicken','prawn','tofu'],required,multi,max);assert.deepEqual(snapshot(f),snapshot(g));
  for(const index of [0,1,0,1,2]){f.modsEl.children[index].click();g.modsEl.children[index].click();assert.deepEqual(snapshot(f),snapshot(g));if(f.currentMax)assert.ok(f.selectedMods.size<=f.currentMax);}
  a.buildModifierChips(null);b.buildModifierChips(null);assert.deepEqual(snapshot(f),snapshot(g));assert.equal(f.modsEl.style.display,'none');assert.equal(f.selectedMods.size,0);
 }
});
test('actual spice selector preserves default/minimum clamping, pressed state and note clearing',()=>{
 for(const enabled of [false,true])for(const level of [-1,0,1,3,9])for(const minimum of [0,1,3,9]){
  const f=fixture(),g=fixture(),a=create(f),b=old(g);a.buildSpiceSelector(enabled,level,minimum,'Chilli base');b.buildSpiceSelector(enabled,level,minimum,'Chilli base');assert.deepEqual(snapshot(f),snapshot(g));
  if(enabled){const index=f.spiceButtons.children.length-1;f.spiceButtons.children[index].click();g.spiceButtons.children[index].click();assert.deepEqual(snapshot(f),snapshot(g));assert.equal(f.currentSpice,3);}
  a.buildSpiceSelector(false);b.buildSpiceSelector(false);assert.deepEqual(snapshot(f),snapshot(g));assert.equal(f.currentSpice,null);
 }
});
