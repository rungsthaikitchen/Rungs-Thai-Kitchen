(function(root){
'use strict';
function create(context){
const {window,console,fetch}=context;
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

async function refreshDeliveryQuote() {
  const generation = ++context.deliveryQuoteGeneration;
  const subtotal = Number(context.checkoutBaseSubtotal || 0);
	const freeDeliveryRemaining = Math.max(0, context.DELIVERY_FREE_THRESHOLD - subtotal);
	const freeDeliveryMessage =
	  subtotal >= context.DELIVERY_FREE_THRESHOLD
		? "🎉 You’ve unlocked FREE delivery!"
		: `Add £${freeDeliveryRemaining.toFixed(2)} more for FREE delivery 🚚`;
  const restaurant = getRestaurantLatLng();
  const customer = getCustomerLatLng();

			  // 🚫 No coords = cannot prove address is in delivery radius
			  if (!restaurant || !customer) {
			  context.deliveryQuoteState = {
				loading: false,
				eligible: true,
				reason: "",
				straightLineMiles: null,
				routeMiles: null,
				fee: context.DELIVERY_FALLBACK_FEE,
				usedFallback: true,
				freeDeliveryRemaining,
				freeDeliveryMessage,
				lastUpdated: Date.now()
			  };

			  window.deliveryQuoteState = context.deliveryQuoteState;

			  console.warn("[delivery] blocked - missing coords for radius check", {
				restaurant,
				customer
			  });

			  return context.deliveryQuoteState;
			}

  const straightLineMiles = haversineMiles(
    restaurant.lat,
    restaurant.lng,
    customer.lat,
    customer.lng
  );

  // 🚫 Hard 3-mile radius gate
  if (straightLineMiles > context.DELIVERY_MAX_STRAIGHT_LINE_MILES) {
    context.deliveryQuoteState = {
      loading: false,
      eligible: false,
      reason: "Sorry, this address is outside our 3-mile delivery radius. Please call us on 0113 469 9564 and we’ll see what we can do 😊",
      straightLineMiles,
      routeMiles: null,
      fee: null,
      usedFallback: false,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = context.deliveryQuoteState;

    console.warn("[delivery] outside radius", {
      straightLineMiles
    });

    return context.deliveryQuoteState;
  }

  // ✅ Free delivery only AFTER radius check
  if (subtotal >= context.DELIVERY_FREE_THRESHOLD) {
    context.deliveryQuoteState = {
      loading: false,
      eligible: true,
      reason: "",
      straightLineMiles,
      routeMiles: null,
      fee: 0,
      usedFallback: false,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = context.deliveryQuoteState;

    console.log("[delivery] free delivery threshold met within radius");
    return context.deliveryQuoteState;
  }

  // ✅ Inside radius, under free delivery threshold: use fallback while route quote loads
  context.deliveryQuoteState = {
    loading: true,
    eligible: true,
    reason: "",
    straightLineMiles,
    routeMiles: null,
    fee: context.DELIVERY_FALLBACK_FEE,
    usedFallback: true,
    lastUpdated: Date.now()
  };

  window.deliveryQuoteState = context.deliveryQuoteState;

  try {
    const resp = await fetch(`${context.SUPABASE_URL}/functions/v1/get-delivery-route-quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": context.SUPABASE_PUBLIC_KEY
      },
      body: JSON.stringify({
        origin: restaurant,
        destination: customer
      })
    });

    const data = await resp.json().catch(() => null);
    if (generation !== context.deliveryQuoteGeneration) return window.deliveryQuoteState;

    if (!resp.ok || !data?.ok || !Number.isFinite(data?.routeMiles)) {
      console.warn("[delivery] route lookup failed, using fallback");

      context.deliveryQuoteState = {
        ...context.deliveryQuoteState,
        loading: false,
        eligible: true,
        fee: context.DELIVERY_FALLBACK_FEE,
        usedFallback: true,
        lastUpdated: Date.now()
      };

      window.deliveryQuoteState = context.deliveryQuoteState;
      return context.deliveryQuoteState;
    }

    const routeMiles = Number(data.routeMiles);
    const routeFee = calculateBandFee(routeMiles, context.DELIVERY_ROUTE_BANDS);

    context.deliveryQuoteState = {
      loading: false,
      eligible: true,
      reason: "",
      straightLineMiles,
      routeMiles,
      fee: routeFee ?? context.DELIVERY_FALLBACK_FEE,
      usedFallback: routeFee == null,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = context.deliveryQuoteState;

    console.log("[delivery] route pricing applied", {
      straightLineMiles,
      routeMiles,
      fee: context.deliveryQuoteState.fee
    });

    return context.deliveryQuoteState;

  } catch (err) {
    if (generation !== context.deliveryQuoteGeneration) return window.deliveryQuoteState;
    console.warn("[delivery] route fetch exception, using fallback", err);

    context.deliveryQuoteState = {
      ...context.deliveryQuoteState,
      loading: false,
      eligible: true,
      fee: context.DELIVERY_FALLBACK_FEE,
      usedFallback: true,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = context.deliveryQuoteState;
    return context.deliveryQuoteState;
  }
}

var refreshCheckoutPricingAndRender = async function () {
  if ((0, context.getSelectedOrderType)() === "delivery") {
    await window.refreshDeliveryQuote();
  } else {
    ++context.deliveryQuoteGeneration; // Invalidate delivery replies after switching to collection.
    context.deliveryQuoteState = {
      loading: false,
      eligible: true,
      reason: "",
      straightLineMiles: null,
      routeMiles: null,
      fee: 0,
      usedFallback: false,
      lastUpdated: Date.now()
    };

    window.deliveryQuoteState = context.deliveryQuoteState;
  }

  (0, context.recomputeCheckoutTotals)();
  (0, context.updateCheckoutSubmitButton)();
  (0, context.updateCheckoutOrderSummary)();
};
return {toRadians,haversineMiles,roundMiles,calculateBandFee,getRestaurantLatLng,getCustomerLatLng,refreshDeliveryQuote,refreshCheckoutPricingAndRender};
}
if(typeof module==='object'&&module.exports)module.exports={create};
if(root)root.RTKDeliveryQuotes={create};
})(typeof window!=='undefined'?window:null);
