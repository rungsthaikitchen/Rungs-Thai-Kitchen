const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create}=require('../customer-menu-catalogue'),e=require('../MENU-CATALOGUE-EXTRACTION-2026-11-24.json');
const plain=x=>JSON.parse(JSON.stringify(x));
const previous=()=>vm.runInNewContext(e.block+'\n({ALLERGENS,EXTRAS,MENU_CATEGORIES,MODIFIERS,normalizeAllergens,renderAllergenIconsCompact,renderAllergenBadges})');
test('catalogue extraction reconstructs complete released menu script',()=>{require('./catalogue-source.cjs').reconstructCatalogue();});
test('all dishes, prices, modifiers, extras, allergens and spice rules match released catalogue',()=>{
 const actual=create(),old=previous();for(const name of ['ALLERGENS','EXTRAS','MENU_CATEGORIES','MODIFIERS'])assert.deepEqual(plain(actual[name]),plain(old[name]));
 for(const id of ['salt-chicken','salt-chips','salt-chickenchips']){
  const item=actual.MENU_CATEGORIES.flatMap(c=>c.items).find(i=>i.id===id);assert.ok(item,'known chilli-base dish '+id);assert.equal(item.spiceMin,1);
 }
});
test('actual allergen helpers preserve normalization, aliases, deduplication and unknown-key handling',()=>{
 const actual=create(),old=previous();for(const list of [undefined,[],['nuts'],['nuts','peanuts','tree_nuts','egg'],['unknown'],Object.keys(actual.ALLERGENS)]){
  for(const fn of ['normalizeAllergens','renderAllergenIconsCompact','renderAllergenBadges'])assert.deepEqual(plain(actual[fn](list)),plain(old[fn](list)));
 }
});
test('catalogue registration and creation perform no DOM or network work and return independent data',()=>{
 const blocked=()=>{throw Error('startup side effect');},window={};
 vm.runInNewContext(fs.readFileSync(require.resolve('../customer-menu-catalogue'),'utf8'),{window,document:new Proxy({},{get:blocked}),fetch:blocked});assert.equal(typeof window.RTKMenuCatalogue.create,'function');
 const a=create(),b=create();a.MENU_CATEGORIES[0].items[0].price=999;a.MODIFIERS[0].delta=999;
 assert.notEqual(a.MENU_CATEGORIES[0].items[0].price,b.MENU_CATEGORIES[0].items[0].price);assert.notEqual(a.MODIFIERS[0].delta,b.MODIFIERS[0].delta);
});
