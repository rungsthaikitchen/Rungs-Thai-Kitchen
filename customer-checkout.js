
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
async function loadBlackouts(...args){return checkoutService.loadBlackouts(...args);}

const serviceStatusNotice =
  document.getElementById('service-status-notice');

let SERVICE_STATE = {
  mode: 'normal',
  capacity_throttle: 0,
  customer_message: null,
  effective_until: null
};

// BEGIN checkout-service boundary
const checkoutService = window.RTKCheckoutService.create({
 document, console, fetch,
 get sb(){return sb;},
 get serviceStatusNotice(){return serviceStatusNotice;},
 get SERVICE_STATE(){return SERVICE_STATE;},
 set SERVICE_STATE(value){SERVICE_STATE=value;},
 get CLOSED_RANGES(){return CLOSED_RANGES;},
 set CLOSED_RANGES(value){CLOSED_RANGES=value;},
 get FULLY_BOOKED(){return FULLY_BOOKED;},
 set FULLY_BOOKED(value){FULLY_BOOKED=value;}
});
// END checkout-service boundary
function renderServiceStatusNotice(...args){return checkoutService.renderServiceStatusNotice(...args);}

async function loadServiceState(...args){return checkoutService.loadServiceState(...args);}

// Helpers
function inAnyWindow(...args){return checkoutService.inAnyWindow(...args);}

function isWedThuLondon(d = new Date()){
  const day = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short'
  }).format(d); // "Mon", "Tue", "Wed", "Thu", ...
  return day === 'Wed' || day === 'Thu';
}

			function applyWedThuDiscount(...args){return checkoutPricing.applyWedThuDiscount(...args);}



// Banner helpers
function showCheckoutBanner(...args){return checkoutService.showCheckoutBanner(...args);}
function hideCheckoutBanner(...args){return checkoutService.hideCheckoutBanner(...args);}

