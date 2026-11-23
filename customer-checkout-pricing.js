// Pricing and loyalty: register only; explicitly initialise from checkout.
(function(root){
 function create(context){
// BEGIN pricing applyWedThuDiscount
function applyWedThuDiscount(subtotal, preferredTimeRaw, asapRequested) {
  // 🚫 TEMP DISABLED - midweek 10% discount paused
  return {
    eligible: false,
    discount: 0,
    discountedSubtotal: Math.round(subtotal * 100) / 100
  };
}
// END pricing applyWedThuDiscount

// BEGIN pricing validateDiscountCode
async function validateDiscountCode(code, foodSubtotal) {
  const cleanCode = String(code || "").trim().toUpperCase();

  if (!cleanCode) {
    return { valid: false, reason: "Please enter a discount code." };
  }

  const { data, error } = await context.sb
    .from("discount_codes")
    .select("*")
    .eq("code", cleanCode)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    return {
      valid: false,
      reason: "That discount code was not recognised."
    };
  }

  const now = new Date();

  if (data.starts_at && new Date(data.starts_at) > now) {
    return {
      valid: false,
      reason: "This discount code is not active yet."
    };
  }

  if (data.expires_at && new Date(data.expires_at) < now) {
    return {
      valid: false,
      reason: "This discount code has expired."
    };
  }
 

 // Restrict discount codes to selected order weekdays, where configured
if (
  Array.isArray(data.allowed_weekdays) &&
  data.allowed_weekdays.length > 0
) {
  const selectedDateTimeValue =
    context.document.getElementById("cust-preferred-time")?.value;

  if (!selectedDateTimeValue) {
    return {
      valid: false,
      reason: "Please select your collection or delivery time first."
    };
  }

  const selectedDateTime =
    new Date(selectedDateTimeValue);

  const selectedWeekday =
    selectedDateTime.getDay();

  const allowedWeekdays =
    data.allowed_weekdays.map(Number);

  if (!allowedWeekdays.includes(selectedWeekday)) {
    return {
      valid: false,
      reason: "This discount code is only valid for Wednesday and Thursday orders."
    };
  }
}

  if (
    data.max_uses !== null &&
    Number(data.used_count || 0) >= Number(data.max_uses)
  ) {
    return {
      valid: false,
      reason: "Sorry, this discount code has already been used."
    };
  }

  if (foodSubtotal < Number(data.min_food_subtotal || 0)) {
    return {
      valid: false,
      reason:
        `This code requires a minimum food spend of £${Number(data.min_food_subtotal).toFixed(2)}.`
    };
  }

  let discountAmount = 0;

  if (data.discount_type === "fixed") {
    discountAmount = Math.min(
      Number(data.discount_value || 0),
      foodSubtotal
    );
  }

  if (data.discount_type === "percent") {
    discountAmount =
      foodSubtotal *
      (Number(data.discount_value || 0) / 100);
  }

  discountAmount =
    Math.round(discountAmount * 100) / 100;

  return {
    valid: true,
    code: cleanCode,
    discountAmount,
    discount: data
  };
}
// END pricing validateDiscountCode

// BEGIN pricing refreshAppliedDiscountCode
async function refreshAppliedDiscountCode() {
  if (!context.appliedDiscountCode) return;

  // Recalculate current basket subtotal directly
  const foodSubtotal = context.window.basket.reduce(
    (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.qty || 0),
    0
  );

  // Keep checkout subtotal in sync
  context.checkoutBaseSubtotal = foodSubtotal;

  const result = await validateDiscountCode(
    context.appliedDiscountCode,
    foodSubtotal
  );

  const message = context.document.getElementById("discount-code-message");

  if (!result.valid) {
    context.appliedDiscountCode = null;
    context.appliedDiscountAmount = 0;

    if (message) {
  message.textContent =
    `Discount code removed — ${result.reason}`;
  message.className = "discount-code-message error";
}

    recomputeCheckoutTotals();
    return;
  }

  context.appliedDiscountAmount = result.discountAmount;

  if (message) {
    message.textContent =
      `${context.appliedDiscountCode} applied: £${context.appliedDiscountAmount.toFixed(2)} off`;
    message.className = "discount-code-message success";
  }

  recomputeCheckoutTotals();
}
// END pricing refreshAppliedDiscountCode

// BEGIN pricing applyLoyaltyToTotals
function applyLoyaltyToTotals(foodSubtotal) {
  // ✅ USE SETTLED POINTS ONLY
  	context.console.log('APPLY LOYALTY CHECK', {
  pointsBalance: context.loyaltyState.pointsBalance,
  settledPointsBalance: context.loyaltyState.settledPointsBalance,
  threshold: context.LOYALTY_REWARD_THRESHOLD
});
  const settledPoints = Number(context.loyaltyState.settledPointsBalance || 0);
  const eligibleSubtotal = Number(foodSubtotal || 0);

  const rewardEligible = Number(context.loyaltyState.availablePointsBalance || 0) >= context.LOYALTY_REWARD_THRESHOLD;

  const discountApplied = rewardEligible
    ? Math.min(context.LOYALTY_REWARD_VALUE, eligibleSubtotal)
    : 0;

  context.loyaltyState.rewardEligible = rewardEligible;
  context.loyaltyState.discountApplied = discountApplied;

  // Only redeem if actually eligible from settled balance
  context.loyaltyState.pointsRedeemedPending = rewardEligible
    ? context.LOYALTY_REWARD_THRESHOLD
    : 0;

  return discountApplied;
}
// END pricing applyLoyaltyToTotals

// BEGIN pricing updateLoyaltyProjection
function updateLoyaltyProjection(foodSubtotalAfterAllDiscounts) {
  const settledPoints = Number(context.loyaltyState.settledPointsBalance || 0);
  const rewardEligible = !!context.loyaltyState.rewardEligible;
  const pointsRedeemedPending = rewardEligible ? context.LOYALTY_REWARD_THRESHOLD : 0;

  // Earn points only on food actually paid for, after all discounts
  const pointsEarnedPending = Math.max(0, Math.floor(Number(foodSubtotalAfterAllDiscounts || 0)));

  const expectedBalance = settledPoints - pointsRedeemedPending + pointsEarnedPending;
  const pointsToNextReward = rewardEligible
  ? 0
  : Math.max(0, context.LOYALTY_REWARD_THRESHOLD - Number(context.loyaltyState.availablePointsBalance || 0));

  context.loyaltyState.pointsRedeemedPending = pointsRedeemedPending;
  context.loyaltyState.pointsEarnedPending = pointsEarnedPending;
  context.loyaltyState.expectedBalance = expectedBalance;
  context.loyaltyState.pointsToNextReward = pointsToNextReward;
  
  context.console.log('LOYALTY STATE:', context.loyaltyState);
}
// END pricing updateLoyaltyProjection

// BEGIN pricing renderLoyaltyMessage
function renderLoyaltyMessage() {
  const el = context.document.getElementById('loyalty-message');
  if (!el) return;

  const points = Number(context.loyaltyState.pointsBalance || 0);
  const rewardEligible = !!context.loyaltyState.rewardEligible;
  const discountApplied = Number(context.loyaltyState.discountApplied || 0);
  const pointsRedeemedPending = Number(context.loyaltyState.pointsRedeemedPending || 0);
  const pointsEarnedPending = Number(context.loyaltyState.pointsEarnedPending || 0);
  const expectedBalance = Number(context.loyaltyState.expectedBalance || 0);
  const needed = Number(context.loyaltyState.pointsToNextReward || context.LOYALTY_REWARD_THRESHOLD);

  // Hide if no phone entered / no known balance yet
  if (points <= 0 && !rewardEligible && pointsEarnedPending <= 0) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }

  el.hidden = false;

if (rewardEligible && discountApplied > 0) {
  el.innerHTML = `
    <strong>Loyalty reward applied:</strong> You have ${points} points, so <strong>£${discountApplied.toFixed(2)} off</strong> your food subtotal has been applied automatically.<br>
    Redeeming on fulfilment: -${pointsRedeemedPending} points<br>
    This order: +${pointsEarnedPending} pending points<br>
    Expected balance after fulfilment: <strong>${expectedBalance}</strong>
  `;
  return;
}

  if (context.loyaltyState.reservedPoints > 0) {
    el.innerHTML = `<strong>Loyalty reward reserved:</strong> ${context.loyaltyState.reservedPoints} points are already reserved on another pending order. You have <strong>${context.loyaltyState.availablePointsBalance} points available</strong> for this order.<br>This order: +${pointsEarnedPending} pending points.`;
    return;
  }

  el.innerHTML = `
    <strong>Loyalty points:</strong> You currently have ${points} points.<br>
    This order: +${pointsEarnedPending} pending points<br>
    Expected balance after fulfilment: <strong>${expectedBalance}</strong><br>
    ${needed > 0 ? `Only ${needed} more points until your next £5 reward.` : ''}
  `;
}
// END pricing renderLoyaltyMessage

// BEGIN pricing normalisePhone
function normalisePhone(phone) {
  return (phone || '').trim();
}
// END pricing normalisePhone

// BEGIN pricing fetchLoyaltyBalance
async function fetchLoyaltyBalance(phone) {
  const cleanPhone = normalisePhone(phone);
  if (!cleanPhone) return null;

  try {
    const res = await (0, context.fetch)('https://order-backend-production.up.railway.app/loyalty-balance', {
      method: 'POST', cache: 'no-store', signal: context.AbortSignal.timeout(8000),
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone: cleanPhone })
    });

    const data = await res.json();
    if (!data.ok) return null;

    return data.loyalty || null;
  } catch (err) {
    context.console.error('Failed to fetch loyalty balance:', err);
    return null;
  }
}
// END pricing fetchLoyaltyBalance

