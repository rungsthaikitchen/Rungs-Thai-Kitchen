const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../customer-checkout-availability');
const {reconstruct}=require('./checkout-refactor-source.cjs');
test('availability and submission reconstruct the preceding draft exactly',()=>{
 assert.ok(reconstruct().includes('const checkoutDialog = window.RTKCheckoutDialog.create('));
});
function fixture(){
 const windowEvents={},documentEvents={},requests=[],loading=[],messages=[],fields=new Map();let type='collection',cancels=0,controller;
 const node=(value='')=>({value,style:{},dataset:{},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},dispatchEvent(event){this.listeners[event.type]?.(event);}});
 const date=node('2026-11-20'),select=node(),hidden=node(),address=node('Synthetic fixture address');let options=[];
 Object.defineProperty(select,'options',{get:()=>options});Object.defineProperty(select,'innerHTML',{set:()=>{options=[];}});
 select.appendChild=option=>options.push(option);
 for(const [id,value] of [['cust-preferred-date',date],['cust-preferred-time-select',select],['cust-preferred-time',hidden],['cust-address',address],['refresh-preferred-times',node()]])fields.set(id,value);
 const basket=[{itemId:'stir-pepper',qty:1,mods:[{id:'chicken'}],spice:1,unitPrice:8.5}];
 const window={basket,isLateDeliverySlot:()=>false,addEventListener:(name,fn)=>windowEvents[name]=fn,RTKBookingClient:{cancelAvailability:()=>cancels++,availability:payload=>new Promise((resolve,reject)=>requests.push({payload,resolve,reject}))}};
 const context={window,document:{getElementById:id=>fields.get(id)||null,querySelector:()=>({value:type}),createElement:tag=>({tagName:tag.toUpperCase(),value:'',disabled:false}),addEventListener:(name,fn)=>documentEvents[name]=fn},console:{log(){},warn(){}},Event,
  KITCHEN_OVERRUN_MINUTES:60,LEAD_MINUTES:15,OPEN_DAYS:[3,4,5,6],OPEN_WINDOW:{start:'17:00',end:'21:00'},CLOSED_DATES:[],CLOSED_RANGES:[],basket,
  checkoutModal:{style:{display:'none'}},getBasketKitchenLoad:()=>1,getSelectedOrderType:()=>type,
  hidePreferredTimeMessage(){},showPreferredTimeMessage:text=>messages.push(text),setAvailabilityLoading:value=>loading.push(value),showBlackoutBannerForDate(){},
  toYMD:date=>date.toISOString().slice(0,10),roundTo5Min:date=>date,isAllowed:date=>controller.hints?.get(date.toISOString())===true,isAllowedForAlternativeFulfilment:()=>false,isClosedDate:()=>false,isFullyBooked:()=>false,refreshKitchenSlotMap:async()=>{throw Error('Legacy assessment must not run');}};
 controller=create(context);
 const reply=request=>({route:'MASTER_WOK',bookingApprovalAllowed:false,hints:request.payload.times.map(time=>({time,available:true}))});
 return {controller,context,requests,loading,messages,windowEvents,date,select,hidden,address,reply,setType:value=>type=value,get cancels(){return cancels;}};
}
test('current basket/date/type/address are sent to the read-only hint client and selection updates the hidden time',async()=>{
 const f=fixture();f.setType('delivery');const pending=f.controller.populatePreferredTimeSelect('2026-11-20');
 assert.equal(f.requests.length,1);const request=f.requests[0];assert.equal(request.payload.orderType,'delivery');assert.equal(request.payload.address,'Synthetic fixture address');
 assert.deepEqual(request.payload.items,[{item_id:'stir-pepper',qty:1,modifiers:[{id:'chicken'}],spice:1,item_note:null}]);
 request.resolve(f.reply(request));await pending;
 assert.equal(f.select.options.filter(o=>o.value&&!o.disabled).length,49);
 f.select.value='18:30';f.select.dispatchEvent(new Event('change'));assert.equal(f.hidden.value,'2026-11-20T18:30');assert.deepEqual(f.loading,[true,false]);
});
test('a late response cannot replace hints from a newer address assessment',async()=>{
 const f=fixture();f.setType('delivery');const first=f.controller.populatePreferredTimeSelect('2026-11-20');
 f.address.value='Second synthetic fixture';const second=f.controller.populatePreferredTimeSelect('2026-11-20');
 f.requests[1].resolve(f.reply(f.requests[1]));await second;const options=f.select.options.map(o=>o.textContent);
 f.requests[0].resolve({route:'MASTER_WOK',hints:[]});await first;
 assert.deepEqual(f.select.options.map(o=>o.textContent),options);assert.equal(f.controller.hints.size,49);assert.deepEqual(f.loading,[true,true,false]);
});
test('basket events invalidate controller-owned hints and cancel the old request without a hidden rescan',()=>{
 const f=fixture();f.controller.hints=new Map([['fixture',true]]);f.windowEvents['rtk:basket-changed']();assert.equal(f.cancels,0);
 f.context.window.basket[0].qty=2;f.windowEvents['rtk:basket-changed']();
 assert.equal(f.cancels,1);assert.equal(f.controller.hints,null);assert.equal(f.controller.generation,1);assert.equal(f.requests.length,0);
});
test('missing delivery address prevents a scan and retains the basket',async()=>{
 const f=fixture();f.setType('delivery');f.address.value='';await f.controller.populatePreferredTimeSelect('2026-11-20');
 assert.equal(f.requests.length,0);assert.match(f.messages.at(-1),/Enter your delivery address/);assert.equal(f.context.window.basket.length,1);
});
