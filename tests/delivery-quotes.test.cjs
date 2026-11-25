const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {create}=require('../customer-delivery-quotes'),e=require('../DELIVERY-QUOTES-EXTRACTION-2026-11-25.json');
function fixture({subtotal=29,lat=53.75,lng=-1.57,route=1.25,failure='',type='delivery'}={}){
 const f={window:{customerLat:lat,customerLng:lng},deliveryQuoteGeneration:0,deliveryQuoteState:{fee:3},checkoutBaseSubtotal:subtotal,DELIVERY_FREE_THRESHOLD:30,DELIVERY_FALLBACK_FEE:3,DELIVERY_MAX_STRAIGHT_LINE_MILES:3,DELIVERY_ROUTE_BANDS:[{maxMiles:1.5,fee:2},{maxMiles:2.5,fee:3},{maxMiles:4,fee:4}],SUPABASE_URL:'https://provider.invalid',SUPABASE_PUBLIC_KEY:'fixture',calls:[],console:{log(){},warn(){}},getSelectedOrderType:()=>type};
 for(const k of ['recomputeCheckoutTotals','updateCheckoutSubmitButton','updateCheckoutOrderSummary'])f[k]=()=>f.calls.push(k);
 f.fetch=async(url,options)=>{f.calls.push([url,options]);if(failure==='network')throw Error('network');return {ok:failure!=='http',json:async()=>{if(failure==='json')throw Error('json');return {ok:failure!=='provider',routeMiles:route};}};};return f;
}
function old(f){return vm.runInNewContext(e.regions.map(r=>r.before).join('\n')+'\n({'+e.regions.map(r=>r.name).join(',')+'})',f);}
function state(f){return JSON.parse(JSON.stringify({state:f.deliveryQuoteState,global:f.window.deliveryQuoteState,generation:f.deliveryQuoteGeneration,calls:f.calls},(k,v)=>k==='lastUpdated'?0:v));}
test('delivery quotes reconstruct released bootstrap and factory defers side effects',()=>{require('./delivery-quotes-source.cjs').reconstructDeliveryQuotes();const window={};vm.runInNewContext(fs.readFileSync(require.resolve('../customer-delivery-quotes'),'utf8'),{window});create({window:new Proxy({},{get(){throw Error('startup window access');}})});assert.equal(typeof window.RTKDeliveryQuotes.create,'function');});
test('actual delivery quotes match released radius/free/fallback/route branches and request payload',async()=>{
 const cases=[{lat:undefined},{lat:54},{subtotal:30},{subtotal:0},{route:1.5},{route:1.5001},{route:2.5},{route:2.5001},{route:4},{route:4.01},{route:null},{route:'1.25'},...['network','http','json','provider'].map(failure=>({failure})),{type:'collection'}];
 for(const options of cases){const a=fixture(options),b=fixture(options),x=create(a),y=old(b);a.window.refreshDeliveryQuote=x.refreshDeliveryQuote;b.window.refreshDeliveryQuote=y.refreshDeliveryQuote;await x.refreshCheckoutPricingAndRender();await y.refreshCheckoutPricingAndRender();assert.deepEqual(state(a),state(b));assert.deepEqual(a.calls.slice(-3),['recomputeCheckoutTotals','updateCheckoutSubmitButton','updateCheckoutOrderSummary']);}
});
test('actual distance and route band helpers retain boundaries and missing values',()=>{
 const x=create(fixture()),y=old(fixture());for(const value of [null,NaN,0,1.5,1.5001,2.5,2.5001,4,4.0001]){assert.equal(x.roundMiles(value),y.roundMiles(value));assert.equal(x.calculateBandFee(value,[{maxMiles:1.5,fee:2},{maxMiles:2.5,fee:3},{maxMiles:4,fee:4}]),y.calculateBandFee(value,[{maxMiles:1.5,fee:2},{maxMiles:2.5,fee:3},{maxMiles:4,fee:4}]));}assert.equal(x.haversineMiles(53.744437,-1.576570,53.75,-1.57),y.haversineMiles(53.744437,-1.576570,53.75,-1.57));assert.equal(x.haversineMiles(53,-1,53,-1),0);
});
