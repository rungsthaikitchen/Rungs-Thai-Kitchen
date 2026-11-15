
    // Init Supabase
   // const SUPABASE_URL = 'https://ubyjrrsvbbqomitpaidb.supabase.co';
    //const SUPABASE_PUBLIC_KEY = //'sb_publishable_wnLIasgPkPRUH3UnCpTMZw_hW6PHz2O';
   // const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
	

/* ------------------------------
   Blackout windows (from Supabase)
---------------------------------*/

// In-memory windows (filled by Supabase)
let CLOSED_RANGES = [];      // [{start:Date, end:Date, message?:string}]
let FULLY_BOOKED  = [];      // same shape

// Load active windows that intersect “now → +60 days” (tweak as needed)
async function loadBlackouts() {
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 60);

  const { data, error } = await sb
    .from('booking_blackouts')
    .select('kind,start_at,end_at,message,active')
    .eq('active', true)
    // overlap test (start < horizon && end > now)
    .lt('start_at', horizon.toISOString())
    .gt('end_at',  now.toISOString());

  if (error) {
    console.warn('[blackouts] fetch failed', error);
    return;
  }

  CLOSED_RANGES = [];
  FULLY_BOOKED  = [];

  (data || []).forEach(row => {
    const win = {
      start: new Date(row.start_at),
      end:   new Date(row.end_at),
      message: row.message || ''
    };
    if (row.kind === 'closed')       CLOSED_RANGES.push(win);
    if (row.kind === 'fully_booked') FULLY_BOOKED.push(win);
  });
  
  console.log('[blackouts] loaded rows:', data);
console.log('[blackouts] CLOSED_RANGES:', CLOSED_RANGES);
console.log('[blackouts] FULLY_BOOKED:', FULLY_BOOKED);
}

const serviceStatusNotice =
  document.getElementById('service-status-notice');

let SERVICE_STATE = {
  mode: 'normal',
  capacity_throttle: 0,
  customer_message: null,
  effective_until: null
};

function renderServiceStatusNotice() {
  if (!serviceStatusNotice) return;

  const mode = SERVICE_STATE.mode || 'normal';

  if (mode === 'normal') {
    serviceStatusNotice.hidden = true;
    serviceStatusNotice.innerHTML = '';
    return;
  }

  const titleByMode = {
    busy: '🍜 We’re a little busy tonight',
    very_busy: '🔥 We’re very busy tonight',
    paused: '⏸️ Online orders are temporarily paused'
  };

  const title = titleByMode[mode] || '';
  const message = SERVICE_STATE.customer_message || '';

  serviceStatusNotice.innerHTML =
    `<strong>${title}</strong>`;

  if (message) {
    serviceStatusNotice.appendChild(
      document.createElement('br')
    );

    serviceStatusNotice.appendChild(
      document.createTextNode(message)
    );
  }

  serviceStatusNotice.hidden = false;
}

async function loadServiceState() {
  try {
    const response = await fetch(
      '/api/service-state'
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || 'Unable to load service state'
      );
    }

    SERVICE_STATE =
      data.effective_service_state || SERVICE_STATE;

    renderServiceStatusNotice();

    console.log(
      '[service-state] loaded:',
      SERVICE_STATE
    );

  } catch (error) {
    console.warn(
      '[service-state] fetch failed:',
      error
    );
  }
}

// Helpers
function inAnyWindow(dt, windows) {
  const t = +dt;
  return windows.find(w => t >= +w.start && t <= +w.end) || null;
}

function isWedThuLondon(d = new Date()){
  const day = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short'
  }).format(d); // "Mon", "Tue", "Wed", "Thu", ...
  return day === 'Wed' || day === 'Thu';
}

			function applyWedThuDiscount(subtotal, preferredTimeRaw, asapRequested) {
  // 🚫 TEMP DISABLED - midweek 10% discount paused
  return {
    eligible: false,
    discount: 0,
    discountedSubtotal: Math.round(subtotal * 100) / 100
  };
}



// Banner helpers
function showCheckoutBanner(kind, msg) {
  const el = document.getElementById('checkout-banner');
  if (!el) return;
  el.className = 'checkout-banner ' + (kind === 'closed'
    ? 'checkout-banner--closed'
    : 'checkout-banner--fullybooked');

  el.innerHTML = `
    <button class="x" aria-label="Dismiss" onclick="this.parentElement.style.display='none'">×</button>
    ${msg}
  `;
  el.style.display = 'block';
}
function hideCheckoutBanner() {
  const el = document.getElementById('checkout-banner');
  if (el) { el.style.display = 'none'; el.textContent = ''; el.className = 'checkout-banner'; }
}

function showBlackoutBannerForDate(dateString) {
  hideCheckoutBanner();

  if (!dateString) return;

  const dayStart =
    new Date(`${dateString}T00:00:00`);

  const dayEnd =
    new Date(`${dateString}T23:59:59`);

  // A closure takes priority if both kinds somehow overlap.
  const closedWindow =
    CLOSED_RANGES.find(win =>
      win.start <= dayEnd &&
      win.end >= dayStart
    );

  if (closedWindow) {
    showCheckoutBanner(
      'closed',
      closedWindow.message ||
        'Sorry, we are closed during this service.'
    );
  }
}

/* ------------------------------
   Wire into your existing flow
---------------------------------*/

// 1) Load blackouts, then re-check the preferred time
loadBlackouts().then(() => {
  const t = document.getElementById('cust-preferred-time');

  if (t && t.value) {
    t.dispatchEvent(new Event('change'));
  }
});

loadServiceState();

// 2) When opening checkout, keep your existing min (+30m) and step=300
//    Just add an input change listener to live-validate the chosen time.
const preferredTimeInput =
  document.getElementById('cust-preferred-time');
  
  let lastPreferredDate = null;

function validatePreferredTime() {
  hideCheckoutBanner();

  const submitBtn =
    document.getElementById('checkout-submit');

  const raw = preferredTimeInput?.value;
  if (!raw) return true;

  const chosen = new Date(raw);
  if(masterWokTimeHints){
    const available=masterWokTimeHints.get(chosen.toISOString())===true;
    if(submitBtn)submitBtn.disabled=!available;
    return available;
  }

  const isClosed = inAnyWindow(chosen, CLOSED_RANGES);
  const isFull   = inAnyWindow(chosen, FULLY_BOOKED);

  if (isClosed) {
    showCheckoutBanner(
      'closed',
      isClosed.message ||
        'Sorry, we are closed at the selected time.'
    );

    if (submitBtn) submitBtn.disabled = true;
    return false;
  }

  if (isFull) {
    showCheckoutBanner(
      'fully_booked',
      isFull.message ||
        'We’re fully booked at the selected time.'
    );

    if (submitBtn) submitBtn.disabled = true;
    return false;
  }

  if (submitBtn) submitBtn.disabled = false;

  return true;
}

// 3) Guard your submit handler (fail fast if invalid)
//    In your existing `checkoutForm.addEventListener('submit', async (e) => { ... })`,
//    add these lines near the top, right after you read `preferredTimeRaw`:

/*
  // inside your submit handler, after:
  // const preferredTimeRaw = document.getElementById('cust-preferred-time').value;
  hideCheckoutBanner();
  const chosenDt = preferredTimeRaw ? new Date(preferredTimeRaw) : null;
  const isClosedNow = chosenDt && inAnyWindow(chosenDt, CLOSED_RANGES);
  const isFullNow   = chosenDt && inAnyWindow(chosenDt, FULLY_BOOKED);

  if (isClosedNow) {
    showCheckoutBanner('closed', isClosedNow.message || 'We’re closed at the selected time.');
    return; // stop submit
  }
  if (isFullNow) {
    showCheckoutBanner('fully_booked', isFullNow.message || 'We’re fully booked at the selected time.');
    return; // stop submit
  }
*/

// ============================================================
// PREFERRED DATE / TIME DROPDOWN
// ============================================================

