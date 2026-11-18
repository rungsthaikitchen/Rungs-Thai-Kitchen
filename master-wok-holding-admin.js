(function(root){
 'use strict';
 function summary(row){const minutes=Math.max(0,...(row?.warnings||[]).map(w=>w.estimatedMinutes));return minutes>20?'Extended holding: '+minutes+' min':'';}
 function needsReview(row){return (row?.warnings||[]).some(w=>!w.acknowledgement);}
 function dishes(row){return (row?.warnings||[]).flatMap(w=>w.dishes.map(d=>(d.name||d.itemId.replaceAll('-',' '))+' — '+d.minutes+' min before collection/dispatch'));}
 if(typeof module!=='undefined'&&module.exports){module.exports={summary,needsReview,dishes};return;}
 async function mount(){
  try{const r=await fetch('/api/payments',{cache:'no-store'});if(!r.ok||(await r.json()).enabled!==true)return;}catch(_){return;}
  const rows=new Map();let timer,running=false,again=false,busy=false,current=null;
  async function request(payload){
   const r=await fetch('/admin-api/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(25000)});
   const data=await r.json();if(!r.ok||data.success!==true){const e=Error(data.reason==='EXTENDED_HOLDING_REVIEW_REQUIRED'?'The holding warning changed. Review the updated details before accepting.':data.reason||data.error||'Holding details could not be checked. Please retry.');e.data=data;throw e;}return data;
  }
  const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Review extended kitchen holding');
  dialog.style.cssText='max-width:520px;width:calc(100% - 48px);border:1px solid #d97706;border-radius:12px;padding:24px';
  dialog.innerHTML='<h2>Review extended kitchen holding</h2><p data-summary></p><p>The planned kitchen wait exceeds the 20-minute target for:</p><ul data-dishes></ul><p>These estimates cover waiting before collection or dispatch. Delivery travel is separate.</p><form><p><label><input type="checkbox" name="acknowledged" required> I have reviewed the affected dishes and can manage this order at the planned time.</label></p><button class="btn" type="submit">Accept order</button> <button class="btn" data-cancel type="button">Cancel</button></form><p role="status" data-status></p>';
  document.body.append(dialog);const status=dialog.querySelector('[data-status]'),form=dialog.querySelector('form'),save=form.querySelector('[type=submit]'),cancel=dialog.querySelector('[data-cancel]');
  function show(row){
   current=row;dialog.querySelector('[data-summary]').textContent=summary(row);const list=dialog.querySelector('[data-dishes]');list.replaceChildren();
   for(const text of dishes(row)){const li=document.createElement('li');li.textContent=text;list.append(li);}
   form.reset();status.textContent='';if(!dialog.open)dialog.showModal();
  }
  function decorate(){
   for(const button of document.querySelectorAll('.btn-accept[data-order-id]')){
    const tr=button.closest('tr'),row=rows.get(button.dataset.orderId);let badge=tr?.querySelector('[data-holding-warning]');
    if(!row?.warnings?.length){badge?.remove();continue;}
    if(!badge){badge=document.createElement('details');badge.dataset.holdingWarning='';badge.style.cssText='margin-bottom:6px;padding:6px 8px;border-left:4px solid #d97706;background:#fff7ed;color:#9a3412;font-size:12px;text-align:left';tr.querySelector('.actions')?.prepend(badge);}
    const expanded=badge.open;badge.replaceChildren();const title=document.createElement('summary');title.textContent=summary(row)+(needsReview(row)?' · Review required':' · Reviewed');badge.append(title);
    const list=document.createElement('ul');list.style.cssText='margin:6px 0;padding-left:18px';for(const text of dishes(row)){const li=document.createElement('li');li.textContent=text;list.append(li);}badge.append(list);badge.open=expanded;
   }
  }
  async function refresh(){
   if(running){again=true;return;}running=true;
   try{do{again=false;const ids=[...new Set([...document.querySelectorAll('.btn-accept[data-order-id]')].map(b=>b.dataset.orderId))];
    for(let i=0;i<ids.length;i+=60){const data=await request({action:'holding_list',orderIds:ids.slice(i,i+60)});for(const row of data.holding)rows.set(row.orderId,row);decorate();}
   }while(again);}catch(_){/* Server-side acceptance guard remains authoritative. */}finally{running=false;}
  }
  document.addEventListener('click',async event=>{
   const button=event.target.closest?.('.btn-accept[data-order-id]');if(!button||!needsReview(rows.get(button.dataset.orderId)))return;
   event.preventDefault();event.stopImmediatePropagation();if(busy||dialog.open)return;button.disabled=true;
   try{const data=await request({action:'holding_list',orderIds:[button.dataset.orderId]});const row=data.holding.find(r=>r.orderId===button.dataset.orderId);if(!row)throw Error('Order details changed. Refresh the orders list.');rows.set(row.orderId,row);decorate();show(row);}
   catch(error){alert(error.message);}finally{button.disabled=false;}
  },true);
  form.onsubmit=async event=>{
   event.preventDefault();if(busy||!current||!form.elements.acknowledged.checked)return;busy=true;save.disabled=true;cancel.disabled=true;status.textContent='Accepting order…';
   try{await request({action:'holding_accept',orderId:current.orderId,holdingWarningToken:current.warningToken});status.textContent='Order accepted. Customer notification queued.';dialog.close();document.getElementById('refresh')?.click();refresh();}
   catch(error){
    if(error.data?.reason==='EXTENDED_HOLDING_REVIEW_REQUIRED'&&error.data.holdingWarnings){show({orderId:current.orderId,warnings:error.data.holdingWarnings,warningToken:error.data.warningToken});}
    status.textContent=error.message;
   }finally{busy=false;save.disabled=false;cancel.disabled=false;}
  };
  cancel.onclick=()=>{if(!busy)dialog.close();};dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  const tbody=document.getElementById('tbody');if(tbody)new MutationObserver(()=>{decorate();clearTimeout(timer);timer=setTimeout(refresh,100);}).observe(tbody,{childList:true});
  refresh();setInterval(()=>{if(!document.hidden)refresh();},30000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})(globalThis);
