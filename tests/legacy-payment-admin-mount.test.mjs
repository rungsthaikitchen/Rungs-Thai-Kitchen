import test from 'node:test';
import assert from 'node:assert/strict';
import {mountLegacyPaymentControl} from '../legacy-payment-admin-mount.mjs';

class Element{
 constructor(tag){this.tag=tag;this.children=[];this.handlers={};this.disabled=false;this.value='';}
 append(...nodes){this.children.push(...nodes)}
 prepend(...nodes){this.children.unshift(...nodes)}
 setAttribute(name,value){this[name]=value}
 addEventListener(name,callback){this.handlers[name]=callback}
 showModal(){this.open=true}
 close(){this.open=false;this.handlers.close?.()}
}
function fixture(fetch){
 const document={body:new Element('body'),createElement:tag=>new Element(tag)};
 const container=new Element('div');
 return {document,container,fetch,crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000002'},
  order:{id:'00000000-0000-4000-8000-000000000001',total:'1.00',order_ref:'RTK-TEST'}};
}
test('feature disabled leaves payment control inaccessible',async()=>{
 const ui=fixture(async()=>Response.json({error:'disabled'},{status:503}));
 const result=await mountLegacyPaymentControl(ui);
 assert.equal(result.eligible,false);
 assert.equal(result.button.disabled,true);
 assert.equal(result.button.handlers.click,undefined);
});
test('already-paid order cannot open recording dialog',async()=>{
 const ui=fixture(async()=>Response.json({success:true,committed:false,paymentEvidenceChecked:true,orderId:ui.order.id,total:'32.50',paid:true,payment:null,methodUnknown:true}));
 const result=await mountLegacyPaymentControl(ui);
 assert.equal(result.button.disabled,true);
});
test('eligible order enables button only after preflight and uses verified total',async()=>{
 let preflightCount=0;
 const ui=fixture(async(url)=>{
  assert.equal(url,'/admin-api/legacy-payment-preflight');
  preflightCount++;
  return Response.json({success:true,committed:false,paymentEvidenceChecked:true,orderId:ui.order.id,total:'32.50',paid:false,payment:null,methodUnknown:false});
 });
 const result=await mountLegacyPaymentControl(ui);
 assert.equal(preflightCount,1);
 assert.equal(result.eligible,true);
 assert.equal(result.button.disabled,false);
 result.button.handlers.click();
 assert.equal(ui.document.body.children.length,1);
 const dialog=ui.document.body.children[0];
 assert.equal(dialog.open,true);
 const form=dialog.children[0];
 const input=form.children.flatMap(n=>n.children||[]).find(n=>n.name==='billAmount');
 assert.equal(input.value,'32.50');
});

test('missing explicit payment evidence verification blocks recording',async()=>{
 const ui=fixture(async()=>Response.json({
  success:true,committed:false,orderId:ui.order.id,total:'32.50',
  paid:false,payment:null,methodUnknown:false
 }));
 const result=await mountLegacyPaymentControl(ui);
 assert.equal(result.eligible,false);
 assert.equal(result.button.disabled,true);
 assert.match(result.status.textContent,/evidence could not be verified/i);
});

test('cancel before submission permits a fresh dialog',async()=>{
 const ui=fixture(async()=>Response.json({
  success:true,committed:false,paymentEvidenceChecked:true,orderId:ui.order.id,
  total:'32.50',paid:false,payment:null,methodUnknown:false
 }));
 const result=await mountLegacyPaymentControl(ui);
 result.button.handlers.click();
 const first=ui.document.body.children.at(-1);
 first.close();
 result.button.handlers.click();
 const second=ui.document.body.children.at(-1);
 assert.notEqual(first,second);
 assert.equal(second.open,true);
});

test('closing a submitted attempt preserves the dialog and its payment key',async()=>{
 const sent=[];
 const ui=fixture(async(url,options)=>{
  if(url.endsWith('preflight'))return Response.json({
   success:true,committed:false,paymentEvidenceChecked:true,orderId:ui.order.id,
   total:'32.50',paid:false,payment:null,methodUnknown:false
  });
  sent.push(options.body);
  throw Error('network uncertainty');
 });
 const result=await mountLegacyPaymentControl(ui);
 result.button.handlers.click();
 const first=ui.document.body.children.at(-1);
 const form=first.children[0];
 const find=(node,name)=>node.name===name?node:node.children.map(n=>find(n,name)).find(Boolean);
 find(form,'billMethod').value='card';
 await form.handlers.submit({preventDefault(){}});
 first.close();
 result.button.handlers.click();
 assert.equal(ui.document.body.children.at(-1),first);
 await form.handlers.submit({preventDefault(){}});
 assert.equal(sent.length,2);
 assert.equal(sent[0],sent[1]);
});

test('Admin defers the preflight to the first payment click and blocks concurrent clicks',async()=>{
 let requests=0;
 const ui=fixture(async()=>{
  requests++;
  if(requests===1)return Response.json({error:'busy'},{status:503});
  return Response.json({success:true,committed:false,paymentEvidenceChecked:true,
   orderId:ui.order.id,total:'32.50',paid:false});
 });
 const {button}=await mountLegacyPaymentControl({...ui,deferPreflight:true});
 assert.equal(requests,0);
 const first=button.handlers.click();
 await button.handlers.click();
 await first;
 assert.equal(requests,1);
 assert.equal(ui.document.body.children.length,0);
 await button.handlers.click();
 assert.equal(requests,2);
 assert.equal(ui.document.body.children.at(-1).open,true);
});
