(function(){
 'use strict';
 const origin=location.origin,parent=window.opener,status=document.getElementById('print-status'),retry=document.getElementById('print-retry');
 const api=window.MasterWokReconciliation;
 const style=document.createElement('style');style.textContent=api.css+'@page{size:auto;margin:3mm}';document.head.append(style);
 let received=false;
 function printReceipt(){status.textContent='Opening printer dialogue…';retry.hidden=false;window.focus();try{window.print();}catch(_){status.textContent='Use Print receipt to open the printer dialogue.';}}
 retry.onclick=printReceipt;
 window.addEventListener('afterprint',()=>{
  if(!received)return;
  parent.postMessage({type:'rtk-eod-print-finished'},origin);
  window.close();
 });
 window.addEventListener('message',async event=>{
  if(received||event.origin!==origin||event.source!==parent||event.data?.type!=='rtk-eod-print-report')return;
  const report=event.data.report;
  if(!report||!api.validDate(report.date)||!Array.isArray(report.exceptions)){status.textContent='Receipt data could not be verified.';return;}
  received=true;document.title='RTK end of day '+report.date;
  document.getElementById('receipt').innerHTML=api.receiptHTML(report);
  // Navigation, scripts and layout must finish before invoking the native dialogue.
  if(document.readyState!=='complete')await new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));
  await document.fonts.ready;
  await new Promise(resolve=>window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve)));
  printReceipt();
 });
 if(parent)parent.postMessage({type:'rtk-eod-print-ready'},origin);
 else status.textContent='Open this receipt from Admin → End of day.';
})();
