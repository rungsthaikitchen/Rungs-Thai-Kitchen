const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {create}=require('../customer-customisation-dialog'),e=require('../CUSTOMISATION-DIALOG-EXTRACTION-2026-11-25.json');
const plain=x=>JSON.parse(JSON.stringify(x));
function element(){return {style:{},dataset:{},textContent:'',innerHTML:'',value:'1',src:'',listeners:{},addEventListener(k,fn){this.listeners[k]=fn;},removeAttribute(k){delete this[k];}};}
function fixture(item){
 const f={calls:[],basket:[],currentItem:null,selectedMods:new Set(['old']),selectedExtras:[{id:'old'}],currentAllowExtras:true,currentAllowedMods:['old'],currentSpice:2,MODIFIERS:[{id:'chicken',name:'Chicken',delta:1}],window:{ITEMS_BY_ID:new Map([['dish',item]])}};
 for(const k of ['modal','modalTitle','modalBase','qtyInput','modalImg','modalAll','modalAllWrap'])f[k]=element();
 f.nodes={'qty-incr':element(),'qty-decr':element(),'modal-close':element(),'modal-cancel':element(),'modal-add':element()};f.document={getElementById:id=>f.nodes[id]};
 f.console={warn:(...a)=>f.calls.push(['warn',...a]),error:(...a)=>f.calls.push(['error',...a])};
 for(const fn of e.functions)f[fn]=(...a)=>{f.calls.push([fn,...a]);if(fn==='formatCurrency')return '£'+a[0].toFixed(2);if(fn==='roundToTwo')return Math.round(a[0]*100)/100;if(fn==='renderAllergenBadges')return a[0].join(',');};return f;
}
function old(f){return vm.runInNewContext(e.regions.filter(r=>r.name!=='bindControls').map(r=>r.before).join('\n')+'\nfunction bindControls(){'+e.regions.find(r=>r.name==='bindControls').before+'}\n({openCustomiseById,closeModal,bindControls})',f);}
function snapshot(f){return plain({calls:f.calls,basket:f.basket,currentItem:f.currentItem,mods:[...f.selectedMods],extras:f.selectedExtras,allow:f.currentAllowExtras,allowed:f.currentAllowedMods,modal:f.modal,title:f.modalTitle,base:f.modalBase,qty:f.qtyInput,img:f.modalImg,all:f.modalAll,wrap:f.modalAllWrap});}
function pair(item){const a=fixture(item),b=fixture(item);return {a,b,x:create(a),y:old(b)};}
test('dialog extraction reconstructs released bootstrap and registration has no DOM effects',()=>{
 require('./customisation-dialog-source.cjs').reconstructCustomisationDialog();const window={};vm.runInNewContext(fs.readFileSync(require.resolve('../customer-customisation-dialog'),'utf8'),{window});create({document:new Proxy({},{get(){throw Error('startup DOM access');}})});assert.equal(typeof window.RTKCustomisationDialog.create,'function');
});
test('actual dialog opener preserves resets, extras policies, image/allergen branches and selector inputs',()=>{
 for(const extras of [undefined,[],['prawn']])for(const decorated of [false,true]){
 const item={id:'dish',name:'Dish',price:8,allowedModifiers:['chicken'],modifierRequired:true,modifierMax:1,categoryAllowedExtras:true,spiceEnabled:true,spiceDefault:1,spiceMin:1,spiceNote:'Chilli base',...(extras===undefined?{}:{allowedExtras:extras}),...(decorated?{img:'dish.png',allergens:['soya']}:{})};
 const {a,b,x,y}=pair(item);x.openCustomiseById('dish');y.openCustomiseById('dish');assert.deepEqual(snapshot(a),snapshot(b));assert.equal(a.qtyInput.value,1);assert.equal(a.modal.style.display,'flex');assert.equal(a.selectedMods.size,0);assert.deepEqual(a.selectedExtras,[]);x.closeModal();y.closeModal();assert.deepEqual(snapshot(a),snapshot(b));assert.equal(a.currentItem,null);assert.equal(a.modal.style.display,'none');
 }
});
test('actual bound controls preserve quantity floor, basket payload, callback order and dismiss paths',()=>{
 const {a,b,x,y}=pair({id:'dish',name:'Dish',price:8});x.bindControls();y.bindControls();x.openCustomiseById('dish');y.openCustomiseById('dish');
 for(const id of ['qty-decr','qty-incr','qty-incr']){a.nodes[id].listeners.click();b.nodes[id].listeners.click();assert.deepEqual(snapshot(a),snapshot(b));}assert.equal(a.qtyInput.value,3);
 for(const f of [a,b]){f.selectedMods.add('chicken');f.selectedExtras=[{id:'prawn',name:'Prawn',delta:3}];f.currentAllowExtras=true;}
 a.nodes['modal-add'].listeners.click();b.nodes['modal-add'].listeners.click();assert.deepEqual(snapshot(a),snapshot(b));assert.equal(a.basket.length,1);assert.equal(a.basket[0].unitPrice,12);assert.equal(a.basket[0].qty,3);assert.equal(a.basket[0].spice,2);assert.deepEqual(a.calls.slice(-2).map(x=>x[0]),['renderOrder','refreshAppliedDiscountCode']);
 for(const id of ['modal-close','modal-cancel']){x.openCustomiseById('dish');y.openCustomiseById('dish');a.nodes[id].listeners.click();b.nodes[id].listeners.click();assert.deepEqual(snapshot(a),snapshot(b));}
 x.openCustomiseById('dish');y.openCustomiseById('dish');a.modal.listeners.click({target:a.modalTitle});b.modal.listeners.click({target:b.modalTitle});assert.equal(a.modal.style.display,'flex');a.modal.listeners.click({target:a.modal});b.modal.listeners.click({target:b.modal});assert.deepEqual(snapshot(a),snapshot(b));assert.equal(a.modal.style.display,'none');
});
test('unknown dish and add without current item preserve released refusal behaviour',()=>{
 const {a,b,x,y}=pair({id:'dish',name:'Dish',price:8});x.openCustomiseById('missing');y.openCustomiseById('missing');x.bindControls();y.bindControls();a.nodes['modal-add'].listeners.click();b.nodes['modal-add'].listeners.click();assert.deepEqual(snapshot(a),snapshot(b));assert.equal(a.basket.length,0);
});

