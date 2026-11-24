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
const api={create};
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.RTKCheckoutDisplay=api;
})(typeof window==='undefined'?null:window);