// Time-picker state and requests belong to the availability controller.
const checkoutAvailability = window.RTKCheckoutAvailability.create({
  window, document, console,
  get KITCHEN_OVERRUN_MINUTES(){ return typeof KITCHEN_OVERRUN_MINUTES === 'undefined' ? undefined : KITCHEN_OVERRUN_MINUTES; },
  get LEAD_MINUTES(){ return typeof LEAD_MINUTES === 'undefined' ? undefined : LEAD_MINUTES; },
  get OPEN_DAYS(){ return typeof OPEN_DAYS === 'undefined' ? undefined : OPEN_DAYS; },
  get OPEN_WINDOW(){ return typeof OPEN_WINDOW === 'undefined' ? undefined : OPEN_WINDOW; },
  get basket(){ return typeof basket === 'undefined' ? undefined : basket; },
  get checkoutModal(){ return typeof checkoutModal === 'undefined' ? undefined : checkoutModal; },
  get getBasketKitchenLoad(){ return typeof getBasketKitchenLoad === 'undefined' ? undefined : getBasketKitchenLoad; },
  get getSelectedOrderType(){ return typeof getSelectedOrderType === 'undefined' ? undefined : getSelectedOrderType; },
  get hidePreferredTimeMessage(){ return typeof hidePreferredTimeMessage === 'undefined' ? undefined : hidePreferredTimeMessage; },
  get isAllowed(){ return typeof isAllowed === 'undefined' ? undefined : isAllowed; },
  get isAllowedForAlternativeFulfilment(){ return typeof isAllowedForAlternativeFulfilment === 'undefined' ? undefined : isAllowedForAlternativeFulfilment; },
  get isClosedDate(){ return typeof isClosedDate === 'undefined' ? undefined : isClosedDate; },
  get isFullyBooked(){ return typeof isFullyBooked === 'undefined' ? undefined : isFullyBooked; },
  get refreshKitchenSlotMap(){ return typeof refreshKitchenSlotMap === 'undefined' ? undefined : refreshKitchenSlotMap; },
  get roundTo5Min(){ return typeof roundTo5Min === 'undefined' ? undefined : roundTo5Min; },
  get setAvailabilityLoading(){ return typeof setAvailabilityLoading === 'undefined' ? undefined : setAvailabilityLoading; },
  get showBlackoutBannerForDate(){ return typeof showBlackoutBannerForDate === 'undefined' ? undefined : showBlackoutBannerForDate; },
  get showPreferredTimeMessage(){ return typeof showPreferredTimeMessage === 'undefined' ? undefined : showPreferredTimeMessage; },
  get toYMD(){ return typeof toYMD === 'undefined' ? undefined : toYMD; }
});
const preferredDateInput = checkoutAvailability.dateInput;
const preferredTimeSelect = checkoutAvailability.timeSelect;
const preferredTimeHidden = checkoutAvailability.timeHidden;
function clearPreferredTimeSelect(message){return checkoutAvailability.clear(message);}
async function populatePreferredTimeSelect(date){return checkoutAvailability.populate(date);}
async function refreshPreferredTimes(){return checkoutAvailability.refresh();}
function availabilityBasketKey(){return checkoutAvailability.basketKey();}

// Checkout modal helpers
const checkoutModal = document.getElementById('checkout-modal');
const checkoutClose = document.getElementById('checkout-close');
const checkoutCancel = document.getElementById('checkout-cancel');
const checkoutForm = document.getElementById('checkout-form');
const checkoutMsg = document.getElementById('checkout-msg');
const checkoutSubtotalEl = document.getElementById('checkout-subtotal');
const checkoutDeliveryEl = document.getElementById('checkout-delivery');
const checkoutTotalEl = document.getElementById('checkout-total');
const deliveryNote = document.getElementById('delivery-note');
const orderMsg = document.getElementById('order-msg');
const openCheckoutBtn = document.getElementById('open-checkout');
const pausedOrderAlert =
  document.getElementById('paused-order-alert');

const pausedOrderAlertMessage =
  document.getElementById('paused-order-alert-message');

const pausedOrderAlertOk =
  document.getElementById('paused-order-alert-ok');

function showPausedOrderAlert(message) {
  if (!pausedOrderAlert || !pausedOrderAlertMessage) return;

  pausedOrderAlertMessage.textContent =
    message ||
    'Online orders are temporarily paused. Please check back shortly.';

  pausedOrderAlert.style.display = 'flex';

  if (pausedOrderAlertOk) {
    pausedOrderAlertOk.focus();
  }
}

function hidePausedOrderAlert() {
  if (!pausedOrderAlert) return;

  pausedOrderAlert.style.display = 'none';
}

pausedOrderAlertOk?.addEventListener(
  'click',
  hidePausedOrderAlert
);

const orderTypeRadios = document.querySelectorAll('input[name="order-type"]');
let checkoutBaseSubtotal = 0;

// Discount code state
let appliedDiscountCode = null;
let appliedDiscountAmount = 0;

