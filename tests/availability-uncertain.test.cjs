const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../customer-checkout-availability.js'),'utf8');
const populate=source.slice(source.indexOf('async function populatePreferredTimeSelect('),source.indexOf('async function refreshPreferredTimes()'));
for(const uncertain of [true,false])test('zero verified slots '+(uncertain?'stay in checkout for retry':'offer a genuine basket review'),async()=>{
 let opened=0,message='';const select={options:[],appendChild(option){this.options.push(option);},set innerHTML(_){this.options=[];}};
 const ctx={preferredTimeGeneration:0,availabilityContextKey:()=>'',preferredTimeSelect:select,preferredTimeHidden:{value:''},stopExpiredBasketReview:()=>false,document:{querySelector:()=>({value:'collection'}),getElementById:()=>null,createElement:()=>({})},setAvailabilityLoading(){},clearPreferredTimeSelect(){},showPreferredTimeMessage:s=>message=s,hidePreferredTimeMessage(){},OPEN_WINDOW:{start:'17:00',end:'17:05'},KITCHEN_OVERRUN_MINUTES:0,LEAD_MINUTES:0,roundTo5Min:x=>x,toYMD:()=> '2026-11-14',OPEN_DAYS:[6],basket:[],getSelectedOrderType:()=> 'collection',isAllowed:()=>false,isClosedDate:()=>false,isFullyBooked:()=>false,formatTimeHHMM:d=>d.toISOString().slice(11,16),showUnavailableBasketDialog(){opened++;},console:{log(){}},window:{RTKBookingClient:{availability:async({times})=>({route:'MASTER_WOK',hints:times.map(time=>({time,available:false,unverified:uncertain}))})}}};ctx.context=ctx;
 vm.runInNewContext(populate,ctx);await ctx.populatePreferredTimeSelect('2026-11-14');
 assert.equal(opened,uncertain?0:1);if(uncertain)assert.match(message,/refresh times/);
 assert.equal(select.options.filter(o=>o.value&&!o.disabled).length,0);
});
