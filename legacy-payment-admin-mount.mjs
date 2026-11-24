import {createLegacyPaymentDialog} from './legacy-payment-admin-dialog.mjs';

/**
 * Explicit opt-in integration point for the existing Admin order row.
 * The caller supplies the row's trusted order snapshot and a mount element.
 * No global listeners, automatic activation or production Admin injection.
 */
export async function mountLegacyPaymentControl({
 document,fetch,crypto,order,container,onRecorded
}){
 if(!container||!order?.id)throw Error('Order and mount container required');
 const button=document.createElement('button');
 button.type='button';
 button.textContent='Record LEGACY payment';
 button.disabled=true;
 const status=document.createElement('span');
 status.setAttribute('role','status');
 status.textContent='Checking LEGACY payment eligibility…';
 container.append(button,status);
 let eligible=false,dialog=null;
 try{
  const response=await fetch('/admin-api/legacy-payment-preflight',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({action:'read',orderId:order.id}),redirect:'error',
   signal:AbortSignal.timeout(25000)});
  const data=await response.json();
  if(!response.ok||data.success!==true||data.orderId!==order.id){
   status.textContent='LEGACY payment unavailable or not verified.';
   return {button,status,eligible:false};
  }
  if(data.methodUnknown||data.paid||data.payment){
   status.textContent='Payment needs review; recording is unavailable.';
   return {button,status,eligible:false};
  }
  eligible=true;
  button.disabled=false;
  status.textContent='LEGACY payment ready for review.';
 }catch(_){
  status.textContent='Could not verify payment eligibility.';
  return {button,status,eligible:false};
 }
 button.addEventListener('click',()=>{
  if(!eligible||dialog)return;
  dialog=createLegacyPaymentDialog({document,fetch,crypto,order,
   onRecorded:async result=>{
    eligible=false;button.disabled=true;
    status.textContent='Payment recorded. Refresh order details.';
    if(typeof onRecorded==='function')await onRecorded(result);
   }});
  dialog.open();
 });
 return {button,status,eligible};
}
