(function(root){
'use strict';
function create(context){
const {document,window,console,localStorage,crypto}=context;
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
  context.appliedDiscountCode = null;
  context.appliedDiscountAmount = 0;

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
  context.lastPreferredDate = null;

  (0, context.hidePreferredTimeMessage)();

  // Clear delivery calculation from previous customer
  window.deliveryQuoteState = {};

  // IMPORTANT:
  // next order must get a brand-new idempotency key
  localStorage.removeItem('checkout_idempotency_key');

  console.log('[checkout] reset complete');
}

function getIdempotencyKey() {
		  const existing = localStorage.getItem("checkout_idempotency_key");
		  if (existing) return existing;

		  const key = crypto.randomUUID();
		  localStorage.setItem("checkout_idempotency_key", key);
		  return key;
		}
return {resetCheckoutForNextOrder,getIdempotencyKey};
}
function createCheckoutCompatibility(context){
const {document,window,console,localStorage,crypto}=context;
function getIdempotencyKey() {
		  const existing = localStorage.getItem("checkout_idempotency_key");
		  if (existing) return existing;

		  const key = crypto.randomUUID();
		  localStorage.setItem("checkout_idempotency_key", key);
		  return key;
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

  context.appliedDiscountCode = null;
  context.appliedDiscountAmount = 0;

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

  context.lastPreferredDate = null;

  if (typeof context.hidePreferredTimeMessage === 'function') {
    context.hidePreferredTimeMessage();
  }

  window.deliveryQuoteState = {};

  localStorage.removeItem('checkout_idempotency_key');

  console.log('[checkout] reset complete');
}
return {getIdempotencyKey,resetCheckoutForNextOrder};
}
if(typeof module==='object'&&module.exports)module.exports={create,createCheckoutCompatibility};
if(root)root.RTKCheckoutReset={create,createCheckoutCompatibility};
})(typeof window!=='undefined'?window:null);
