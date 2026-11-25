const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create}=require('../customer-delivery-quotes');
function fixture(){
 const pending=[];let type='delivery';
 const context={window:{customerLat:53.744437+1/69,customerLng:-1.576570},console:{log(){},warn(){}},deliveryQuoteGeneration:0,deliveryQuoteState:{fee:3},checkoutBaseSubtotal:29,DELIVERY_FREE_THRESHOLD:30,DELIVERY_FALLBACK_FEE:3,DELIVERY_MAX_STRAIGHT_LINE_MILES:3,DELIVERY_ROUTE_BANDS:[{maxMiles:1.5,fee:2},{maxMiles:2.5,fee:3},{maxMiles:4,fee:4}],SUPABASE_URL:'https://provider.invalid',SUPABASE_PUBLIC_KEY:'fixture',getSelectedOrderType:()=>type,recomputeCheckoutTotals(){},updateCheckoutSubmitButton(){},updateCheckoutOrderSummary(){},fetch:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))};
 const api=create(context);context.window.refreshDeliveryQuote=api.refreshDeliveryQuote;
 return {context,pending,refresh:()=>api.refreshCheckoutPricingAndRender(),quote:()=>context.window.deliveryQuoteState,setType:v=>type=v,setDistance:v=>context.window.customerLat=53.744437+v/69,setCoords:v=>{context.window.customerLat=v?53.744437+1/69:undefined;}};
}
const response=()=>({ok:true,json:async()=>({ok:true,routeMiles:1.25})});
test('crossing the free-delivery threshold invalidates an older successful route reply',async()=>{
 const f=fixture(),old=f.refresh();assert.equal(f.pending.length,1);
 f.context.checkoutBaseSubtotal=30;await f.refresh();assert.equal(f.quote().fee,0);
 f.pending[0].resolve(response());await old;assert.equal(f.quote().fee,0);assert.equal(f.quote().loading,false);
});
test('reducing a free-delivery basket recalculates the paid route fee',async()=>{
 const f=fixture();f.context.checkoutBaseSubtotal=30;await f.refresh();assert.equal(f.quote().fee,0);
 f.context.checkoutBaseSubtotal=29;const next=f.refresh();assert.equal(f.quote().loading,true);
 f.pending[0].resolve(response());await next;assert.equal(f.quote().fee,2);
});
test('switching to collection prevents an old failed request restoring the fallback delivery fee',async()=>{
 const f=fixture(),old=f.refresh();f.setType('collection');await f.refresh();
 f.pending[0].reject(Error('Old route failed'));await old;assert.equal(f.quote().fee,0);assert.equal(f.quote().usedFallback,false);
});
test('a newer completed route quote wins when older requests finish out of order',async()=>{
 const f=fixture(),old=f.refresh(),latest=f.refresh();
 f.pending[1].resolve(response());await latest;f.pending[0].resolve({ok:false,json:async()=>({})});await old;
 assert.equal(f.quote().fee,2);assert.equal(f.quote().usedFallback,false);
});
test('free delivery cannot bypass missing coordinates or the radius gate',async()=>{
 const f=fixture();f.context.checkoutBaseSubtotal=30;f.setCoords(false);await f.refresh();assert.equal(f.quote().straightLineMiles,null);assert.equal(f.quote().usedFallback,true);
 f.setCoords(true);f.setDistance(4);await f.refresh();assert.equal(f.quote().eligible,false);assert.equal(f.quote().fee,null);assert.equal(f.pending.length,0);
});
