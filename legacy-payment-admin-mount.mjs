import {createLegacyPaymentDialog} from './legacy-payment-admin-dialog.mjs?v=complete-order-20261126';

/**
 * Explicit opt-in integration point for the existing Admin order row.
 * The caller supplies the row's trusted order snapshot and a mount element.
 * No global listeners, automatic activation or production Admin injection.
 */
export async function mountLegacyPaymentControl({
 document,fetch,crypto,order,container,onRecorded,onComplete,deferPreflight=false
}){
 if(!container||!order?.id)throw Error('Order and mount container required');
 const button=document.createElement('button');
 button.type='button';
 button.textContent='Record LEGACY payment';
 button.disabled=!deferPreflight;
 const status=document.createElement('span');
 status.setAttribute('role','status');
 status.textContent=deferPreflight?'':'Checking LEGACY payment eligibility…';
 container.append(button,status);
 let eligible=false,dialog=null,verifiedOrder=null;
 async function preflight(){
  button.disabled=true;
  status.textContent='Checking LEGACY payment eligibility…';
  try{
   const response=await fetch('/admin-api/legacy-payment-preflight',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'read',orderId:order.id}),redirect:'error',
    signal:AbortSignal.timeout(25000)});
   const data=await response.json();
   if(!response.ok||data.success!==true||data.orderId!==order.id){
    status.textContent='LEGACY payment unavailable or not verified.';
    return false;
   }
   if(data.methodUnknown||data.paid||data.payment){
    status.textContent='Payment needs review; recording is unavailable.';
    return false;
   }
   if(data.paymentEvidenceChecked !== true || data.committed !== false){
    status.textContent='Payment evidence could not be verified.';
    return false;
   }
   if(!/^\d+(?:\.\d{1,2})?$/.test(String(data.total))){
    status.textContent='Order total could not be verified.';
    return false;
   }
   verifiedOrder={...order,total:data.total,status:data.status};
   eligible=true;
   button.disabled=false;
   status.textContent='LEGACY payment ready for review.';
   return true;
  }catch(_){
   status.textContent='Could not verify payment eligibility.';
   return false;
  }
 }
 if(!deferPreflight&&!await preflight())return {button,status,eligible:false};
 button.addEventListener('click',async()=>{
  if(button.disabled)return;
  if(!eligible&&!await preflight()){button.disabled=false;return;}
  // Reopen a submitted attempt with its original key, never generate another.
  if(dialog){dialog.open();return;}
  dialog=createLegacyPaymentDialog({document,fetch,crypto,order:verifiedOrder,
   onComplete:!order.is_test&&['accepted','confirmed','customer_accepted_time'].includes(verifiedOrder.status)
    ? onComplete : undefined,
   onRecorded:async result=>{
    eligible=false;button.disabled=true;
    status.textContent='Payment recorded. Refresh order details.';
    if(typeof onRecorded==='function')await onRecorded(result);
   }});
  // Discard an unsubmitted cancellation; retain submitted attempts and their
  // idempotency keys across close/reopen, including uncertain outcomes.
  const current=dialog;
  current.dialog.addEventListener('close',()=>{
   if(dialog===current && !current.hasSubmitted())dialog=null;
  });
  current.open();
 });
 return {button,status,eligible};
}
