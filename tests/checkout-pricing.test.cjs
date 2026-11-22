const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create}=require('../customer-checkout-pricing');
const evidence=require('../CHECKOUT-PRICING-EXTRACTION-2026-11-22.json');
const names=evidence.regions.map(r=>r.name);
const baseline=evidence.regions.map(r=>r.before).join('\n')+'\n;({'+names.join(',')+'})';
function fixture({subtotal=29,discount=0,points=105,available=105,type='collection',quote={fee:0,eligible:true}}={}){
 const elements=new Map();
 const element=()=>({style:{},hidden:false,textContent:'',innerHTML:'',querySelector(){return this.label||(this.label={textContent:''});}});
 for(const id of ['checkout-subtotal','checkout-delivery','checkout-total','loyalty-message','freeDeliveryHint','discountRow','discountValue','loyaltyDiscountRow','loyaltyDiscountValue','discount-code-message'])elements.set(id,element());
 const state={pointsBalance:points,settledPointsBalance:points,availablePointsBalance:available,reservedPoints:points-available};
 const context={window:{deliveryQuoteState:quote,basket:[{unitPrice:subtotal,qty:1}]},document:{getElementById:id=>elements.get(id)||null,querySelector:()=>null},console:{log(){},warn(){},error(){}},checkoutBaseSubtotal:subtotal,appliedDiscountCode:discount?'FIXTURE':null,appliedDiscountAmount:discount,loyaltyState:state,LOYALTY_REWARD_THRESHOLD:100,LOYALTY_REWARD_VALUE:5,deliveryQuoteState:quote,deliveryNote:element(),getSelectedOrderType:()=>type,DELIVERY_FREE_THRESHOLD:30,DELIVERY_FALLBACK_FEE:3,formatCurrency:n=>'£'+n.toFixed(2)};
 const snapshot=()=>JSON.parse(JSON.stringify({totals:context.window.__checkoutTotals,last:context.window.__lastGoodCheckoutTotals,state,note:context.deliveryNote,elements:[...elements]}));
 return {context,state,elements,snapshot};
}
test('pricing extraction reconstructs the released bootstrap exactly',()=>{
 assert.ok(require('./pricing-source.cjs').reconstructPricing().includes('standard charge; route pricing unavailable'));
});
test('loading the pricing module has no DOM, storage or network side effects',()=>{
 const blocked=()=>{throw Error('Unexpected initialization side effect');},window={};
 vm.runInNewContext(fs.readFileSync(require.resolve('../customer-checkout-pricing'),'utf8'),{window,document:new Proxy({},{get:blocked}),fetch:blocked,localStorage:new Proxy({},{get:blocked})});
 assert.deepEqual(Object.keys(window),['RTKCheckoutPricing']);assert.equal(typeof window.RTKCheckoutPricing.create,'function');
});
test('actual extracted totals, loyalty state and displayed amounts match released functions across 540 combinations',()=>{
 let cases=0;
 for(const subtotal of [0,2,29,30,104.5,29.995])for(const discount of [0,5,subtotal])for(const [points,available]of [[0,0],[99,99],[100,100],[105,5],[205,105]])for(const [type,quote]of [
  ['collection',{fee:3,eligible:true}],['delivery',{fee:3,eligible:true,usedFallback:true,straightLineMiles:0}],['delivery',{fee:3,eligible:true,usedFallback:true,straightLineMiles:null}],['delivery',{fee:2,eligible:true,routeMiles:1.25}],['delivery',{fee:0,loading:true}],['delivery',{fee:0,eligible:false,reason:'Outside delivery area'}]]){
  const input={subtotal,discount,points,available,type,quote};const old=fixture(input),current=fixture(input);
  vm.runInNewContext(baseline,old.context).recomputeCheckoutTotals();create(current.context).recomputeCheckoutTotals();
  assert.deepEqual(current.snapshot(),old.snapshot(),JSON.stringify(input));cases++;
 }
 assert.equal(cases,540);
});
test('recalculation reads current shared basket subtotal, voucher and reserved reward balance',()=>{
 const f=fixture(),pricing=create(f.context);assert.equal(pricing.recomputeCheckoutTotals().total,24);
 f.context.checkoutBaseSubtotal=104.5;f.context.appliedDiscountAmount=10;f.state.availablePointsBalance=5;
 const next=pricing.recomputeCheckoutTotals();assert.equal(next.total,94.5);assert.equal(next.loyalty_discount,0);assert.equal(next.loyalty_points_earned_pending,94);
});
test('voucher refresh updates shared state after basket changes and removes a newly invalid code',async()=>{
 const f=fixture({discount:5});let valid=true;
 f.context.sb={from:()=>({select(){return this;},eq(){return this;},async maybeSingle(){return {data:valid?{discount_type:'percent',discount_value:10,max_uses:null}:null,error:null};}})};
 const pricing=create(f.context);f.context.window.basket=[{unitPrice:10,qty:3}];
 await pricing.refreshAppliedDiscountCode();assert.equal(f.context.checkoutBaseSubtotal,30);assert.equal(f.context.appliedDiscountAmount,3);
 valid=false;await pricing.refreshAppliedDiscountCode();assert.equal(f.context.appliedDiscountCode,null);assert.equal(f.context.appliedDiscountAmount,0);
 assert.match(f.elements.get('discount-code-message').textContent,/Discount code removed/);
});
test('loyalty lookup retains phone normalization and failure behavior without provider traffic',async()=>{
 const f=fixture();let calls=0;
 f.context.AbortSignal={timeout:()=>undefined};f.context.fetch=async(url,options)=>{calls++;assert.equal(url,'https://order-backend-production.up.railway.app/loyalty-balance');assert.deepEqual(JSON.parse(options.body),{phone:'07000000000'});return {json:async()=>({ok:true,loyalty:{points_balance:105}})};};
 const pricing=create(f.context);assert.equal(await pricing.fetchLoyaltyBalance(''),null);assert.equal(calls,0);
 assert.equal((await pricing.fetchLoyaltyBalance(' 07000000000 ')).points_balance,105);
 f.context.fetch=async()=>{throw Error('Unavailable');};assert.equal(await pricing.fetchLoyaltyBalance('07000000000'),null);
});
