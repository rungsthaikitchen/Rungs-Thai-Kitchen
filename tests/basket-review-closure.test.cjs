const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {londonTime}=require('../master-wok-basket-review-client');
const source=require('./checkout-refactor-source.cjs').reconstruct();
const helpers=source.slice(source.indexOf('function basketReviewClosureMessage('),source.indexOf('function stopExpiredBasketReview('));
function fixture(ranges=[]){
 const context={window:{RTKBasketReview:{londonTime}},Intl,Date,OPEN_WINDOW:{start:'17:00',end:'21:00'},KITCHEN_OVERRUN_MINUTES:60,CLOSED_RANGES:ranges,CLOSED_DATES:[]};
 vm.runInNewContext(helpers,context);return context;
}
test('full explicit closure blocks the arrange-order invitation for that date',()=>{
 const c=fixture([{start:new Date('2026-11-18T16:30:00Z'),end:new Date('2026-11-18T22:30:00Z')}]);
 assert.match(c.basketReviewDateMessage('2026-11-18',new Date('2026-11-18T19:05:55Z')),/closed on this date/);
 assert.equal(c.basketReviewClosureMessage('2026-11-19'),'');
});
test('partial closure blocks its times while permitting other times, with exclusive end',()=>{
 const c=fixture([{start:'2026-11-19T17:00:00Z',end:'2026-11-19T19:00:00Z'}]);
 assert.equal(c.basketReviewClosureMessage('2026-11-19'),'');
 assert.match(c.basketReviewClosureMessage('2026-11-19','17:00'),/closed at that time/);
 assert.match(c.basketReviewClosureMessage('2026-11-19','18:55'),/closed at that time/);
 assert.equal(c.basketReviewClosureMessage('2026-11-19','19:00'),'');
});
test('adjacent closure windows and UK summer time are handled without browser timezone assumptions',()=>{
 const c=fixture([{start:'2027-07-10T15:30:00Z',end:'2027-07-10T18:00:00Z'},{start:'2027-07-10T18:00:00Z',end:'2027-07-10T21:30:00Z'}]);
 assert.match(c.basketReviewClosureMessage('2027-07-10'),/closed on this date/);
});
test('fully booked periods do not act as business closures and static closed dates remain closed',()=>{
 const c=fixture();c.FULLY_BOOKED=[{start:'2026-11-19T17:00:00Z',end:'2026-11-19T22:30:00Z'}];
 assert.equal(c.basketReviewClosureMessage('2026-11-19'),'');
 c.CLOSED_DATES=['2026-12-25'];assert.match(c.basketReviewClosureMessage('2026-12-25'),/closed on this date/);
});
