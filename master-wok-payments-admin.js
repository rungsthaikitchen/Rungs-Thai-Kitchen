(function(root){
 'use strict';
 function describeBalance(balance){if(!balance)return '';return Number(balance.underpayment)>0?'Underpaid £'+Number(balance.underpayment).toFixed(2):Number(balance.overpayment)>0?'Overpaid £'+Number(balance.overpayment).toFixed(2)+' (not a tip)':'Bill paid in full';}
 function difference(due,received){const d=Math.round(Number(due)*100)-Math.round(Number(received)*100);return {underpayment:(Math.max(0,d)/100).toFixed(2),overpayment:(Math.max(0,-d)/100).toFixed(2)};}
 if(typeof module!=='undefined'&&module.exports){module.exports={describeBalance,difference};return;}
 async function mount(){
  try{const r=await fetch('/api/payments',{cache:'no-store'});if(!r.ok||(await r.json()).enabled!==true)return;}catch(_){return;}
  const dialog=document.createElement('dialog');dialog.style.cssText='max-width:460px;width:calc(100% - 48px);border:1px solid #ddd;border-radius:12px;padding:24px';
  dialog.innerHTML='<h2>Take payment &amp; complete</h2><p data-summary></p><form><p><label>Amount received towards bill (£) <input name="billAmount" type="number" min="0" max="99999999.99" step="0.01" required></label><br><small>Enter the amount actually received, excluding tips.</small></p><p data-difference></p><p data-reason hidden><label>Reason for payment difference <textarea name="differenceReason" maxlength="500" rows="2" style="width:100%"></textarea></label></p><label>Bill payment method <select name="billMethod" required><option value="">Choose…</option><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option></select></label><p><label>Tip amount (£) <input name="tipAmount" type="number" min="0" step="0.01" value="0.00" required></label></p><p><label>Tip payment method <select name="tipMethod"><option value="">No tip</option><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option></select></label></p><p><span data-completion-note>Payment and order completion save together.</span></p><button class="btn" type="submit">Save payment &amp; complete</button></form><p data-status role="status"></p><button data-close class="btn" type="button">Close</button>';
  dialog.setAttribute('aria-label','Take payment and complete');
  document.body.append(dialog);const form=dialog.querySelector('form'),summary=dialog.querySelector('[data-summary]'),status=dialog.querySelector('[data-status]'),close=dialog.querySelector('[data-close]'),save=form.querySelector('button');
  let current=null,pending=null,busy=false,uncertain=false;
  const money=v=>'£'+Number(v).toFixed(2);
  async function request(payload){const r=await fetch('/admin-api/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(25000)});const data=await r.json();if(!r.ok||data.success!==true){const error=Error(data.reason==='PAYMENT_TOTAL_CHANGED_REFRESH'?'The order total changed. Close and reopen payment details before saving.':data.reason==='INVALID_PAYMENT_DETAILS'?'Check the amount received, payment methods and the reason for any difference.':data.reason||data.error||'Payment could not be confirmed. Retry the same payment.');error.definitive=r.status>=400&&r.status<500;throw error;}return data;}
  let listing=false,rowRefreshTimer;
  async function refreshSummaries(){
   if(listing)return;const nodes=[...document.querySelectorAll('[data-payment-summary]')];if(!nodes.length)return;listing=true;
   try{for(let offset=0;offset<nodes.length;offset+=60){const chunk=nodes.slice(offset,offset+60),data=await request({action:'list',orderIds:chunk.map(n=>n.dataset.orderId)}),byId=new Map(data.payments.map(p=>[p.order_id,p]));
    for(const node of chunk){const row=byId.get(node.dataset.orderId);if(!row)continue;const p=row.payment;const tr=node.closest('tr'),paidButton=tr?.querySelector('.btn-paid'),completed=tr?.querySelector('.status-pill')?.textContent.trim().toUpperCase()==='COMPLETED';if(paidButton)paidButton.textContent=p?'Payment details':completed?'Record payment':'Take payment & complete';node.textContent=p?'Received '+money(p.bill_amount)+' · '+p.bill_method.replace('_',' ')+(row.balance?' · '+describeBalance(row.balance):'')+(Number(p.tip_amount)>0?' · Tip '+money(p.tip_amount)+' '+p.tip_method.replace('_',' '):' · No tip'):row.paid?'Paid · method unknown':'Unpaid';}
   }}catch(_){for(const node of nodes)node.textContent='Payment details unavailable';}finally{listing=false;}
  }
  const observer=new MutationObserver(()=>{clearTimeout(rowRefreshTimer);rowRefreshTimer=setTimeout(refreshSummaries,100);});
  const orderRows=document.getElementById('tbody');if(orderRows)observer.observe(orderRows,{childList:true});
  refreshSummaries();setInterval(()=>{if(!document.hidden)refreshSummaries();},30000);
  const controls=()=>[...form.querySelectorAll('input,select,textarea')];
  function updateDifference(){
   if(!pending)return;const b=difference(pending.expectedTotal,form.elements.billAmount.value),changed=Number(b.underpayment)>0||Number(b.overpayment)>0;
   dialog.querySelector('[data-difference]').textContent=describeBalance(b);dialog.querySelector('[data-reason]').hidden=!changed;form.elements.differenceReason.required=changed;
  }
  form.elements.billAmount.addEventListener('input',updateDifference);
  function showSaved(data){form.hidden=true;const p=data.payment;summary.textContent='Received '+money(p.bill_amount)+' towards bill'+' via '+p.bill_method.replace('_',' ')+'; tip '+money(p.tip_amount)+(p.tip_method?' via '+p.tip_method.replace('_',' '):'')+'.';status.textContent=(data.status==='completed'?'Payment recorded. Order completed. ':'Payment recorded. ')+describeBalance(data.balance);uncertain=false;refreshSummaries();}
  close.onclick=()=>{if(!busy)dialog.close();};dialog.addEventListener('cancel',e=>{if(busy||uncertain)e.preventDefault();});
  // Capture prevents the old Mark paid handler from also executing.
  document.addEventListener('click',async e=>{
   const button=e.target.closest?.('.btn-paid');if(!button)return;e.preventDefault();e.stopImmediatePropagation();if(dialog.open)return;
   current=button.dataset.orderId;pending=null;uncertain=false;form.reset();form.hidden=true;summary.textContent='Loading payment details…';status.textContent='';close.disabled=true;dialog.showModal();busy=true;
   try{const data=await request({action:'read',orderId:current});if(data.payment){showSaved(data);return;}pending={action:data.status==='completed'?'record':'record_and_complete',orderId:current,billAmount:Number(data.total).toFixed(2),expectedTotal:Number(data.total).toFixed(2),idempotencyKey:crypto.randomUUID()};form.elements.billAmount.value=Number(data.total).toFixed(2);updateDifference();summary.textContent='Bill due: '+money(data.total)+(data.methodUnknown?' — previously marked paid; method not recorded.':'');form.hidden=false;controls().forEach(x=>x.disabled=false);save.disabled=false;save.textContent=data.status==='completed'?'Save payment details':'Save payment & complete';dialog.querySelector('[data-completion-note]').textContent=data.status==='completed'?'This order is already completed; only payment details will be recorded.':'Payment and order completion save together.';}
   catch(error){status.textContent=error.message;}finally{busy=false;close.disabled=false;}
  },true);
  form.onsubmit=async e=>{e.preventDefault();if(busy||!pending)return;
   if(!uncertain){pending={...pending,billAmount:Number(form.elements.billAmount.value).toFixed(2),differenceReason:form.elements.differenceReason.value.trim()||null,billMethod:form.elements.billMethod.value,tipAmount:Number(form.elements.tipAmount.value).toFixed(2),tipMethod:Number(form.elements.tipAmount.value)>0?form.elements.tipMethod.value:null};if(Number(form.elements.tipAmount.value)>0&&!pending.tipMethod){status.textContent='Choose how the tip was paid.';return;}}
   busy=true;close.disabled=true;save.disabled=true;controls().forEach(x=>x.disabled=true);status.textContent='Saving…';
   try{showSaved(await request(pending));document.getElementById('refresh')?.click();}
   catch(error){uncertain=!error.definitive;status.textContent=error.message+(uncertain?' Use Retry to check the same request; do not enter a second payment.':'');save.textContent=uncertain?'Retry same payment':pending.action==='record_and_complete'?'Save payment & complete':'Save payment details';if(!uncertain)controls().forEach(x=>x.disabled=false);}
   finally{busy=false;save.disabled=false;close.disabled=uncertain;}
  };
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})(globalThis);

