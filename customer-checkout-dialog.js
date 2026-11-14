// Checkout responsibility module; initialized explicitly by customer-checkout.js.
(function(root){
 // Preserve the original classic-script semantics during this extraction.
 function create(context){
  const {window,document,console}=context;
let checkoutOpening = false;
function setCheckoutOpening(loading) {
  const status = document.getElementById('checkout-opening-status');
  if (status) status.hidden = !loading;
  for (const button of document.querySelectorAll('#open-checkout, #menu-checkout-btn')) {
    button.disabled = loading;
    button.setAttribute('aria-busy', String(loading));
  }
}
function setAvailabilityLoading(loading) {
  context.preferredTimeSelect?.setAttribute('aria-busy', String(loading));
  const message = document.getElementById('preferred-time-message');
  if (message) message.dataset.loading = String(loading);
  if (loading) (0, context.showPreferredTimeMessage)('Checking available times…');
}
async function openCheckout(subtotal) {
  if (checkoutOpening) return;
  checkoutOpening = true;
  setCheckoutOpening(true);
  try {
  const openedBasketKey=(0, context.availabilityBasketKey)();
			  console.trace("[checkout] openCheckout called", { subtotal });
			  
const preferredTimeEl =
  document.getElementById('cust-preferred-time');


// Remember the date checkout has settled on
if (preferredTimeEl?.value) {
  context.lastPreferredDate =
    preferredTimeEl.value.slice(0, 10);
}

			  if (Number(subtotal || 0) <= 0) {
				console.warn("[checkout] openCheckout blocked - empty basket", { subtotal });
				return;
			  }

await (0, context.loadServiceState)();

if (context.SERVICE_STATE.mode === 'paused') {
  if (context.orderMsg) {
    context.orderMsg.textContent =
      context.SERVICE_STATE.customer_message ||
      'Online orders are temporarily paused. Please check back shortly.';
    context.orderMsg.style.color = '#b02a2a';
  }

  console.warn(
    '[checkout] openCheckout blocked - orders paused'
  );

  return;
}

        // Keep the customer's choice when reopening this checkout. Only use
        // the initial collection default when neither option is selected.
        if (!document.querySelector('input[name="order-type"]:checked')) {
          const collection = document.querySelector('input[name="order-type"][value="collection"]');
          if (collection) collection.checked = true;
        }

        // Refresh closures / fully-booked periods whenever checkout opens.
// This prevents a customer using stale blackout data from an older page load.
await (0, context.loadBlackouts)();

        // Refresh preferred-time availability whenever checkout opens.
// This ensures the dropdown reflects the latest orders in Supabase
// and the current basket's kitchen load.
if (
  context.preferredDateInput?.value &&
  typeof context.populatePreferredTimeSelect === 'function'
) {
  const previouslySelectedTime =
    context.preferredTimeSelect?.value || '';

  await (0, context.populatePreferredTimeSelect)(
    context.preferredDateInput.value
  );

  // Restore the previous selection only if it is still available.
  if (previouslySelectedTime && context.preferredTimeSelect) {
    const previousOption =
      Array.from(context.preferredTimeSelect.options)
        .find(option =>
          option.value === previouslySelectedTime &&
          !option.disabled
        );

    if (previousOption) {
      context.preferredTimeSelect.value =
        previouslySelectedTime;

      context.preferredTimeHidden.value =
        `${context.preferredDateInput.value}T${previouslySelectedTime}`;
    } else {
      context.preferredTimeSelect.value = '';
      context.preferredTimeHidden.value = '';

      (0, context.showPreferredTimeMessage)(
        'Your previously selected time is no longer available. Please choose another available time.'
      );
    }
  }
}

      if(openedBasketKey!==(0, context.availabilityBasketKey)())return;
      context.checkoutBaseSubtotal = Math.round(subtotal * 100) / 100;
      context.checkoutMsg.textContent = '';
      context.checkoutMsg.style.color = '';

			  // Availability above uses the retained order type.

			  (0, context.recomputeCheckoutTotals)();
			  (0, context.updateCheckoutSubmitButton)();
			  (0, context.updateCheckoutOrderSummary)();

			  context.checkoutModal.style.display = 'flex';
			  } finally {
    checkoutOpening = false;
    setCheckoutOpening(false);
  }
}
 
    // 3. Update submit button + show the modal
	// updateCheckoutSubmitButton();
	//updateCheckoutOrderSummary();
	//checkoutModal.style.display = 'flex';


function closeCheckout(){
  if (context.checkoutModal) context.checkoutModal.style.display = 'none';
}


  return Object.freeze({open:openCheckout, close:closeCheckout, setAvailabilityLoading});
 }
 const api=Object.freeze({create});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.RTKCheckoutDialog=api;
})(typeof window!=='undefined'?window:null);
