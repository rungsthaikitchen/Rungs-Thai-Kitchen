
  var DELIVERY_FREE_THRESHOLD = 30;
  function getSelectedOrderType() {
  const selected = document.querySelector('input[name="order-type"]:checked');
  return selected ? selected.value : "collection";
}

	document.addEventListener('DOMContentLoaded', () => {
	
	// ---------- Allergen registry ----------
  const {ALLERGENS,EXTRAS,MENU_CATEGORIES,MODIFIERS,normalizeAllergens,renderAllergenIconsCompact,renderAllergenBadges} = window.RTKMenuCatalogue.create();
    // ---------- State ----------
    let basket = []; // { name, itemId, mods:[{id,name,delta}], unitPrice, qty, img, spice }
	window.basket = basket;  // expose the array reference to the second script
    //const ITEMS_BY_ID = new Map();
	
	// remove chilli emojis that are baked into menu item names
		const CHILLI_RE = /🌶️+/g;
		function nameWithoutChillies(str) {
		  return (str || '')
			.replace(CHILLI_RE, '')
			.replace(/\s{2,}/g, ' ')
			.trim();
		}



    // ---------- Helpers ----------
    function formatCurrency(n){ const cents = Math.round((n + Number.EPSILON) * 100); return '£' + (cents/100).toFixed(2); }
    function roundToTwo(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }
    function chilliIcons(n){ return '🌶️'.repeat(Math.max(0, Math.min(3, n||0))); }
	
var deliveryQuoteGeneration = 0;
var deliveryQuoteState = {
  loading: false,
  eligible: true,
  reason: "",
  straightLineMiles: null,
  routeMiles: null,
  fee: 0,
  usedFallback: false,
  lastUpdated: null
};

window.deliveryQuoteState = deliveryQuoteState;

var refreshCheckoutPricingAndRender = async function () {
  if (getSelectedOrderType() === "delivery") {
    await window.refreshDeliveryQuote();
  } else {
    ++deliveryQuoteGeneration; // Invalidate delivery replies after switching to collection.
    deliveryQuoteState = {
      loading: false,
      eligible: true,
      reason: "",
      straightLineMiles: null,
      routeMiles: null,
      fee: 0,
      usedFallback: false,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = deliveryQuoteState;
  }

  recomputeCheckoutTotals();
  updateCheckoutSubmitButton();
  updateCheckoutOrderSummary();
};

window.refreshCheckoutPricingAndRender = refreshCheckoutPricingAndRender;
			
			
			// ---------- Delivery pricing (HELPERS) ----------
var DELIVERY_MAX_STRAIGHT_LINE_MILES = 3;
var DELIVERY_FREE_THRESHOLD = 30;

var DELIVERY_ROUTE_BANDS = [
  { maxMiles: 1.5, fee: 2.0 },
  { maxMiles: 2.5, fee: 3.0 },
  { maxMiles: 4.0, fee: 4.0 }
];

var DELIVERY_FALLBACK_FEE = 3.0;

function toRadians(deg) {
  return deg * (Math.PI / 180);
}

function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function roundMiles(value) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value * 10) / 10;
}

function calculateBandFee(miles, bands) {
  if (miles == null || Number.isNaN(miles)) return null;

  for (const band of bands) {
    if (miles <= band.maxMiles) return band.fee;
  }

  return null;
}

function getSelectedOrderType() {
  const selected = document.querySelector('input[name="order-type"]:checked');
  return selected ? selected.value : "collection";
}

function getPreDiscountFoodSubtotal() {
  return Number(checkoutBaseSubtotal || 0);
}

function getRestaurantLatLng() {
  return {
    lat: 53.744437,
    lng: -1.576570
  };
}

function getCustomerLatLng() {
  const lat = Number(window.customerLat);
  const lng = Number(window.customerLng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function resetCheckoutForNextOrder() {
  console.log('[checkout] resetting state for next order');

  // Clear customer-entered checkout fields
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

  // Clear discount state
  appliedDiscountCode = null;
  appliedDiscountAmount = 0;

  const discountMessage =
    document.getElementById('discount-code-message');

  if (discountMessage) {
    discountMessage.textContent = '';
    discountMessage.className = 'discount-code-message';
  }

  // Try to clear the discount-code input without assuming one exact ID
  const discountInput =
    document.getElementById('discount-code') ||
    document.querySelector('input[name="discount_code"]');

  if (discountInput) {
    discountInput.value = '';
  }

  // Clear preferred-time scheduler state
  lastPreferredDate = null;

  hidePreferredTimeMessage();

  // Clear delivery calculation from previous customer
  window.deliveryQuoteState = {};

  // IMPORTANT:
  // next order must get a brand-new idempotency key
  localStorage.removeItem('checkout_idempotency_key');

  console.log('[checkout] reset complete');
}

async function refreshDeliveryQuote() {
  const generation = ++deliveryQuoteGeneration;
  const subtotal = Number(checkoutBaseSubtotal || 0);
	const freeDeliveryRemaining = Math.max(0, DELIVERY_FREE_THRESHOLD - subtotal);
	const freeDeliveryMessage =
	  subtotal >= DELIVERY_FREE_THRESHOLD
		? "🎉 You’ve unlocked FREE delivery!"
		: `Add £${freeDeliveryRemaining.toFixed(2)} more for FREE delivery 🚚`;
  const restaurant = getRestaurantLatLng();
  const customer = getCustomerLatLng();

			  // 🚫 No coords = cannot prove address is in delivery radius
			  if (!restaurant || !customer) {
			  deliveryQuoteState = {
				loading: false,
				eligible: true,
				reason: "",
				straightLineMiles: null,
				routeMiles: null,
				fee: DELIVERY_FALLBACK_FEE,
				usedFallback: true,
				freeDeliveryRemaining,
				freeDeliveryMessage,
				lastUpdated: Date.now()
			  };

			  window.deliveryQuoteState = deliveryQuoteState;

			  console.warn("[delivery] blocked - missing coords for radius check", {
				restaurant,
				customer
			  });

			  return deliveryQuoteState;
			}

  const straightLineMiles = haversineMiles(
    restaurant.lat,
    restaurant.lng,
    customer.lat,
    customer.lng
  );

  // 🚫 Hard 3-mile radius gate
  if (straightLineMiles > DELIVERY_MAX_STRAIGHT_LINE_MILES) {
    deliveryQuoteState = {
      loading: false,
      eligible: false,
      reason: "Sorry, this address is outside our 3-mile delivery radius. Please call us on 0113 469 9564 and we’ll see what we can do 😊",
      straightLineMiles,
      routeMiles: null,
      fee: null,
      usedFallback: false,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = deliveryQuoteState;

    console.warn("[delivery] outside radius", {
      straightLineMiles
    });

    return deliveryQuoteState;
  }

  // ✅ Free delivery only AFTER radius check
  if (subtotal >= DELIVERY_FREE_THRESHOLD) {
    deliveryQuoteState = {
      loading: false,
      eligible: true,
      reason: "",
      straightLineMiles,
      routeMiles: null,
      fee: 0,
      usedFallback: false,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = deliveryQuoteState;

    console.log("[delivery] free delivery threshold met within radius");
    return deliveryQuoteState;
  }

  // ✅ Inside radius, under free delivery threshold: use fallback while route quote loads
  deliveryQuoteState = {
    loading: true,
    eligible: true,
    reason: "",
    straightLineMiles,
    routeMiles: null,
    fee: DELIVERY_FALLBACK_FEE,
    usedFallback: true,
    lastUpdated: Date.now()
  };

  window.deliveryQuoteState = deliveryQuoteState;

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/get-delivery-route-quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_PUBLIC_KEY
      },
      body: JSON.stringify({
        origin: restaurant,
        destination: customer
      })
    });

    const data = await resp.json().catch(() => null);
    if (generation !== deliveryQuoteGeneration) return window.deliveryQuoteState;

    if (!resp.ok || !data?.ok || !Number.isFinite(data?.routeMiles)) {
      console.warn("[delivery] route lookup failed, using fallback");

      deliveryQuoteState = {
        ...deliveryQuoteState,
        loading: false,
        eligible: true,
        fee: DELIVERY_FALLBACK_FEE,
        usedFallback: true,
        lastUpdated: Date.now()
      };

      window.deliveryQuoteState = deliveryQuoteState;
      return deliveryQuoteState;
    }

    const routeMiles = Number(data.routeMiles);
    const routeFee = calculateBandFee(routeMiles, DELIVERY_ROUTE_BANDS);

    deliveryQuoteState = {
      loading: false,
      eligible: true,
      reason: "",
      straightLineMiles,
      routeMiles,
      fee: routeFee ?? DELIVERY_FALLBACK_FEE,
      usedFallback: routeFee == null,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = deliveryQuoteState;

    console.log("[delivery] route pricing applied", {
      straightLineMiles,
      routeMiles,
      fee: deliveryQuoteState.fee
    });

    return deliveryQuoteState;

  } catch (err) {
    if (generation !== deliveryQuoteGeneration) return window.deliveryQuoteState;
    console.warn("[delivery] route fetch exception, using fallback", err);

    deliveryQuoteState = {
      ...deliveryQuoteState,
      loading: false,
      eligible: true,
      fee: DELIVERY_FALLBACK_FEE,
      usedFallback: true,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = deliveryQuoteState;
    return deliveryQuoteState;
  }
}

window.refreshDeliveryQuote = refreshDeliveryQuote;

// Single source of truth for how much space to keep above scrolled content
// Single source of truth for how much space to keep above targets
function computeHeaderOffset() {
  const root = document.documentElement;
  const headerSlidUp = root.classList.contains('header-slid-up'); // when header is hidden past Allergens
  if (headerSlidUp) return 12; // tiny gap when header isn’t covering content
  const h = (document.querySelector('.site-header') || document.querySelector('header'));
  return (h ? Math.round(h.getBoundingClientRect().height) : 0) + 12;
}

function applyHeaderOffset() {
  document.documentElement.style.setProperty('--header-offset', computeHeaderOffset() + 'px');
}

window.addEventListener('load', applyHeaderOffset, { passive:true });
window.addEventListener('resize', applyHeaderOffset, { passive:true });
window.addEventListener('orientationchange', applyHeaderOffset, { passive:true });
window.addEventListener('scroll', applyHeaderOffset, { passive:true }); // keep it fresh while you move
applyHeaderOffset();

			
	
	// robust smooth scroll that clamps to page bounds (prevents “footer snaps”)
	function smoothScrollToElTop(el){
	  if (!el) return;
	  const offset = computeHeaderOffset();
	  const target = el.getBoundingClientRect().top + window.scrollY - offset;
	  const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
	  const top = Math.max(0, Math.min(target, maxTop));

	  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
	  window.scrollTo({ top, behavior: (isIOS || prefersReduced) ? 'auto' : 'smooth' });
	}
	
					
	// ---- Holiday / fully-booked ticker ----
		const tickerEl = document.getElementById('status-ticker');
		const tickerText = document.getElementById('ticker-text');

		// Simple config object (edit this anytime)
		const siteStatus = {
		  active: true,  // turn off when not needed
		  message: "Unfortunately, due to illness, Rung’s Thai Kitchen will be closed today (14th December). We are very sorry for any inconvenience this may cause."

		};
		
		// ✅ Add this line:
			console.log('TICKER INIT', { 
			  active: siteStatus.active, 
			  hasTickerEl: !!tickerEl, 
			  hasTickerText: !!tickerText 
			});

		if (siteStatus.active && tickerEl && tickerText) {
		  tickerText.textContent = siteStatus.message;
		  tickerEl.classList.remove('hidden');
		}

		(function adjustForTicker(){
		  const bar = document.getElementById('status-ticker');
		  if (!bar) return;
		  const set = () => {
			const h = bar.offsetHeight || 0;
			document.documentElement.style.setProperty('--ticker-height', h + 'px');
		  };
		  new ResizeObserver(set).observe(bar);
		  window.addEventListener('load', set, { passive:true });
		  window.addEventListener('resize', set, { passive:true });
		  set();
		})();
		
		// === Order idempotency ===
		function getIdempotencyKey() {
		  const existing = localStorage.getItem("checkout_idempotency_key");
		  if (existing) return existing;

		  const key = crypto.randomUUID();
		  localStorage.setItem("checkout_idempotency_key", key);
		  return key;
		}


// === Customise globals (place near top, before buildMenu) ===
window.ITEMS_BY_ID = window.ITEMS_BY_ID || new Map();
let currentItem = null;          // the item currently being customised
let selectedMods = new Set();    // your existing modifier selection
let selectedExtras = [];         // extras (added proteins)
let currentAllowExtras = false;
let isSubmittingOrder = false;   // double submit guard




// ---------- Build menu (single, clean version) ----------
/* === Full-screen menu overlay === */
// ---------- Build menu (for full-screen popup) ----------
// BEGIN menu-rendering boundary
const menuRendering = window.RTKMenuRendering.create({
 window, document,
 get MENU_CATEGORIES(){return MENU_CATEGORIES;},
 get renderAllergenIconsCompact(){return renderAllergenIconsCompact;},
 get formatCurrency(){return formatCurrency;},
 get openCustomise(){return openCustomise;}
});
// END menu-rendering boundary
function buildMenu(...args){return menuRendering.buildMenu(...args);}


// --------- Order rendering ----------
// BEGIN basket-controls boundary
const basketControls = window.RTKBasketControls.create({
 window, document, CustomEvent,
 get basket(){return basket;},
 get formatCurrency(){return formatCurrency;},
 get roundToTwo(){return roundToTwo;},
 get nameWithoutChillies(){return nameWithoutChillies;},
 get chilliIcons(){return chilliIcons;},
 get refreshAppliedDiscountCode(){return refreshAppliedDiscountCode;}
});
// END basket-controls boundary
function renderOrder(...args){return basketControls.renderOrder(...args);}
		
		// ---------- Menu popup open / close ----------
const menuOverlay     = document.getElementById('menu-overlay');
const menuLink        = document.getElementById('menu-link');
const menuClose       = document.getElementById('menu-overlay-close');
const menuCheckoutBtn = document.getElementById('menu-checkout-btn');
const menuFab         = document.getElementById('menu-fab');

// Open / close helpers
function openMenuOverlay() {
  if (!menuOverlay) return;
  menuOverlay.classList.add('show');
  menuOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // stop background scroll
}

function closeMenuOverlay() {
  if (!menuOverlay) return;
  menuOverlay.classList.remove('show');
  menuOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// Header nav "Menu" link
if (menuLink) {
  menuLink.addEventListener('click', (e) => {
    e.preventDefault();
    openMenuOverlay();
  });
}

// Floating FAB "Menu" button
if (menuFab) {
  menuFab.addEventListener('click', (e) => {
    e.preventDefault();
    openMenuOverlay();
  });
}

if (menuFab) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      menuFab.classList.remove('hidden');
    } else {
      menuFab.classList.add('hidden');
    }
  });
}

