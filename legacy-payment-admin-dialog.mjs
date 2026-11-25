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
 const makeMethod=(label,name,required=true)=>{
  const wrap=document.createElement('label');wrap.textContent=label+' ';
  const select=document.createElement('select');select.name=name;select.required=required;
  for(const [value,text] of [['','Choose method'],['cash','Cash'],['card','Card'],['bank_transfer','Bank transfer']]){
   const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);
  }
  wrap.append(select);form.append(wrap);return select;
 };
 const method=makeMethod('Payment method','billMethod');
 const tip=makeField('Tip (£)','tipAmount');tip.value='0.00';
 const tipMethod=makeMethod('Tip method (if applicable)','tipMethod',false);
 const status=document.createElement('p');status.setAttribute('role','status');
 const submit=document.createElement('button');submit.type='submit';submit.textContent='Confirm and record payment';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
 form.prepend(heading,summary);form.append(submit,cancel,status);dialog.append(form);
 let busy=false,key=null,submittedPayload=null;
 const fields=[bill,method,tip,tipMethod];
 const lockFields=()=>fields.forEach(field=>{field.disabled=true});
 cancel.onclick=()=>{if(!busy)dialog.close()};
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const total=Number(order.total),amount=Number(bill.value),tipAmount=Number(tip.value);
  if(!Number.isFinite(amount)||!Number.isFinite(tipAmount)||amount<0||tipAmount<0||
     !/^\d+(?:\.\d{1,2})?$/.test(bill.value)||!/^\d+(?:\.\d{1,2})?$/.test(tip.value)){
   status.textContent='Enter valid non-negative amounts.';return;
  }
  if(!submittedPayload&&amount!==total){
   status.textContent='The bill must be paid in full. Enter the verified order total.';return;
  }
  if(!['cash','card','bank_transfer'].includes(method.value)){
   status.textContent='Choose cash, card or bank_transfer.';return;
  }
  if(tipAmount>0&&!['cash','card','bank_transfer'].includes(tipMethod.value)){
   status.textContent='Choose a tip payment method.';return;
  }
  if(tipAmount===0&&tipMethod.value){status.textContent='Clear the tip method when no tip is recorded.';return;}
  const payload=submittedPayload||{action:'record',orderId:order.id,idempotencyKey:key||(key=crypto.randomUUID()),
   billAmount:amount.toFixed(2),billMethod:method.value,tipAmount:tipAmount.toFixed(2),
   tipMethod:tipAmount>0?tipMethod.value:null,expectedTotal:total.toFixed(2),
   differenceReason:null};
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
    const reason=data.reason||data.error||'please check the order';
    status.textContent=reason==='INVALID_PAYMENT_DETAILS'
     ? 'Payment not recorded. The order total or payment details may have changed. Reload the order and run a fresh preflight before trying again.'
     : 'Payment not confirmed: '+reason+'. Review the order before retrying.';
    if(response.status>=400&&response.status<500){submit.disabled=true;}
    return;
   }
   status.textContent=data.replayed?'Payment already recorded (verified retry).':'Payment recorded successfully.';
   submit.disabled=true;cancel.disabled=false;
   // A successful server acknowledgement must never be reclassified as an
   // unknown payment outcome merely because the Admin refresh callback fails.
   if(typeof onRecorded==='function'){
    try{await onRecorded(data)}
    catch(_){status.textContent='Payment recorded. Admin refresh failed; reload the order manually.'}
   }
  }catch(_){
   status.textContent='Outcome unknown. Check the order before retrying; the same payment key will be reused.';
  }finally{busy=false;
   if(status.textContent.startsWith('Outcome unknown.')||status.textContent.includes('unavailable'))submit.disabled=false;
   cancel.disabled=false;}
 });
 return {dialog,hasSubmitted(){return submittedPayload!==null},open(){document.body.append(dialog);dialog.showModal()},close(){if(!busy)dialog.close()}};
}
