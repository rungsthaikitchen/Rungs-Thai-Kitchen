const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('print waits for layout and sizes paper to include the complete receipt',async()=>{
 const events=[],fields={date:{value:'2026-11-12'},cash:{value:''}},elements=new Map();
 const control=()=>({style:{},setAttribute(){},append(){},replaceChildren(){},querySelectorAll(){return [];}});
 const form={...control(),elements:fields,addEventListener(){}};
 for(const key of ['form','[role=status]','[data-print]','[data-preview]','[data-close]'])elements.set(key,key==='form'?form:control());
 const dialog={...control(),querySelector:key=>elements.get(key)};
 const doc={readyState:'complete',body:{append(){}},getElementById:()=>({parentElement:{prepend(){}}}),createElement:tag=>tag==='dialog'?dialog:control()};
 let paper='';const popupDoc={fonts:{ready:Promise.resolve().then(()=>events.push('fonts'))},open(){},write(html){assert.ok(html.includes('END OF RECEIPT'));},close(){},querySelector(){return {getBoundingClientRect(){events.push('measure');return {height:1400};}};},createElement(){return {};},head:{append(style){paper=style.textContent;events.push('paper');}}};
 const popup={document:popupDoc,requestAnimationFrame(callback){events.push('frame');callback();},focus(){},print(){events.push('print');}};
 const model=require('./master-wok-reconciliation');
 const context={document:doc,location:{hostname:'preview.pages.dev'},window:{MasterWokReconciliation:model,MasterWokAdminClient:{loadOrders:async()=>({data:[]})},open:()=>popup},fetch:async()=>({ok:true,json:async()=>({enabled:true})}),AbortSignal,console};
 vm.runInNewContext(fs.readFileSync(__dirname+'/master-wok-reconciliation-admin.js','utf8'),context);
 // Allow async capability gating to finish before invoking the mounted form.
 await new Promise(resolve=>setImmediate(resolve));
 await form.onsubmit({preventDefault(){}});
 await elements.get('[data-print]').onclick();
 assert.match(paper,/@page\{size:80mm 381mm;margin:3mm\}/);
 assert.deepEqual(events.filter(x=>x!=='fonts'),['frame','frame','measure','paper','print']);
 assert.ok(events.indexOf('fonts')<events.indexOf('measure'));
});
