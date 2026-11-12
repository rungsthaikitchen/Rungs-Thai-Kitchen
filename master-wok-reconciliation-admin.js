(function(){
 'use strict';
 async function mount(){
  try{const r=await fetch('/api/payments',{cache:'no-store'});if(!r.ok||(await r.json()).enabled!==true)return;}catch(_){return;}
  const api=window.MasterWokReconciliation,toolbar=document.getElementById('refresh')?.parentElement;if(!api||!toolbar)return;
  const button=document.createElement('button');button.className='btn';button.textContent='End of day';button.type='button';toolbar.prepend(button);
  const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','End of day reconciliation');dialog.style.cssText='width:440px;max-width:calc(100% - 32px);border:1px solid #ddd;border-radius:12px;padding:20px';
  dialog.innerHTML='<h2>End of day reconciliation</h2><form><p><label>Service date <input name="date" type="date" required></label></p><p><label>Counted cash takings (£), optional <input name="cash" type="number" min="0" step="0.01"></label></p><p>Include cash tips; exclude opening float. Allow for any cash removed or expenses separately.</p><button class="btn" type="submit">Build receipt</button></form><p role="status"></p><button type="button" class="btn" data-print disabled>Print receipt</button> <button type="button" class="btn" data-close>Close</button><div data-preview></div>';
  document.body.append(dialog);const form=dialog.querySelector('form'),status=dialog.querySelector('[role=status]'),print=dialog.querySelector('[data-print]'),preview=dialog.querySelector('[data-preview]');let report=null,busy=false;
  button.onclick=()=>{form.elements.date.value=api.ukDate(new Date().toISOString());form.elements.cash.value='';report=null;preview.replaceChildren();print.disabled=true;status.textContent='';dialog.showModal();};
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  form.addEventListener('input',()=>{report=null;print.disabled=true;preview.replaceChildren();status.textContent='Build the receipt to refresh the figures.';});
  async function loadOrders(date){
   // A broad UTC range covers both UK DST boundaries; the model applies the exact UK service date.
   const start=new Date(date+'T00:00:00Z');start.setUTCDate(start.getUTCDate()-1);const end=new Date(start);end.setUTCDate(end.getUTCDate()+3);
   const filter=`and(confirmed_time.gte.${start.toISOString()},confirmed_time.lt.${end.toISOString()}),and(preferred_time.gte.${start.toISOString()},preferred_time.lt.${end.toISOString()})`;
   const rows=[];const production=['rungsthaikitchen.co.uk','www.rungsthaikitchen.co.uk','localhost','127.0.0.1'].includes(location.hostname);
   for(let offset=0;offset<10000;offset+=500){
    const response=await window.MasterWokAdminClient.loadOrders(()=>window.supabaseClient.from('orders').select('id,order_ref,status,total,is_test,confirmed_time,preferred_time').eq('is_test',false).or(filter).order('id').range(offset,offset+499));
    if(response.error||!Array.isArray(response.data))throw Error('Orders could not be loaded. No partial receipt will be printed.');
    rows.push(...response.data);if(!production||response.data.length<500)return rows.filter(o=>o.is_test!==true&&api.serviceDate(o)===date);
   }
   throw Error('Too many orders to verify; no partial receipt will be printed.');
  }
  async function loadPayments(orders){
   const results=[];
   for(let i=0;i<orders.length;i+=60){
    const r=await fetch('/admin-api/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'list',orderIds:orders.slice(i,i+60).map(o=>o.id)}),redirect:'error',signal:AbortSignal.timeout(25000)});
    const data=await r.json();if(!r.ok||data.success!==true||!Array.isArray(data.payments))throw Error('Payment details could not be verified. No partial receipt will be printed.');results.push(...data.payments);
   }
   return results;
  }
  form.onsubmit=async e=>{
   e.preventDefault();if(busy)return;busy=true;report=null;print.disabled=true;preview.replaceChildren();status.textContent='Loading orders and recorded payments…';
   const date=form.elements.date.value,cash=form.elements.cash.value;
   form.querySelectorAll('input,button').forEach(n=>n.disabled=true);
   try{const orders=await loadOrders(date),payments=await loadPayments(orders);report=api.buildReport({date,orders,payments,countedCash:cash===''?null:cash});
    const iframe=document.createElement('iframe');iframe.title='Receipt preview';iframe.style.cssText='width:100%;height:500px;border:1px solid #ddd;margin-top:16px';iframe.setAttribute('sandbox','');iframe.srcdoc='<!doctype html><html><head><meta charset="utf-8"><style>'+api.css+'</style></head><body>'+api.receiptHTML(report)+'</body></html>';preview.append(iframe);print.disabled=false;
    status.textContent=report.exceptions.length?`${report.exceptions.length} check(s) need attention. Review before printing.`:'Receipt ready. Please check the figures before printing.';
   }catch(error){status.textContent=error.message;}finally{busy=false;form.querySelectorAll('input,button').forEach(n=>n.disabled=false);}
  };
  // Print a full-length sibling of Admin, never its clipped preview iframe.
  const printRoot=document.createElement('section');printRoot.id='rtk-eod-print';printRoot.hidden=true;document.body.append(printRoot);
  const printStyle=document.createElement('style');printStyle.media='print';printStyle.disabled=true;
  printStyle.textContent=api.css+`
   @page{size:auto;margin:3mm}
   html:has(body.rtk-eod-printing){height:auto!important;overflow:visible!important}
   body.rtk-eod-printing{width:74mm!important;height:auto!important;min-height:0!important;max-height:none!important;margin:0!important;padding:0!important;overflow:visible!important;position:static!important;font:12px/1.3 Arial,sans-serif!important}
   body.rtk-eod-printing > :not(#rtk-eod-print){display:none!important}
   body.rtk-eod-printing > #rtk-eod-print{display:block!important;position:static!important;width:72mm!important;height:auto!important;max-height:none!important;overflow:visible!important;margin:0!important;padding:0!important}
   #rtk-eod-print .receipt{width:72mm!important;max-width:72mm!important;margin:0!important;overflow:visible!important}
   dialog::backdrop{display:none!important}
  `;document.head.append(printStyle);
  let printing=false;
  function preparePrint(){
   if(printing||!report||!dialog.open)return;
   printing=true;printRoot.innerHTML=api.receiptHTML(report);
   // A modal occupies the browser's top layer. Close it before print layout so
   // neither its controls nor its fixed-height iframe can be paginated.
   dialog.close();printRoot.hidden=false;printStyle.disabled=false;document.body.classList.add('rtk-eod-printing');
  }
  function finishPrint(){
   if(!printing)return;document.body.classList.remove('rtk-eod-printing');printStyle.disabled=true;printRoot.hidden=true;printing=false;
  }
  // Ctrl+P while reviewing a receipt uses exactly the same receipt-only output.
  window.addEventListener('beforeprint',preparePrint);window.addEventListener('afterprint',finishPrint);
  print.onclick=()=>{
   if(!report||printing)return;
   preparePrint();
   // Invoke during the actual click; popup/message callbacks can lose activation.
   try{window.focus();window.print();}catch(error){
    finishPrint();dialog.showModal();status.textContent='Printing could not start. Please try Print receipt again.';
   }
  }; }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