// BEGIN pricing calcDeliveryFee
function calcDeliveryFee(subtotal, orderType){
			  if(orderType !== 'delivery') return 0;
			  return subtotal < context.DELIVERY_FREE_THRESHOLD ? context.DELIVERY_FALLBACK_FEE : 0;
			}
// END pricing calcDeliveryFee

// BEGIN pricing getPreDiscountFoodSubtotal
function getPreDiscountFoodSubtotal() {
			  return Number(context.checkoutBaseSubtotal || 0);
			}
// END pricing getPreDiscountFoodSubtotal

// BEGIN pricing updateFreeDeliveryHint
function updateFreeDeliveryHint() {
  const hintEl = context.document.getElementById("freeDeliveryHint");
  if (!hintEl) return;

  const orderType = (0, context.getSelectedOrderType)();
  const subtotal = Number(context.checkoutBaseSubtotal || 0);

  if (orderType !== "delivery") {
    hintEl.style.display = "none";
    hintEl.textContent = "";
    return;
  }

  if (subtotal >= context.DELIVERY_FREE_THRESHOLD) {
    hintEl.textContent = "🎉 You’ve unlocked FREE delivery!";
    hintEl.style.display = "block";
    return;
  }

  const remaining = Math.max(0, context.DELIVERY_FREE_THRESHOLD - subtotal);

  hintEl.textContent = `🚚 Add £${remaining.toFixed(2)} more for FREE delivery`;
  hintEl.style.display = "block";
}
// END pricing updateFreeDeliveryHint