// Close X in overlay
if (menuClose) {
  menuClose.addEventListener('click', closeMenuOverlay);
}

// Click outside sheet closes
if (menuOverlay) {
  menuOverlay.addEventListener('click', (e) => {
    if (e.target === menuOverlay) closeMenuOverlay();
  });
}

// Proceed to checkout button in overlay
if (menuCheckoutBtn) {
  menuCheckoutBtn.addEventListener('click', () => {
    if (!basket || basket.length === 0) {
      alert('Please add at least one dish before proceeding to checkout.');
      return;
    }

    // close the menu overlay
    closeMenuOverlay();

    // compute subtotal from basket and open checkout
    const subtotal = basket.reduce(
      (sum, line) => sum + line.unitPrice * line.qty,
      0
    );
    openCheckout(subtotal);
  });
}

// ESC key closes popup too
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuOverlay?.classList.contains('show')) {
    closeMenuOverlay();
  }
});


    // ---------- Modal (customise) ----------
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBase = document.getElementById('modal-base');
    const qtyInput = document.getElementById('qty-input');
    const qtyIncr = document.getElementById('qty-incr');
    const qtyDecr = document.getElementById('qty-decr');
    const modsEl = document.getElementById('mods');
    const unitPriceEl = document.getElementById('unit-price');
	// if any older code still uses `modalPrice`, point it at #unit-price
	const modalPrice = unitPriceEl;
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const modalAdd = document.getElementById('modal-add');
    const modalImg = document.getElementById('modal-img');
    const modRequiredNote = document.getElementById('mod-required-note');
    const modLimitNote = document.getElementById('mod-limit-note');
    const modalAllWrap = document.getElementById('modal-allergens-wrap');
    const modalAll = document.getElementById('modal-allergens');
    const spiceWrap = document.getElementById('spice-wrap');
    const spiceButtons = document.getElementById('spice-buttons');
    let currentAllowedMods = null;
    let currentRequires = false;
    let currentMulti = false;
    let currentMax = null;
    let currentSpice = null; // 0..3 or null
	

