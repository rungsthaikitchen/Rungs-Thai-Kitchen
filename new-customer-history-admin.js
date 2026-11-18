(function(){
 'use strict';
 function mount(){
  const tbody=document.getElementById('tbody');
  const helper=window.RTKNewCustomerVerification;
  if(!tbody||!helper)return;
  const style=document.createElement('style');
  style.textContent='.rtk-new-customer-indicator{margin-top:6px;padding:7px;border:1px solid #1d4ed8;border-radius:6px;background:#eff6ff;color:#1e3a8a;font-size:12px;max-width:340px}.rtk-new-customer-indicator[data-kind="possible"]{border-color:#64748b;background:#f8fafc;color:#334155}.rtk-new-customer-indicator[data-kind="unavailable"]{border-color:#a1a1aa;background:#fafafa;color:#52525b}.rtk-new-customer-indicator p{margin:3px 0}';
  document.head.append(style);
  const cache=new Map();let busy=false,again=false,timer;
  const rows=()=>[...tbody.querySelectorAll('tr[data-order-id][data-order-ref]')];
  function show(row,result){
   const info=helper.describe(result);
   let node=row.querySelector('.rtk-new-customer-indicator');
   if(info.kind==='returning'){node?.remove();return;}
   if(!node){node=document.createElement('div');node.className='rtk-new-customer-indicator';row.children[1]?.append(node);}
   if(!node)return;
   node.dataset.kind=info.kind;node.replaceChildren();
   const heading=document.createElement('strong'),instruction=document.createElement('p');
   heading.textContent=info.heading;instruction.textContent=info.instruction;
   node.append(heading,instruction);
  }
  async function refresh(){
   if(busy){again=true;return;}busy=true;again=false;
   try{
    const wanted=rows().filter(row=>!cache.has(row.dataset.orderId)||Date.now()-cache.get(row.dataset.orderId).at>30000);
    for(let offset=0;offset<wanted.length;offset+=100){
     const batch=wanted.slice(offset,offset+100),ids=batch.map(row=>row.dataset.orderId);
     const response=await fetch('/admin-api/new-customer-history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'classify',orderIds:ids}),redirect:'error',signal:AbortSignal.timeout(15000)});
     const data=await response.json();
     if(!response.ok||data.success!==true||!Array.isArray(data.classifications)||
        data.classifications.some(x=>!ids.includes(x.order_id)||!['new','possibly_new','returning'].includes(x.classification)))throw Error('Lookup unavailable');
     const results=new Map(data.classifications.map(x=>[x.order_id,x]));
     for(const row of batch)cache.set(row.dataset.orderId,{at:Date.now(),value:results.get(row.dataset.orderId)||null});
    }
    for(const row of rows())show(row,cache.get(row.dataset.orderId)?.value||null);
   }catch(_){
    for(const row of rows())show(row,null);
   }finally{busy=false;if(again)schedule();}
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(refresh,100);}
  new MutationObserver(schedule).observe(tbody,{childList:true});
  document.getElementById('refresh')?.addEventListener('click',()=>{cache.clear();schedule();});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
