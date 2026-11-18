const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {loyaltyAvailability}=require('../master-wok-checkout-client');
const source=fs.readFileSync(require.resolve('../customer-checkout.js'),'utf8');
const apply=source.slice(source.indexOf('function applyLoyaltyToTotals('),source.indexOf('function updateLoyaltyProjection('));
function discount(quote){
 const balance=loyaltyAvailability(quote),state={pointsBalance:quote.points_balance,settledPointsBalance:balance.settledPoints,availablePointsBalance:balance.availablePoints,reservedPoints:balance.reservedPoints};
 const context={loyaltyState:state,LOYALTY_REWARD_THRESHOLD:100,LOYALTY_REWARD_VALUE:5,console:{log(){}}};
 const amount=vm.runInNewContext(apply+';applyLoyaltyToTotals(103)',context);
 return {amount,state};
}
test('the visible checkout cannot reuse the first pending order reward',()=>{
 const result=discount({points_balance:105,settled_points_balance:105,reserved_points:100,available_points_balance:5});
 assert.equal(result.amount,0);assert.equal(result.state.rewardEligible,false);assert.equal(result.state.pointsRedeemedPending,0);assert.equal(result.state.settledPointsBalance,105);
});
test('released reservations and balances covering two rewards remain redeemable',()=>{
 for(const q of [{points_balance:105,reserved_points:0},{points_balance:205,reserved_points:100}]){
  const r=discount(q);assert.equal(r.amount,5);assert.equal(r.state.pointsRedeemedPending,100);
 }
});
test('an explicit zero available balance cannot fall back to settled points',()=>{
 assert.equal(discount({points_balance:105,available_points_balance:0}).amount,0);
 assert.equal(loyaltyAvailability({points_balance:5,reserved_points:100}).availablePoints,0);
});