// include extras in the price calculation
function sumExtras(...args){return customisationPricing.sumExtras(...args);}

const extrasWrap = document.getElementById('extras-wrap');
const extrasEl   = document.getElementById('extras');

// BEGIN customisation-pricing boundary
const customisationPricing = window.RTKCustomisationPricing.create({
 document,
 get selectedExtras(){return selectedExtras;},
 get currentAllowExtras(){return currentAllowExtras;},
 get extrasWrap(){return extrasWrap;},
 get extrasEl(){return extrasEl;},
 get EXTRAS(){return EXTRAS;},
 get selectedMods(){return selectedMods;},
 get MODIFIERS(){return MODIFIERS;},
 get modalBase(){return modalBase;},
 get unitPriceEl(){return unitPriceEl;},
 set selectedExtras(value){selectedExtras=value;},
 get formatCurrency(){return formatCurrency;},
 get roundToTwo(){return roundToTwo;}
});
// END customisation-pricing boundary
function buildExtraChips(...args){return customisationPricing.buildExtraChips(...args);}

function handleExtraClick(...args){return customisationPricing.handleExtraClick(...args);}

    // BEGIN customisation-selectors boundary
const customisationSelectors = window.RTKCustomisationSelectors.create({
 document,
 get modsEl(){return modsEl;},
 get selectedMods(){return selectedMods;},
 get currentAllowedMods(){return currentAllowedMods;},
 get currentRequires(){return currentRequires;},
 get currentMulti(){return currentMulti;},
 get currentMax(){return currentMax;},
 get modRequiredNote(){return modRequiredNote;},
 get modalAdd(){return modalAdd;},
 get modLimitNote(){return modLimitNote;},
 get MODIFIERS(){return MODIFIERS;},
 get spiceWrap(){return spiceWrap;},
 get spiceButtons(){return spiceButtons;},
 get currentSpice(){return currentSpice;},
 set currentAllowedMods(value){currentAllowedMods=value;},
 set currentRequires(value){currentRequires=value;},
 set currentMulti(value){currentMulti=value;},
 set currentMax(value){currentMax=value;},
 set currentSpice(value){currentSpice=value;},
 get formatCurrency(){return formatCurrency;},
 get updateUnitPricePreview(){return updateUnitPricePreview;}
});
// END customisation-selectors boundary
function buildModifierChips(...args){return customisationSelectors.buildModifierChips(...args);}
	
	function openCustomiseById(itemId) {
  const item = window.ITEMS_BY_ID.get(String(itemId));
  if (!item || !modal) {
    console.warn('openCustomiseById: item not found', itemId);
    return;
  }

  currentItem = item;
  modalBase.dataset.id = item.id;   // ✅ ADD THIS LINE
  selectedMods.clear();
  selectedExtras = [];
  currentAllowExtras = !!item.categoryAllowedExtras;

  const allowed  = Array.isArray(item.allowedModifiers) ? item.allowedModifiers : null;
  const requires = !!item.modifierRequired;
  const isMulti  = !!item.modifierMax || !!item.modifiersMulti;
  const max      = (typeof item.modifierMax === 'number' && item.modifierMax > 0)
    ? item.modifierMax
    : null;

  buildModifierChips(allowed, requires, isMulti, max);
  buildExtraChips();
  modalTitle.textContent = `Customise — ${item.name}`;
  modalBase.dataset.price = item.price;
  modalBase.textContent   = `Base price: ${formatCurrency(item.price)}`;
  qtyInput.value = 1;
  updateUnitPricePreview();

  if (modalImg) {
    if (item.img) {
      modalImg.src = item.img;
      modalImg.style.display = 'block';
    } else {
      modalImg.removeAttribute('src');
      modalImg.style.display = 'none';
    }
  }

  if (item.allergens && item.allergens.length) {
    modalAll.innerHTML = renderAllergenBadges(item.allergens);
    modalAllWrap.style.display = 'block';
  } else {
    modalAll.innerHTML = '';
    modalAllWrap.style.display = 'none';
  }

  const defaultSpice = (typeof item.spiceDefault === 'number') ? item.spiceDefault : 0;
  buildSpiceSelector(!!item.spiceEnabled, defaultSpice, item.spiceMin, item.spiceNote);

  modal.style.display = 'flex';
}

	
	// ---------- Success popup (matches #order-success in HTML) ----------
	const orderSuccess      = document.getElementById('order-success');
	const orderSuccessX     = document.getElementById('order-success-x');
	const orderSuccessClose = document.getElementById('order-success-close');

	function showOrderSuccessNew(summary, items, preferredTimeStr) {
  if (!orderSuccess) {
    alert(`Order placed! ${summary?.ref || ''}`);
    return;
  }
  
			  // ✅ Store last order data so "Download receipt" works
			window.__lastOrderReceipt = {
			  summary: summary || {},
			  items: items || [],
			  preferredTimeStr: preferredTimeStr || ''
			};


  // Use the same totals logic as checkout (discount + correct delivery rule)
		const successTotals = window.__lastOrderTotals || window.__checkoutTotals || {};


  // 1) header
  const titleEl = document.getElementById('order-success-title');
  if (titleEl) {
    titleEl.textContent = `${summary?.holdingReviewRequired ? 'Order received' : 'Order confirmed'} — ${summary?.ref || ''}`;
  }

    // 2) message
  const msgEl = document.getElementById('order-success-msg');
  if (msgEl) {
    const suffix = (summary?.orderType === 'delivery') ? 'delivery' : 'collection';
    const note = preferredTimeStr
      ? `Thanks! We’ll contact you to confirm your ${suffix} time (${preferredTimeStr}).`
      : `Thanks! We’ll contact you to confirm your ${suffix}.`;
    msgEl.textContent = note;
  }

  // 2b) order type + time check
  const typeEl = document.getElementById('order-success-type');
  const timeEl = document.getElementById('order-success-time');

  if (typeEl) {
    typeEl.textContent = (summary?.orderType === 'delivery') ? 'Delivery' : 'Collection';
  }

  if (timeEl) {
    timeEl.textContent = preferredTimeStr || 'To be confirmed';
  }

  // 3) items
  const listEl = document.getElementById('order-success-items');
  if (listEl) {
    listEl.innerHTML = '';
    (items || []).forEach(row => {
      const details = [];
      if (row.mods?.length) details.push(row.mods.map(m => m.name).join(', '));
      if (typeof row.spice === 'number') details.push('🌶️'.repeat(row.spice));

      const div = document.createElement('div');
      div.style.padding = '6px 0';
      div.style.borderBottom = '1px dashed #eee';
      div.innerHTML = `
        ${row.qty} × ${row.name}
        ${details.length ? ` <span class="muted small">• ${details.join(' • ')}</span>` : ''}
      `;
      listEl.appendChild(div);
    });
  }

			  // 4) total (force numeric; no undefined fallbacks)
				const totalEl = document.getElementById('order-success-total');
				if (totalEl) {
				  const t = window.__lastOrderTotals || window.__checkoutTotals || {};
				  const finalTotal = Number(t.total);

				  const safeTotal = Number.isFinite(finalTotal)
					? finalTotal
					: Number(summary?.total || 0);

				  totalEl.textContent = formatCurrency(safeTotal);

				  // DEBUG: watch for anything that changes the total after we set it
					if (!window.__watchingSuccessTotal) {
					  window.__watchingSuccessTotal = true;

					  const el = document.getElementById('order-success-total');
					  if (el) {
						const obs = new MutationObserver(() => {
						  console.log('[SUCCESS TOTAL MUTATION] now =', el.textContent);
						  console.trace('[SUCCESS TOTAL MUTATION TRACE]');
						});
						obs.observe(el, { childList: true, characterData: true, subtree: true });
					  }
					}

				}
				// 🔒 Force-correct total AFTER popup is rendered
					setTimeout(() => {
					  const t = window.__lastOrderTotals || {};
					  const el = document.getElementById('order-success-total');
					  if (el && typeof t.total === 'number') {
						el.textContent = formatCurrency(t.total);
					  }
					}, 0);

  orderSuccess.style.display = 'flex';
}


	// close buttons
	if (orderSuccessX)     orderSuccessX.addEventListener('click', () => orderSuccess.style.display = 'none');
	if (orderSuccessClose) orderSuccessClose.addEventListener('click', () => orderSuccess.style.display = 'none');
	if (orderSuccess) {
	  orderSuccess.addEventListener('click', (e) => {
		if (e.target === orderSuccess) orderSuccess.style.display = 'none';
	  });
	}


	// make it available to the second script
	window.showOrderSuccessNew = showOrderSuccessNew;


	
		// ----  (pure front-end) ----

	(function(){
	  const wrap  = document.getElementById('order-success');
	  const title = document.getElementById('order-success-title');
	  const msg   = document.getElementById('order-success-msg');
	  const list  = document.getElementById('order-success-items');
	  const totalEl = document.getElementById('order-success-total');
	  const btnClose = document.getElementById('order-success-close');
	  const btnX     = document.getElementById('order-success-x');

	  function hide() {
		if (wrap) wrap.style.display = 'none';
	  }

	  // expose a global helper we can call later (kept for backwards compatibility)
	function showOrderSuccess(orderId, items, total, orderType, preferredTime, holdingReviewRequired = false) {
	  // If the new-style function exists, delegate to it
	  if (typeof window.showOrderSuccessNew === 'function') {
		window.showOrderSuccessNew(
		  {
			// if checkout already passed "RTK-012", keep it;
			// if it passed just "012", add RTK-
			ref: (typeof orderId === 'string' && orderId.startsWith('RTK-'))
			  ? orderId
			  : `RTK-${orderId}`,
			subtotal: 0,
			delivery: 0,
			total: total || 0,
			orderType: orderType || 'collection',
            holdingReviewRequired: holdingReviewRequired === true
		  },
		  items || [],
		  preferredTime || null
		);
		return;
	  }
	  

	  // Fallback if the new function isn’t there
	  alert(
		(typeof orderId === 'string' ? orderId : `RTK-${orderId}`) ||
		'Order placed!'
	  );
	}


	  if (btnClose) btnClose.addEventListener('click', hide);
	  if (btnX)     btnX.addEventListener('click', hide);
	  if (wrap)     wrap.addEventListener('click', e => {
		if (e.target === wrap) hide();
	  });

	  // make available to other scripts
	  window.showOrderSuccess = showOrderSuccess;
	})();


    function buildSpiceSelector(...args){return customisationSelectors.buildSpiceSelector(...args);}

    function closeModal(){
      modal.style.display = 'none';
      currentItem = null;
      selectedMods.clear();
      currentAllowedMods = null;
      if (modalImg){ modalImg.removeAttribute('src'); modalImg.style.display = 'none'; }
      buildSpiceSelector(false);
    }

    function updateUnitPricePreview(...args){return customisationPricing.updateUnitPricePreview(...args);}


