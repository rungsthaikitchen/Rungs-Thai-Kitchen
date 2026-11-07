(function(root){
 'use strict';
 function londonTime(date,time){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw Error('Please select a preferred date and time.');
  const wanted=date+'T'+time+':00',base=Date.parse(wanted+'Z');
  if(!Number.isFinite(base))throw Error('Please select a valid date and time.');
  const format=value=>{
   const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})
    .formatToParts(new Date(value)).map(p=>[p.type,p.value]));
   return parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute+':'+parts.second;
  };
  let value=base;
  for(let i=0;i<3;i++)value+=base-Date.parse(format(value)+'Z');
  if(format(value)!==wanted)throw Error('Please select a valid UK time.');
  return new Date(value).toISOString();
 }
 const storageKey='rtk-basket-review-attempt-v1';
 function createClient({fetch=root.fetch.bind(root),storage=root.sessionStorage,crypto=root.crypto}={}){
  let busy=false;
  return {londonTime,
   async enabled(){try{
    const response=await fetch('/api/basket-review',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
    return response.ok&&(await response.json()).enabled===true;
   }catch(_){return false;}},
   async submit(payload){
    if(busy)throw Error('Please wait for your review request to finish.');
    busy=true;
    try{
     const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)));
     const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
     let attempt;
     try{attempt=JSON.parse(storage.getItem(storageKey)||'null');}catch(_){throw Error('Your previous request could not be checked. Please call us.');}
     if(attempt&&attempt.fingerprint!==fingerprint&&attempt.uncertain)
      throw Error('Your previous request may have arrived. Please retry with the same details or call us before sending a different basket.');
     if(!attempt||attempt.fingerprint!==fingerprint)attempt={key:crypto.randomUUID(),fingerprint};
     attempt.uncertain=true;
     // Persist only a hash and request key, never contact details or the basket.
     storage.setItem(storageKey,JSON.stringify(attempt));
     const response=await fetch('/api/basket-review',{method:'POST',redirect:'error',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestKey:attempt.key}),
      signal:AbortSignal.timeout(25000)});
     const data=await response.json();
     if(response.ok&&data.success===true&&data.bookingApprovalAllowed===false&&typeof data.reviewId==='string'){
      attempt.uncertain=false;storage.setItem(storageKey,JSON.stringify(attempt));return data;
     }
     if(response.status===400){attempt.uncertain=false;storage.setItem(storageKey,JSON.stringify(attempt));
      throw Error('Please check your contact details, preferred time and basket before trying again.');}
     throw Error('We could not confirm receipt. Please retry with the same details or call 0113 469 9564.');
    }finally{busy=false;}
   }
  };
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={createClient,londonTime};
 else root.RTKBasketReview=createClient();
})(typeof globalThis!=='undefined'?globalThis:this);