function showBlackoutBannerForDate(...args){return checkoutService.showBlackoutBannerForDate(...args);}

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
  if(checkoutAvailability.hints){
    const available=checkoutAvailability.hints.get(chosen.toISOString())===true;
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

// BEGIN checkout-availability boundary
const checkoutAvailability = window.RTKCheckoutAvailability.create({
window, document, console,
get getBasketKitchenLoad(){return typeof getBasketKitchenLoad==='undefined'?undefined:getBasketKitchenLoad;},
get getSelectedOrderType(){return typeof getSelectedOrderType==='undefined'?undefined:getSelectedOrderType;},
get hidePreferredTimeMessage(){return typeof hidePreferredTimeMessage==='undefined'?undefined:hidePreferredTimeMessage;},
get isAllowed(){return typeof isAllowed==='undefined'?undefined:isAllowed;},
get isAllowedForAlternativeFulfilment(){return typeof isAllowedForAlternativeFulfilment==='undefined'?undefined:isAllowedForAlternativeFulfilment;},
get isClosedDate(){return typeof isClosedDate==='undefined'?undefined:isClosedDate;},
get isFullyBooked(){return typeof isFullyBooked==='undefined'?undefined:isFullyBooked;},
get refreshKitchenSlotMap(){return typeof refreshKitchenSlotMap==='undefined'?undefined:refreshKitchenSlotMap;},
get roundTo5Min(){return typeof roundTo5Min==='undefined'?undefined:roundTo5Min;},
get setAvailabilityLoading(){return typeof setAvailabilityLoading==='undefined'?undefined:setAvailabilityLoading;},
get showBlackoutBannerForDate(){return typeof showBlackoutBannerForDate==='undefined'?undefined:showBlackoutBannerForDate;},
get showPreferredTimeMessage(){return typeof showPreferredTimeMessage==='undefined'?undefined:showPreferredTimeMessage;},
get toYMD(){return typeof toYMD==='undefined'?undefined:toYMD;},
get KITCHEN_OVERRUN_MINUTES(){return typeof KITCHEN_OVERRUN_MINUTES==='undefined'?undefined:KITCHEN_OVERRUN_MINUTES;},
get LEAD_MINUTES(){return typeof LEAD_MINUTES==='undefined'?undefined:LEAD_MINUTES;},
get OPEN_DAYS(){return typeof OPEN_DAYS==='undefined'?undefined:OPEN_DAYS;},
get OPEN_WINDOW(){return typeof OPEN_WINDOW==='undefined'?undefined:OPEN_WINDOW;},
get basket(){return typeof basket==='undefined'?undefined:basket;},
get checkoutModal(){return typeof checkoutModal==='undefined'?undefined:checkoutModal;},
get CLOSED_DATES(){return typeof CLOSED_DATES==='undefined'?undefined:CLOSED_DATES;},
get CLOSED_RANGES(){return typeof CLOSED_RANGES==='undefined'?undefined:CLOSED_RANGES;},
get Event(){return typeof Event==='undefined'?undefined:Event;},
});
const preferredDateInput=checkoutAvailability.preferredDateInput;
const preferredTimeSelect=checkoutAvailability.preferredTimeSelect;
const preferredTimeHidden=checkoutAvailability.preferredTimeHidden;
function formatTimeHHMM(...args){return checkoutAvailability.formatTimeHHMM(...args);}
function clearPreferredTimeSelect(...args){return checkoutAvailability.clearPreferredTimeSelect(...args);}
function availabilityBasketKey(...args){return checkoutAvailability.availabilityBasketKey(...args);}
function availabilityContextKey(...args){return checkoutAvailability.availabilityContextKey(...args);}
function basketReviewClosureMessage(...args){return checkoutAvailability.basketReviewClosureMessage(...args);}
function basketReviewDateMessage(...args){return checkoutAvailability.basketReviewDateMessage(...args);}
function stopExpiredBasketReview(...args){return checkoutAvailability.stopExpiredBasketReview(...args);}
function showUnavailableBasketDialog(...args){return checkoutAvailability.showUnavailableBasketDialog(...args);}
function populatePreferredTimeSelect(...args){return checkoutAvailability.populatePreferredTimeSelect(...args);}
function refreshPreferredTimes(...args){return checkoutAvailability.refreshPreferredTimes(...args);}
// END checkout-availability boundary
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
function validateDiscountCode(...args){return checkoutPricing.validateDiscountCode(...args);}

function refreshAppliedDiscountCode(...args){return checkoutPricing.refreshAppliedDiscountCode(...args);}

// ← ADD THIS HERE
// BEGIN checkout-pricing-events boundary
const checkoutPricingEvents=window.RTKCheckoutEvents.createPricingBindings({
 get document(){return document;},
 get refreshAppliedDiscountCode(){return refreshAppliedDiscountCode;},
 get recomputeCheckoutTotals(){return recomputeCheckoutTotals;},
 get orderTypeRadios(){return typeof orderTypeRadios==='undefined'?undefined:orderTypeRadios;},
 get checkoutBaseSubtotal(){return checkoutBaseSubtotal;},
 get validateDiscountCode(){return validateDiscountCode;},
 get appliedDiscountCode(){return appliedDiscountCode;},
 get appliedDiscountAmount(){return appliedDiscountAmount;},
 set appliedDiscountCode(value){appliedDiscountCode=value;},
 set appliedDiscountAmount(value){appliedDiscountAmount=value;}
});
// END checkout-pricing-events boundary
checkoutPricingEvents.bindPreferredTimeDiscount();

// ---------------- LOYALTY STATE ----------------
const LOYALTY_REWARD_THRESHOLD = 100;   // 100 points unlocks reward
const LOYALTY_REWARD_VALUE = 5;    // £5 reward

const loyaltyState = {
  pointsBalance: 0,
  lifetimePoints: 0,
  settledPointsBalance: 0,
  availablePointsBalance: 0,
  reservedPoints: 0,

  // derived values
  rewardEligible: false,
  discountApplied: 0,
  pointsRedeemedPending: 0,
  pointsEarnedPending: 0,
  expectedBalance: 0,
  pointsToNextReward: LOYALTY_REWARD_THRESHOLD
};
// ---------------- END LOYALTY STATE ----------------

// BEGIN pricing initialization
const checkoutPricing=window.RTKCheckoutPricing.create({
 get window(){return window;},
 get document(){return document;},
 get console(){return console;},
 get sb(){return sb;},
 get fetch(){return fetch;},
 get AbortSignal(){return AbortSignal;},
 get checkoutBaseSubtotal(){return checkoutBaseSubtotal;},
 set checkoutBaseSubtotal(value){checkoutBaseSubtotal=value;},
 get appliedDiscountCode(){return appliedDiscountCode;},
 set appliedDiscountCode(value){appliedDiscountCode=value;},
 get appliedDiscountAmount(){return appliedDiscountAmount;},
 set appliedDiscountAmount(value){appliedDiscountAmount=value;},
 get loyaltyState(){return loyaltyState;},
 get LOYALTY_REWARD_THRESHOLD(){return LOYALTY_REWARD_THRESHOLD;},
 get LOYALTY_REWARD_VALUE(){return LOYALTY_REWARD_VALUE;},
 get deliveryQuoteState(){return deliveryQuoteState;},
 get deliveryNote(){return deliveryNote;},
 get getSelectedOrderType(){return getSelectedOrderType;},
 get DELIVERY_FREE_THRESHOLD(){return DELIVERY_FREE_THRESHOLD;},
 get DELIVERY_FALLBACK_FEE(){return DELIVERY_FALLBACK_FEE;},
 get formatCurrency(){return formatCurrency;}
});
// END pricing initialization

function applyLoyaltyToTotals(...args){return checkoutPricing.applyLoyaltyToTotals(...args);}

function updateLoyaltyProjection(...args){return checkoutPricing.updateLoyaltyProjection(...args);}

function renderLoyaltyMessage(...args){return checkoutPricing.renderLoyaltyMessage(...args);}

function normalisePhone(...args){return checkoutPricing.normalisePhone(...args);}

function fetchLoyaltyBalance(...args){return checkoutPricing.fetchLoyaltyBalance(...args);}
// Recompute totals whenever fulfilment time / ASAP / order type changes
checkoutPricingEvents.bindTotalRecompute();


			function calcDeliveryFee(...args){return checkoutPricing.calcDeliveryFee(...args);}
	
			function getPreDiscountFoodSubtotal(...args){return checkoutPricing.getPreDiscountFoodSubtotal(...args);}
			
			function updateFreeDeliveryHint(...args){return checkoutPricing.updateFreeDeliveryHint(...args);}
			
			function recomputeCheckoutTotals(...args){return checkoutPricing.recomputeCheckoutTotals(...args);}

// BEGIN checkout-display boundary
const checkoutDisplay = window.RTKCheckoutDisplay.create({
 window, document,
 get checkoutForm(){return checkoutForm;},
 get deliveryQuoteState(){return deliveryQuoteState;}
});
// END checkout-display boundary
updateAddressRequirement();
function updateCheckoutOrderSummary(...args){return checkoutDisplay.updateCheckoutOrderSummary(...args);}


    checkoutPricingEvents.bindOrderTypeTotals();
	
				// ---- Address required only for delivery ----
				function updateAddressRequirement(...args){return checkoutDisplay.updateAddressRequirement(...args);}

				
				window.RTKPrepareReviewedDelivery = address => geocodeCustomerAddress(address);
				// BEGIN checkout-geocoder boundary
const checkoutGeocoder=window.RTKDeliveryQuotes.createGeocoder({sb,window,console});
// END checkout-geocoder boundary
async function geocodeCustomerAddress(...args){return checkoutGeocoder.geocodeCustomerAddress(...args);}

		
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

// BEGIN legacy-kitchen-allocator boundary
const legacyKitchenAllocator=window.RTKLegacyKitchenAllocator.create({SLOT_MINUTES,KITCHEN_START_HOUR,KITCHEN_START_MINUTE,KITCHEN_STEP_MINUTES});
// END legacy-kitchen-allocator boundary
function getKitchenStartForDate(...args){return legacyKitchenAllocator.getKitchenStartForDate(...args);}

function getLatestProductionSlotStart(...args){return legacyKitchenAllocator.getLatestProductionSlotStart(...args);}

function allocateLoadBackwards(...args){return legacyKitchenAllocator.allocateLoadBackwards(...args);}

function forceAllocateExistingLoad(...args){return legacyKitchenAllocator.forceAllocateExistingLoad(...args);}

// BEGIN legacy-kitchen-schedule boundary
const legacyKitchenSchedule=window.RTKLegacyKitchenSchedule.create({sb,window,allocateLoadBackwards,forceAllocateExistingLoad});
// END legacy-kitchen-schedule boundary
function getEffectiveOrderTime(...args){return legacyKitchenSchedule.getEffectiveOrderTime(...args);}

function buildKitchenProductionMap(...args){return legacyKitchenSchedule.buildKitchenProductionMap(...args);}

async function refreshKitchenSlotMap(serviceDate) {
  const schedule = await loadKitchenScheduleForDate(serviceDate);
kitchenSlotMap = buildKitchenProductionMap(schedule);

  console.log(
    '[kitchen-schedule] refreshed slot map:',
    kitchenSlotMap
  );

  return kitchenSlotMap;
}

// BEGIN checkout-time-eligibility boundary
const checkoutTimeEligibility=window.RTKCheckoutTimeEligibility.create({
 get OPEN_DAYS(){return OPEN_DAYS;},
 get OPEN_WINDOW(){return OPEN_WINDOW;},
 get CLOSED_DATES(){return CLOSED_DATES;},
 get CLOSED_RANGES(){return CLOSED_RANGES;},
 get FULLY_BOOKED(){return FULLY_BOOKED;},
 get KITCHEN_OVERRUN_MINUTES(){return KITCHEN_OVERRUN_MINUTES;},
 get checkoutAvailability(){return checkoutAvailability;},
 get canBasketFitInSlot(){return canBasketFitInSlot;},
 get refreshKitchenSlotMap(){return refreshKitchenSlotMap;}
});
// END checkout-time-eligibility boundary
function toYMD(...args){return checkoutTimeEligibility.toYMD(...args);}
function parseHm(...args){return checkoutTimeEligibility.parseHm(...args);}
function isBetween(d, start, end){ return d >= start && d <= end; }
function roundTo5Min(...args){return checkoutTimeEligibility.roundTo5Min(...args);}
function withinOpenHours(...args){return checkoutTimeEligibility.withinOpenHours(...args);}
function isClosedDate(...args){return checkoutTimeEligibility.isClosedDate(...args);}

function isFullyBooked(...args){return checkoutTimeEligibility.isFullyBooked(...args);}
async function loadKitchenScheduleForDate(...args){return legacyKitchenSchedule.loadKitchenScheduleForDate(...args);}

function getExistingOrderKitchenLoad(...args){return legacyKitchenSchedule.getExistingOrderKitchenLoad(...args);}

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

function isAllowed(...args){return checkoutTimeEligibility.isAllowed(...args);}

function isAllowedForAlternativeFulfilment(...args){return checkoutTimeEligibility.isAllowedForAlternativeFulfilment(...args);}

function nextAllowed(...args){return checkoutTimeEligibility.nextAllowed(...args);}

async function nextAlternativeFulfilment(...args){return checkoutTimeEligibility.nextAlternativeFulfilment(...args);}
function showPreferredTimeMessage(...args){return checkoutDisplay.showPreferredTimeMessage(...args);}

function hidePreferredTimeMessage(...args){return checkoutDisplay.hidePreferredTimeMessage(...args);}

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
// BEGIN checkout-loyalty-phone boundary
const checkoutLoyaltyPhone=window.RTKCheckoutLoyaltyPhone.create({
 get document(){return document;},
 get fetchLoyaltyBalance(){return fetchLoyaltyBalance;},
 get console(){return console;},
 get loyaltyState(){return loyaltyState;},
 get window(){return window;},
 get refreshCheckoutPricingAndRender(){return refreshCheckoutPricingAndRender;},
 get renderLoyaltyMessage(){return renderLoyaltyMessage;}
});
checkoutLoyaltyPhone.bind();
// END checkout-loyalty-phone boundary
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
// BEGIN checkout-dialog boundary
function setAvailabilityLoading(loading) {
  preferredTimeSelect?.setAttribute('aria-busy', String(loading));
  const message = document.getElementById('preferred-time-message');
  if (message) message.dataset.loading = String(loading);
  if (loading) showPreferredTimeMessage('Checking available times…');
}
const checkoutDialog = window.RTKCheckoutDialog.create({
  window, document, console,
  get availabilityBasketKey(){return availabilityBasketKey;},
  get loadServiceState(){return loadServiceState;},
  get loadBlackouts(){return loadBlackouts;},
  get populatePreferredTimeSelect(){return populatePreferredTimeSelect;},
  get showPreferredTimeMessage(){return showPreferredTimeMessage;},
  get recomputeCheckoutTotals(){return recomputeCheckoutTotals;},
  get updateCheckoutSubmitButton(){return updateCheckoutSubmitButton;},
  get updateCheckoutOrderSummary(){return updateCheckoutOrderSummary;},
  get lastPreferredDate(){return lastPreferredDate;},
  set lastPreferredDate(value){lastPreferredDate=value;},
  get SERVICE_STATE(){return SERVICE_STATE;},
  get orderMsg(){return orderMsg;},
  get preferredDateInput(){return preferredDateInput;},
  get preferredTimeSelect(){return preferredTimeSelect;},
  get preferredTimeHidden(){return preferredTimeHidden;},
  get checkoutBaseSubtotal(){return checkoutBaseSubtotal;},
  set checkoutBaseSubtotal(value){checkoutBaseSubtotal=value;},
  get checkoutMsg(){return checkoutMsg;},
  get checkoutModal(){return checkoutModal;},
});
function openCheckout(subtotal){updateAddressRequirement();return checkoutDialog.open(subtotal);}
function closeCheckout(){return checkoutDialog.close();}
// END checkout-dialog boundary
// Ensure other code can call it
window.openCheckout = openCheckout;


// BEGIN checkout-events boundary
const checkoutEvents=window.RTKCheckoutEvents.create({
 get window(){return window;},
 get document(){return document;},
 get checkoutClose(){return checkoutClose;},
 get checkoutCancel(){return checkoutCancel;},
 get checkoutModal(){return checkoutModal;},
 get closeCheckout(){return closeCheckout;},
 get updateAddressRequirement(){return updateAddressRequirement;},
 get updateCheckoutSubmitButton(){return updateCheckoutSubmitButton;},
 get updateCheckoutOrderSummary(){return updateCheckoutOrderSummary;},
 get checkoutAvailability(){return checkoutAvailability;},
 get availabilityContextKey(){return availabilityContextKey;},
 get clearPreferredTimeSelect(){return clearPreferredTimeSelect;},
 get refreshCheckoutPricingAndRender(){return refreshCheckoutPricingAndRender;},
 get populatePreferredTimeSelect(){return populatePreferredTimeSelect;},
 get geocodeCustomerAddress(){return geocodeCustomerAddress;},
 get openCheckoutBtn(){return openCheckoutBtn;},
 get orderMsg(){return orderMsg;},
 get openCheckout(){return openCheckout;}
});
checkoutEvents.bind();
// END checkout-events boundary
// 👇 ADD THE DISCOUNT CODE LISTENER HERE

checkoutPricingEvents.bindDiscountCode();

	
		// ---------- Helpers to call Supabase RPC & REST ----------
// BEGIN checkout-customer-data boundary
const checkoutCustomerData = window.RTKCheckoutCustomerData.create({window, console});
// END checkout-customer-data boundary
    async function getNextOrderRef(...args){return checkoutCustomerData.getNextOrderRef(...args);}

	
// BEGIN checkout-confirmation boundary
const checkoutConfirmation = window.RTKCheckoutConfirmation.install({window, document, alert, console});
function stripChillies(...args){return checkoutConfirmation.stripChillies(...args);}
// END checkout-confirmation boundary
			async function getOrCreateCustomer(...args){return checkoutCustomerData.getOrCreateCustomer(...args);}


		// Prevent accidental double submit in the same session
// Submission guard is private to its controller.

		// One key per checkout attempt; reused on retries; cleared on success
		function getIdempotencyKey() {
		  const existing = localStorage.getItem("checkout_idempotency_key");
		  if (existing) return existing;

		  const key = crypto.randomUUID();
		  localStorage.setItem("checkout_idempotency_key", key);
		  return key;
		}
		
			function updateCheckoutSubmitButton(...args){return checkoutDisplay.updateCheckoutSubmitButton(...args);}

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
// BEGIN checkout-submission boundary
checkoutForm.addEventListener('submit',window.RTKCheckoutSubmission.create({
window, document, console,
get applyWedThuDiscount(){return typeof applyWedThuDiscount==='undefined'?undefined:applyWedThuDiscount;},
get getItemKitchenLoad(){return typeof getItemKitchenLoad==='undefined'?undefined:getItemKitchenLoad;},
get getNextOrderRef(){return typeof getNextOrderRef==='undefined'?undefined:getNextOrderRef;},
get getOrCreateCustomer(){return typeof getOrCreateCustomer==='undefined'?undefined:getOrCreateCustomer;},
get getSelectedOrderType(){return typeof getSelectedOrderType==='undefined'?undefined:getSelectedOrderType;},
get isAllowed(){return typeof isAllowed==='undefined'?undefined:isAllowed;},
get isAllowedForAlternativeFulfilment(){return typeof isAllowedForAlternativeFulfilment==='undefined'?undefined:isAllowedForAlternativeFulfilment;},
get loadServiceState(){return typeof loadServiceState==='undefined'?undefined:loadServiceState;},
get populatePreferredTimeSelect(){return typeof populatePreferredTimeSelect==='undefined'?undefined:populatePreferredTimeSelect;},
get recomputeCheckoutTotals(){return typeof recomputeCheckoutTotals==='undefined'?undefined:recomputeCheckoutTotals;},
get refreshKitchenSlotMap(){return typeof refreshKitchenSlotMap==='undefined'?undefined:refreshKitchenSlotMap;},
get renderOrder(){return typeof renderOrder==='undefined'?undefined:renderOrder;},
get resetCheckoutForNextOrder(){return typeof resetCheckoutForNextOrder==='undefined'?undefined:resetCheckoutForNextOrder;},
get showOrderSuccess(){return typeof showOrderSuccess==='undefined'?undefined:showOrderSuccess;},
get showPausedOrderAlert(){return typeof showPausedOrderAlert==='undefined'?undefined:showPausedOrderAlert;},
get showPreferredTimeMessage(){return typeof showPreferredTimeMessage==='undefined'?undefined:showPreferredTimeMessage;},
get toYMD(){return typeof toYMD==='undefined'?undefined:toYMD;},
get validatePreferredTime(){return typeof validatePreferredTime==='undefined'?undefined:validatePreferredTime;},
get DELIVERY_FREE_THRESHOLD(){return typeof DELIVERY_FREE_THRESHOLD==='undefined'?undefined:DELIVERY_FREE_THRESHOLD;},
get OPEN_WINDOW(){return typeof OPEN_WINDOW==='undefined'?undefined:OPEN_WINDOW;},
get SERVICE_STATE(){return typeof SERVICE_STATE==='undefined'?undefined:SERVICE_STATE;},
get appliedDiscountAmount(){return typeof appliedDiscountAmount==='undefined'?undefined:appliedDiscountAmount;},
get appliedDiscountCode(){return typeof appliedDiscountCode==='undefined'?undefined:appliedDiscountCode;},
get basket(){return typeof basket==='undefined'?undefined:basket;},
get checkoutBaseSubtotal(){return typeof checkoutBaseSubtotal==='undefined'?undefined:checkoutBaseSubtotal;},
get checkoutForm(){return typeof checkoutForm==='undefined'?undefined:checkoutForm;},
get checkoutModal(){return typeof checkoutModal==='undefined'?undefined:checkoutModal;},
get checkoutMsg(){return typeof checkoutMsg==='undefined'?undefined:checkoutMsg;},
get deliveryMessageEl(){return typeof deliveryMessageEl==='undefined'?undefined:deliveryMessageEl;},
get deliveryQuoteState(){return typeof deliveryQuoteState==='undefined'?undefined:deliveryQuoteState;},
get preferredDateInput(){return typeof preferredDateInput==='undefined'?undefined:preferredDateInput;},
get preferredTimeHidden(){return typeof preferredTimeHidden==='undefined'?undefined:preferredTimeHidden;},
get preferredTimeSelect(){return typeof preferredTimeSelect==='undefined'?undefined:preferredTimeSelect;},
get sb(){return typeof sb==='undefined'?undefined:sb;},
set checkoutBaseSubtotal(value){checkoutBaseSubtotal=value;}
}));
// END checkout-submission boundary



