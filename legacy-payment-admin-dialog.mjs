/* Isolated LEGACY payment dialog. Not loaded by production Admin.
 * Caller must explicitly mount after checking LEGACY preflight and staff access.
 */
export function createLegacyPaymentDialog({document,fetch,crypto,order,onRecorded}){
 if(!order||typeof order.id!=='string')throw Error('Order required');
 const dialog=document.createElement('dialog');
 dialog.setAttribute('aria-label','Record LEGACY payment');
 const form=document.createElement('form');
 form.method='dialog';
 const heading=document.createElement('h2');heading.textContent='Record payment';
 const summary=document.createElement('p');
 summary.textContent='Order '+(order.order_ref||order.id)+' — total £'+String(order.total);
 const makeField=(label,name,type='text')=>{
  const wrap=document.createElement('label');wrap.textContent=label+' ';
  const input=document.createElement('input');input.name=name;input.type=type;input.required=true;
  wrap.append(input);form.append(wrap);return input;
 };
 const bill=makeField('Amount received (£)','billAmount');bill.value=Number(order.total).toFixed(2);
 const method=makeField('Payment method (cash, card or bank_transfer)','billMethod');
 const tip=makeField('Tip (£)','tipAmount');tip.value='0.00';
 const tipMethod=makeField('Tip method (cash, card or bank_transfer; blank if no tip)','tipMethod');tipMethod.required=false;
 const reason=makeField('Reason if amount differs from order total','differenceReason');reason.required=false;
 const status=document.createElement('p');status.setAttribute('role','status');
 const submit=document.createElement('button');submit.type='submit';submit.textContent='Confirm and record payment';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
 form.prepend(heading,summary);form.append(submit,cancel,status);dialog.append(form);
 let busy=false,key=null,submittedPayload=null;
 const fields=[bill,method,tip,tipMethod,reason];
 const lockFields=()=>fields.forEach(field=>{field.disabled=true});
 cancel.onclick=()=>{if(!busy)dialog.close()};
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const total=Number(order.total),amount=Number(bill.value),tipAmount=Number(tip.value);
  if(!Number.isFinite(amount)||!Number.isFinite(tipAmount)||amount<0||tipAmount<0){
   status.textContent='Enter valid non-negative amounts.';return;
  }
  if(!submittedPayload&&amount!==total&&!reason.value.trim()){
   status.textContent='Provide a reason for the difference.';return;
  }
  if(!['cash','card','bank_transfer'].includes(method.value)){
   status.textContent='Choose cash, card or bank_transfer.';return;
  }
  if(tipAmount>0&&!['cash','card','bank_transfer'].includes(tipMethod.value)){
   status.textContent='Choose a tip payment method.';return;
  }
  const payload=submittedPayload||{action:'record',orderId:order.id,idempotencyKey:key||(key=crypto.randomUUID()),
   billAmount:amount.toFixed(2),billMethod:method.value,tipAmount:tipAmount.toFixed(2),
   tipMethod:tipAmount>0?tipMethod.value:null,expectedTotal:total.toFixed(2),
   differenceReason:reason.value.trim()||null};
  submittedPayload=payload;
  lockFields(); // Unknown outcomes must retry the exact same payload and key.
  busy=true;submit.disabled=true;cancel.disabled=true;
  status.textContent='Recording payment…';
  try{
   const response=await fetch('/admin-api/legacy-payment-record',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),
    redirect:'error',signal:AbortSignal.timeout(25000)});
   const data=await response.json();
   if(!response.ok||data.success!==true){
    status.textContent='Payment not confirmed: '+(data.reason||data.error||'please check the order');
    return;
   }
   status.textContent=data.replayed?'Payment already recorded (verified retry).':'Payment recorded successfully.';
   submit.disabled=true;cancel.disabled=false;
   if(typeof onRecorded==='function')await onRecorded(data);
  }catch(_){
   status.textContent='Outcome unknown. Check the order before retrying; the same payment key will be reused.';
  }finally{busy=false;if(!status.textContent.includes('successfully')&&!status.textContent.includes('verified retry'))submit.disabled=false;cancel.disabled=false;}
 });
 return {dialog,open(){document.body.append(dialog);dialog.showModal()},close(){if(!busy)dialog.close()}};
}
