
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

// BEGIN delivery-quotes boundary
const deliveryQuotes=window.RTKDeliveryQuotes.create({
 window,console,fetch,
 get deliveryQuoteGeneration(){return deliveryQuoteGeneration;},
 get deliveryQuoteState(){return deliveryQuoteState;},
 get checkoutBaseSubtotal(){return checkoutBaseSubtotal;},
 get DELIVERY_FREE_THRESHOLD(){return DELIVERY_FREE_THRESHOLD;},
 get DELIVERY_FALLBACK_FEE(){return DELIVERY_FALLBACK_FEE;},
 get DELIVERY_MAX_STRAIGHT_LINE_MILES(){return DELIVERY_MAX_STRAIGHT_LINE_MILES;},
 get DELIVERY_ROUTE_BANDS(){return DELIVERY_ROUTE_BANDS;},
 get SUPABASE_URL(){return SUPABASE_URL;},
 get SUPABASE_PUBLIC_KEY(){return SUPABASE_PUBLIC_KEY;},
 get getSelectedOrderType(){return getSelectedOrderType;},
 get recomputeCheckoutTotals(){return recomputeCheckoutTotals;},
 get updateCheckoutSubmitButton(){return updateCheckoutSubmitButton;},
 get updateCheckoutOrderSummary(){return updateCheckoutOrderSummary;},
 set deliveryQuoteGeneration(value){deliveryQuoteGeneration=value;},
 set deliveryQuoteState(value){deliveryQuoteState=value;},
});
// END delivery-quotes boundary
var refreshCheckoutPricingAndRender = function (...args){return deliveryQuotes.refreshCheckoutPricingAndRender(...args);};

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

function toRadians(...args){return deliveryQuotes.toRadians(...args);}

function haversineMiles(...args){return deliveryQuotes.haversineMiles(...args);}

function roundMiles(...args){return deliveryQuotes.roundMiles(...args);}

function calculateBandFee(...args){return deliveryQuotes.calculateBandFee(...args);}

function getSelectedOrderType() {
  const selected = document.querySelector('input[name="order-type"]:checked');
  return selected ? selected.value : "collection";
}

function getPreDiscountFoodSubtotal() {
  return Number(checkoutBaseSubtotal || 0);
}

function getRestaurantLatLng(...args){return deliveryQuotes.getRestaurantLatLng(...args);}

function getCustomerLatLng(...args){return deliveryQuotes.getCustomerLatLng(...args);}

// BEGIN checkout-reset boundary
const checkoutReset=window.RTKCheckoutReset.create({
 document,window,console,localStorage,crypto,
 set appliedDiscountCode(value){appliedDiscountCode=value;},
 set appliedDiscountAmount(value){appliedDiscountAmount=value;},
 set lastPreferredDate(value){lastPreferredDate=value;},
 get hidePreferredTimeMessage(){return hidePreferredTimeMessage;}
});
// END checkout-reset boundary
function resetCheckoutForNextOrder(...args){return checkoutReset.resetCheckoutForNextOrder(...args);}

function refreshDeliveryQuote(...args){return deliveryQuotes.refreshDeliveryQuote(...args);}

window.refreshDeliveryQuote = refreshDeliveryQuote;

// Single source of truth for how much space to keep above scrolled content
// Single source of truth for how much space to keep above targets
// BEGIN page-controls boundary
const pageControls=window.RTKPageControls.create({document,window,navigator});
// END page-controls boundary
function computeHeaderOffset(...args){return pageControls.computeHeaderOffset(...args);}

function applyHeaderOffset(...args){return pageControls.applyHeaderOffset(...args);}

pageControls.bindHeader();

			
	
	// robust smooth scroll that clamps to page bounds (prevents “footer snaps”)
	function smoothScrollToElTop(...args){return pageControls.smoothScrollToElTop(...args);}
	
					
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
		function getIdempotencyKey(...args){return checkoutReset.getIdempotencyKey(...args);}


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
// Earlier openMenuOverlay declaration removed; the canonical wrapper below remains.

// Earlier closeMenuOverlay declaration removed; the canonical wrapper below remains.

// BEGIN menu-overlay boundary
const menuOverlayControls=window.RTKMenuOverlay.create({
 document,window,alert,
 get menuOverlay(){return menuOverlay;},
 get menuLink(){return menuLink;},
 get menuClose(){return menuClose;},
 get menuCheckoutBtn(){return menuCheckoutBtn;},
 get menuFab(){return menuFab;},
 get basket(){return basket;},
 get openCheckout(){return openCheckout;},
});
// END menu-overlay boundary
menuOverlayControls.bindEarly();


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
	
// BEGIN customisation-dialog boundary
const customisationDialog = window.RTKCustomisationDialog.create({
 document, window, console,
 get currentItem(){return currentItem;},
 get selectedMods(){return selectedMods;},
 get selectedExtras(){return selectedExtras;},
 get currentAllowExtras(){return currentAllowExtras;},
 get modal(){return modal;},
 get modalTitle(){return modalTitle;},
 get modalBase(){return modalBase;},
 get qtyInput(){return qtyInput;},
 get modalImg(){return modalImg;},
 get modalAll(){return modalAll;},
 get modalAllWrap(){return modalAllWrap;},
 get currentAllowedMods(){return currentAllowedMods;},
 get currentSpice(){return currentSpice;},
 get MODIFIERS(){return MODIFIERS;},
 get basket(){return basket;},
 get buildModifierChips(){return buildModifierChips;},
 get buildExtraChips(){return buildExtraChips;},
 get formatCurrency(){return formatCurrency;},
 get updateUnitPricePreview(){return updateUnitPricePreview;},
 get renderAllergenBadges(){return renderAllergenBadges;},
 get buildSpiceSelector(){return buildSpiceSelector;},
 get roundToTwo(){return roundToTwo;},
 get renderOrder(){return renderOrder;},
 get refreshAppliedDiscountCode(){return refreshAppliedDiscountCode;},
 set currentItem(value){currentItem=value;},
 set selectedExtras(value){selectedExtras=value;},
 set currentAllowExtras(value){currentAllowExtras=value;},
 set currentAllowedMods(value){currentAllowedMods=value;},
});
// END customisation-dialog boundary
	// Earlier openCustomiseById declaration removed; the canonical wrapper below remains.

	
// BEGIN order-success compatibility boundary
window.RTKOrderSuccessCompat.create({document,window,alert,console,MutationObserver,setTimeout,formatCurrency}).install();
// END order-success compatibility boundary
    function buildSpiceSelector(...args){return customisationSelectors.buildSpiceSelector(...args);}

    function closeModal(...args){return customisationDialog.closeModal(...args);}

    function updateUnitPricePreview(...args){return customisationPricing.updateUnitPricePreview(...args);}


// Safe wrapper so old calls still work
function opencustomise(id){ openCustomize(id); }


// Canonical customise opener
function openCustomiseById(...args){return customisationDialog.openCustomiseById(...args);}
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




customisationDialog.bindControls();


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
pageControls.bindLightbox();

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

	  
	  function openMenuOverlay(...args){return menuOverlayControls.openMenuOverlay(...args);}
	function closeMenuOverlay(...args){return menuOverlayControls.closeMenuOverlay(...args);}

menuOverlayControls.bindLate();
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