test('Escape closes child then parent and restores keyboard focus in order', () => {
 const f = fixture({id: 'dish', name: 'Dish', price: 8});
 const listeners = [];
 const focusable = () => ({focus() { f.document.activeElement = this; }});
 const menuLink = focusable();
 const dishButton = focusable();
 f.nodes['modal-close'] = focusable();
 f.nodes.modal = f.modal;
 f.document.addEventListener = (type, fn) => listeners.push(fn);
 const classes = new Set();
 const classList = {contains: name => classes.has(name), add: name => classes.add(name), remove: name => classes.delete(name)};
 f.document.body = {style: {}, classList};
 f.menuOverlay = {classList, addEventListener() {}, setAttribute() {}};
 f.menuClose = {...focusable(), addEventListener() {}};
 const menu = require('../customer-menu-overlay').create(f);
 const dish = create(f);
 f.closeModal = dish.closeModal;

 menu.bindEarly();
 require('../customer-interactions').create(f).bindEscape();
 menu.bindLate();
 menu.openMenuOverlay(menuLink);
 dishButton.focus();
 dish.openCustomiseById('dish');
 dish.openCustomiseById('dish');
 assert.equal(f.document.activeElement, f.nodes['modal-close']);

 const escape = (repeat = false) => {
  const event = {key: 'Escape', repeat, preventDefault() { this.defaultPrevented = true; }};
  listeners.forEach(listener => listener(event));
 };
 escape();
 assert.equal(f.modal.style.display, 'none');
 assert.ok(classes.has('show'));
 assert.equal(f.document.activeElement, dishButton);
 escape(true);
 assert.ok(classes.has('show'));
 escape();
 assert.ok(!classes.has('show'));
 assert.equal(f.document.activeElement, menuLink);
});
