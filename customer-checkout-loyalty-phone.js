(function(root){
'use strict';
function create(deps){
function bind(){
(function wireLoyaltyPhoneLookup() {
  const phoneInput = deps.document.getElementById('cust-phone');
  if (!phoneInput) return;

  let generation = 0;
  async function refreshLoyaltyFromPhone() {
    const current = ++generation, phone = phoneInput.value;
    const loyalty = await deps.fetchLoyaltyBalance(phone);
    if (current !== generation || phone !== phoneInput.value) return false;
	
	  deps.console.log('LOYALTY RESPONSE:', loyalty); // 👈 ADD THIS

			if (loyalty) {
			  deps.loyaltyState.pointsBalance = Number(loyalty.points_balance || 0);

              const balances = deps.window.RTKLoyaltyAvailability(loyalty);
              deps.loyaltyState.settledPointsBalance = balances.settledPoints;
              deps.loyaltyState.reservedPoints = balances.reservedPoints;
              deps.loyaltyState.availablePointsBalance = balances.availablePoints;

			  deps.loyaltyState.lifetimePoints = Number(loyalty.lifetime_points || 0);
			  deps.loyaltyState.pointsToNextReward = Number(loyalty.points_to_next_reward || 100);
			} else {
			  deps.loyaltyState.pointsBalance = 0;
			  deps.loyaltyState.settledPointsBalance = 0;
              deps.loyaltyState.reservedPoints = 0;
              deps.loyaltyState.availablePointsBalance = 0;
			  deps.loyaltyState.lifetimePoints = 0;
			  deps.loyaltyState.pointsToNextReward = 100;
			}
			
			deps.console.log('LOYALTY RESPONSE FROM BACKEND:', loyalty);
			deps.console.log('LOYALTY STATE AFTER LOAD:', deps.loyaltyState);

    deps.refreshCheckoutPricingAndRender();
    deps.renderLoyaltyMessage();
    return loyalty !== null;
  }
  deps.window.RTKRefreshLoyalty = refreshLoyaltyFromPhone;

  phoneInput.addEventListener('blur', refreshLoyaltyFromPhone);
  phoneInput.addEventListener('change', refreshLoyaltyFromPhone);
})();
}
return {bind};
}
if(typeof module==='object'&&module.exports)module.exports={create};
if(root)root.RTKCheckoutLoyaltyPhone={create};
})(typeof window!=='undefined'?window:null);
