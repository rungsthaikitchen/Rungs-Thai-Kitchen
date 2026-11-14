const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=require('./customer-source.cjs')(__dirname+'/../index.html');
const helpers=source.slice(source.indexOf('function basketReviewDateMessage('),source.indexOf('function showUnavailableBasketDialog('));
const context={Intl,Date,OPEN_WINDOW:{end:'21:00'}};vm.runInNewContext(helpers,context);
test('basket review uses the London ordering cutoff in winter and summer',()=>{
 for(const [date,before,at,after] of [
 ['2026-11-13','2026-11-13T20:59:59Z','2026-11-13T21:00:00Z','2026-11-13T22:11:00Z'],
 ['2026-07-18','2026-07-18T19:59:59Z','2026-07-18T20:00:00Z','2026-07-18T21:11:00Z']]){
  assert.equal(context.basketReviewDateMessage(date,new Date(before)),'');
  for(const instant of [at,after])assert.match(context.basketReviewDateMessage(date,new Date(instant)),/finished for today/);
 }
});
test('future requests remain eligible after closing while previous dates are blocked',()=>{
 const now=new Date('2026-11-13T22:11:00Z');
 assert.equal(context.basketReviewDateMessage('2026-11-14',now),'');
 assert.match(context.basketReviewDateMessage('2026-11-12',now),/date has passed/);
});
test('expired service stops before requesting availability or offering a review',async()=>{
 const populate=source.slice(source.indexOf('async function populatePreferredTimeSelect('),source.indexOf('async function refreshPreferredTimes()'));
 let stopped=0,requested=0;
 const ctx={availabilityContextKey:()=>'',preferredTimeGeneration:0,masterWokTimeHints:null,preferredTimeSelect:{},preferredTimeHidden:{},stopExpiredBasketReview:()=>{stopped++;return true;},window:{RTKBookingClient:{availability:()=>{requested++;}}}};
 vm.runInNewContext(populate,ctx);await ctx.populatePreferredTimeSelect('2026-11-13');assert.equal(stopped,1);assert.equal(requested,0);
});
