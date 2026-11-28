(function(){
 'use strict';
 const messages={AMENDMENT_NO_PROPOSED_TIME_TO_CONFIRM:'There is no unresolved proposed time to record. Close and reopen the order.',AMENDMENT_REASON_AND_KEY_REQUIRED:'Enter a reason before recording the agreed time.',AMENDMENT_AREA_OVERRIDE_REASON_REQUIRED:'Enter a reason for the delivery-area exception.',AMENDMENT_AREA_OVERRIDE_MANUAL_FEE_REQUIRED:'Set the delivery charge explicitly for a delivery-area exception.',DELIVERY_GEOCODING_UNAVAILABLE:'The delivery address lookup could not be completed. Please retry; an area exception still needs a verified address.',AMENDMENT_COMPLETED_DELIVERY_FEE_REQUIRED:'Set the delivery charge explicitly for a completed order.',AMENDMENT_LOYALTY_BALANCE_NEEDS_REVIEW:'The loyalty points needed for this correction have already been spent. No changes were saved; this needs a loyalty review.',AMENDMENT_LOYALTY_ACCOUNT_REQUIRED:'The settled loyalty account could not be found. No changes were saved; this needs a loyalty review.',AMENDMENTS_DISABLED:'Order amendments are not enabled yet.',INVALID_PAYMENT_REQUEST:'Order amendments are not enabled on this server yet.',AMENDMENT_UNAVAILABLE:'Amendments are temporarily unavailable. Please try again.',AMENDMENT_PAYMENT_ALREADY_RECORDED:'Payment has already been recorded. This order needs a separate payment adjustment.',AMENDMENT_LOYALTY_ALREADY_SETTLED:'Loyalty has already been settled. This order needs a separate adjustment.',AMENDMENT_REQUIRES_ACTIVE_ORDER:'This order status cannot be amended here.',AMENDMENT_ORDER_CHANGED_REFRESH:'The order changed. Close and reopen Amend to load the latest version.',AMENDMENT_PRICE_CHANGED_REVIEW:'The delivery quote changed. Review the revised totals again before saving.',AMENDMENT_SCHEDULE_NOT_AVAILABLE:'The revised collection/delivery arrangement could not be scheduled safely. No changes were saved. Use Suggest to agree another time, then try again.',AMENDMENT_EXISTING_TOTALS_NEED_REVIEW:'The existing order totals need a financial review before they can be amended.',DISCOUNT_NOT_AVAILABLE:'This discount code is unavailable or its limit has been reached.',DISCOUNT_WRONG_SERVICE_DAY:'This code cannot be used on the order’s service day.',DELIVERY_ADDRESS_NOT_ELIGIBLE:'The address could not be verified within our normal 3-mile area. For an agreed exception, tick the staff delivery-area override and set the charge.',DELIVERY_ADDRESS_REQUIRED:'Enter the delivery address.',AMENDMENT_DELIVERY_ALREADY_STARTED:'This delivery trip has already started. Its type or address cannot be changed here.',AMENDMENT_NO_CHANGES:'No changes to save.'};
 async function mount(){
  async function enabled(path,key){
   try{const response=await fetch(path,{cache:'no-store',signal:AbortSignal.timeout(5000)});return response.ok&&(await response.json())[key]===true;}
   catch(_){return false;}
  }
  const [masterWokEnabled,legacyEnabled]=await Promise.all([
   enabled('/api/payments','enabled'),enabled('/admin-api/amendments','legacyEnabled')
  ]);
  if(!masterWokEnabled&&!legacyEnabled)return;
  const eligible=button=>button.dataset.legacyAmend==='true'?legacyEnabled:
   masterWokEnabled&&button.closest('tr')?.dataset.capacityScheduler!=='LEGACY';
  let legacy=false;
  const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Amend order');dialog.className='rtk-amend-dialog';const style=document.createElement('style');style.textContent='.rtk-amend-dialog p{margin:10px 0}.rtk-amend-dialog table{table-layout:fixed!important}.rtk-amend-dialog table td{padding:6px 4px!important;height:auto!important;white-space:pre-line!important;line-height:1.3!important;font-size:14px!important}.rtk-amend-dialog table tr:first-child{font-weight:bold}';document.head.append(style);dialog.style.cssText='width:500px;max-width:calc(100% - 40px);max-height:90vh;overflow:auto;border:1px solid #ddd;border-radius:12px;padding:22px';
  dialog.innerHTML='<h2>Amend order</h2><p data-summary></p><p data-time></p><section data-time-confirm hidden><p data-time-confirm-summary></p><p><label>Reason <textarea data-time-confirm-reason maxlength="500" rows="2" style="width:100%"></textarea></label></p><button type="button" class="btn" data-time-confirm-save>Record agreed time</button></section><form hidden><p data-order-type><label>Order type <select name="orderType"><option value="collection">Collection</option><option value="delivery">Delivery</option></select></label></p><div data-delivery><p data-delivery-address><label>Delivery address <textarea name="deliveryAddress" maxlength="1000" rows="3" style="width:100%"></textarea></label></p><p data-area-override><label><input type="checkbox" name="deliveryAreaOverride"> Allow delivery outside the normal 3-mile area</label><br><small>Staff exception only. Set the delivery charge and explain why below. Address verification and delivery timing still apply.</small></p><p><label>Delivery charge <select name="feeMode" data-fee-mode><option value="auto">Calculate automatically</option><option value="manual">Set amount</option></select></label> <label data-fee>Amount (£) <input name="deliveryFee" type="number" min="0" max="100" step="0.01"></label></p></div><p><label>Discount code <input name="discountCode" maxlength="80" autocomplete="off"></label><br><small>Leave blank to remove a code. Existing loyalty is retained where possible.</small></p><fieldset data-legacy-items hidden><legend>Order items</legend><div data-item-quantities></div><p><label>Add Jasmine Rice (£2 per portion) <input type="number" name="jasmineRice" min="0" max="99" step="1" value="0" required></label></p><div data-menu-pickers hidden></div><button type="button" data-add-dish hidden>Add another dish</button></fieldset><p data-discretionary-discount hidden><label>Discretionary discount (£) <input name="discretionaryDiscount" type="number" min="0" step="0.01" required disabled></label><br><small>Enter the total discretionary discount. Use £0 to remove it.</small></p><p><label>Reason for change <textarea name="reason" required maxlength="500" rows="2" style="width:100%"></textarea></label></p><p data-explanation>The booked time stays the same. For delivery it means arrival at the customer’s door. Agree the change with the customer; this action does not send a message.</p><button class="btn" type="submit">Review changes</button></form><div data-review></div><button class="btn" data-save hidden>Save amendment</button><p role="status"></p><button class="btn" data-close>Close</button><details><summary>Amendment history</summary><div data-history></div></details>';
  document.body.append(dialog);const form=dialog.querySelector('form'),status=dialog.querySelector('[role=status]'),summary=dialog.querySelector('[data-summary]'),review=dialog.querySelector('[data-review]'),save=dialog.querySelector('[data-save]'),close=dialog.querySelector('[data-close]');
  const timePanel=dialog.querySelector('[data-time-confirm]'),timeReason=dialog.querySelector('[data-time-confirm-reason]'),timeButton=dialog.querySelector('[data-time-confirm-save]');
  const itemsPanel=form.querySelector('[data-legacy-items]');
  const quantitiesPanel=form.querySelector('[data-item-quantities]');
  Object.assign(messages,{
   INVALID_DISCRETIONARY_DISCOUNT:'Enter a non-negative discount in pounds and pence.',
   DISCRETIONARY_DISCOUNT_TOO_HIGH:'Leave at least £0.01 of the food subtotal after all discounts.',
   AMENDMENT_ITEM_CAPACITY_FULL:'The extra kitchen work does not fit before the booked time.',
   AMENDMENT_ITEM_CAPACITY_UNAVAILABLE:'The kitchen schedule is incomplete. Try again shortly.',
   AMENDMENT_ITEM_BOOKED_TIME_REQUIRED:'Agree a booked time before increasing the kitchen load.',
   INVALID_AMENDMENT_MENU_SELECTION:'Choose a valid dish, quantity and options.',
   AMENDMENT_MENU_MODIFIER_REQUIRED:'Choose a protein or other required option for the dish.',
   AMENDMENT_ITEM_CAPACITY_REQUIRED:'Increasing this quantity needs a new kitchen capacity check.',
   AMENDMENT_ORDER_REQUIRES_ITEMS:'Keep at least one item on the order.',
   AMENDMENT_ITEMS_DISABLED:'Item changes are unavailable. Reopen Amend to refresh the order.'
  });
  const manualPanel=form.querySelector('[data-discretionary-discount]');
  function showManualDiscount(order){
   const enabled=legacy&&order?.discretionary_discount_amount!=null;
   manualPanel.hidden=!enabled;
   form.elements.discretionaryDiscount.value=enabled?Number(order.discretionary_discount_amount).toFixed(2):'';
  }
  const menuPickers=form.querySelector('[data-menu-pickers]');
  const addDish=form.querySelector('[data-add-dish]');
  function option(value,text){
   const node=document.createElement('option');
   node.value=value;
   node.textContent=text;
   return node;
  }
  function menuField(container,label,input){
   const row=document.createElement('p');
   const caption=document.createElement('label');
   caption.append(label+' ',input);
   row.append(caption);
   container.append(row);
  }
  function appendDishPicker(menu,removable=false){
   const row=document.createElement('div');
   const menuSelect=document.createElement('select');
   const menuOptions=document.createElement('div');
   menuSelect.name='menuItem';
   menuSelect.append(option('','Choose a dish'));
   for(const [id,item] of Object.entries(menu))
    menuSelect.append(option(id,item.category+' · '+item.name+' ('+money(item.price)+')'));
   menuField(row,'Add a dish',menuSelect);
   row.append(menuOptions);
   if(removable){
    const remove=document.createElement('button');
    remove.type='button';
    remove.textContent='Remove dish';
    remove.onclick=()=>{
     row.remove();
     clearReview();
     status.textContent='Review the changes before saving.';
     addDish.focus();
    };
    row.append(remove);
   }
   menuSelect.addEventListener('change',()=>{
    menuOptions.replaceChildren();
    const item=menu[menuSelect.value];
    if(item)renderDishOptions(menuOptions,item);
   });
   menuPickers.append(row);
   if(removable)menuSelect.focus();
  }
  function showMenu(menu){
   menuPickers.hidden=!menu;
   addDish.hidden=!menu||!current?.menuSupportsMultiple;
   form.elements.jasmineRice.closest('p').hidden=!!menu;
   menuPickers.replaceChildren();
   if(menu)appendDishPicker(menu);
  }
  addDish.onclick=()=>appendDishPicker(current.menu,true);
  function renderDishOptions(menuOptions,item){
   const qty=document.createElement('input');
   Object.assign(qty,{type:'number',name:'menuQuantity',min:'1',max:'99',step:'1',required:true,value:'1'});
   menuField(menuOptions,'Portions',qty);
   for(const [name,label,options,required] of [
    ['menuModifier','Protein or option',item.modifiers,item.modifierRequired],
    ['menuExtra','Extra',item.extras,false]
   ]){
    if(!options.length)continue;
    const select=document.createElement('select');
    Object.assign(select,{name,required});
    select.append(option('',required?'Choose an option':'None'));
    for(const entry of options) select.append(option(entry.id,entry.name+' (+'+money(entry.delta)+')'));
    menuField(menuOptions,label,select);
   }
   if(item.spice){
    const spice=document.createElement('select');
    spice.name='menuSpice';
    ['No spice','Mild','Medium','Very spicy'].forEach((label,level)=>{
     if(level>=item.spice.min) spice.append(option(String(level),label));
    });
    spice.value=String(Math.max(item.spice.min,item.spice.default));
    menuField(menuOptions,'Spice',spice);
   }
  }
  function showItems(items,menu){
   itemsPanel.hidden=!Array.isArray(items)||items.length===0;
   quantitiesPanel.replaceChildren();
   showMenu(itemsPanel.hidden?null:menu);
   if(itemsPanel.hidden)return;
   for(const item of items){
    const row=document.createElement('p');
    const label=document.createElement('label');
    const quantity=document.createElement('input');
    quantity.type='number';
    quantity.min='0';
    quantity.max=String(item.kitchen_load!=null&&(menu||Number(item.kitchen_load)===0)?Math.max(99,item.qty):item.qty);
    quantity.step='1';
    quantity.required=true;
    quantity.value=String(item.qty);
    quantity.dataset.lineId=item.id;
    label.append(itemDescription(item)+' · Quantity ',quantity);
    row.append(label);
    quantitiesPanel.append(row);
   }
   const help=document.createElement('p');
   help.textContent=menu?'Set quantity to 0 to remove an item. We check the booked time before adding kitchen work.':'Set quantity to 0 to remove an item. Quantities that use kitchen capacity can be reduced here.';
   quantitiesPanel.append(help);
  }
  function itemDescription(item){
   const modifiers=(Array.isArray(item.modifiers)?item.modifiers:[]).map(modifier=>modifier.name).filter(Boolean);
   return [item.name,...modifiers,item.spice==null?'':'spice '+item.spice,item.item_note].filter(Boolean).join(' · ');
  }
  function describeItems(items){
   return items.map(item=>item.qty+' × '+itemDescription(item)).join('\n');
  }
  function editedItems(){
   if(itemsPanel.hidden)return {};
   const quantities=Object.fromEntries([...quantitiesPanel.querySelectorAll('input')].map(input=>[
    input.dataset.lineId, input.valueAsNumber
   ]).filter(([id,quantity])=>current.items.some(item=>item.id===id&&item.qty!==quantity)));
   const jasmineRice=form.elements.jasmineRice.valueAsNumber;
   const additions=[];
   for(const row of menuPickers.children){
    const value=name=>row.querySelector('[name='+name+']')?.value;
    const id=value('menuItem');
    if(!id)continue;
    const spice=value('menuSpice');
    additions.push({
     id,qty:Number(value('menuQuantity')),modifier:value('menuModifier')||null,
     extra:value('menuExtra')||null,spice:spice==null?null:Number(spice)
    });
   }
   const add=current.menuSupportsMultiple?additions:additions[0];
   return Object.keys(quantities).length||jasmineRice||additions.length
    ?{items:{quantities,jasmineRice,...(additions.length?{add}:{})}}:{};

  }
  let current=null,busy=false,pending=null,pendingTime=null,uncertain=false;
  const money=v=>'£'+Number(v||0).toFixed(2),fields=()=>[...form.querySelectorAll('input,select,textarea,button'),timeReason,timeButton];
  function lock(value){busy=value;fields().forEach(n=>n.disabled=value||uncertain||(n===form.elements.discretionaryDiscount&&manualPanel.hidden));close.disabled=value||uncertain;save.disabled=value;timeButton.disabled=value;}
  function showType(){const override=form.elements.deliveryAreaOverride.checked&&!current?.completedAmendment;form.elements.feeMode.querySelector('option[value=auto]').disabled=!!current?.completedAmendment||override;if(override)form.elements.feeMode.value='manual';dialog.querySelector('[data-area-override]').hidden=legacy||!!current?.completedAmendment;const delivery=form.elements.orderType.value==='delivery';dialog.querySelector('[data-delivery]').hidden=!delivery;dialog.querySelector('[data-fee]').hidden=form.elements.feeMode.value!=='manual';form.elements.deliveryAddress.required=delivery&&!legacy&&!current?.completedAmendment;}
  async function request(payload){const r=await fetch('/admin-api/amendments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(legacy?{...payload,scheduler:'LEGACY'}:payload),redirect:'error',signal:AbortSignal.timeout(25000)});const data=await r.json();if(!r.ok||data.success!==true){const e=Error(messages[data.reason]||data.error||'The amendment could not be confirmed.');e.definitive=r.status>=400&&r.status<500;throw e;}return data;}
  function clearReview(){pending=null;save.hidden=true;review.replaceChildren();}
  function renderReview(data){
   review.replaceChildren();const table=document.createElement('table');table.style.cssText='width:100%;margin:16px 0';
   for(const row of [['','Current','Revised'],...(Array.isArray(data.before.items)?[['Items',describeItems(data.before.items),describeItems(data.after.items)],['Food subtotal',money(data.before.subtotal),money(data.after.subtotal)]]:[]),...(legacy?[]:[['Order type',data.before.order_type,data.after.order_type]]),['Delivery charge',money(data.before.delivery_fee),money(data.after.delivery_fee)],['Discount code',data.before.discount_code||'None',data.after.discount_code||'None'],['Code discount',money(data.before.discount_amount),money(data.after.discount_amount)],...(legacy&&data.after.discretionary_discount_amount!=null?[['Discretionary discount',money(data.before.discretionary_discount_amount),money(data.after.discretionary_discount_amount)]]:[]),...(legacy?[]:[['Loyalty discount',money(data.before.loyalty_discount),money(data.after.loyalty_discount)]]),['Total',money(data.before.total),money(data.after.total)]]){const tr=document.createElement('tr');for(const text of row){const td=document.createElement('td');td.textContent=text;td.style.whiteSpace='pre-line';tr.append(td);}table.append(tr);}review.append(table);
   if(data.deliveryAreaOverride){const p=document.createElement('p');p.textContent='Staff delivery-area exception: '+(data.deliveryAreaOverride.straightLineMiles==null?'distance not recorded':Number(data.deliveryAreaOverride.straightLineMiles).toFixed(2)+' miles straight-line; normal limit 3 miles')+'. Reason: '+data.deliveryAreaOverride.reason;review.append(p);}
   if(data.completedAmendment){const payment=data.paymentAfter,p=document.createElement('p');p.textContent=payment?.recorded?'Already received towards bill: '+money(payment.billAmount)+' · Tips: '+money(payment.tipAmount)+' (unchanged). '+(Number(payment.balance.underpayment)>0?'Underpaid '+money(payment.balance.underpayment):Number(payment.balance.overpayment)>0?'Overpaid '+money(payment.balance.overpayment):'Bill paid in full')+'.':payment?.methodUnknown?'Previously marked paid; actual amount and method are unknown. No payment details will be invented.':'No payment receipt recorded. This amendment does not record a payment.';review.append(p);if(data.loyaltyAdjustment){const l=document.createElement('p');l.textContent='Loyalty points balance: '+data.loyaltyAdjustment.before.pointsBalance+' → '+data.loyaltyAdjustment.after.pointsBalance;review.append(l);}}
  }
  form.addEventListener('input',()=>{if(!busy&&!uncertain){clearReview();status.textContent='Review the changes before saving.';showType();}});
  form.elements.orderType.addEventListener('change',()=>{form.elements.feeMode.value=current?.completedAmendment?'manual':'auto';showType();});
  close.onclick=()=>{if(!busy&&!uncertain)dialog.close();};dialog.addEventListener('cancel',e=>{if(busy||uncertain)e.preventDefault();});
  function reveal(){document.querySelectorAll('[data-amend-order]').forEach(n=>n.hidden=!eligible(n));}
  reveal();const rows=document.getElementById('tbody');if(rows)new MutationObserver(reveal).observe(rows,{childList:true});
  document.addEventListener('click',async e=>{
   const button=e.target.closest?.('[data-amend-order]');if(!button||!eligible(button))return;e.preventDefault();e.stopImmediatePropagation();if(dialog.open)return;
   legacy=button.dataset.legacyAmend==='true';
   for(const selector of ['[data-order-type]','[data-delivery-address]','[data-fee-mode]'])dialog.querySelector(selector).hidden=legacy;
   current=null;uncertain=false;pendingTime=null;timePanel.hidden=true;timeReason.value='';form.reset();showItems(null);showManualDiscount(null);form.hidden=true;clearReview();summary.textContent='Loading order…';dialog.querySelector('[data-time]').textContent='';status.textContent='';dialog.querySelector('[data-history]').replaceChildren();dialog.showModal();lock(true);
   try{const data=await request({action:'amend_read',orderId:button.dataset.amendOrder});current=data;const o=data.order;showItems(legacy?data.items:null,legacy?data.menu:null);showManualDiscount(o);
    summary.textContent=(o.order_ref||'Order')+' · Current total '+money(o.total);const time=o.confirmed_time||o.preferred_time;dialog.querySelector('[data-time]').textContent='Booked time: '+(time?new Date(time).toLocaleString('en-GB',{timeZone:'Europe/London'}):'Unavailable');
    form.elements.orderType.value=o.order_type;form.elements.deliveryAddress.value=o.delivery_address||'';form.elements.discountCode.value=o.discount_code||'';form.elements.feeMode.value=legacy||data.completedAmendment||o.order_type==='delivery'?'manual':'auto';form.elements.feeMode.querySelector('option[value=auto]').disabled=!!data.completedAmendment;dialog.querySelector('[data-explanation]').textContent=legacy?'Review the revised price and provide a reason for the audit history.':data.completedAmendment?'This corrects a completed order. Payment received and tips stay unchanged. No refund or extra payment is taken. Kitchen and delivery history stay unchanged; no customer message is sent. Set any delivery charge explicitly.':'The booked time stays the same. For delivery it means arrival at the customer’s door. Agree the change with the customer; this action does not send a message.';form.elements.deliveryFee.value=Number(o.delivery_fee||0).toFixed(2);showType();form.hidden=!!data.staffTimeConfirmationAvailable;timePanel.hidden=!data.staffTimeConfirmationAvailable;if(data.staffTimeConfirmationAvailable){const agreed=new Date(o.proposed_time).toLocaleString('en-GB',{timeZone:'Europe/London'});dialog.querySelector('[data-time-confirm-summary]').textContent='Record the customer’s agreement to '+agreed+'. Kitchen and delivery capacity will be checked. This records staff confirmation and sends no customer message.';timeButton.textContent='Record agreed '+new Date(o.proposed_time).toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'})+' time';timeReason.value=o.status==='customer_declined_time'?'Customer selected Decline by mistake; agreed time confirmed with staff.':'';}
    const history=dialog.querySelector('[data-history]');if(!data.history.length)history.textContent='No amendments recorded.';
    for(const item of data.history){const p=document.createElement('p');p.textContent=new Date(item.occurred_at).toLocaleString('en-GB',{timeZone:'Europe/London'})+' · '+item.actor+' · '+item.reason+' · '+money(item.before_details.total)+' → '+money(item.after_details.total);if(item.after_details.time_confirmation)p.textContent+=' · Agreed time recorded by staff: '+new Date(item.after_details.time_confirmation.agreedTime).toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'});if(item.after_details.delivery_area_override)p.textContent+=' · Staff delivery-area exception ('+Number(item.after_details.delivery_area_override.straightLineMiles).toFixed(2)+' miles)';history.append(p);}
   }catch(error){status.textContent=error.message;}finally{lock(false);}
  },true);
  timeReason.addEventListener('input',()=>{if(!busy&&!uncertain)pendingTime=null;});
  timeButton.onclick=async()=>{
   if(busy||!current||!current.staffTimeConfirmationAvailable)return;
   if(!pendingTime){const reason=timeReason.value.trim();if(!reason){status.textContent='Enter a reason for recording the agreed time.';return;}pendingTime={action:'amend_confirm_time',orderId:current.order.id,expectedVersion:current.version,reason,idempotencyKey:crypto.randomUUID()};}
   lock(true);status.textContent='Checking capacity and recording the agreed time…';
   try{const data=await request(pendingTime);uncertain=false;pendingTime=null;timePanel.hidden=true;current=null;dialog.querySelector('[data-time]').textContent='Booked time: '+new Date(data.after.confirmed_time).toLocaleString('en-GB',{timeZone:'Europe/London'});status.textContent='Agreed time recorded: '+new Date(data.after.confirmed_time).toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'})+'. No customer message was sent.';document.getElementById('refresh')?.click();}
   catch(error){uncertain=!error.definitive;status.textContent=error.message+(uncertain?' Retry the same confirmation; do not create another.':'');if(!uncertain)pendingTime=null;else timeButton.textContent='Retry same time confirmation';}
   finally{lock(false);}
  };
  form.onsubmit=async e=>{e.preventDefault();if(busy||!current)return;clearReview();lock(true);status.textContent=legacy?'Checking revised totals…':current.completedAmendment?'Checking revised totals, payment balance and loyalty…':'Checking the revised totals and schedule…';
   const changes=legacy?{...editedItems(),...(!manualPanel.hidden?{discretionaryDiscount:form.elements.discretionaryDiscount.value}:{}),discountCode:form.elements.discountCode.value.trim(),...(current.order.order_type==='delivery'?{deliveryFee:form.elements.deliveryFee.value}:{})}:{orderType:form.elements.orderType.value,deliveryAddress:form.elements.deliveryAddress.value.trim(),deliveryFee:form.elements.orderType.value==='delivery'&&form.elements.feeMode.value==='manual'?form.elements.deliveryFee.value:'',discountCode:form.elements.discountCode.value.trim(),deliveryAreaOverride:form.elements.orderType.value==='delivery'&&!current.completedAmendment&&form.elements.deliveryAreaOverride.checked};
   try{const data=await request({action:'amend_preview',orderId:current.order.id,expectedVersion:current.version,changes,reason:form.elements.reason.value.trim()});renderReview(data);pending={action:'amend_save',orderId:current.order.id,expectedVersion:current.version,expectedPreview:data.preview,changes,reason:form.elements.reason.value.trim(),idempotencyKey:crypto.randomUUID()};save.textContent='Save amendment';save.hidden=false;status.textContent='Checked. Review the figures, then save.';}catch(error){status.textContent=error.message;}finally{lock(false);}
  };
  save.onclick=async()=>{if(busy||!pending)return;lock(true);status.textContent=uncertain?'Checking the same amendment…':'Saving amendment…';
   try{const data=await request(pending);uncertain=false;form.hidden=true;renderReview(data);save.hidden=true;pending=null;status.textContent='Amendment saved. Reprint the order ticket if needed. No customer message was sent.';document.getElementById('refresh')?.click();}
   catch(error){uncertain=!error.definitive;status.textContent=error.message+(uncertain?' Retry the same amendment; do not create another one.':' Review the changes again before saving.');if(!uncertain){pending=null;save.hidden=true;}else save.textContent='Retry same amendment';}
   finally{lock(false);}
  };
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
