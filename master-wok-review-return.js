(function(root){
 'use strict';
 let restoreGeneration=0;
 async function restore(){
  const token=new URLSearchParams(location.hash.slice(1)).get('basket-review');
  if(!token)return;
  const generation=++restoreGeneration;
  root.RTKApprovedReview=null;
  // Do not leak the capability into later navigation, screenshots or referrers.
  history.replaceState(null,'',location.pathname+location.search);
  document.querySelector('[data-review-checkout-notice]')?.remove();
  const notice=document.createElement('section');notice.dataset.reviewCheckoutNotice='true';notice.style.cssText='margin:20px;padding:20px;border:2px solid #69415d;border-radius:12px;background:#fff;color:#222';
  notice.setAttribute('role','status');document.querySelector('main').prepend(notice);
  try{
   if(!/^[a-f0-9]{64}$/.test(token)||localStorage.getItem('rtk_master_wok_pending_checkout'))
    throw Error('An earlier checkout needs checking. Please contact the restaurant before continuing.');
   const response=await fetch('/api/basket-review',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'approval_lookup',token}),redirect:'error',signal:AbortSignal.timeout(15000)});
   const data=await response.json();if(generation!==restoreGeneration)return;if(!response.ok||!data.success||!data.review)throw Error('This agreed-time link is invalid or expired. Please contact the restaurant.');
   if(!root.RTKRestoreReviewedBasket(data.review.items))throw Error('Your current basket was kept. Reopen the agreed-time link when ready.');
   document.getElementById('order-success-close')?.click();
   document.getElementById('review-holding-ack')?.closest('label')?.remove();
   root.RTKApprovedReview={...data.review,token};
   notice.textContent='The restaurant has allowed checkout for this basket at the agreed time. It is not yet booked: current capacity and prices will be checked on submission.';
   await root.RTKOpenReviewedCheckout();
   for(const [id,value] of [['cust-name',data.review.customer.name],['cust-phone',data.review.customer.phone],['cust-address',data.review.customer.address]]){
    const input=document.getElementById(id);input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));
   }
   const type=document.querySelector('input[name="order-type"][value="'+data.review.orderType+'"]');type.checked=true;type.dispatchEvent(new Event('change',{bubbles:true}));
   const form=document.getElementById('cust-name').closest('form');
   const label=document.createElement('label'),ack=document.createElement('input');ack.type='checkbox';ack.id='review-holding-ack';ack.required=true;
   label.append(ack,document.createTextNode(' I confirm our discussion: some dishes may be prepared earlier than usual, up to '+data.review.maxHoldMinutes+' minutes before collection or arrival.'));
   document.getElementById('checkout-submit').before(label);await root.RTKApplyReviewedTime(data.review.preferredTime);
  }catch(error){notice.textContent=error.message;}
 }
 root.addEventListener('hashchange',restore);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore);else restore();
})(globalThis);
