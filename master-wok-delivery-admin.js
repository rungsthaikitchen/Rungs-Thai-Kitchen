(function(root){
 'use strict';
 // Owner-only controls within the existing authenticated Admin. Route choices
 // are previews until the server confirms the same service-plan revision.
 const messages={DELIVERY_PLAN_CHANGED_REFRESH:'The schedule changed. Close this window and review the trips again.',
  DRIVER_UNAVAILABLE:'The driver cannot fit this trip around the current bookings.',
  DELIVERY_TRIP_ALREADY_STARTED:'This trip has already started loading and cannot be changed.',
  COMBINED_DELIVERY_NOT_FEASIBLE:'These deliveries cannot be combined within their arrival and food holding limits.',
  RESOLVE_PROPOSED_TIMES_FIRST:'Please resolve the outstanding customer time proposal first.',
  SPLIT_EXISTING_TRIP_FIRST:'Split the existing combined trip before making a different combination.',
  DELIVERY_TRAVEL_TIME_UNAVAILABLE:'Travel times are unavailable. Please try again shortly.'};
 const clock=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 async function open(order){
  const dialog=document.createElement('dialog');dialog.style.maxWidth='560px';
  const title=document.createElement('h2');title.textContent='Delivery trip — '+order.order_ref;
  const content=document.createElement('div'),error=document.createElement('p'),close=document.createElement('button');
  close.textContent='Close';close.onclick=()=>dialog.close();dialog.append(title,content,error,close);
  dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
  async function request(input){
   try{return await root.MasterWokAdminClient.submit({orderId:order.id,...input});}
   catch(e){throw Error(messages[e.message]||e.message);}
  }
  function text(value){const p=document.createElement('p');p.textContent=value;content.append(p);}
  function button(label,run){const b=document.createElement('button');b.textContent=label;b.style.margin='4px';
   b.onclick=async()=>{b.disabled=true;error.textContent='';try{await run();}catch(e){error.textContent=e.message;}finally{b.disabled=false;}};content.append(b);return b;}
  function showTrip(trip,refs){
   text('Food ready '+clock(trip.start)+' · Depart '+clock(trip.departure)+' · Back '+clock(trip.finish));
   for(const s of trip.stops)text((refs.get(s.sourceId)||s.sourceId)+' — door arrival '+clock(s.arrival));
  }
  try{
   content.textContent='Checking delivery trips…';
   const state=await request({action:'delivery_trip_options'});content.replaceChildren();
   const refs=new Map([[order.id,order.order_ref],...state.candidates.map(c=>[c.orderId,c.reference])]);
   showTrip(state.trip,refs);
   if(state.trip.stops.length===2){
    button('Split into separate trips',async()=>{await request({action:'split_delivery_trip',expectedRevision:state.revision});dialog.close();});return;
   }
   async function review(orderIds){
    const preview=await request({action:'preview_delivery_combination',orderIds,expectedRevision:state.revision});
    content.replaceChildren();text('Review combined trip');showTrip(preview.trip,refs);
    text('Customer arrival promises stay unchanged. Confirming reserves this route for subsequent bookings.');
    button('Confirm combined trip',async()=>{await request({action:'combine_deliveries',orderIds,expectedRevision:preview.revision});dialog.close();});
   }
   for(const r of state.recommendations)button('Review recommendation: '+r.orderIds.map(id=>refs.get(id)||id).join(' → ')+' (saves '+r.savedMinutes+' min)',()=>review(r.orderIds));
   if(!state.recommendations.length)text('No time-saving combination recommended. You can still check a combination below.');
   if(!state.candidates.length){text('No other deliveries available to combine.');return;}
   const select=document.createElement('select'),label=document.createElement('label');label.textContent='Combine with ';label.append(select);content.append(label);
   for(const c of state.candidates){const o=document.createElement('option');o.value=c.orderId;o.textContent=c.reference;select.append(o);}
   const first=document.createElement('input');first.type='checkbox';first.checked=true;
   const firstLabel=document.createElement('label');firstLabel.append(first,document.createTextNode(' Deliver '+order.order_ref+' first'));content.append(firstLabel);
   button('Check this combination',()=>review(first.checked?[order.id,select.value]:[select.value,order.id]));
  }catch(e){content.replaceChildren();error.textContent=e.message;}
 }
 root.MasterWokDeliveryAdmin={open};
})(globalThis);
