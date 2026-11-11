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
  const flags=await (await fetch('/api/basket-review',{cache:'no-store'})).json();
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
     if(flags.approvalsEnabled&&['pending','contacted','approved'].includes(review.status)){
      const form=document.createElement('form');
      form.innerHTML='<h3>'+ (review.status==='approved'?'Replace customer checkout link':'Allow checkout at an agreed time')+'</h3>'
       +'<p>This does not reserve capacity. Checkout will recheck current bookings and prices.</p>'
       +'<label>Agreed date <input name="date" type="date" required></label> '
       +'<label>Agreed time <input name="time" type="time" step="300" required></label><br>'
       +'<label>Maximum finished-food holding time (minutes) <input name="hold" type="number" min="20" max="330" value="20" required></label><br>'
       +'<label>Reason / customer discussion <textarea name="reason" minlength="5" maxlength="1000" required></textarea></label><br>'
       +'<label><input name="discussed" type="checkbox" required> I discussed the basket, time and any longer holding with the customer.</label><br>'
       +'<button type="submit">Create customer checkout link</button>';
      form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;
       try{const result=await request({action:'approve_agreed_time',reviewId:review.id,expectedStatus:review.status,
        agreedTime:root.RTKBasketReview.londonTime(form.elements.date.value,form.elements.time.value),
        maxHoldMinutes:Number(form.elements.hold.value),reason:form.elements.reason.value,customerDiscussed:form.elements.discussed.checked});
        const output=document.createElement('p'),link=document.createElement('a');
        link.href=new URL('/#basket-review='+result.token,location.origin).href;
        link.textContent='Customer checkout link (expires in 30 minutes)';link.rel='noreferrer';link.target='_blank';
        output.append(link);form.replaceWith(output);article.querySelectorAll('button').forEach(b=>b.remove());status.textContent='Approval created. Share the link privately with this customer. No booking has been made.';
       }catch(error){status.textContent=error.message;button.disabled=false;}};
      article.append(form);
     }
     for(const [label,next] of [['Mark contacted','contacted'],['Resolve review','resolved'],['Close review','closed']]){ 
      if(review.status===next||review.status==='approved'&&next!=='closed')continue;
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
