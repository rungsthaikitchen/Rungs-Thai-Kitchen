import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyPaymentDialog} from '../legacy-payment-admin-dialog.mjs';

class Element{
 constructor(tag){this.tag=tag;this.children=[];this.handlers={};this.value='';this.disabled=false;}
 append(...children){this.children.push(...children)}
 prepend(...children){this.children.unshift(...children)}
 setAttribute(name,value){this[name]=value}
 addEventListener(name,fn){this.handlers[name]=fn}
 showModal(){this.open=true}
 close(){this.open=false}
}
function fixture(fetch){
 const body=new Element('body');
 const document={body,createElement:tag=>new Element(tag)};
 const dialog=createLegacyPaymentDialog({document,fetch,crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000002'},
  order:{id:'00000000-0000-4000-8000-000000000001',order_ref:'RTK-TEST',total:'32.50'}});
 const form=dialog.dialog.children[0];
 const find=name=>{
  const scan=node=>node.name===name?node:node.children.map(scan).find(Boolean);
  return scan(form);
 };
 const submit=()=>form.handlers.submit({preventDefault(){}});
 return {dialog,form,find,submit};
}
test('selects payment method and sends trusted payment fields',async()=>{
 let payload;
 const ui=fixture(async(_url,options)=>{
  payload=JSON.parse(options.body);
  return Response.json({success:true,committed:true});
 });
 ui.find('billMethod').value='card';
 ui.find('tipAmount').value='2.00';
 ui.find('tipMethod').value='cash';
 await ui.submit();
 assert.equal(payload.billAmount,'32.50');
 assert.equal(payload.billMethod,'card');
 assert.equal(payload.tipAmount,'2.00');
 assert.equal(payload.tipMethod,'cash');
 assert.equal(payload.staffActor,undefined);
});
test('invalid money or missing method never calls API',async()=>{
 let calls=0;
 const ui=fixture(async()=>{calls++;return Response.json({success:true})});
 ui.find('billAmount').value='32.501';
 await ui.submit();
 assert.equal(calls,0);
 ui.find('billAmount').value='32.50';
 await ui.submit();
 assert.equal(calls,0);
});
test('network uncertainty retains identical payload and idempotency key',async()=>{
 const sent=[];let count=0;
 const ui=fixture(async(_url,options)=>{
  sent.push(options.body);
  if(++count===1)throw Error('network lost');
  return Response.json({success:true,replayed:true,committed:false});
 });
 ui.find('billMethod').value='cash';
 await ui.submit();
 assert.equal(ui.find('billAmount').disabled,true);
 await ui.submit();
 assert.equal(sent.length,2);
 assert.equal(sent[0],sent[1]);
});
test('a definitive conflict blocks another submission',async()=>{
 let count=0;
 const ui=fixture(async()=>{count++;return Response.json({success:false,reason:'PAYMENT_ALREADY_RECORDED'},{status:409})});
 ui.find('billMethod').value='card';
 await ui.submit();
 assert.equal(count,1);
 const button=ui.form.children.find(n=>n.tag==='button'&&n.type==='submit');
 assert.equal(button.disabled,true);
});
