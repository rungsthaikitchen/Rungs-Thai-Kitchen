const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../customer-menu-basket.js'), 'utf8');
const menu = require('../customer-menu-catalogue').create().MENU_CATEGORIES;
const items = menu.flatMap(category => category.items);
function selector() {
 const elements = {};
 function element() { return { style: {}, children: [], classList: {add(){},remove(){}}, setAttribute(){}, addEventListener(event, fn){this.click=fn;}, appendChild(child){this.children.push(child);if(child.id)elements[child.id]=child;}, querySelectorAll(){return this.children;}, set innerHTML(value){this.children=[];} }; }
 const context = {document:{getElementById:id=>elements[id],createElement:element},spiceWrap:element(),spiceButtons:element(),currentSpice:null};
 vm.createContext(context);
 const start = source.indexOf('function buildSpiceSelector(');
 vm.runInContext(source.slice(start, source.indexOf('function closeModal()', start)), context);
 return context;
}
test('all six restricted dishes offer mild or hotter and explain the heat', () => {
 for (const id of ['stir-crispy','stir-basil','pad-kee-mao','salt-chicken','salt-chickenchips','salt-chips']) {
  const item=items.find(item=>item.id===id), c=selector();
  assert.equal(item.spiceMin,1,id);
  c.buildSpiceSelector(true,0,item.spiceMin,item.spiceNote);
  assert.equal(c.currentSpice,1,id);
  assert.deepEqual(c.spiceButtons.children.map(b=>b.textContent),['Mild 🌶️','Medium 🌶️🌶️','Very spicy 🌶️🌶️🌶️']);
  assert.match(c.document.getElementById('spice-note').textContent,/cannot be made completely non-spicy/);
  c.spiceButtons.children[2].click();assert.equal(c.currentSpice,3);
  c.buildSpiceSelector(true,0);
  assert.equal(c.spiceButtons.children[0].textContent,'No spice');
  assert.equal(c.currentSpice,0);
  assert.equal(c.document.getElementById('spice-note').hidden,true);
  c.buildSpiceSelector(false);assert.equal(c.currentSpice,null);assert.equal(c.spiceWrap.style.display,'none');
 }
});
