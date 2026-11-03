(function(root){
 'use strict';
 function capacityRows(rows,start,end){
  const begin=new Date(start).getTime(),finish=new Date(end).getTime();
  if(!Array.isArray(rows)||!Number.isFinite(begin)||!Number.isFinite(finish)||finish<=begin)
   throw Error('Invalid kitchen commitment snapshot');
  return rows.flatMap(row=>{
   if(row.is_test||['cancelled','declined','rejected'].includes(row.status))return [];
   let times;
   if(row.capacity_scheduler==='MASTER_WOK'){
    const original=row.confirmed_time||row.preferred_time;
    times=row.status==='proposed'?[original,row.proposed_time]:row.status==='customer_declined_time'?
     [original]:[row.confirmed_time||row.proposed_time||row.preferred_time];
   }else{
    times=[row.confirmed_time||(row.status==='pending'&&row.proposed_time?null:row.proposed_time||row.preferred_time)];
   }
   return [...new Set(times.filter(Boolean).map(t=>{
    const instant=new Date(t);if(!Number.isFinite(instant.getTime()))throw Error('Invalid kitchen commitment time');
    return instant.toISOString();
   }))].filter(t=>new Date(t)>=begin&&new Date(t)<finish)
    .map(t=>({...row,id:row.id+'@'+t,preferred_time:t,confirmed_time:t}));
  });
 }
 function createClient({fetch:transport,storage,crypto:cryptoApi,modeUrl='/api/booking-mode',bookingUrl='/api/booking',hostname=root?.location?.hostname??null}={}){
  const legacyAllowed=hostname===null||['rungsthaikitchen.co.uk','www.rungsthaikitchen.co.uk','localhost','127.0.0.1','::1'].includes(hostname);
  function requireLegacyHost(){if(!legacyAllowed)throw Error('Preview ordering is disabled until the staging booking service is ready.');}
  const storageKey='rtk_master_wok_pending_checkout';
  let availabilityMode=null;
  if(!transport||!storage||!cryptoApi)throw Error('Checkout service is unavailable. Please reload this page.');
  async function get(url,options={},timeout=25000){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
   try{return await transport(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}
  }
  function pending(){
   const text=storage.getItem(storageKey);if(!text)return null;
   try{const saved=JSON.parse(text);if(typeof saved.key==='string'&&typeof saved.fingerprint==='string')return saved;}catch(_){}
   throw Error('An earlier checkout needs checking. Please contact the restaurant before trying again.');
  }
  return {async availability(input){
   const response=await get(modeUrl,{},17000);
   if(!response.ok)throw Error('Ordering availability could not be checked. Please retry.');
   const mode=(await response.json()).mode;
   if(mode==='LEGACY'){requireLegacyHost();availabilityMode=mode;return {route:'LEGACY'};}
   if(mode!=='MASTER_WOK')throw Error('Ordering availability is temporarily unavailable.');
   const result=await get('/api/booking-availability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
   const body=await result.json();
   if(!result.ok||body.success!==true||body.bookingApprovalAllowed!==false||!Array.isArray(body.hints)||
    body.hints.length!==input.times.length||new Set(body.hints.map(h=>h.time)).size!==input.times.length||
    body.hints.some(h=>!input.times.includes(h.time)||typeof h.available!=='boolean'))
    throw Error('Ordering availability could not be checked. Please retry.');
   availabilityMode=mode;return {route:'MASTER_WOK',hints:body.hints};
  },async submit(input){
   let mode;
   try{const r=await get(modeUrl,{},17000);if(!r.ok)throw Error();mode=(await r.json()).mode;}
   catch(_){
    if(pending())throw Error('Your earlier checkout still needs checking. Please retry the same order or contact the restaurant before placing another.');
    throw Error('We could not check ordering availability. Please retry; your order has not been submitted.');
   }
   if(availabilityMode&&availabilityMode!==mode)throw Error('Ordering has changed. Please refresh the available times before submitting.');
   const previous=pending();
   if(mode==='LEGACY'){
    requireLegacyHost();
    if(previous)throw Error('We need to check your previous order before creating another. Please contact the restaurant.');
    return {route:'LEGACY'};
   }
   if(mode!=='MASTER_WOK')throw Error('Online ordering is temporarily unavailable. Please try again shortly.');
   const bytes=await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(input)));
   const fingerprint=Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
   if(previous&&previous.fingerprint!==fingerprint)
    throw Error('Your previous checkout still needs checking. Please retry that order or contact the restaurant.');
   const attempt=previous||{key:cryptoApi.randomUUID(),fingerprint};
   storage.setItem(storageKey,JSON.stringify(attempt));
   if(storage.getItem(storageKey)!==JSON.stringify(attempt))throw Error('We could not save your checkout reference. Please reload and try again.');
   let response,body;
   try{
    response=await get(bookingUrl,{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({...input,key:attempt.key})});
    body=await response.json();
   }catch(_){throw Error('We could not confirm the result. Please retry the same order so we can check it without duplicating it.');}
   if(response.ok&&body?.success===true&&typeof body.orderId==='string'&&typeof body.orderRef==='string'&&
    Number.isFinite(body.totals?.total)&&body.notification_status==='queued'){
    storage.removeItem(storageKey);return {route:'MASTER_WOK',order:body};
   }
   if(body?.committed===false&&[400,409,422].includes(response.status)){
    storage.removeItem(storageKey);
    const messages={CHECKOUT_PRICE_CHANGED:'Your price or loyalty balance has changed. Please refresh checkout and review the total.',
     REVIEW_REQUIRED:'That time is no longer available for this order. Please choose another time.'};
    throw Error(messages[body.reason||body.error]||body.message||'We could not book this order. Please review your details and selected time.');
   }
   throw Error('We could not confirm the result. Please retry the same order or contact the restaurant.');
  }};
 }
 const api={createClient,capacityRows};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root){root.RTKBookingCapacityRows=capacityRows;root.RTKBookingClient=createClient({fetch:root.fetch.bind(root),storage:root.localStorage,crypto:root.crypto});}
})(typeof window!=='undefined'?window:null);