// Discount code validation
async function validateDiscountCode(code, foodSubtotal) {
  const cleanCode = String(code || "").trim().toUpperCase();

  if (!cleanCode) {
    return { valid: false, reason: "Please enter a discount code." };
  }

  const { data, error } = await sb
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
    document.getElementById("cust-preferred-time")?.value;

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

async function refreshAppliedDiscountCode() {
  if (!appliedDiscountCode) return;

  // Recalculate current basket subtotal directly
  const foodSubtotal = window.basket.reduce(
    (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.qty || 0),
    0
  );

  // Keep checkout subtotal in sync
  checkoutBaseSubtotal = foodSubtotal;

  const result = await validateDiscountCode(
    appliedDiscountCode,
    foodSubtotal
  );

  const message = document.getElementById("discount-code-message");

  if (!result.valid) {
    appliedDiscountCode = null;
    appliedDiscountAmount = 0;

    if (message) {
  message.textContent =
    `Discount code removed — ${result.reason}`;
  message.className = "discount-code-message error";
}

    recomputeCheckoutTotals();
    return;
  }

  appliedDiscountAmount = result.discountAmount;

  if (message) {
    message.textContent =
      `${appliedDiscountCode} applied: £${appliedDiscountAmount.toFixed(2)} off`;
    message.className = "discount-code-message success";
  }

  recomputeCheckoutTotals();
}

// ← ADD THIS HERE
document
  .getElementById("cust-preferred-time")
  ?.addEventListener("change", async () => {
    await refreshAppliedDiscountCode();
  });

// ---------------- LOYALTY STATE ----------------
const LOYALTY_REWARD_THRESHOLD = 100;   // 100 points unlocks reward
const LOYALTY_REWARD_VALUE = 5;    // £5 reward

const loyaltyState = {
  pointsBalance: 0,
  lifetimePoints: 0,

  // derived values
  rewardEligible: false,
  discountApplied: 0,
  pointsRedeemedPending: 0,
  pointsEarnedPending: 0,
  expectedBalance: 0,
  pointsToNextReward: LOYALTY_REWARD_THRESHOLD
};
// ---------------- END LOYALTY STATE ----------------

function applyLoyaltyToTotals(foodSubtotal) {
  // ✅ USE SETTLED POINTS ONLY
  	console.log('APPLY LOYALTY CHECK', {
  pointsBalance: loyaltyState.pointsBalance,
  settledPointsBalance: loyaltyState.settledPointsBalance,
  threshold: LOYALTY_REWARD_THRESHOLD
});
  const settledPoints = Number(loyaltyState.settledPointsBalance || 0);
  const eligibleSubtotal = Number(foodSubtotal || 0);

  const rewardEligible = settledPoints >= LOYALTY_REWARD_THRESHOLD;

  const discountApplied = rewardEligible
    ? Math.min(LOYALTY_REWARD_VALUE, eligibleSubtotal)
    : 0;

  loyaltyState.rewardEligible = rewardEligible;
  loyaltyState.discountApplied = discountApplied;

  // Only redeem if actually eligible from settled balance
  loyaltyState.pointsRedeemedPending = rewardEligible
    ? LOYALTY_REWARD_THRESHOLD
    : 0;

  return discountApplied;
}

function updateLoyaltyProjection(foodSubtotalAfterAllDiscounts) {
  const settledPoints = Number(loyaltyState.settledPointsBalance || 0);
  const rewardEligible = !!loyaltyState.rewardEligible;
  const pointsRedeemedPending = rewardEligible ? LOYALTY_REWARD_THRESHOLD : 0;

  // Earn points only on food actually paid for, after all discounts
  const pointsEarnedPending = Math.max(0, Math.floor(Number(foodSubtotalAfterAllDiscounts || 0)));

  const expectedBalance = settledPoints - pointsRedeemedPending + pointsEarnedPending;
  const pointsToNextReward = rewardEligible
  ? 0
  : Math.max(0, LOYALTY_REWARD_THRESHOLD - settledPoints);

  loyaltyState.pointsRedeemedPending = pointsRedeemedPending;
  loyaltyState.pointsEarnedPending = pointsEarnedPending;
  loyaltyState.expectedBalance = expectedBalance;
  loyaltyState.pointsToNextReward = pointsToNextReward;
  
  console.log('LOYALTY STATE:', loyaltyState);
}

function renderLoyaltyMessage() {
  const el = document.getElementById('loyalty-message');
  if (!el) return;

  const points = Number(loyaltyState.pointsBalance || 0);
  const rewardEligible = !!loyaltyState.rewardEligible;
  const discountApplied = Number(loyaltyState.discountApplied || 0);
  const pointsRedeemedPending = Number(loyaltyState.pointsRedeemedPending || 0);
  const pointsEarnedPending = Number(loyaltyState.pointsEarnedPending || 0);
  const expectedBalance = Number(loyaltyState.expectedBalance || 0);
  const needed = Number(loyaltyState.pointsToNextReward || LOYALTY_REWARD_THRESHOLD);

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

  el.innerHTML = `
    <strong>Loyalty points:</strong> You currently have ${points} points.<br>
    This order: +${pointsEarnedPending} pending points<br>
    Expected balance after fulfilment: <strong>${expectedBalance}</strong><br>
    ${needed > 0 ? `Only ${needed} more points until your next £5 reward.` : ''}
  `;
}

function normalisePhone(phone) {
  return (phone || '').trim();
}

async function fetchLoyaltyBalance(phone) {
  const cleanPhone = normalisePhone(phone);
  if (!cleanPhone) return null;

  try {
    const res = await fetch('https://order-backend-production.up.railway.app/loyalty-balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone: cleanPhone })
    });

    const data = await res.json();
    if (!data.ok) return null;

    return data.loyalty || null;
  } catch (err) {
    console.error('Failed to fetch loyalty balance:', err);
    return null;
  }
}
// Recompute totals whenever fulfilment time / ASAP / order type changes
(function wireCheckoutTotalRecompute() {
  const timeEl =
    document.getElementById('preferred-time') ||
    document.querySelector('input[name="preferred_time"]');

  const asapEl =
    document.getElementById('asap') ||
    document.getElementById('asap-requested') ||
    document.getElementById('asapRequested') ||
    document.querySelector('input[name="asap_requested"]');

  if (timeEl) {
    timeEl.addEventListener('input', recomputeCheckoutTotals);
    timeEl.addEventListener('change', recomputeCheckoutTotals);
  }

  if (asapEl) {
    asapEl.addEventListener('change', recomputeCheckoutTotals);
  }

  if (typeof orderTypeRadios !== 'undefined' && orderTypeRadios?.length) {
    orderTypeRadios.forEach(r => r.addEventListener('change', recomputeCheckoutTotals));
  }
})();


			function calcDeliveryFee(subtotal, orderType){
			  if(orderType !== 'delivery') return 0;
			  return subtotal < DELIVERY_FREE_THRESHOLD ? DELIVERY_FALLBACK_FEE : 0;
			}
	
			function getPreDiscountFoodSubtotal() {
			  return Number(checkoutBaseSubtotal || 0);
			}
			
			function updateFreeDeliveryHint() {
  const hintEl = document.getElementById("freeDeliveryHint");
  if (!hintEl) return;

  const orderType = getSelectedOrderType();
  const subtotal = Number(checkoutBaseSubtotal || 0);

  if (orderType !== "delivery") {
    hintEl.style.display = "none";
    hintEl.textContent = "";
    return;
  }

  if (subtotal >= DELIVERY_FREE_THRESHOLD) {
    hintEl.textContent = "🎉 You’ve unlocked FREE delivery!";
    hintEl.style.display = "block";
    return;
  }

  const remaining = Math.max(0, DELIVERY_FREE_THRESHOLD - subtotal);

  hintEl.textContent = `🚚 Add £${remaining.toFixed(2)} more for FREE delivery`;
  hintEl.style.display = "block";
}
			
			function recomputeCheckoutTotals() {
			  const orderType = getSelectedOrderType();

			  const quote = window.deliveryQuoteState || deliveryQuoteState || {
				loading: false,
				eligible: true,
				fee: 0
			  };

			  console.log("[totals debug] checkoutBaseSubtotal:", checkoutBaseSubtotal);
			  console.log("[totals debug] preDiscountSubtotal:", Number(checkoutBaseSubtotal || 0));
			  console.log("[totals debug] deliveryQuoteState:", quote);
			  console.log("[totals debug] order type:", orderType);

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

			  const subtotal = Math.round(Number(checkoutBaseSubtotal || 0) * 100) / 100;

			  const preferredTimeRaw =
				(document.getElementById('preferred-time')?.value ||
				 document.querySelector('input[name="preferred_time"]')?.value ||
				 '').trim();

			  const asapRequested =
				!!document.querySelector('input[name="asap_requested"]:checked') ||
				!!document.getElementById('asap')?.checked ||
				!!document.getElementById('asap-requested')?.checked ||
				!!document.getElementById('asapRequested')?.checked;

			  const disc = applyWedThuDiscount(subtotal, preferredTimeRaw, asapRequested);

				const discountCodeAmount = Number(appliedDiscountAmount || 0);

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

			  const checkoutSubtotalEl = document.getElementById('checkout-subtotal');
			  const checkoutDeliveryEl = document.getElementById('checkout-delivery');
			  const checkoutTotalEl = document.getElementById('checkout-total');

			  if (checkoutSubtotalEl) {
				checkoutSubtotalEl.textContent = formatCurrency(subtotal);
			  }

			  if (checkoutDeliveryEl) {
				checkoutDeliveryEl.textContent = deliveryBlocked
				  ? "Unavailable"
				  : formatCurrency(deliveryFee);
			  }

			  if (checkoutTotalEl) {
				checkoutTotalEl.textContent = formatCurrency(total);
			  }

if (typeof deliveryNote !== 'undefined' && deliveryNote) {
  deliveryNote.style.display = (orderType === 'delivery') ? 'block' : 'none';

  if (orderType === 'delivery') {
    const fullAddressMessage =
      'Sorry, we could not confirm this delivery address. Please enter your full address including street, town and postcode, for example: 30 Topcliffe Mews, Morley, LS27 8UL. If you are still having problems, please call us on <a href="tel:01134699564">0113 469 9564</a> and we’ll see what we can do 😊';

    if (quote.loading) {
      deliveryNote.className = "";
      deliveryNote.textContent = "Calculating delivery charge…";

    } else if (quote.eligible === false || quote.usedFallback) {
      deliveryNote.className = "delivery-error";
      deliveryNote.innerHTML = fullAddressMessage;

    } else if (getPreDiscountFoodSubtotal() >= DELIVERY_FREE_THRESHOLD) {
      deliveryNote.className = "";
      deliveryNote.textContent = "🎉 Free delivery on orders over £30";

    } else {
      deliveryNote.className = "";
      deliveryNote.textContent =
        `Delivery ${formatCurrency(Number(quote.fee ?? 0))}${
          Number.isFinite(quote.routeMiles)
            ? ` based on approx. route distance of ${quote.routeMiles.toFixed(1)} miles`
            : ' based on approximate distance'
        }`;
    }
  }
}

			  const discountRow = document.getElementById('discountRow');
			  const discountValue = document.getElementById('discountValue');

				if (discountRow && discountValue) {

				  const existingDiscount =
					Number(disc.discount || 0);

				  const voucherDiscount =
					Number(appliedDiscountAmount || 0);

				  const totalDiscount =
					existingDiscount + voucherDiscount;

				  if (totalDiscount > 0) {

					discountRow.style.display = 'flex';

					let label = 'Discount';

					if (appliedDiscountCode) {
					  label += ` (${appliedDiscountCode})`;
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

			  const loyaltyRow = document.getElementById('loyaltyDiscountRow');
			  const loyaltyValue = document.getElementById('loyaltyDiscountValue');

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

				window.__checkoutTotals = {
				  subtotal,

				  discount: Number(appliedDiscountAmount || 0),
				  discount_amount: Number(appliedDiscountAmount || 0),
				  discount_code: appliedDiscountCode || "",
				  discount_label: appliedDiscountCode
					? `Voucher discount (${appliedDiscountCode})`
					: "",

				  discounted_subtotal: discountedSubtotal,

				loyalty_discount: loyaltyDiscount,
				loyalty_reward_applied: !!loyaltyState.rewardEligible,
				loyalty_points_balance: Number(loyaltyState.pointsBalance || 0),
				loyalty_points_redeem_pending: Number(loyaltyState.pointsRedeemedPending || 0),
				loyalty_points_earned_pending: Number(loyaltyState.pointsEarnedPending || 0),
				loyalty_expected_balance: Number(loyaltyState.expectedBalance || 0),

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
				  window.__lastGoodCheckoutTotals = { ...window.__checkoutTotals };
				}
			  
			  updateFreeDeliveryHint();

			  return window.__checkoutTotals;
			}

function updateCheckoutOrderSummary() {
  const box = document.getElementById('checkout-order-summary');
  if (!box) return;

  const orderType = document.querySelector('input[name="order-type"]:checked')?.value || 'collection';
  const address = document.getElementById('cust-address')?.value || '';

  if (orderType === 'delivery') {
    box.innerHTML = `
      <strong>ORDER TYPE: DELIVERY</strong><br>
      Delivering to:<br>
      ${address || '(enter delivery address)'}
    `;
  } else {
    box.innerHTML = `
      <strong>ORDER TYPE: COLLECTION</strong><br>
      Collect from:<br>
      Rung's Thai Kitchen, Morley
    `;
  }
}


    orderTypeRadios.forEach(r => r.addEventListener('change', recomputeCheckoutTotals));
	
				// ---- Address required only for delivery ----
				function updateAddressRequirement() {
				  const orderType = document.querySelector('input[name="order-type"]:checked')?.value || 'collection';
				  const addr = document.getElementById('cust-address');
				  const hint = document.getElementById('addr-required-hint');

				  const isDelivery = (orderType === 'delivery');

				  if (addr) {
					addr.required = isDelivery;
					if (hint) hint.style.opacity = isDelivery ? '1' : '0.6';
				  }
				}

				
				async function geocodeCustomerAddress(address) {
				  try {
					const { data, error } = await sb.functions.invoke("geocode-address", {
					  body: { customer_address: address },
					});

					if (error || !data?.ok) {
					  console.warn("[geocode] failed", error || data);
					  return;
					}

					window.customerLat = data.customer_lat;
					window.customerLng = data.customer_lng;

					console.log("[geocode] success", window.customerLat, window.customerLng);

					await window.refreshCheckoutPricingAndRender();

				  } catch (err) {
					console.error("[geocode] error", err);
				  }
				}

		
// ====== CONFIG YOU CAN EDIT ======
const OPEN_DAYS = [3,4,5,6]; // Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6  (open Fri & Sat) **temp changing open days**
const OPEN_WINDOW = { start: "17:00", end: "21:00" }; // local time, 24h

// Specific closed dates (all day)
const CLOSED_DATES = [
 "2025-12-25", "2025-12-26", "2026-06-17"
];

// //Closed ranges (start/end local)
//const CLOSED_RANGES = [
 //{ start:"2026-07-11T00:00", end:"2026-07-17T23:59" }
//];

// Fully booked windows by date: { "YYYY-MM-DD": [ ["HH:MM","HH:MM"], ... ] }
//const FULLY_BOOKED = {
  // "2025-11-05": [["17:00","18:30"], ["20:00","21:00"]]
//};

// ====== HELPERS ======
const SLOT_MINUTES = 15;
const MAX_KITCHEN_LOAD_PER_SLOT = 3;

// Kitchen production can begin before customer opening time
const KITCHEN_START_HOUR = 16;
const KITCHEN_START_MINUTE = 30;

// System-generated alternative fulfilment times may extend
// beyond the normal customer-selectable closing time.
const KITCHEN_OVERRUN_MINUTES = 60;

// Kitchen scheduling:
// 1 Chef Rung workload unit = 5 continuous minutes
const KITCHEN_STEP_MINUTES = 5;

let kitchenSlotMap = new Map();

function getSlotStart(dt) {
  const slot = new Date(dt);

  const minutes = slot.getMinutes();
  const floored =
    Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES;

  slot.setMinutes(floored, 0, 0);

  return slot;
}

function buildKitchenSlotMap(orders) {
  const slotMap = new Map();

  for (const order of orders) {
    if (!order.preferred_time) continue;

    const orderTime = new Date(order.preferred_time);
    const slotStart = getSlotStart(orderTime);

    const key = slotStart.toISOString();

    const orderLoad =
      getExistingOrderKitchenLoad(order);

    slotMap.set(
      key,
      (slotMap.get(key) || 0) + orderLoad
    );
  }

  return slotMap;
}

function getKitchenStartForDate(dt) {
  const start = new Date(dt);

  start.setHours(
    KITCHEN_START_HOUR,
    KITCHEN_START_MINUTE,
    0,
    0
  );

  return start;
}

function getLatestProductionSlotStart(readyTime) {
  // Find the latest COMPLETE 15-minute kitchen slot
  // that finishes on or before the customer's ready time.
  const t = new Date(
    readyTime.getTime() -
    SLOT_MINUTES * 60 * 1000
  );

  const minutes = t.getMinutes();

  t.setMinutes(
    Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES,
    0,
    0
  );

  return t;
}

function allocateLoadBackwards(
  readyTime,
  load,
  slotMap
) {
  const requiredSteps = Number(load || 0);

  if (requiredSteps <= 0) {
    return {
      success: true,
      slotMap
    };
  }

  const kitchenStart =
    getKitchenStartForDate(readyTime);

  // Work backwards in continuous 5-minute steps
  let slot = new Date(
    readyTime.getTime() -
    KITCHEN_STEP_MINUTES * 60 * 1000
  );

  const slotsNeeded = [];

  for (let i = 0; i < requiredSteps; i++) {

    // Would this push production before the kitchen starts?
    if (slot < kitchenStart) {
      return {
        success: false,
        slotMap
      };
    }

    const key = slot.toISOString();

    // Any occupied step breaks the continuous run
    if ((slotMap.get(key) || 0) > 0) {
      return {
        success: false,
        slotMap
      };
    }

    slotsNeeded.push(key);

    slot = new Date(
      slot.getTime() -
      KITCHEN_STEP_MINUTES * 60 * 1000
    );
  }

  // Only reserve the slots once we've proved the
  // ENTIRE continuous run is available.
  for (const key of slotsNeeded) {
    slotMap.set(key, 1);
  }

  return {
    success: true,
    slotMap
  };
}

function forceAllocateExistingLoad(
  readyTime,
  load,
  slotMap
) {
  const requiredSteps = Number(load || 0);

  if (requiredSteps <= 0) {
    return {
      overCapacity: false,
      conflicts: []
    };
  }

  const kitchenStart =
    getKitchenStartForDate(readyTime);

  let slot = new Date(
    readyTime.getTime() -
    KITCHEN_STEP_MINUTES * 60 * 1000
  );

  const conflicts = [];

  for (let i = 0; i < requiredSteps; i++) {
    if (slot < kitchenStart) {
      break;
    }

    const key = slot.toISOString();
    const existingLoad = slotMap.get(key) || 0;

    if (existingLoad > 0) {
      conflicts.push({
        time: key,
        existingLoad,
        newLoad: existingLoad + 1
      });
    }

    slotMap.set(
      key,
      existingLoad + 1
    );

    slot = new Date(
      slot.getTime() -
      KITCHEN_STEP_MINUTES * 60 * 1000
    );
  }

  return {
    overCapacity: conflicts.length > 0,
    conflicts
  };
}

function getEffectiveOrderTime(order) {
  // An explicitly confirmed adjusted time is always authoritative.
  if (order.confirmed_time) {
    return order.confirmed_time;
  }

  // Customer rejected the proposed time.
  // The original requested time was already unavailable,
  // so don't reserve capacity until another time is agreed/offered.
  if (
    order.status === 'pending' &&
    order.proposed_time
  ) {
    return null;
  }

  // A proposed replacement time is the best operational time we have.
  // This covers both an active proposal and an order subsequently
  // progressed/completed without confirmed_time being populated.
  if (order.proposed_time) {
    return order.proposed_time;
  }

  // Normal untouched order.
  return order.preferred_time;
}

function buildKitchenProductionMap(orders) {
  const productionMap = new Map();

  const sortedOrders = [...orders].sort(
    (a, b) =>
      new Date(getEffectiveOrderTime(a)) -
      new Date(getEffectiveOrderTime(b))
  );

  for (const order of sortedOrders) {
    const effectiveTime = getEffectiveOrderTime(order);

    if (!effectiveTime) continue;

    const load =
      getExistingOrderKitchenLoad(order);

    if (load <= 0) continue;

    const readyTime =
      new Date(effectiveTime);

    const result = allocateLoadBackwards(
      readyTime,
      load,
      productionMap
    );

    if (!result.success) {
  const forced =
    forceAllocateExistingLoad(
      readyTime,
      load,
      productionMap
    );

  console.warn(
    '[kitchen-schedule] existing order exceeds available capacity:',
    {
      orderId: order.id,
      preferredTime: order.preferred_time,
      proposedTime: order.proposed_time,
      confirmedTime: order.confirmed_time,
      effectiveTime,
      load,
      conflicts: forced.conflicts
    }
  );
}
  }

  return productionMap;
}

async function refreshKitchenSlotMap(serviceDate) {
  const schedule = await loadKitchenScheduleForDate(serviceDate);
kitchenSlotMap = buildKitchenProductionMap(schedule);

  console.log(
    '[kitchen-schedule] refreshed slot map:',
    kitchenSlotMap
  );

  return kitchenSlotMap;
}

function toYMD(d){
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function parseHm(dateRef, hm){ // "HH:MM" -> Date on same Y/M/D
  const [h,m] = hm.split(':').map(Number);
  const d = new Date(dateRef);
  d.setHours(h, m, 0, 0);
  return d;
}
function isBetween(d, start, end){ return d >= start && d <= end; }
function roundTo5Min(d){
  const ms = 5 * 60 * 1000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}
function withinOpenHours(d){
  // day
  if (!OPEN_DAYS.includes(d.getDay())) return false;
  // time
  const start = parseHm(d, OPEN_WINDOW.start);
  const end   = parseHm(d, OPEN_WINDOW.end);
  return d >= start && d <= end;
}
function isClosedDate(d){
  const ymd = toYMD(d);

  if (CLOSED_DATES.includes(ymd)) return true;

  for (const r of CLOSED_RANGES){
    const rs = new Date(r.start);
    const re = new Date(r.end);

    // Blackout end times are exclusive:
    // 18:00–18:30 closes 18:00 through 18:25.
    if (d >= rs && d < re) return true;
  }

  return false;
}

function isFullyBooked(d) {
  return FULLY_BOOKED.some(win =>
    d >= win.start && d < win.end
  );
}
async function loadKitchenScheduleForDate(serviceDate) {
  const start = new Date(serviceDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data, error } = await sb
    .from('orders')
    .select(`
      id,
      preferred_time,
      proposed_time,
      confirmed_time,
      status,
      is_test,
      capacity_scheduler,
      order_items (
        qty,
        kitchen_load
      )
    `)
    .or([
      `and(preferred_time.gte.${start.toISOString()},preferred_time.lt.${end.toISOString()})`,
      `and(proposed_time.gte.${start.toISOString()},proposed_time.lt.${end.toISOString()})`,
      `and(confirmed_time.gte.${start.toISOString()},confirmed_time.lt.${end.toISOString()})`
    ].join(','))
    .eq('is_test', false);

  if (error) {
    console.warn('[kitchen-schedule] fetch failed', error);
    return [];
  }

  return window.RTKBookingCapacityRows(data||[],start,end);
}

function getExistingOrderKitchenLoad(order) {
  return (order.order_items || []).reduce(
    (total, line) =>
      total +
      Number(line.kitchen_load || 0) *
      Number(line.qty || 0),
    0
  );
}

async function refreshKitchenScheduleForDateTime(dt) {
  if (!dt) return;

  await refreshKitchenSlotMap(dt);

  const preferredTimeEl =
    document.getElementById('cust-preferred-time');

  if (!preferredTimeEl?.value) return;

  const currentlySelected =
    new Date(preferredTimeEl.value);

  if (!isAllowed(currentlySelected)) {
    const nextAvailable =
      await nextAlternativeFulfilment(
        currentlySelected
      );

    if (nextAvailable) {
      preferredTimeEl.value =
        toLocalInputValue(nextAvailable);

      console.log(
        '[kitchen-schedule] preferred time moved to:',
        preferredTimeEl.value
      );
    }
  }
}

function isAllowed(dt){
  if(checkoutAvailability.hints)return withinOpenHours(dt)&&checkoutAvailability.hints.get(dt.toISOString())===true;
  return withinOpenHours(dt) &&
         !isClosedDate(dt) &&
         !isFullyBooked(dt) &&
         canBasketFitInSlot(dt);
}

function isAllowedForAlternativeFulfilment(dt) {
  if(checkoutAvailability.hints)return checkoutAvailability.hints.get(dt.toISOString())===true;
  // Must still be one of our trading days.
  if (!OPEN_DAYS.includes(dt.getDay())) {
    return false;
  }

  // Respect closures / fully-booked periods.
  if (isClosedDate(dt) || isFullyBooked(dt)) {
    return false;
  }

  const normalStart = parseHm(dt, OPEN_WINDOW.start);
  const normalEnd = parseHm(dt, OPEN_WINDOW.end);

  const extendedEnd = new Date(
    normalEnd.getTime() +
    KITCHEN_OVERRUN_MINUTES * 60 * 1000
  );

  // Alternative fulfilment may run beyond normal closing,
  // but must not begin before the normal customer opening time.
  if (dt < normalStart || dt > extendedEnd) {
    return false;
  }

  return canBasketFitInSlot(dt);
}

function nextAllowed(from) {
  // walk forward in 5-minute steps until we find an allowed slot (cap at +30 days)
  const cap = new Date(from);
  cap.setDate(cap.getDate() + 30);

  let t = new Date(from);
  t = roundTo5Min(t);

  while (t <= cap) {
    if (isAllowed(t)) return t;
    t = new Date(t.getTime() + 5 * 60 * 1000);
  }

  return null;
}

async function nextAlternativeFulfilment(from) {
  const cap = new Date(from);
  cap.setDate(cap.getDate() + 30);

  let t = roundTo5Min(new Date(from));

  let loadedDateKey = null;

  while (t <= cap) {
    const dateKey = toYMD(t);

    // The kitchen production map is date-specific.
    // Reload it whenever the search crosses onto another day.
    if (dateKey !== loadedDateKey) {
      await refreshKitchenSlotMap(t);
      loadedDateKey = dateKey;
    }

    if (isAllowedForAlternativeFulfilment(t)) {
      return t;
    }

    t = new Date(
      t.getTime() + 5 * 60 * 1000
    );
  }

  return null;
}
function showPreferredTimeMessage(message) {
  const el =
    document.getElementById('preferred-time-message');

  if (!el) return;

  el.textContent = message;
  el.style.display = 'block';
}

function hidePreferredTimeMessage() {
  const el =
    document.getElementById('preferred-time-message');

  if (!el) return;

  el.textContent = '';
  el.style.display = 'none';
}

// ---- Preferred time helpers ----

// How many minutes from "now" before the earliest slot is allowed
const LEAD_MINUTES = 20;

/** Convert a Date to the value format of datetime-local input */
function toLocalInputValue(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
         `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const KITCHEN_LOAD_BY_CATEGORY = {
  "Starter": 0,
  "Soup": 1,
  "Salad": 1,
  "Curry": 1,
  "Stir Fry": 1,
  "Noodles & Rice": 1,
  "Side Dishes": 0,
  "Soft Drinks": 0
};

function getItemKitchenLoad(item) {
  if (item.kitchenLoad !== undefined) {
    return Number(item.kitchenLoad);
  }

  return KITCHEN_LOAD_BY_CATEGORY[item.categoryTitle] ?? 0;
}

function getBasketKitchenLoad() {
  const basket = Array.isArray(window.basket)
    ? window.basket
    : [];

  return basket.reduce((total, line) => {
    const item = window.ITEMS_BY_ID.get(line.itemId);

    if (!item) return total;

    return total +
      getItemKitchenLoad(item) *
      Number(line.qty || 0);
  }, 0);
}

function canBasketFitInSlot(readyTime) {
  const basketLoad =
    getBasketKitchenLoad();

  if (basketLoad <= 0) {
    return true;
  }

  // Work on a copy - don't actually reserve capacity yet
  const testMap =
    new Map(kitchenSlotMap);

  const result =
    allocateLoadBackwards(
      readyTime,
      basketLoad,
      testMap
    );

  return result.success;
}

/**
 * Starting from now + LEAD_MINUTES, find the next allowed slot
 * using your existing nextAllowed/isAllowed logic.
 */
function findNextAllowedFromNow() {
  const start = new Date();
  start.setMinutes(start.getMinutes() + LEAD_MINUTES);
  return nextAllowed(start);  // may return null if nothing within +30 days
}

			function isWedThuLondonForFulfilment(preferredTimeRaw, asapRequested) {
			  // Option A: ASAP uses "today" in London
			  if (asapRequested) return isWedThuLondon();

			  try {
				const raw = String(preferredTimeRaw || '').trim();
				if (!raw) return false;

				let y, m, d;

				// Format A: "YYYY-MM-DDTHH:MM" or "YYYY-MM-DD HH:MM"
				if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
				  const datePart = raw.split('T')[0].split(' ')[0];
				  const parts = datePart.split('-').map(n => parseInt(n, 10));
				  [y, m, d] = parts;
				}
				// Format B: "DD/MM/YYYY HH:MM" (your UI)
				else if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
				  const datePart = raw.split(' ')[0];
				  const parts = datePart.split('/').map(n => parseInt(n, 10));
				  [d, m, y] = parts;
				} else {
				  return false;
				}

				if (![y, m, d].every(Number.isFinite)) return false;

				// Noon UTC avoids DST edge cases
				const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

				const weekday = new Intl.DateTimeFormat('en-GB', {
				  timeZone: 'Europe/London',
				  weekday: 'short'
				}).format(dt);

				return weekday === 'Wed' || weekday === 'Thu';
			  } catch {
				return false;
			  }
			}
			
			// ---------------- LOYALTY PHONE LOOKUP ----------------
(function wireLoyaltyPhoneLookup() {
  const phoneInput = document.getElementById('cust-phone');
  if (!phoneInput) return;

  async function refreshLoyaltyFromPhone() {
    const loyalty = await fetchLoyaltyBalance(phoneInput.value);
	
	  console.log('LOYALTY RESPONSE:', loyalty); // 👈 ADD THIS

			if (loyalty) {
			  loyaltyState.pointsBalance = Number(loyalty.points_balance || 0);

			  // ⭐ NEW — use settled balance if available, fallback safely
			  loyaltyState.settledPointsBalance = Number(
				loyalty.settled_points_balance ?? loyalty.points_balance ?? 0
			  );

			  loyaltyState.lifetimePoints = Number(loyalty.lifetime_points || 0);
			  loyaltyState.pointsToNextReward = Number(loyalty.points_to_next_reward || 100);
			} else {
			  loyaltyState.pointsBalance = 0;
			  loyaltyState.settledPointsBalance = 0; // ⭐ NEW
			  loyaltyState.lifetimePoints = 0;
			  loyaltyState.pointsToNextReward = 100;
			}
			
			console.log('LOYALTY RESPONSE FROM BACKEND:', loyalty);
			console.log('LOYALTY STATE AFTER LOAD:', loyaltyState);

    refreshCheckoutPricingAndRender();
    renderLoyaltyMessage();
  }

  phoneInput.addEventListener('blur', refreshLoyaltyFromPhone);
  phoneInput.addEventListener('change', refreshLoyaltyFromPhone);
})();
// ---------------- END LOYALTY PHONE LOOKUP ----------------






			
		// Single, clean checkout opener
			window.RTKApplyReviewedTime=async instant=>{
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant)).map(p=>[p.type,p.value]));
 const date=parts.year+'-'+parts.month+'-'+parts.day;
 preferredDateInput.value=date;
 await populatePreferredTimeSelect(date);
 preferredTimeSelect.value=parts.hour+':'+parts.minute;
 preferredTimeSelect.dispatchEvent(new Event('change',{bubbles:true}));
 document.getElementById('unavailable-basket-dialog')?.close();
};
window.RTKOpenReviewedCheckout=()=>openCheckout(basket.reduce((n,i)=>n+i.qty*i.unitPrice,0));
// Keep popup operations separate from availability and submission.
const checkoutDialog = window.RTKCheckoutDialog.create({
  window, document, console,
  get SERVICE_STATE(){ return typeof SERVICE_STATE === 'undefined' ? undefined : SERVICE_STATE; },
  get availabilityBasketKey(){ return typeof availabilityBasketKey === 'undefined' ? undefined : availabilityBasketKey; },
  get checkoutBaseSubtotal(){ return typeof checkoutBaseSubtotal === 'undefined' ? undefined : checkoutBaseSubtotal; },
  set checkoutBaseSubtotal(value){ checkoutBaseSubtotal = value; },
  get checkoutModal(){ return typeof checkoutModal === 'undefined' ? undefined : checkoutModal; },
  get checkoutMsg(){ return typeof checkoutMsg === 'undefined' ? undefined : checkoutMsg; },
  get lastPreferredDate(){ return typeof lastPreferredDate === 'undefined' ? undefined : lastPreferredDate; },
  set lastPreferredDate(value){ lastPreferredDate = value; },
  get loadBlackouts(){ return typeof loadBlackouts === 'undefined' ? undefined : loadBlackouts; },
  get loadServiceState(){ return typeof loadServiceState === 'undefined' ? undefined : loadServiceState; },
  get orderMsg(){ return typeof orderMsg === 'undefined' ? undefined : orderMsg; },
  get populatePreferredTimeSelect(){ return typeof populatePreferredTimeSelect === 'undefined' ? undefined : populatePreferredTimeSelect; },
  get preferredDateInput(){ return typeof preferredDateInput === 'undefined' ? undefined : preferredDateInput; },
  get preferredTimeHidden(){ return typeof preferredTimeHidden === 'undefined' ? undefined : preferredTimeHidden; },
  get preferredTimeSelect(){ return typeof preferredTimeSelect === 'undefined' ? undefined : preferredTimeSelect; },
  get recomputeCheckoutTotals(){ return typeof recomputeCheckoutTotals === 'undefined' ? undefined : recomputeCheckoutTotals; },
  get showPreferredTimeMessage(){ return typeof showPreferredTimeMessage === 'undefined' ? undefined : showPreferredTimeMessage; },
  get updateCheckoutOrderSummary(){ return typeof updateCheckoutOrderSummary === 'undefined' ? undefined : updateCheckoutOrderSummary; },
  get updateCheckoutSubmitButton(){ return typeof updateCheckoutSubmitButton === 'undefined' ? undefined : updateCheckoutSubmitButton; }
});
async function openCheckout(subtotal){return checkoutDialog.open(subtotal);}
function setAvailabilityLoading(value){return checkoutDialog.setAvailabilityLoading(value);}

// Ensure other code can call it
window.openCheckout = openCheckout;


function closeCheckout(){return checkoutDialog.close();}

// safe listeners
if (checkoutClose) {
  checkoutClose.addEventListener('click', closeCheckout);
}
if (checkoutCancel) {
  checkoutCancel.addEventListener('click', closeCheckout);
}
if (checkoutModal) {
  checkoutModal.addEventListener('click', (e) => {
    if (e.target === checkoutModal) closeCheckout();
  });
}

document.addEventListener('change', async (e) => {
  if (e.target && e.target.matches('input[name="order-type"]')) {

    updateCheckoutSubmitButton();
    updateCheckoutOrderSummary();

    await refreshCheckoutPricingAndRender();
    await populatePreferredTimeSelect(document.getElementById('cust-preferred-date')?.value);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const addressInput = document.getElementById('cust-address');

  if (addressInput) {
    addressInput.addEventListener('blur', (e) => {
      const address = e.target.value;

      if (address && address.length > 5) {
        geocodeCustomerAddress(address).then(()=>populatePreferredTimeSelect(document.getElementById('cust-preferred-date')?.value));
      }
    });
  }
});

document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'cust-address') {
    updateCheckoutOrderSummary();
    if(document.querySelector('input[name="order-type"]:checked')?.value==='delivery'){
      checkoutAvailability.invalidate();
      clearPreferredTimeSelect('Finish entering your delivery address');
    }
  }
});

// Open checkout (safe)
if (openCheckoutBtn) {
  openCheckoutBtn.addEventListener('click', () => {
    if (!window.basket || window.basket.length === 0) {
      if (orderMsg) {
        orderMsg.textContent = 'Your basket is empty.';
        orderMsg.style.color = '#b02a2a';
      }
      return;
    }

    if (orderMsg) {
      orderMsg.textContent = '';
      orderMsg.style.color = '';
    }
    const subtotal = window.basket.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    openCheckout(subtotal);
  });
}


// 👇 ADD THE DISCOUNT CODE LISTENER HERE

document.getElementById("apply-discount-code-btn")?.addEventListener("click", async () => {

  const input = document.getElementById("discount-code-input");
  const message = document.getElementById("discount-code-message");

  const foodSubtotal = Number(checkoutBaseSubtotal || 0);

  const result = await validateDiscountCode(
    input.value,
    foodSubtotal
  );

  if (!result.valid) {

    appliedDiscountCode = null;
    appliedDiscountAmount = 0;

    if (message) {
      message.textContent = result.reason;
      message.className = "discount-code-message error";
    }

    recomputeCheckoutTotals();
    return;
	
	  appliedDiscountAmount =
    result.discountAmount;

  // 👇 ADD THIS
  recomputeCheckoutTotals();
  }

  appliedDiscountCode = result.code;
  appliedDiscountAmount = result.discountAmount;

  if (message) {
    message.textContent =
      `${result.code} applied: £${result.discountAmount.toFixed(2)} off`;

    message.className =
      "discount-code-message success";
  }

  recomputeCheckoutTotals();

});

	
		// ---------- Helpers to call Supabase RPC & REST ----------
    async function getNextOrderRef() {
  if (!window.sb) {
    throw new Error("Supabase client not initialised");
  }

  const { data, error } = await window.sb.rpc('get_next_order_number');

  if (error) {
    console.error('get_next_order_number failed', error);
    throw error;
  }

  const assigned =
    Array.isArray(data)
      ? data[0]?.assigned
      : (data?.assigned ?? data);

  const num = Number(assigned || 0);
  return 'RTK-' + String(num).padStart(3, '0');
}

	
		// --- Success popup renderer (with Download PDF) ---
		window.__lastOrderForPdf = null;
		
		// helper: strip any 🌶️ from item names so we only show user's chosen level
		function stripChillies(str) {
		  return (str || '').replace(/🌶️+/g, '').replace(/\s{2,}/g, ' ').trim();
		}


		window.showOrderSuccessNew = function (summary, items, preferredTimeStr) {
		  const wrap     = document.getElementById('order-success');
		  const titleEl  = document.getElementById('order-success-title');
		  const msgEl    = document.getElementById('order-success-msg');
		  const listEl   = document.getElementById('order-success-items');
		  const totalEl  = document.getElementById('order-success-total');

		  if (!wrap) {
			alert(`Order placed! ${summary?.ref || ''}`);
			return;
		  }

		  // header
		  if (titleEl) {
			titleEl.textContent = `Order confirmed — ${summary.ref}`;
		  }

		  // note
		  if (msgEl) {
			const suffix = summary.orderType === 'delivery' ? 'delivery' : 'collection';
			const note = preferredTimeStr
			  ? `Thanks! We’ll contact you to confirm your ${suffix} time (${preferredTimeStr}).`
			  : `Thanks! We’ll contact you to confirm your ${suffix} time.`;
			msgEl.textContent = note;
		  }

		  // items
		  if (listEl) {
			listEl.innerHTML = items.map((row) => {
	  const cleanName = stripChillies(row.name);
	  const hasMods  = row.mods && row.mods.length;
	  const hasSpice = typeof row.spice === 'number';
	  const spiceStr = hasSpice ? ' ' + '🌶️'.repeat(Math.max(0, Math.min(3, row.spice))) : '';
	  return `
		<div style="padding:6px 0;border-bottom:1px dashed #eee">
		  ${row.qty} × ${cleanName}
		  ${hasMods ? `<span class="muted small"> • ${row.mods.map(m => m.name).join(', ')}</span>` : ''}
		  ${spiceStr}
		  <div class="muted small">Line: ${window.formatCurrency(row.qty * row.unitPrice)}</div>
		</div>
	  `;
	}).join('');

		  }

		  // total
		  if (totalEl) {
			totalEl.textContent = window.formatCurrency(summary.total);
		  }
		  
		    // hook up the "Download receipt" button
  const dlBtn = document.getElementById('order-success-download');
  if (dlBtn) {
    dlBtn.onclick = () => {
      // make it loud so we see it even if console is filtered
      console.error('[Receipt] download clicked', items);
      if (typeof window.downloadReceipt === 'function') {
        window.downloadReceiptPlain(summary, items, preferredTimeStr);
      }
    };
  }


		  // ✅ store for PDF generation
		  window.__lastOrderForPdf = { summary, items, preferredTimeStr };

		  wrap.style.display = 'flex';
		};

			async function getOrCreateCustomer({ name, email, phone, address }) {
		  const sb = window.sb;
		  if (!sb) throw new Error('Supabase client not initialised');

		  const normEmail = email ? email.trim().toLowerCase() : null;
		  const normPhone = phone ? phone.trim() : null;

		  // 1) Try find by email
		  if (normEmail) {
			const { data: byEmail, error: e1 } = await sb
			  .from('customers')
			  .select('id, phone, email')
			  .eq('email', normEmail)
			  .maybeSingle();
			if (e1) throw e1;

			if (byEmail?.id) {
			  // Update existing
			  const updatePayload = { full_name: name, address: address || null };
			  if (!byEmail.phone && normPhone) updatePayload.phone = normPhone;

			  const { data: updated, error: e2 } = await sb
				.from('customers')
				.update(updatePayload)
				.eq('id', byEmail.id)
				.select('id')
				.single();
			  if (e2) throw e2;

			  return updated;
			}
		  }

		  // 2) Try find by phone
		  if (normPhone) {
			const { data: byPhone, error: p1 } = await sb
			  .from('customers')
			  .select('id, phone, email')
			  .eq('phone', normPhone)
			  .maybeSingle();
			if (p1) throw p1;

			if (byPhone?.id) {
			  // Update existing
			  const updatePayload = { full_name: name, address: address || null };
			  if (!byPhone.email && normEmail) updatePayload.email = normEmail;

			  const { data: updated, error: p2 } = await sb
				.from('customers')
				.update(updatePayload)
				.eq('id', byPhone.id)
				.select('id')
				.single();
			  if (p2) throw p2;

			  return updated;
			}
		  }

		  // 3) Insert new (handle unique collisions gracefully)
		  const insertPayload = {
			full_name: name,
			email: normEmail,
			phone: normPhone,
			address: address || null
		  };

		  // First attempt: insert with whatever we have
		  let { data: inserted, error: insErr } = await sb
			.from('customers')
			.insert([insertPayload])
			.select('id')
			.single();

		  if (!insErr) return inserted;

		  // If we hit a unique violation, re-fetch whichever key collided and return that row
		  if (insErr.code === '23505') {
			if (normEmail) {
			  const { data: existing, error: e3 } = await sb
				.from('customers')
				.select('id')
				.eq('email', normEmail)
				.maybeSingle();
			  if (e3) throw e3;
			  if (existing?.id) return existing;
			}

			if (normPhone) {
			  const { data: existing, error: p3 } = await sb
				.from('customers')
				.select('id')
				.eq('phone', normPhone)
				.maybeSingle();
			  if (p3) throw p3;
			  if (existing?.id) return existing;
			}
		  }

		  // Otherwise, throw the real error
		  throw insErr;
		}


		// Prevent accidental double submit in the same session
		// The submission controller owns its in-flight guard.

		// One key per checkout attempt; reused on retries; cleared on success
		function getIdempotencyKey() {
		  const existing = localStorage.getItem("checkout_idempotency_key");
		  if (existing) return existing;

		  const key = crypto.randomUUID();
		  localStorage.setItem("checkout_idempotency_key", key);
		  return key;
		}
		
			function updateCheckoutSubmitButton() {
			  const submitBtn = checkoutForm?.querySelector('button[type="submit"], input[type="submit"]');
			  const orderType = document.querySelector('input[name="order-type"]:checked')?.value || 'collection';
			  const quote = window.deliveryQuoteState || deliveryQuoteState;

			  if (!submitBtn) return;

			  let label =
				orderType === 'delivery'
				  ? 'Place Delivery Order'
				  : 'Place Collection Order';

			  let disabled = false;

			  if (orderType === 'delivery') {
				if (quote?.loading) {
				  label = 'Checking delivery…';
				  disabled = true;
				} else if (quote?.eligible === false) {
				  label = 'Outside delivery area';
				  disabled = true;
				}
			  }

			  // Apply label
			  if (submitBtn.tagName === 'INPUT') {
				submitBtn.value = label;
			  } else {
				submitBtn.textContent = label;
			  }

			  // Apply disabled state
			  submitBtn.disabled = disabled;

			  // Optional visual styling
			  submitBtn.style.opacity = disabled ? '0.6' : '1';
			  submitBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
			  
			  // After setting disabled state
			if (disabled && orderType === 'delivery' && quote?.eligible === false) {
			  submitBtn.title = "This address is outside our delivery area. Please call (on 0113 469 9564) to discuss";
			} else {
			  submitBtn.title = "";
			}
			}

	  function resetCheckoutForNextOrder() {
  console.log('[checkout] resetting state for next order');

  const fieldsToClear = [
    'cust-name',
    'cust-email',
    'cust-phone',
    'cust-address',
    'cust-notes',
    'cust-preferred-time'
  ];

  fieldsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  appliedDiscountCode = null;
  appliedDiscountAmount = 0;

  const discountMessage =
    document.getElementById('discount-code-message');

  if (discountMessage) {
    discountMessage.textContent = '';
    discountMessage.className = 'discount-code-message';
  }

  const discountInput =
    document.getElementById('discount-code') ||
    document.querySelector('input[name="discount_code"]');

  if (discountInput) {
    discountInput.value = '';
  }

  lastPreferredDate = null;

  if (typeof hidePreferredTimeMessage === 'function') {
    hidePreferredTimeMessage();
  }

  window.deliveryQuoteState = {};

  localStorage.removeItem('checkout_idempotency_key');

  console.log('[checkout] reset complete');
}

// Submit checkout → Supabase (with upsert customer + order_ref + preferred_time)
checkoutForm.addEventListener('submit', window.RTKCheckoutSubmission.create({
  window, document, console,
  get DELIVERY_FREE_THRESHOLD(){ return typeof DELIVERY_FREE_THRESHOLD === 'undefined' ? undefined : DELIVERY_FREE_THRESHOLD; },
  get OPEN_WINDOW(){ return typeof OPEN_WINDOW === 'undefined' ? undefined : OPEN_WINDOW; },
  get SERVICE_STATE(){ return typeof SERVICE_STATE === 'undefined' ? undefined : SERVICE_STATE; },
  get appliedDiscountAmount(){ return typeof appliedDiscountAmount === 'undefined' ? undefined : appliedDiscountAmount; },
  get appliedDiscountCode(){ return typeof appliedDiscountCode === 'undefined' ? undefined : appliedDiscountCode; },
  get applyWedThuDiscount(){ return typeof applyWedThuDiscount === 'undefined' ? undefined : applyWedThuDiscount; },
  get basket(){ return typeof basket === 'undefined' ? undefined : basket; },
  get checkoutBaseSubtotal(){ return typeof checkoutBaseSubtotal === 'undefined' ? undefined : checkoutBaseSubtotal; },
  set checkoutBaseSubtotal(value){ checkoutBaseSubtotal = value; },
  get checkoutForm(){ return typeof checkoutForm === 'undefined' ? undefined : checkoutForm; },
  get checkoutModal(){ return typeof checkoutModal === 'undefined' ? undefined : checkoutModal; },
  get checkoutMsg(){ return typeof checkoutMsg === 'undefined' ? undefined : checkoutMsg; },
  get deliveryMessageEl(){ return typeof deliveryMessageEl === 'undefined' ? undefined : deliveryMessageEl; },
  get deliveryQuoteState(){ return typeof deliveryQuoteState === 'undefined' ? undefined : deliveryQuoteState; },
  get getItemKitchenLoad(){ return typeof getItemKitchenLoad === 'undefined' ? undefined : getItemKitchenLoad; },
  get getNextOrderRef(){ return typeof getNextOrderRef === 'undefined' ? undefined : getNextOrderRef; },
  get getOrCreateCustomer(){ return typeof getOrCreateCustomer === 'undefined' ? undefined : getOrCreateCustomer; },
  get getSelectedOrderType(){ return typeof getSelectedOrderType === 'undefined' ? undefined : getSelectedOrderType; },
  get isAllowed(){ return typeof isAllowed === 'undefined' ? undefined : isAllowed; },
  get isAllowedForAlternativeFulfilment(){ return typeof isAllowedForAlternativeFulfilment === 'undefined' ? undefined : isAllowedForAlternativeFulfilment; },
  get loadServiceState(){ return typeof loadServiceState === 'undefined' ? undefined : loadServiceState; },
  get populatePreferredTimeSelect(){ return typeof populatePreferredTimeSelect === 'undefined' ? undefined : populatePreferredTimeSelect; },
  get preferredDateInput(){ return typeof preferredDateInput === 'undefined' ? undefined : preferredDateInput; },
  get preferredTimeHidden(){ return typeof preferredTimeHidden === 'undefined' ? undefined : preferredTimeHidden; },
  get preferredTimeSelect(){ return typeof preferredTimeSelect === 'undefined' ? undefined : preferredTimeSelect; },
  get recomputeCheckoutTotals(){ return typeof recomputeCheckoutTotals === 'undefined' ? undefined : recomputeCheckoutTotals; },
  get refreshKitchenSlotMap(){ return typeof refreshKitchenSlotMap === 'undefined' ? undefined : refreshKitchenSlotMap; },
  get renderOrder(){ return typeof renderOrder === 'undefined' ? undefined : renderOrder; },
  get resetCheckoutForNextOrder(){ return typeof resetCheckoutForNextOrder === 'undefined' ? undefined : resetCheckoutForNextOrder; },
  get sb(){ return typeof sb === 'undefined' ? undefined : sb; },
  get showOrderSuccess(){ return typeof showOrderSuccess === 'undefined' ? undefined : showOrderSuccess; },
  get showPausedOrderAlert(){ return typeof showPausedOrderAlert === 'undefined' ? undefined : showPausedOrderAlert; },
  get showPreferredTimeMessage(){ return typeof showPreferredTimeMessage === 'undefined' ? undefined : showPreferredTimeMessage; },
  get toYMD(){ return typeof toYMD === 'undefined' ? undefined : toYMD; },
  get validatePreferredTime(){ return typeof validatePreferredTime === 'undefined' ? undefined : validatePreferredTime; }
}));

  