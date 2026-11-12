(function(root){
 'use strict';
 const METHODS=['cash','card','bank_transfer'];
 function pennies(value){
  if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(value)))throw Error('Invalid money amount; report not printed.');
  const [whole,fraction='']=String(value).split('.');const n=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(!Number.isSafeInteger(n))throw Error('Money amount is too large.');return n;
 }
 function ukDate(value){
  const date=new Date(value);if(!value||Number.isNaN(date.getTime()))return null;
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get=t=>parts.find(p=>p.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`;
 }
 function validDate(date){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;}
 function serviceDate(order){return ukDate(order.confirmed_time||order.preferred_time);}
 function buildReport({date,orders,payments,generatedAt=new Date().toISOString(),countedCash=null}){
  if(!validDate(date)||!Array.isArray(orders)||!Array.isArray(payments))throw Error('Invalid reconciliation input.');
  const byId=new Map();for(const p of payments){if(byId.has(p.order_id))throw Error('Duplicate payment summary.');byId.set(p.order_id,p);}
  const report={date,generatedAt,basis:'Service date (Europe/London); confirmed time, otherwise requested time',orders:0,completed:0,cancelled:0,completedSales:0,recordedBills:0,tips:0,received:0,methods:Object.fromEntries(METHODS.map(m=>[m,{bills:0,tips:0,total:0}])),exceptions:[],countedCash:countedCash===null?null:pennies(countedCash)};
  const seen=new Set();
  for(const o of orders){
   if(o.is_test===true||serviceDate(o)!==date)continue;
   if(seen.has(o.id))throw Error('Duplicate order in reconciliation.');seen.add(o.id);
   const summary=byId.get(o.id);if(!summary)throw Error('Incomplete payment data; refresh before printing.');
   report.orders++;const status=String(o.status||'').toLowerCase(),ref=o.order_ref||o.id;
   const cancelled=['cancelled','declined','rejected'].includes(status);
   if(cancelled)report.cancelled++;
   if(status==='completed'){report.completed++;report.completedSales+=pennies(o.total);}
   const p=summary.payment;
   if(!p){if(!cancelled)report.exceptions.push({ref,message:summary.paid?'Paid — method not recorded':'No payment recorded',amount:pennies(o.total)});continue;}
   const bill=pennies(p.bill_amount),tip=pennies(p.tip_amount);
   if(!METHODS.includes(p.bill_method)||(tip>0&&!METHODS.includes(p.tip_method)))throw Error('Unknown payment method; report not printed.');
   report.methods[p.bill_method].bills+=bill;
   if(tip>0)report.methods[p.tip_method].tips+=tip;
   report.recordedBills+=bill;report.tips+=tip;
   if(cancelled)report.exceptions.push({ref,message:'Cancelled order has a recorded payment; check refund separately',amount:bill});
   else if(status!=='completed')report.exceptions.push({ref,message:'Payment recorded; order not completed',amount:bill});
   if(bill!==pennies(o.total))report.exceptions.push({ref,message:'Recorded bill differs from order total',amount:bill});
  }
  for(const m of METHODS)report.methods[m].total=report.methods[m].bills+report.methods[m].tips;
  report.received=report.recordedBills+report.tips;
  report.expectedCash=report.methods.cash.total;
  report.cashDifference=report.countedCash===null?null:report.countedCash-report.expectedCash;
  return report;
 }
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>(n<0?'-':'')+'£'+(Math.abs(n)/100).toFixed(2);
 function receiptHTML(r){
  const line=(label,value)=>`<div class="line"><span>${escape(label)}</span><b>${escape(value)}</b></div>`;
  return `<article class="receipt"><h1>Rung’s Thai Kitchen</h1><h2>END OF DAY RECONCILIATION</h2><p class="centre">Service: ${escape(r.date)}<br>Generated: ${escape(new Date(r.generatedAt).toLocaleString('en-GB',{timeZone:'Europe/London'}))} UK</p><hr>${line('Orders',r.orders)}${line('Completed',r.completed)}${line('Cancelled / declined',r.cancelled)}${line('Completed order sales',money(r.completedSales))}<hr><h3>RECORDED PAYMENTS</h3>${METHODS.map(m=>`<h3>${{cash:'CASH',card:'CARD',bank_transfer:'BANK TRANSFER'}[m]}</h3>${line('Bills',money(r.methods[m].bills))}${line('Tips',money(r.methods[m].tips))}${line('Total',money(r.methods[m].total))}`).join('')}<hr>${line('All recorded bills',money(r.recordedBills))}${line('All tips',money(r.tips))}${line('Total received',money(r.received))}<hr>${line('Expected cash incl. tips',money(r.expectedCash))}${r.countedCash===null?'<p>Counted cash: not entered</p>':line('Counted cash',money(r.countedCash))+line('Cash difference',money(r.cashDifference))}<p>Cash excludes opening float, expenses and cash removed. Enter takings only.</p><hr><h3>CHECKS (${r.exceptions.length})</h3>${r.exceptions.length?r.exceptions.map(e=>`<p><b>${escape(e.ref)}</b>: ${escape(e.message)} (${escape(money(e.amount))})</p>`).join(''):'<p>No payment exceptions found.</p>'}<hr><p>Service date uses confirmed time, otherwise requested time. Test orders excluded. Payment totals are recorded amounts, not bank settlements. Refunds are not recorded here. Reprints may change after later updates.</p></article>`;
 }
 const css=`@page{size:80mm auto;margin:3mm}*{box-sizing:border-box}body{margin:0;color:#000;background:#fff;font:12px/1.3 Arial,sans-serif}.receipt{width:72mm;max-width:100%;margin:auto;padding:2mm}h1{font-size:18px;text-align:center;margin:4px 0}h2{font-size:13px;text-align:center}h3{font-size:12px;margin:10px 0 4px}.centre{text-align:center}.line{display:flex;justify-content:space-between;gap:8px;margin:3px 0}.line span{min-width:0}.line b{white-space:nowrap}p{font-size:11px;overflow-wrap:anywhere}hr{border:0;border-top:1px dashed #000;margin:10px 0}@media print{.no-print{display:none!important}body{width:74mm}article{break-inside:auto}.line{break-inside:avoid}}`;
 const api={pennies,ukDate,validDate,serviceDate,buildReport,receiptHTML,css};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MasterWokReconciliation=api;
})(typeof globalThis!=='undefined'?globalThis:this);