// BEGIN pricing recomputeCheckoutTotals
function recomputeCheckoutTotals() {
			  const orderType = (0, context.getSelectedOrderType)();

			  const quote = context.window.deliveryQuoteState || context.deliveryQuoteState || {
				loading: false,
				eligible: true,
				fee: 0
			  };

			  context.console.log("[totals debug] checkoutBaseSubtotal:", context.checkoutBaseSubtotal);
			  context.console.log("[totals debug] preDiscountSubtotal:", Number(context.checkoutBaseSubtotal || 0));
			  context.console.log("[totals debug] deliveryQuoteState:", quote);
			  context.console.log("[totals debug] order type:", orderType);

			  let deliveryFee = 0;
			  let deliveryBlocked = false;

			  if (orderType === "delivery") {
				if (quote.loading) {
				  deliveryFee = 0;
				} else if (quote.eligible === false) {
				  deliveryFee = 0;
				  deliveryBlocked = true;
				} else {
				  deliveryFee = Number(quote.fee ?? 0);
				}
			  }

			  const subtotal = Math.round(Number(context.checkoutBaseSubtotal || 0) * 100) / 100;

			  const preferredTimeRaw =
				(context.document.getElementById('preferred-time')?.value ||
				 context.document.querySelector('input[name="preferred_time"]')?.value ||
				 '').trim();

			  const asapRequested =
				!!context.document.querySelector('input[name="asap_requested"]:checked') ||
				!!context.document.getElementById('asap')?.checked ||
				!!context.document.getElementById('asap-requested')?.checked ||
				!!context.document.getElementById('asapRequested')?.checked;

			  const disc = applyWedThuDiscount(subtotal, preferredTimeRaw, asapRequested);

				const discountCodeAmount = Number(context.appliedDiscountAmount || 0);

				const discountedSubtotal = Math.max(
				  0,
				  Number(disc.discountedSubtotal || subtotal) - discountCodeAmount
				);
			  

			  const loyaltyDiscount = applyLoyaltyToTotals(discountedSubtotal);
			  const foodSubtotalAfterAllDiscounts = Math.max(0, discountedSubtotal - loyaltyDiscount);

			  updateLoyaltyProjection(foodSubtotalAfterAllDiscounts);

			  const total = Math.round(
				  (foodSubtotalAfterAllDiscounts + deliveryFee) * 100
				) / 100;

			  const checkoutSubtotalEl = context.document.getElementById('checkout-subtotal');
			  const checkoutDeliveryEl = context.document.getElementById('checkout-delivery');
			  const checkoutTotalEl = context.document.getElementById('checkout-total');

			  if (checkoutSubtotalEl) {
				checkoutSubtotalEl.textContent = (0, context.formatCurrency)(subtotal);
			  }

			  if (checkoutDeliveryEl) {
				checkoutDeliveryEl.textContent = deliveryBlocked
				  ? "Unavailable"
				  : (0, context.formatCurrency)(deliveryFee);
			  }

			  if (checkoutTotalEl) {
				checkoutTotalEl.textContent = (0, context.formatCurrency)(total);
			  }

if (typeof context.deliveryNote !== 'undefined' && context.deliveryNote) {
  context.deliveryNote.style.display = (orderType === 'delivery') ? 'block' : 'none';

  if (orderType === 'delivery') {
    const fullAddressMessage =
      'Sorry, we could not confirm this delivery address. Please enter your full address including street, town and postcode, for example: 30 Topcliffe Mews, Morley, LS27 8UL. If you are still having problems, please call us on <a href="tel:01134699564">0113 469 9564</a> and we’ll see what we can do 😊';

    if (quote.loading) {
      context.deliveryNote.className = "";
      context.deliveryNote.textContent = "Calculating delivery charge…";

    } else if (quote.eligible === false || (quote.usedFallback && !Number.isFinite(quote.straightLineMiles))) {
      context.deliveryNote.className = "delivery-error";
      context.deliveryNote.innerHTML = fullAddressMessage;

    } else if (getPreDiscountFoodSubtotal() >= context.DELIVERY_FREE_THRESHOLD) {
      context.deliveryNote.className = "";
      context.deliveryNote.textContent = "🎉 Free delivery on orders over £30";

    } else if (quote.usedFallback) {
      context.deliveryNote.className = "";
      context.deliveryNote.textContent = `Delivery ${(0, context.formatCurrency)(Number(quote.fee ?? 0))} (standard charge; route pricing unavailable)`;

    } else {
      context.deliveryNote.className = "";
      context.deliveryNote.textContent =
        `Delivery ${(0, context.formatCurrency)(Number(quote.fee ?? 0))}${
          Number.isFinite(quote.routeMiles)
            ? ` based on approx. route distance of ${quote.routeMiles.toFixed(1)} miles`
            : ' based on approximate distance'
        }`;
    }
  }
}

			  const discountRow = context.document.getElementById('discountRow');
			  const discountValue = context.document.getElementById('discountValue');

				if (discountRow && discountValue) {

				  const existingDiscount =
					Number(disc.discount || 0);

				  const voucherDiscount =
					Number(context.appliedDiscountAmount || 0);

				  const totalDiscount =
					existingDiscount + voucherDiscount;

				  if (totalDiscount > 0) {

					discountRow.style.display = 'flex';

					let label = 'Discount';

					if (context.appliedDiscountCode) {
					  label += ` (${context.appliedDiscountCode})`;
					}

					const labelEl =
					  discountRow.querySelector('.label');

					if (labelEl) {
					  labelEl.textContent = label;
					}

					discountValue.textContent =
					  `-£${totalDiscount.toFixed(2)}`;

				  } else {

					discountRow.style.display = 'none';
					discountValue.textContent = '';

				  }
				}

			  const loyaltyRow = context.document.getElementById('loyaltyDiscountRow');
			  const loyaltyValue = context.document.getElementById('loyaltyDiscountValue');

			  if (loyaltyRow && loyaltyValue) {
				if (loyaltyDiscount > 0) {
				  loyaltyRow.style.display = 'flex';
				  loyaltyValue.textContent = `-£${loyaltyDiscount.toFixed(2)}`;
				} else {
				  loyaltyRow.style.display = 'none';
				  loyaltyValue.textContent = '';
				}
			  }

			  renderLoyaltyMessage();

				context.window.__checkoutTotals = {
				  subtotal,

				  discount: Number(context.appliedDiscountAmount || 0),
				  discount_amount: Number(context.appliedDiscountAmount || 0),
				  discount_code: context.appliedDiscountCode || "",
				  discount_label: context.appliedDiscountCode
					? `Voucher discount (${context.appliedDiscountCode})`
					: "",

				  discounted_subtotal: discountedSubtotal,

				loyalty_discount: loyaltyDiscount,
				loyalty_reward_applied: !!context.loyaltyState.rewardEligible,
				loyalty_points_balance: Number(context.loyaltyState.pointsBalance || 0),
				loyalty_points_redeem_pending: Number(context.loyaltyState.pointsRedeemedPending || 0),
				loyalty_points_earned_pending: Number(context.loyaltyState.pointsEarnedPending || 0),
				loyalty_expected_balance: Number(context.loyaltyState.expectedBalance || 0),

				delivery_fee: deliveryBlocked ? null : deliveryFee,
				delivery_blocked: deliveryBlocked,
				delivery_block_reason: deliveryBlocked ? quote.reason : "",
				delivery_straight_line_miles: quote?.straightLineMiles ?? null,
				delivery_route_miles: quote?.routeMiles ?? null,
				delivery_distance_source: quote?.usedFallback
				  ? "straight_line_fallback"
				  : (quote?.routeMiles != null ? "route" : null),

				total,

				order_type: orderType,
				preferred_time: preferredTimeRaw,
				asap_requested: asapRequested,
				points_earning_food_subtotal: foodSubtotalAfterAllDiscounts
			  };
			  
			  if (Number(subtotal || 0) > 0) {
				  context.window.__lastGoodCheckoutTotals = { ...context.window.__checkoutTotals };
				}
			  
			  updateFreeDeliveryHint();

			  return context.window.__checkoutTotals;
			}
// END pricing recomputeCheckoutTotals

 return {applyWedThuDiscount,validateDiscountCode,refreshAppliedDiscountCode,applyLoyaltyToTotals,updateLoyaltyProjection,renderLoyaltyMessage,normalisePhone,fetchLoyaltyBalance,calcDeliveryFee,getPreDiscountFoodSubtotal,updateFreeDeliveryHint,recomputeCheckoutTotals};
 }
 if(typeof module!=="undefined"&&module.exports)module.exports={create};
 if(root)root.RTKCheckoutPricing={create};
})(typeof window!=="undefined"?window:null);
