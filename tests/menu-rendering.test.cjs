const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create}=require('../customer-menu-rendering'),catalogue=require('../customer-menu-catalogue'),e=require('../MENU-RENDERING-EXTRACTION-2026-11-24.json');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={};this.className='';this.classes=[];this.events={};this.html='';this.text='';this.value='';this.classList={add:name=>this.classes.push(name)};}
 set innerHTML(value){this.html=value;this.children=[];}get innerHTML(){return this.html;}
 set textContent(value){this.text=value;}get textContent(){return this.text+this.html.replace(/<[^>]+>/g,'')+this.children.map(c=>c.textContent).join('');}
 appendChild(child){this.children.push(child);}
 addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
 querySelectorAll(selector){return this.children.flatMap(c=>[...(selector==='.menu-item-card'&&c.className==='menu-item-card'?[c]:[]),...c.querySelectorAll(selector)]);}
}
function fixture(){
 const data=catalogue.create(),container=new Element('main'),search=new Element('input'),legacySearch=new Element('input'),clicked=[];
 return {...data,container,search,legacySearch,clicked,window:{ITEMS_BY_ID:new Map()},document:{getElementById:id=>id==='menu-list'?container:id==='menu-search-input'?search:id==='menu-search'?legacySearch:null,createElement:tag=>new Element(tag),querySelectorAll:selector=>selector.endsWith('.popup-category')?container.children:container.querySelectorAll('.menu-item-card')},formatCurrency:n=>'£'+n.toFixed(2),openCustomise:id=>clicked.push(id)};
}
function old(f){return vm.runInNewContext(e.regions.filter(r=>r.name!=='bindSearch').map(r=>r.before).join('\n')+'\n({buildMenu,filterMenu,bindSearch(){'+e.regions.find(r=>r.name==='bindSearch').before+'}})',f);}
const plain=x=>JSON.parse(JSON.stringify(x));
function snapshot(f){return plain({container:f.container,map:[...f.window.ITEMS_BY_ID]});}
test('menu rendering extraction reconstructs the released menu bootstrap',()=>{require('./menu-rendering-source.cjs').reconstructMenuRendering();});
test('registration and factory creation have no DOM or listener effects',()=>{
 const blocked=()=>{throw Error('startup access');},window={};vm.runInNewContext(fs.readFileSync(require.resolve('../customer-menu-rendering'),'utf8'),{window});create({window,document:new Proxy({},{get:blocked})});assert.equal(typeof window.RTKMenuRendering.create,'function');
});
test('actual renderer preserves every card, category, order, dataset and customisation lookup',()=>{
 const f=fixture(),g=fixture(),a=create(f),b=old(g);a.buildMenu();b.buildMenu();assert.deepEqual(snapshot(f),snapshot(g));
 assert.equal(f.window.ITEMS_BY_ID.size,f.MENU_CATEGORIES.reduce((n,c)=>n+c.items.length,0));
 a.buildMenu();b.buildMenu();assert.deepEqual(snapshot(f),snapshot(g));assert.equal(f.container.events.click.length,1);
 f.container.events.click[0]({target:{closest:()=>({getAttribute:()=> 'salt-chickenchips'})}});assert.deepEqual(f.clicked,['salt-chickenchips']);
 f.openCustomise=id=>f.clicked.push('latest:'+id);f.container.events.click[0]({target:{closest:()=>({getAttribute:()=> 'jasmine-rice'})}});assert.equal(f.clicked[1],'latest:jasmine-rice');
});
test('category-aware search matches released filtering and clears after no matches',()=>{
 const f=fixture(),g=fixture(),a=create(f),b=old(g);a.buildMenu();b.buildMenu();
 for(const query of ['RICE','  salt & pepper  ','no such dish','']){a.filterMenu(query);b.filterMenu(query);assert.deepEqual(snapshot(f),snapshot(g));}
 assert.ok(f.container.children.every(c=>c.style.display===''));
});
test('both existing search inputs retain their event behaviour',()=>{
 const f=fixture(),g=fixture(),a=create(f),b=old(g);a.buildMenu();b.buildMenu();a.bindSearch();b.bindSearch();
 for(const name of ['legacySearch','search'])for(const value of ['chicken','zzzzzz','']){
  f[name].value=g[name].value=value;f[name].events.input[0]();g[name].events.input[0]();assert.deepEqual(snapshot(f),snapshot(g));
 }
});
