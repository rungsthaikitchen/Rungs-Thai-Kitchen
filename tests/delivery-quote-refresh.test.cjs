const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../customer-menu-basket.js'),'utf8');
const render=source.slice(source.indexOf('var refreshCheckoutPricingAndRender ='),source.indexOf('window.refreshCheckoutPricingAndRender ='));
const quote=source.slice(source.indexOf('async function refreshDeliveryQuote()'),source.indexOf('window.refreshDeliveryQuote ='));
function fixture(){
 const pending=[];let type='delivery',distance=1,coords=true;
 const context={window:{},console:{log(){},warn(){}},checkoutBaseSubtotal:29,DELIVERY_FREE_THRESHOLD:30,DELIVERY_FALLBACK_FEE:3,DELIVERY_MAX_STRAIGHT_LINE_MILES:3,DELIVERY_ROUTE_BANDS:[],SUPABASE_URL:'https://provider.invalid',SUPABASE_PUBLIC_KEY:'fixture',getSelectedOrderType:()=>type,getRestaurantLatLng:()=>({lat:1,lng:1}),getCustomerLatLng:()=>coords?{lat:1,lng:1}:null,haversineMiles:()=>distance,calculateBandFee:()=>2,recomputeCheckoutTotals(){},updateCheckoutSubmitButton(){},updateCheckoutOrderSummary(){},fetch:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))};
 vm.runInNewContext('var deliveryQuoteGeneration=0;var deliveryQuoteState={fee:3};'+quote+';window.refreshDeliveryQuote=refreshDeliveryQuote;'+render,context);
 return {context,pending,refresh:()=>context.refreshCheckoutPricingAndRender(),quote:()=>context.window.deliveryQuoteState,setType:v=>type=v,setDistance:v=>distance=v,setCoords:v=>coords=v};
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
