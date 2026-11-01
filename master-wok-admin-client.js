(function(root){
 'use strict';
 function createClient({fetch=root.fetch.bind(root),hostname=root.location?.hostname??null}={}){
  async function mode(){
   const response=await fetch('/api/booking-mode',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(17000)});
   const data=await response.json();
   if(!response.ok||!['LEGACY','MASTER_WOK'].includes(data.mode))throw Error('Order actions are temporarily unavailable. Please try again.');
   if(data.mode==='LEGACY'&&hostname!==null&&!['rungsthaikitchen.co.uk','www.rungsthaikitchen.co.uk','localhost','127.0.0.1','::1'].includes(hostname))
    throw Error('Preview admin changes are disabled until the staging booking service is ready.');
   return data.mode;
  }
  async function post(payload,selected){
   const response=await fetch('/admin-api/order-action',{method:'POST',redirect:'error',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
   const data=await response.json();
   if(!response.ok||data.success!==true)throw Error(data.error||data.reason||'Could not update the order. Please refresh before retrying.');
   // The authoritative lifecycle queues notifications in the same transaction.
   // Do not send a second notification from the old browser action handler.
   if(selected==='MASTER_WOK'&&data.notification_managed!==true)
    throw Error('Order response could not be verified. Please refresh before retrying.');
   return {...data,notification_managed:data.notification_managed===true};
  }
  return {mode,submit:async payload=>post(payload,await mode()),
   async updateStatus(orderId,status){
    const selected=await mode();
    if(selected==='LEGACY')return false;
    await post({orderId,action:status==='completed'?'complete':'set_status',status},selected);
    return true;
   }};
 }
 const api={createClient};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.MasterWokAdminClient=createClient();
})(typeof globalThis!=='undefined'?globalThis:this);
