(function(root){
 'use strict';
 // The server, not the browser, determines customer history. No name-only
 // match can establish identity; unavailable lookups must never imply "new".
 const statuses=Object.freeze({
  recommended:'Contact recommended',
  contacted:'Contacted',
  unreachable:'Unable to reach',
  not_required:'Not required'
 });
 const reasons=Object.freeze({
  completion_timing_unknown:'Previous order is marked completed, but its completion date is unavailable.',
  previous_order_not_confirmed:'Previous order found, but completion not confirmed.',
  shared_contact:'Previous order found using shared contact details.',
  insufficient_identity:'Not enough contact details to verify previous orders.',
  test_order:'Test order — customer history is not assessed.'
 });
 function describe(result){
  if(!result||typeof result!=='object')return {kind:'unavailable',heading:'Customer history unavailable',instruction:'Do not assume this is a new customer.'};
  const classification=result.classification;
  if(classification==='new')return {kind:'new',heading:'NEW CUSTOMER',instruction:'If time permits, contact before cooking.'};
  if(classification==='possibly_new')return {kind:'possible',heading:'POSSIBLY NEW',instruction:reasons[result.reason]||'Customer history is uncertain. Check contact details if time permits.'};
  if(classification==='returning')return {kind:'returning',heading:'Returning customer',instruction:''};
  return {kind:'unavailable',heading:'Customer history unavailable',instruction:'Do not assume this is a new customer.'};
 }
 function contactLabel(value){
  return Object.prototype.hasOwnProperty.call(statuses,value)?statuses[value]:statuses.recommended;
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={describe,contactLabel};return;}
 root.RTKNewCustomerVerification={describe,contactLabel};
})(typeof window==='undefined'?null:window);
