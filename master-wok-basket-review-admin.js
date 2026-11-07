(function(root){
 'use strict';
 async function mount(){
  if(!await root.RTKBasketReview?.enabled())return;
  const section=document.createElement('section');section.style.cssText='margin:24px;padding:20px;border:1px solid #ddd;border-radius:12px';
  const title=document.createElement('h2');title.textContent='Basket review requests';
  const refresh=document.createElement('button');refresh.textContent='Refresh reviews';
  const status=document.createElement('p'),content=document.createElement('div');status.setAttribute('role','status');
  section.append(title,refresh,status,content);(document.querySelector('main')||document.body).prepend(section);
  async function request(payload){
   const response=await fetch('/admin-api/basket-reviews',{method:'POST',redirect:'error',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
   const data=await response.json();if(!response.ok||data.success!==true)throw Error('Reviews could not be loaded or updated. Check your Admin access and refresh.');
   return data;
  }
  const paragraph=(parent,value)=>{const p=document.createElement('p');p.textContent=value;parent.append(p);};
  async function load(){
   refresh.disabled=true;status.textContent='Loading reviews…';
   try{
    const data=await request({action:'list'});if(!Array.isArray(data.reviews))throw Error('Invalid review response');
    content.replaceChildren();
    for(const review of data.reviews){
     const article=document.createElement('article');article.style.cssText='border-top:1px solid #ddd;padding:16px 0';
     paragraph(article,review.customer_name+' · '+review.customer_phone+' · '+review.status);
     paragraph(article,review.order_type+' requested '+new Date(review.preferred_time).toLocaleString('en-GB',{timeZone:'Europe/London'}));
     if(review.delivery_address)paragraph(article,review.delivery_address);
     paragraph(article,'Review only — no order or time has been confirmed.');
     for(const line of review.basket||[])paragraph(article,line.qty+' × '+line.name+
      (line.modifiers?.length?' · '+line.modifiers.map(m=>m.name||m.id).join(', '):'')+
      (line.spice!=null?' · Spice '+line.spice:'')+(line.item_note?' · '+line.item_note:''));
     paragraph(article,'Basket total £'+(review.basket||[]).reduce((total,line)=>total+Number(line.qty)*Number(line.unit_price),0).toFixed(2));
     paragraph(article,review.assessment?.message||'Bottleneck analysis is unavailable. Check the basket before discussing a time.');
     for(const [label,next] of [['Mark contacted','contacted'],['Resolve review','resolved'],['Close review','closed']]){
      if(review.status===next)continue;
      const button=document.createElement('button');button.textContent=label;button.style.marginRight='8px';
      button.onclick=async()=>{button.disabled=true;try{await request({action:'set_status',reviewId:review.id,status:next,expectedStatus:review.status});await load();}
       catch(error){status.textContent=error.message;button.disabled=false;}};
      article.append(button);
     }
     content.append(article);
    }
    status.textContent=data.reviews.length?data.reviews.length+' active review requests':'No active review requests';
   }catch(error){status.textContent=error.message;}finally{refresh.disabled=false;}
  }
  refresh.onclick=load;await load();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})(globalThis);
