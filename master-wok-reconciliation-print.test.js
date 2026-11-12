const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
async function mount(){
 const fields={date:{value:'2026-11-12'},cash:{value:''}},elements=new Map(),listeners={},created=[],classes=new Set();
 const control=()=>({style:{},setAttribute(){},append(){},replaceChildren(){},querySelectorAll(){return [];}});
 const form={...control(),elements:fields,addEventListener(){}};
 for(const key of ['form','[role=status]','[data-print]','[data-preview]','[data-close]'])elements.set(key,key==='form'?form:control());
 const dialog={...control(),open:true,querySelector:key=>elements.get(key),close(){this.open=false;},showModal(){this.open=true;}};
 const doc={readyState:'complete',body:{append(){},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}},head:{append(){}},getElementById:()=>({parentElement:{prepend(){}}}),createElement:tag=>{const n=tag==='dialog'?dialog:control();created.push([tag,n]);return n;}};
 const model=require('./master-wok-reconciliation');
 const window={MasterWokReconciliation:model,MasterWokAdminClient:{loadOrders:async()=>({data:[]})},addEventListener:(name,handler)=>listeners[name]=handler,print(){listeners.beforeprint();}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/master-wok-reconciliation-admin.js','utf8'),{document:doc,location:{hostname:'preview.pages.dev'},window,fetch:async()=>({ok:true,json:async()=>({enabled:true})}),AbortSignal,console});
 await new Promise(resolve=>setImmediate(resolve));await form.onsubmit({preventDefault(){}});
 return {dialog,listeners,classes,window,button:elements.get('[data-print]'),root:created.find(([tag])=>tag==='section')[1],style:created.find(([tag])=>tag==='style')[1]};
}
test('receipt button prints a complete root while hiding the Admin modal and iframe',async()=>{
 const h=await mount();h.button.onclick();
 assert.equal(h.dialog.open,false);assert.equal(h.root.hidden,false);assert.equal(h.style.disabled,false);assert.ok(h.classes.has('rtk-eod-printing'));
 assert.match(h.root.innerHTML,/Rung’s Thai Kitchen/);assert.match(h.root.innerHTML,/END OF RECEIPT/);
 assert.ok(!h.root.innerHTML.includes('Build receipt'));assert.ok(!h.root.innerHTML.includes('<iframe'));
 assert.match(h.style.textContent,/> :not\(#rtk-eod-print\)\{display:none!important/);
 assert.match(h.style.textContent,/height:auto!important/);
 h.listeners.afterprint();assert.equal(h.dialog.open,true);assert.equal(h.root.hidden,true);assert.equal(h.style.disabled,true);assert.equal(h.classes.size,0);
});
test('browser Ctrl+P uses the same isolated output and cancel restores the form',async()=>{
 const h=await mount();h.listeners.beforeprint();assert.equal(h.dialog.open,false);assert.match(h.root.innerHTML,/END OF RECEIPT/);
 h.listeners.beforeprint();h.listeners.afterprint();assert.equal(h.dialog.open,true);assert.equal(h.classes.size,0);
});
test('print failure restores Admin and does not leave print CSS enabled',async()=>{
 const h=await mount();h.window.print=()=>{throw Error('Printer unavailable');};h.button.onclick();
 assert.equal(h.dialog.open,true);assert.equal(h.root.hidden,true);assert.equal(h.style.disabled,true);assert.equal(h.classes.size,0);
});