// Safe wrapper so old calls still work
function opencustomise(id){ openCustomize(id); }


// Canonical customise opener
function openCustomiseById(itemId) {
  const item = window.ITEMS_BY_ID.get(String(itemId));
  if (!item || !modal) {
    console.warn('openCustomiseById: item not found', itemId);
    return;
  }

  currentItem = item;
  selectedMods.clear();
  selectedExtras = [];

	  // NEW: per-item extras control
if (Array.isArray(item.allowedExtras)) {
  currentAllowExtras = item.allowedExtras;        // [] means no extras
} else {
  currentAllowExtras = !!item.categoryAllowedExtras; // existing behaviour
}

	  const allowed  = Array.isArray(item.allowedModifiers) ? item.allowedModifiers : null;
	  const requires = !!item.modifierRequired;
	  const isMulti  = !!item.modifierMax || !!item.modifiersMulti;
	  const max      = (typeof item.modifierMax === 'number' && item.modifierMax > 0)
		? item.modifierMax
		: null;

	  buildModifierChips(allowed, requires, isMulti, max);
	  buildExtraChips();
	  modalTitle.textContent = `Customise — ${item.name}`;
	  modalBase.dataset.price = item.price;
	  modalBase.textContent   = `Base price: ${formatCurrency(item.price)}`;
	  qtyInput.value = 1;
	  updateUnitPricePreview();

	  if (modalImg) {
		if (item.img) {
		  modalImg.src = item.img;
		  modalImg.style.display = 'block';
		} else {
		  modalImg.removeAttribute('src');
		  modalImg.style.display = 'none';
		}
	  }

	  if (item.allergens && item.allergens.length) {
		modalAll.innerHTML = renderAllergenBadges(item.allergens);
		modalAllWrap.style.display = 'block';
	  } else {
		modalAll.innerHTML = '';
		modalAllWrap.style.display = 'none';
	  }

	  const defaultSpice = (typeof item.spiceDefault === 'number') ? item.spiceDefault : 0;
	  buildSpiceSelector(!!item.spiceEnabled, defaultSpice, item.spiceMin, item.spiceNote);

	  modal.style.display = 'flex';
	}
	function openCustomise(itemId) {
	  // Backwards-compat wrapper so old code still works
	  return openCustomiseById(itemId);
	}

	// If anything uses it from inline HTML like onclick="openCustomise(...)"
	window.openCustomise = openCustomise;


	// Optional aliases if other code uses different casing:
	// keep old call sites working
	window.openCustomise  = openCustomise;
	window.openCustomize  = openCustomise;
	window.opencustomise  = openCustomise;




		document.getElementById('qty-incr').addEventListener('click', ()=>{ qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1') + 1); });
		document.getElementById('qty-decr').addEventListener('click', ()=>{ qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1') - 1); });

		document.getElementById('modal-close').addEventListener('click', closeModal);
		document.getElementById('modal-cancel').addEventListener('click', closeModal);
		modal.addEventListener('click', (ev) => { if(ev.target === modal) closeModal(); });

		document.getElementById('modal-add').addEventListener('click', () => {
	  // … your existing checks …

	  const base = Number(modalBase.dataset.price) || 0;

	  let modsTotal = 0;
	  const modsArr = [];
	  selectedMods.forEach(id => {
		const m = MODIFIERS.find(x => x.id === id);
		if (m) { modsTotal += m.delta; modsArr.push(m); }
	  });

	  const extrasArr = currentAllowExtras
		? selectedExtras.map(e => ({ id:e.id, name:e.name, delta:e.delta, type:'extra' }))
		: [];

	  const extrasTotal = currentAllowExtras
		? selectedExtras.reduce((s,e)=> s + (e.delta || 0), 0)
		: 0;

	  const unitPrice = roundToTwo(base + modsTotal + extrasTotal);
	  const qty = Math.max(1, parseInt(qtyInput.value || '1'));
	  
	const item = currentItem;
	if (!item) {
	  console.error('[Customise] No currentItem set — modal opened without selecting an item');
	  return;
	}
	const itemId = item.id;

	  basket.push({
		name: item.name,
		itemId: item.id,
		mods: [...modsArr, ...extrasArr],   // put extras in mods for downstream reuse
		unitPrice,
		qty,
		img: item.img || '',
		spice: currentSpice ?? null
	  });

	  closeModal();
	  renderOrder();
	  refreshAppliedDiscountCode();
	});



	// One delegated handler for all customise buttons inside the popup
	(function bindCustomiseClicks() {
	  const container = document.getElementById('menu-list');
	  if (!container || container.dataset.customBound) return;

	  container.addEventListener('click', (e) => {
		// works for either a button or the whole card if we later add data-id there
		const btn = e.target.closest('[data-id]');
		if (!btn) return;

		const id = btn.getAttribute('data-id');
		if (!id) return;

		// call our canonical opener
		if (typeof openCustomise === 'function') {
		  openCustomise(id);
		} else if (typeof window.openCustomise === 'function') {
		  window.openCustomise(id);
		}
	  });

	  container.dataset.customBound = '1';
	})();

basketControls.bindControls();

		// Lightbox
	document.querySelectorAll('#food-grid img').forEach(img => {
	  img.addEventListener('click', ()=> {
		const lb = document.getElementById('lightbox');
		const lbImg = document.getElementById('lightbox-img');
		if (!lb || !lbImg) return;
		lbImg.src = img.src || '';
		lb.style.display = 'flex';
	  });
	});
	const lbRoot = document.getElementById('lightbox');
	if (lbRoot) {
	  lbRoot.addEventListener('click', (e) => {
		if(e.target.id === 'lightbox' || e.target.id === 'lightbox-img') lbRoot.style.display = 'none';
	  });
	};

		document.addEventListener('keydown', (e) => {
	  if (e.key === 'Escape') {
		if (typeof closeModal === 'function' && modal?.style.display === 'flex') closeModal();
		if (typeof closeCheckout === 'function' && checkoutModal?.style.display === 'flex') closeCheckout();
		if (typeof hideOrderSuccess === 'function') hideOrderSuccess();
	  }
	});

	// --- One handler for all "customise" buttons in the popup menu ---
	const menuListEl = document.getElementById('menu-list');

	if (menuListEl) {
	  menuListEl.addEventListener('click', (e) => {
		const btn = e.target.closest('button[data-id]');
		if (!btn) return;

		const id = btn.dataset.id;
		// just open customise – do NOT close menu
		openCustomise(id);
	  });
	}

	function filterMenu(...args){return menuRendering.filterMenu(...args);}

menuRendering.bindSearch();



	// ---------- Build & first render ----------
	buildMenu();
	renderOrder();
	refreshAppliedDiscountCode();

	// expose helpers the other script uses
	window.formatCurrency     = formatCurrency;
	window.orderMsg           = document.getElementById('order-msg');
	window.basket             = basket;
	window.renderOrder        = renderOrder;
 window.RTKRestoreReviewedBasket=items=>{
  if(basket.length&&!confirm('Replace your current basket with the basket reviewed by the restaurant?'))return false;
  const restored=items.map(line=>({itemId:line.item_id,name:line.name,mods:line.modifiers,
   unitPrice:line.unit_price,qty:line.qty,img:line.img||'',spice:line.spice,item_note:line.item_note}));
  basket.splice(0,basket.length,...restored);renderOrder();return true;
 };
	window.roundToTwo         = roundToTwo;
	window.chilliIcons        = chilliIcons;
	window.nameWithoutChillies= nameWithoutChillies;

	  
	  function openMenuOverlay() {
	  if (!menuOverlay) return;
	  menuOverlay.classList.add('show');
	  document.body.style.overflow = 'hidden';   // stop background scroll
	  document.body.classList.add('menu-open');  // 👈 NEW: flag that menu is open
	}

	function closeMenuOverlay() {
	  if (!menuOverlay) return;
	  menuOverlay.classList.remove('show');
	  document.body.style.overflow = '';
	  document.body.classList.remove('menu-open'); // 👈 NEW: remove flag
	}


	  if (menuLink) {
		menuLink.addEventListener('click', (e) => {
		  e.preventDefault();
		  openMenuOverlay();
		});
	  }

	  if (menuClose) {
		menuClose.addEventListener('click', () => {
		  closeMenuOverlay();
		});
	  }

	  if (menuOverlay) {
		// click outside the inner card closes
		menuOverlay.addEventListener('click', (e) => {
		  if (e.target === menuOverlay) closeMenuOverlay();
		});
	  }

	  // ESC key closes popup too
	  document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && menuOverlay?.classList.contains('show')) {
		  closeMenuOverlay();
		}
	  });

	function cancelOrder(order, reason, meta = {}) {
	  order.status = 'cancelled';
	  order.cancelReason = reason;            // <- short code/string
	  order.cancelMeta = meta;                // <- optional extra detail
	  order.cancelledAt = new Date().toISOString();
	  console.warn('[ORDER CANCELLED]', reason, meta, order);
	  return order;
	}


	// (no extra closers past here)
	}); 

// end Loaded




