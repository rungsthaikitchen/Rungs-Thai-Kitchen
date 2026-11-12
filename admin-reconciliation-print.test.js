const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
test('print page opens dialogue automatically after layout and closes after print/cancel',async()=>{
 const handlers={},events=[],nodes=Object.fromEntries(['print-status','print-retry','receipt'].map(k=>[k,{}])),messages=[];
 const parent={postMessage:(data,origin)=>messages.push({data,origin})};
 const api=require('./master-wok-reconciliation');
 const window={MasterWokReconciliation:api,opener:parent,addEventListener:(name,fn)=>handlers[name]=fn,requestAnimationFrame:fn=>{events.push('layout');fn();},focus(){},print(){events.push('print');},close(){events.push('close');}};
 const document={readyState:'complete',head:{append(){}},createElement:()=>({}),getElementById:id=>nodes[id],fonts:{ready:Promise.resolve()}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/admin-reconciliation-print.js','utf8'),{window,document,location:{origin:'https://preview.pages.dev'}});
 assert.equal(messages[0].data.type,'rtk-eod-print-ready');
 const report=api.buildReport({date:'2026-11-12',orders:[],payments:[]});
 await handlers.message({origin:'https://wrong.example',source:parent,data:{type:'rtk-eod-print-report',report}});
 assert.equal(events.length,0);
 await handlers.message({origin:'https://preview.pages.dev',source:parent,data:{type:'rtk-eod-print-report',report}});
 assert.deepEqual(events,['layout','layout','print']);assert.match(nodes.receipt.innerHTML,/END OF RECEIPT/);
 handlers.afterprint();assert.equal(events.at(-1),'close');assert.equal(messages.at(-1).data.type,'rtk-eod-print-finished');
});
