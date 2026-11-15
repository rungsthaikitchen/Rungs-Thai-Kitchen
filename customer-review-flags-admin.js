(function(root){
 'use strict';
 function describe(matches){
  const flags=Array.isArray(matches)?matches.filter(f=>f&&typeof f.sourceOrderRef==='string'&&Array.isArray(f.matchTypes)):[];
  if(!flags.length)return null;
  const possible=flags.every(f=>f.possibleMatch===true);
  const labels={source_order:'this order',customer_record:'customer record',phone:'phone',email:'email',name:'name only'};
  return {possible,heading:possible?'Possible name match — check contact details':'Customer review required — previous no-show',
   detail:flags.slice(0,3).map(f=>f.sourceOrderRef+' · '+f.matchTypes.map(t=>labels[t]||'details').join(', ')+': '+String(f.reason||'Previous no-show recorded.')).join('\n')+(flags.length>3?'\nFurther incidents are recorded.':''),
   instruction:possible?'A name alone does not identify the same person. Verify before preparing food.':'Confirm working contact details and agree fulfilment with the customer before preparing food.'};
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={describe};return;}
 function mount(){
  const tbody=document.getElementById('tbody');if(!tbody)return;
  const style=document.createElement('style');style.textContent='.rtk-customer-review-warning{margin-top:8px;padding:9px;max-width:340px;border:2px solid #b45309;border-radius:7px;background:#fff4d6;color:#63370b;font-size:13px;line-height:1.4;white-space:normal}.rtk-customer-review-warning[data-possible="false"]{border-color:#b42318;background:#fff0ed;color:#7a271a}.rtk-customer-review-warning p{margin:5px 0;white-space:pre-line}';document.head.append(style);
  const status=document.createElement('p');status.setAttribute('role','status');status.hidden=true;tbody.closest('table').before(status);
  const cache=new Map();let running=false,again=false,timer;
  const rows=()=>[...tbody.querySelectorAll('tr[data-order-id][data-order-ref]')];
  const key=row=>JSON.stringify([row.dataset.orderId,row.dataset.phone,row.dataset.email,row.dataset.name]);
  function show(row,matches){
   let node=row.querySelector('.rtk-customer-review-warning');const info=describe(matches);
   if(!info){node?.remove();return;}
   if(!node){node=document.createElement('div');node.className='rtk-customer-review-warning';row.children[1].append(node);}
   node.dataset.possible=String(info.possible);node.replaceChildren();
   const heading=document.createElement('strong'),detail=document.createElement('p'),instruction=document.createElement('p');
   heading.textContent=info.heading;detail.textContent=info.detail;instruction.textContent=info.instruction;node.append(heading,detail,instruction);
  }
  async function refresh(){
   if(running){again=true;return;}running=true;again=false;
   try{
    const wanted=rows().filter(row=>!cache.has(key(row))||Date.now()-cache.get(key(row)).at>30000);
    for(let offset=0;offset<wanted.length;offset+=100){
     const batch=wanted.slice(offset,offset+100),ids=batch.map(row=>row.dataset.orderId);
     const response=await fetch('/admin-api/customer-review-flags',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'matches',orderIds:ids}),redirect:'error',signal:AbortSignal.timeout(15000)});
     const data=await response.json();
     if(!response.ok||data.success!==true||!Array.isArray(data.matches)||data.matches.some(m=>!ids.includes(m.order_id)||!Array.isArray(m.matches)))throw Error('Review lookup unavailable');
     const results=new Map(data.matches.map(m=>[m.order_id,m.matches]));
     for(const row of batch)cache.set(key(row),{at:Date.now(),matches:results.get(row.dataset.orderId)||[]});
    }
    for(const row of rows()){const entry=cache.get(key(row));if(entry)show(row,entry.matches);}
    status.hidden=true;
   }catch(_){status.textContent='Customer review checks are unavailable. Refresh Admin before relying on these warnings.';status.hidden=false;}
   finally{running=false;if(again)schedule();}
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(refresh,80);}
  new MutationObserver(schedule).observe(tbody,{childList:true});
  document.getElementById('refresh')?.addEventListener('click',()=>{cache.clear();schedule();});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})(typeof window==='undefined'?null:window);
