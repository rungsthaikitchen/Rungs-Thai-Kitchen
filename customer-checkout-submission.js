// Checkout responsibility module; initialized explicitly by customer-checkout.js.
(function(root){
 // Preserve the original classic-script semantics during this extraction.
 function create(context){
  const {window,document,console}=context;
let isSubmittingOrder = false;
const handler=async (e) => {

  e.preventDefault();

  // HARD GUARD: date and time are mandatory
  const submitDateValue =
    document.getElementById('cust-preferred-date')?.value?.trim() || '';

  const submitTimeSelectValue =
    document.getElementById('cust-preferred-time-select')?.value?.trim() || '';

  const submitPreferredTimeValue =
    document.getElementById('cust-preferred-time')?.value?.trim() || '';

  if (!submitDateValue) {
    context.checkoutMsg.style.color = '#b02a2a';
    context.checkoutMsg.textContent =
      'Please select a date for your order.';

    document.getElementById('cust-preferred-date')?.focus();
    return;
  }

  if (!submitTimeSelectValue || !submitPreferredTimeValue) {
    context.checkoutMsg.style.color = '#b02a2a';
    context.checkoutMsg.textContent =
      'Please select an available time for your order.';

    document.getElementById('cust-preferred-time-select')?.focus();
    return;
  }

  await (0, context.loadServiceState)();

  if (context.SERVICE_STATE.mode === 'paused') {
    (0, context.showPausedOrderAlert)(
      context.SERVICE_STATE.customer_message
    );

    console.warn(
      '[checkout] submit blocked - orders paused'
    );
    return;
  }

  const submitPreferredTimeEl =
  document.getElementById('cust-preferred-time');

if (submitPreferredTimeEl?.value) {

  const selectedTime =
    new Date(submitPreferredTimeEl.value);

  // Get the very latest kitchen commitments
  await (0, context.refreshKitchenSlotMap)(selectedTime);

  // A time after normal closing may only be accepted as a
// same-day overrun while today's normal ordering window is still open.
const normalClose = new Date(selectedTime);
const [closeHour, closeMinute] =
  context.OPEN_WINDOW.end.split(':').map(Number);

normalClose.setHours(
  closeHour,
  closeMinute,
  0,
  0
);

const nowForSubmit = new Date();

const isOverrunTime =
  selectedTime > normalClose;

const isSameDayOrder =
  (0, context.toYMD)(selectedTime) === (0, context.toYMD)(nowForSubmit);

const beforeNormalClose =
  nowForSubmit < normalClose;

const selectedTimeIsAllowed =
  isOverrunTime
    ? (
        isSameDayOrder &&
        beforeNormalClose &&
        (0, context.isAllowedForAlternativeFulfilment)(selectedTime)
      )
    : (0, context.isAllowed)(selectedTime);

 // Is the customer's selected slot still available?
if (!selectedTimeIsAllowed) {
  
  const selectedTimeText =
    selectedTime.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });

  // Rebuild the visible dropdown using the latest
  // kitchen commitments we have just loaded.
  if (
    context.preferredDateInput?.value &&
    typeof context.populatePreferredTimeSelect === 'function'
  ) {
    await (0, context.populatePreferredTimeSelect)(
      context.preferredDateInput.value
    );
  }

  // Do not silently move the customer's order.
  context.preferredTimeHidden.value = '';

  if (context.preferredTimeSelect) {
    context.preferredTimeSelect.value = '';
  }

  (0, context.showPreferredTimeMessage)(
    `Sorry — ${selectedTimeText} has just become unavailable. ` +
    `Please choose another available time.`
  );

  console.log(
    '[kitchen-schedule] submit blocked; selected time no longer available:',
    selectedTime
  );

  return;
}
}

  // Final safety check against closures / fully-booked windows
  if (!(0, context.validatePreferredTime)()) {
    return;
  }

  if (isSubmittingOrder) return;
  isSubmittingOrder = true;

  const submitBtn = context.checkoutForm.querySelector('button[type="submit"], input[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  context.checkoutMsg.style.color = '';
  context.checkoutMsg.textContent = 'Placing order…';

  try {
    const name      = document.getElementById('cust-name').value.trim();
    const email     = document.getElementById('cust-email').value.trim();
    const phone     = document.getElementById('cust-phone').value.trim();
    const address   = document.getElementById('cust-address').value.trim();
    const orderType = document.querySelector('input[name="order-type"]:checked')?.value || 'collection';
    if (orderType === 'delivery' && window.isCollectionOnlyOrderDate?.(document.getElementById('cust-preferred-date')?.value)) {
      context.checkoutMsg.style.color = '#b02a2a';
      context.checkoutMsg.textContent = 'Delivery is unavailable on Saturday 31 October. Please select Collection.';
      isSubmittingOrder = false;
      if (submitBtn) submitBtn.disabled = false;
      return;
    }
    const notes     = document.getElementById('cust-notes').value.trim() || null;

    // ASAP checkbox
    const asapCheckbox   = document.getElementById('cust-asap');
    const asapRequested  = !!(asapCheckbox && asapCheckbox.checked);

    // Preferred time input
    const preferredInput   = document.getElementById('cust-preferred-time');
    const preferredTimeRaw = preferredInput ? preferredInput.value : "";
    if (orderType === 'delivery' && window.isLateDeliverySlot(preferredTimeRaw.slice(0, 10), preferredTimeRaw.slice(11, 16))) {
      (0, context.showPreferredTimeMessage)('Please choose collection for slots from 7:30pm.');
      return;
    }
    const selectedLocal    = preferredTimeRaw ? new Date(preferredTimeRaw) : null;

    // Only store a preferred_time in DB if NOT ASAP
    const preferredTimeISO =
      (!asapRequested && selectedLocal) ? selectedLocal.toISOString() : null;

    // Communication preference (sms / email)
    const commPrefInput = document.querySelector(
      'input[name="communication_preference"]:checked'
    );
    const communicationPreference = commPrefInput
      ? commPrefInput.value
      : 'sms';

    // ---------- Basic validation ----------
    if (!name){
      context.checkoutMsg.style.color='#b02a2a';
      context.checkoutMsg.textContent='Please enter your full name.';
      return;
    }
    if (!email){
      context.checkoutMsg.style.color='#b02a2a';
      context.checkoutMsg.textContent='Please enter your email.';
      return;
    }
    if (!phone){
      context.checkoutMsg.style.color='#b02a2a';
      context.checkoutMsg.textContent='Please enter your phone number.';
      return;
    }
    if (orderType === 'delivery' && !address){
      context.checkoutMsg.style.color='#b02a2a';
      context.checkoutMsg.textContent='Please enter your delivery address.';
      document.getElementById('cust-address').focus();
      return;
    }
	
	if (orderType === 'delivery') {
  const subtotalNow = context.basket.reduce((sum, item) => {
    return sum + (Number(item.unitPrice || 0) * Number(item.qty || 1));
  }, 0);

  const quote = window.deliveryQuoteState || {};
  const deliveryFeeNow = Number(quote.fee || 0);
  const routeMilesNow = Number(
    quote.routeMiles ??
    quote.route_miles ??
    quote.distanceMiles ??
    quote.distance_miles ??
    0
  );

  if (quote.loading || quote.status === 'loading') {
  context.checkoutMsg.style.color = '#b02a2a';
  context.checkoutMsg.textContent =
    'We are still checking your delivery address. Please wait a moment and try again.';
  return;
}

const hasFreeDelivery = subtotalNow >= context.DELIVERY_FREE_THRESHOLD;

if (!hasFreeDelivery && deliveryFeeNow <= 0) {
  context.checkoutMsg.style.color = '#b02a2a';
  context.checkoutMsg.textContent =
    'Sorry, we could not calculate your delivery fee. Please check your address and try again.';
  document.getElementById('cust-address').focus();
  return;
}

if (!hasFreeDelivery && (!routeMilesNow || routeMilesNow <= 0)) {
  context.checkoutMsg.style.color = '#b02a2a';
  context.checkoutMsg.textContent =
    'Sorry, we could not confirm your delivery distance. Please check your address and try again.';
  document.getElementById('cust-address').focus();
  return;
}
}
			// ---------- Basket + totals ----------
			const itemsSnapshot = context.basket.map(i => ({ ...i }));
			const subtotal = Math.round(itemsSnapshot.reduce((s,i)=> s + i.unitPrice * i.qty, 0) * 100) / 100;

			// fulfilment time + ASAP (match checkout rules) — use UNIQUE names here
			const preferredTimeRawTotals =
			  (document.getElementById('cust-preferred-time')?.value ||
			   document.getElementById('preferred-time')?.value ||
			   document.querySelector('input[name="preferred_time"]')?.value ||
			   '').trim();

			const asapRequestedTotals =
			  !!document.querySelector('input[name="asap_requested"]:checked') ||
			  !!document.getElementById('asap')?.checked ||
			  !!document.getElementById('asap-requested')?.checked ||
			  !!document.getElementById('asapRequested')?.checked;

			// discount based on fulfilment day (Wed/Thu), ASAP uses "today" (Option A)
			const disc = (0, context.applyWedThuDiscount)(subtotal, preferredTimeRawTotals, asapRequestedTotals);

			const discountCodeAmount = Number(context.appliedDiscountAmount || 0);

			const discountedSubtotal = Math.max(
			  0,
			  Number(disc.discountedSubtotal || subtotal) - discountCodeAmount
			);

			// ✅ Delivery threshold based on PRE-discount subtotal
			const deliveryFee =
			  (orderType === 'delivery' && subtotal < 20) ? 3.00 : 0.00;

			// Final total used for checkout / order message
			const total = Math.round((discountedSubtotal + deliveryFee) * 100) / 100;




    function fail(step, err){
      console.error(`[Checkout] ${step} failed:`, err);
      context.checkoutMsg.style.color = '#b02a2a';
      context.checkoutMsg.textContent =
        `${step} failed: ${err?.message || err?.hint || 'Unknown error'}`;
    }

    let customerId=null,orderRef=null,orderId=null,submitTotals=null;
    const previewTotals=(0, context.recomputeCheckoutTotals)();
    if(!window.RTKBookingClient)throw new Error('Ordering service is still loading. Please reload and try again.');
    const booking=await window.RTKBookingClient.submit({
      preferredTime:preferredTimeISO,orderType,
      ...(window.RTKApprovedReview?{reviewApprovalToken:window.RTKApprovedReview.token,reviewHoldingAcknowledged:document.getElementById('review-holding-ack')?.checked===true}:{}),
      customer:{name,email,phone,address},notes,
      items:itemsSnapshot.map(line=>({item_id:line.itemId,qty:line.qty,
        modifiers:(line.mods||[]).map(mod=>({id:mod.id})),spice:line.spice??null,
        item_note:line.item_note||null})),
      discountCode:context.appliedDiscountCode||null,
      paymentPreference:document.querySelector('input[name="paymentPreference"]:checked')?.value||'on_arrival',
      communicationPreference,
      expectedTotals:{subtotal:Number(previewTotals.subtotal),total:Number(previewTotals.total),
        delivery_fee:Number(previewTotals.delivery_fee),loyalty_discount:Number(previewTotals.loyalty_discount||0),
        discount:Math.round((Number(previewTotals.subtotal)+Number(previewTotals.delivery_fee)-Number(previewTotals.total))*100)/100}
    });
    const masterWokManaged=booking.route==='MASTER_WOK';
    if(masterWokManaged){
      orderId=booking.order.orderId;orderRef=booking.order.orderRef;customerId=booking.order.customerId;
      // Keep the receipt's existing separate voucher/loyalty display contract.
      submitTotals={...previewTotals,...booking.order.totals,discount:Number(booking.order.totals.discount_amount||0)};
      window.__checkoutTotals=submitTotals;
    }else{
    // ---------- Get or create customer ----------
    customerId = null;
    try {
      const row = await (0, context.getOrCreateCustomer)({
        name,
        email: email?.trim().toLowerCase() || null,
        phone: phone?.trim() || null,
        address
      });
      customerId = row?.id;
    } catch (err) {
      context.checkoutMsg.style.color = '#b02a2a';
      context.checkoutMsg.textContent =
        'Saving your details had a hiccup — trying again…';
      const row = await (0, context.getOrCreateCustomer)({
        name,
        email: email?.trim().toLowerCase() || null,
        phone: phone?.trim() || null,
        address
      });
      customerId = row?.id;
    }
    if (!customerId) {
      context.checkoutMsg.style.color = '#b02a2a';
      context.checkoutMsg.textContent = 'Sorry — we could not save your details.';
      return;
    }

    // ---------- Global sequential order ref ----------
    orderRef = 'RTK-???';
    try {
      orderRef = await (0, context.getNextOrderRef)();
    } catch (err) {
      console.warn('Falling back to timestamp-based ref');
      orderRef = 'RTK-' + Date.now();
    }

    // ---------- Payment preference ----------
    const paymentPreferenceInput = document.querySelector(
      'input[name="paymentPreference"]:checked'
    );
    const payment_preference = paymentPreferenceInput
      ? paymentPreferenceInput.value
      : 'on_arrival';
	  
				  if (context.getSelectedOrderType === "delivery") {
				  const quote = window.deliveryQuoteState || context.deliveryQuoteState;

				  // ✅ Outside radius wins over free-delivery messaging
				  if (quote && quote.eligible === false) {
					context.deliveryMessageEl.textContent =
					  quote.reason || "Sorry, this address is outside our 3-mile delivery area. Please call us on 0113 469 9564 and we’ll see what we can do 😊";
					context.deliveryMessageEl.className = "delivery-message delivery-error";
					return;
				  }

				  // ✅ Only show free delivery upsell if still eligible / not yet known to be ineligible
				  if (context.checkoutBaseSubtotal < 30) {
					context.deliveryMessageEl.textContent = "🎉 Free delivery on orders over £30";
					context.deliveryMessageEl.className = "delivery-message delivery-info";
					return;
				  }

				  if (context.checkoutBaseSubtotal >= 30) {
					context.deliveryMessageEl.textContent = "🎉 Free delivery applied";
					context.deliveryMessageEl.className = "delivery-message delivery-success";
					return;
				  }
				}

			// 🚫 Block delivery orders outside delivery area
				const latestTotals = (0, context.recomputeCheckoutTotals)();
				const latestQuote = window.deliveryQuoteState || context.deliveryQuoteState;

				if ((0, context.getSelectedOrderType)() === "delivery") {
				  if (latestQuote?.loading) {
					alert("Please wait while we check your delivery address.");
					return;
				  }

				  if (latestQuote?.eligible === false || latestTotals?.delivery_blocked === true) {
					alert(
					  latestQuote?.reason ||
					  "Sorry, this address is outside our 3-mile delivery radius. Please call us on 0113 469 9564 and we’ll see what we can do 😊"
					);
					return;
				  }

				  if (latestTotals.delivery_fee === null || latestTotals.delivery_fee === undefined) {
					alert("We could not calculate delivery for this address. Please check the address or choose collection.");
					return;
				  }
				}
			
			// ---------- Create order ----------
			// ✅ NEW: generate a fresh idempotency key for THIS submit

			// 🚚 DELIVERY VALIDATION — stop submit if delivery price/radius is not ready
			if ((0, context.getSelectedOrderType)() === "delivery" && context.deliveryQuoteState.loading) {
			  alert("Please wait a moment while we calculate the delivery charge.");
			  return;
			}

			if ((0, context.getSelectedOrderType)() === "delivery" && !context.deliveryQuoteState.eligible) {
			  alert(context.deliveryQuoteState.reason || "Sorry, you're outside our delivery area.");
			  return;
			}
			
				submitTotals = (0, context.recomputeCheckoutTotals)();

				if ((0, context.getSelectedOrderType)() === "delivery") {

  const hasDistance =
    submitTotals.delivery_route_miles != null ||
    submitTotals.delivery_straight_line_miles != null;

  if (!hasDistance) {
    alert(
      "Please wait while we confirm your delivery distance and charge, then try again."
    );
    return;
  }

  if (
    Number(submitTotals.subtotal || 0) < 30 &&
    Number(submitTotals.delivery_fee || 0) <= 0
  ) {
    alert(
      "Please wait while we calculate your delivery charge, then try again."
    );
    return;
  }
}

			const idempotencyKey = crypto.randomUUID();

			// ✅ keep this as recomputeCheckoutTotals()
			// We want final exact totals synchronously at submit time
			
// keep this if disc already exists above in your submit handler
const totalDiscount =
  Number(disc?.discount || 0) + Number(submitTotals.loyalty_discount || 0);

console.log('SUBMIT TOTALS:', submitTotals);
console.log('ORDER PAYLOAD PREVIEW:', {
  subtotal: submitTotals.subtotal,
  loyalty_discount: submitTotals.loyalty_discount,
  loyalty_points_earned_pending: submitTotals.loyalty_points_earned_pending,
  loyalty_points_redeem_pending: submitTotals.loyalty_points_redeem_pending,
  loyalty_reward_applied: submitTotals.loyalty_reward_applied,
  total: submitTotals.total
});

const baseOrderPayload = {
  customer_id: customerId,

  subtotal: Number(submitTotals.subtotal.toFixed(2)),
  discount: Number(totalDiscount.toFixed(2)),
  discount_label:
    submitTotals.loyalty_discount > 0
      ? 'Loyalty reward'
      : Number(disc?.discount || 0) > 0
        ? 'Wed/Thu discount'
        : null,

  discount_code: context.appliedDiscountCode,
  discount_amount: Number(context.appliedDiscountAmount || 0),
  discount_label: context.appliedDiscountCode ? `Discount code ${context.appliedDiscountCode}` : null,

  delivery_fee: Number(submitTotals.delivery_fee.toFixed(2)),

delivery_straight_line_miles:
  submitTotals.delivery_straight_line_miles != null
    ? Number(Number(submitTotals.delivery_straight_line_miles).toFixed(2))
    : null,

delivery_route_miles:
  submitTotals.delivery_route_miles != null
    ? Number(Number(submitTotals.delivery_route_miles).toFixed(2))
    : null,

delivery_distance_source:
  submitTotals.delivery_distance_source,

total: Number(submitTotals.total.toFixed(2)),

  // loyalty fields
  loyalty_discount: Number((submitTotals.loyalty_discount || 0).toFixed(2)),
  loyalty_points_redeem_pending: Number(submitTotals.loyalty_points_redeem_pending || 0),
  loyalty_points_earned_pending: Number(submitTotals.loyalty_points_earned_pending || 0),
  loyalty_reward_applied: !!submitTotals.loyalty_reward_applied,
  loyalty_expected_balance: Number.isFinite(submitTotals.loyalty_expected_balance)
    ? Number(submitTotals.loyalty_expected_balance)
    : null,
  loyalty_settled: false,

  order_type: orderType,
  notes,
  order_ref: orderRef,
  payment_preference,
  preferred_time: preferredTimeISO,
  asap_requested: asapRequested,
  communication_preference: communicationPreference,

  idempotency_key: idempotencyKey,
};

if (orderType === 'delivery') {
  const deliveryFee = Number(baseOrderPayload.delivery_fee || 0);
  const routeMiles = Number(baseOrderPayload.delivery_route_miles || 0);
  const subtotal = Number(baseOrderPayload.subtotal || 0);

  if (subtotal < context.DELIVERY_FREE_THRESHOLD && deliveryFee <= 0) {
    return fail(
      'Delivery charge',
      'Sorry, we could not calculate your delivery fee. Please enter your full address including street, town and postcode, then try again.'
    );
  }

const hasFreeDelivery = Number(subtotal || context.checkoutBaseSubtotal || 0) >= context.DELIVERY_FREE_THRESHOLD;

if (!hasFreeDelivery && (!routeMiles || routeMiles <= 0)) {
  return fail(
    'Delivery distance',
    'Sorry, we could not confirm your delivery distance. Please enter your full address including street, town and postcode, then try again.'
  );
}
}

if (orderType === 'delivery') {
  const deliveryFee = Number(baseOrderPayload.delivery_fee || 0);
  const routeMiles = Number(baseOrderPayload.delivery_route_miles || 0);
  const subtotal = Number(baseOrderPayload.subtotal || 0);

  if (subtotal < context.DELIVERY_FREE_THRESHOLD && deliveryFee <= 0) {
    return fail(
      'Delivery charge',
      'Sorry, we could not calculate your delivery fee. Please enter your full address including street, town and postcode, then try again.'
    );
  }

  const hasFreeDelivery = Number(subtotal || context.checkoutBaseSubtotal || 0) >= context.DELIVERY_FREE_THRESHOLD;

if (!hasFreeDelivery && (!routeMiles || routeMiles <= 0)) {
  return fail(
    'Delivery distance',
    'Sorry, we could not confirm your delivery distance. Please enter your full address including street, town and postcode, then try again.'
  );
}
}

console.log('BASE ORDER PAYLOAD:', baseOrderPayload);


		const { data: orderRow, error: orderUpsertErr } = await context.sb
		  .from('orders')
		  .upsert(baseOrderPayload, { onConflict: 'idempotency_key' })
		  .select('id')
		  .single();

		if (orderUpsertErr) return fail('Create order', orderUpsertErr);

		orderId = orderRow.id;



			// 4) Items (with safety check)
			const rows = itemsSnapshot.map(line => {
			  const item_id = line.itemId; // ✅ basket uses itemId

			  if (!item_id) {
				console.error('[ORDER_ITEMS] Missing itemId on line:', line);
				throw new Error('Basket item missing itemId (cannot save order items).');
			  }

			  const menuItem = window.ITEMS_BY_ID.get(item_id);
				const kitchenLoad = menuItem
				  ? (0, context.getItemKitchenLoad)(menuItem)
				  : 0;

				return {
				  order_id: orderId,
				  item_id,
				  name: line.name,
				  unit_price: Number(line.unitPrice.toFixed(2)),
				  qty: line.qty,
				  modifiers: (line.mods ?? []).map(m => ({
					id: m.id,
					name: m.name,
					delta: m.delta
				  })),
				  spice: (typeof line.spice === 'number') ? line.spice : null,
				  img: line.img || null,
				  kitchen_load: kitchenLoad
				};
			});

			const { error: itemsErr } = await window.sb.from('order_items').insert(rows);
			if (itemsErr) return fail('Add order items', itemsErr);
    }



			// ✅ Recompute and freeze totals once
				window.__lastOrderTotals = submitTotals;
				console.log('[CHECKOUT TOTALS @ SUBMIT]', submitTotals);

				try {
				  if(!masterWokManaged) await fetch('https://order-backend-production.up.railway.app/send-order-confirmation', {
					method: 'POST',
					headers: { 'Content-Type': 'text/plain' },
					body: JSON.stringify({
					  order_id: orderId,
					  order_ref: orderRef,
					  name,
					  email,
					  phone,
					  order_type: orderType,
					  preferred_time: preferredTimeRaw,

						subtotal: submitTotals.subtotal,
						discount: submitTotals.discount,
						delivery_fee: submitTotals.delivery_fee,
						total: submitTotals.total,

						discount_label:
						  context.appliedDiscountCode
							? `Discount code ${context.appliedDiscountCode}`
							: submitTotals.loyalty_discount > 0
							  ? 'Loyalty reward'
							  : submitTotals.discount > 0
								? '10% Wed/Thu discount'
								: null,

						loyalty_discount: submitTotals.loyalty_discount,
						loyalty_reward_applied: submitTotals.loyalty_reward_applied,
						loyalty_points_balance: submitTotals.loyalty_points_balance,
						loyalty_points_redeem_pending: submitTotals.loyalty_points_redeem_pending,
						loyalty_points_earned_pending: submitTotals.loyalty_points_earned_pending,
						loyalty_expected_balance: submitTotals.loyalty_expected_balance,
						points_earning_food_subtotal: submitTotals.points_earning_food_subtotal,

					  communication_preference: communicationPreference,
					  asap_requested: asapRequested
					})
				  });
				} catch (err) {
				  console.warn('send-order-confirmation failed', err);
				}



    // --- SUCCESS UI ---
    context.checkoutMsg.textContent = '';
    context.checkoutModal.style.display = 'none';

    // clear basket + re-render
    context.basket.length = 0;
    (0, context.renderOrder)();

    // pretty time string
    const prefPretty = preferredTimeRaw
      ? new Date(preferredTimeRaw).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      : null;

    // ensure ref is a string like RTK-012
    const refText = (orderRef && typeof orderRef === 'object')
      ? ('RTK-' + String(Number(orderRef.assigned ?? orderRef.id ?? orderRef.value ?? 0)).padStart(3,'0'))
      : String(orderRef);

			// numeric total
			const grandTotal = Number(submitTotals.total);

(0, context.showOrderSuccess)(
  refText,
  itemsSnapshot,
  grandTotal,
  orderType,
  prefPretty
);

// Order is safely complete.
// Prepare checkout for the next customer.
(0, context.resetCheckoutForNextOrder)();


  } catch (err) {
    fail('Unexpected error', err);
  } finally {
    isSubmittingOrder = false;
    if (submitBtn) submitBtn.disabled = false;
  }
};
  return handler;
 }
 const api=Object.freeze({create});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.RTKCheckoutSubmission=api;
})(typeof window!=='undefined'?window:null);
