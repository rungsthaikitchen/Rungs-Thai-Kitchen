(function(root){
'use strict';
function create(deps){
function bind(){
// safe listeners
if (deps.checkoutClose) {
  deps.checkoutClose.addEventListener('click', deps.closeCheckout);
}
if (deps.checkoutCancel) {
  deps.checkoutCancel.addEventListener('click', deps.closeCheckout);
}
if (deps.checkoutModal) {
  deps.checkoutModal.addEventListener('click', (e) => {
    if (e.target === deps.checkoutModal) deps.closeCheckout();
  });
}

deps.document.addEventListener('change', async (e) => {
  if (e.target && e.target.matches('input[name="order-type"]')) {

    deps.updateAddressRequirement();
    deps.updateCheckoutSubmitButton();
    deps.updateCheckoutOrderSummary();
    // Old collection times must stop being selectable before delivery pricing
    // or geocoding awaits. Supersede in-flight checks immediately as well.
    const generation=++deps.checkoutAvailability.generation;
    const date=deps.document.getElementById('cust-preferred-date')?.value;
    const context=deps.availabilityContextKey(date);
    deps.window.RTKBookingClient?.cancelAvailability?.();
    deps.checkoutAvailability.hints=null;deps.checkoutAvailability.unverifiedTimes=new Set();deps.checkoutAvailability.driverBusyTimes=new Set();
    deps.clearPreferredTimeSelect('Checking times for your order type…');
    await deps.refreshCheckoutPricingAndRender();
    if(generation!==deps.checkoutAvailability.generation||context!==deps.availabilityContextKey(date))return;
    await deps.populatePreferredTimeSelect(date);
  }
});

deps.document.addEventListener('DOMContentLoaded', () => {
  const addressInput = deps.document.getElementById('cust-address');

  if (addressInput) {
    addressInput.addEventListener('blur', (e) => {
      const address = e.target.value;

      if (address && address.length > 5) {
        deps.geocodeCustomerAddress(address).then(()=>deps.populatePreferredTimeSelect(deps.document.getElementById('cust-preferred-date')?.value));
      }
    });
  }
});

deps.document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'cust-address') {
    deps.updateCheckoutOrderSummary();
    if(deps.document.querySelector('input[name="order-type"]:checked')?.value==='delivery'){
      ++deps.checkoutAvailability.generation;deps.checkoutAvailability.hints=null;
      deps.clearPreferredTimeSelect('Finish entering your delivery address');
    }
  }
});

// Open checkout (safe)
if (deps.openCheckoutBtn) {
  deps.openCheckoutBtn.addEventListener('click', () => {
    if (!deps.window.basket || deps.window.basket.length === 0) {
      if (deps.orderMsg) {
        deps.orderMsg.textContent = 'Your basket is empty.';
        deps.orderMsg.style.color = '#b02a2a';
      }
      return;
    }

    if (deps.orderMsg) {
      deps.orderMsg.textContent = '';
      deps.orderMsg.style.color = '';
    }
    const subtotal = deps.window.basket.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    deps.openCheckout(subtotal);
  });
}



}
return {bind};
}
if(typeof module==='object'&&module.exports)module.exports={create};
if(root)root.RTKCheckoutEvents={create};
})(typeof window!=='undefined'?window:null);
