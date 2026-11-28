(function(root){
'use strict';
function create(context){
const {window,document}=context;
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
function updateCheckoutSubmitButton() {
			  const submitBtn = context.checkoutForm?.querySelector('button[type="submit"], input[type="submit"]');
			  const orderType = document.querySelector('input[name="order-type"]:checked')?.value || 'collection';
			  const quote = window.deliveryQuoteState || context.deliveryQuoteState;

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
return {updateCheckoutOrderSummary,updateAddressRequirement,showPreferredTimeMessage,hidePreferredTimeMessage,updateCheckoutSubmitButton};
}
function createValidationAlerts(context){
function validatePreferredTime() {
  context.hideCheckoutBanner();

  const submitBtn =
    context.document.getElementById('checkout-submit');

  const raw = context.preferredTimeInput?.value;
  if (!raw) return true;

  const chosen = new Date(raw);
  if(context.checkoutAvailability.hints){
    const available=context.checkoutAvailability.hints.get(chosen.toISOString())===true;
    if(submitBtn)submitBtn.disabled=!available;
    return available;
  }

  const isClosed = context.inAnyWindow(chosen, context.CLOSED_RANGES);
  const isFull   = context.inAnyWindow(chosen, context.FULLY_BOOKED);

  if (isClosed) {
    context.showCheckoutBanner(
      'closed',
      isClosed.message ||
        'Sorry, we are closed at the selected time.'
    );

    if (submitBtn) submitBtn.disabled = true;
    return false;
  }

  if (isFull) {
    context.showCheckoutBanner(
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

function showPausedOrderAlert(message) {
  if (!context.pausedOrderAlert || !context.pausedOrderAlertMessage) return;

  context.pausedOrderAlertMessage.textContent =
    message ||
    'Online orders are temporarily paused. Please check back shortly.';

  context.pausedOrderAlert.style.display = 'flex';

  if (context.pausedOrderAlertOk) {
    context.pausedOrderAlertOk.focus();
  }
}

function hidePausedOrderAlert() {
  if (!context.pausedOrderAlert) return;

  context.pausedOrderAlert.style.display = 'none';
}
return {validatePreferredTime,showPausedOrderAlert,hidePausedOrderAlert};
}
const api={create,createValidationAlerts};
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.RTKCheckoutDisplay=api;
})(typeof window==='undefined'?null:window);
