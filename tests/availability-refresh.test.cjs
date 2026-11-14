const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=require('./customer-source.cjs')(process.env.CHECKOUT_INDEX||path.join(__dirname,'../index.html'));
const {create:createDialog}=require('../customer-checkout-dialog');
for(const initialMode of ['delivery','collection',null])test('reopening checkout retains '+(initialMode||'the initial collection default')+' and refreshes matching times',async()=>{
 let mode=initialMode;const requests=[];
 const radio={set checked(value){if(value)mode='collection';}};
 const context={checkoutOpening:false,setCheckoutOpening(){},availabilityBasketKey:()=>'',console:{trace(){},warn(){}},document:{getElementById:()=>({value:''}),querySelectorAll:()=>[],querySelector:selector=>selector.includes(':checked')?(mode?{value:mode}:null):radio},window:{},loadServiceState:async()=>{},SERVICE_STATE:{mode:'normal'},loadBlackouts:async()=>{},preferredDateInput:{value:'2026-11-12'},preferredTimeSelect:{value:'',options:[]},preferredTimeHidden:{value:''},populatePreferredTimeSelect:async()=>requests.push(mode),hidePreferredTimeMessage(){},showPreferredTimeMessage(){},recomputeCheckoutTotals(){},updateCheckoutSubmitButton(){},updateCheckoutOrderSummary(){},checkoutMsg:{style:{}},checkoutModal:{style:{}},lastPreferredDate:null,checkoutBaseSubtotal:0};
 const dialog=createDialog(context);await dialog.open(22.50);await dialog.open(22.50);
 const expected=initialMode||'collection';assert.deepEqual(requests,[expected,expected]);assert.equal(mode,expected);assert.equal(context.checkoutModal.style.display,'flex');
});
const refreshSource=html.slice(html.indexOf('async function refreshPreferredTimes()'),html.indexOf("document.getElementById('refresh-preferred-times')?.addEventListener"));
test('refresh keeps a still-available time, but never restores a disabled time',async()=>{
 const context={checkoutOpening:false,setCheckoutOpening(){},preferredDateInput:{value:'2026-11-12'},preferredTimeGeneration:0,preferredTimeSelect:{value:'20:00',options:[],dispatchEvent(){this.changed=true;}},Event:class{},showPreferredTimeMessage(message){this.message=message;}};
 context.populatePreferredTimeSelect=async()=>{context.preferredTimeGeneration++;context.preferredTimeSelect.value='';context.preferredTimeSelect.options=[{value:'20:00',disabled:false}];};
 context.context=context;vm.runInNewContext(refreshSource,context);await context.refreshPreferredTimes();assert.equal(context.preferredTimeSelect.value,'20:00');
 context.preferredTimeSelect.options=[];context.populatePreferredTimeSelect=async()=>{context.preferredTimeGeneration++;context.preferredTimeSelect.value='';context.preferredTimeSelect.options=[{value:'20:00',disabled:true}];};
 await context.refreshPreferredTimes();assert.equal(context.preferredTimeSelect.value,'');
});
test('availability transport bypasses browser cache without authorising a booking',async()=>{
 const {createClient}=require('../master-wok-checkout-client');
 const calls=[],time='2026-11-12T20:00:00.000Z';
 const client=createClient({fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.includes('booking-mode')?{mode:'MASTER_WOK'}:{success:true,bookingApprovalAllowed:false,hints:[{time,available:true}]}};},storage:{},crypto:{},hostname:'rungsthaikitchen.co.uk'});
 const result=await client.availability({times:[time],orderType:'collection',items:[]});assert.equal(result.hints[0].available,true);
 assert.ok(calls.every(c=>c.options.cache==='no-store'));assert.ok(calls.every(c=>c.url!=='/api/booking'));
});
