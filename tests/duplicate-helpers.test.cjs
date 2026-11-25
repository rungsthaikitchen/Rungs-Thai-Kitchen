const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),e=require('../DUPLICATE-HELPERS-CLEANUP-2026-11-25.json');
const source=fs.readFileSync(require.resolve('../customer-menu-basket.js'),'utf8');
test('cleanup reverses exactly to the released bootstrap with no other edits',()=>{require('./duplicate-helpers-source.cjs').reconstructDuplicateHelpers();});
test('removed declarations were shadowed by the same canonical wrappers before and after cleanup',()=>{
 for(const r of e.regions){const pattern=new RegExp('function '+r.name+'\\(\\.\\.\\.args\\)\\{[^\\r\\n]+\\}'),wrapper=source.match(pattern)?.[0];assert.ok(wrapper);assert.equal([...source.matchAll(new RegExp('function '+r.name+'\\(','g'))].length,1);
 const calls=[];const delegate={};delegate[r.name]=(...args)=>{calls.push(args);return 'canonical-result';};const context={menuOverlayControls:delegate,customisationDialog:delegate};
 const old=vm.runInNewContext(r.before+'\n'+wrapper+'\n'+r.name,context),current=vm.runInNewContext(wrapper+'\n'+r.name,context);
 assert.equal(old('dish',2),'canonical-result');assert.equal(current('dish',2),'canonical-result');assert.deepEqual(calls,[['dish',2],['dish',2]]);assert.equal(old.toString(),current.toString());
 }
});
test('outer and inner order-type helpers remain because they occupy different scopes',()=>{assert.equal([...source.matchAll(/function getSelectedOrderType\(/g)].length,2);const boundary=source.indexOf("document.addEventListener('DOMContentLoaded'");assert.ok(source.indexOf('function getSelectedOrderType(')<boundary);assert.ok(source.lastIndexOf('function getSelectedOrderType(')>boundary);});
