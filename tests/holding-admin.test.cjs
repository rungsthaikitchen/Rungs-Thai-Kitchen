const test=require('node:test'),assert=require('node:assert/strict');
const {summary,needsReview,dishes}=require('../master-wok-holding-admin');
test('extended kitchen waiting shows its estimate and each affected dish for staff review',()=>{
 const row={warnings:[{estimatedMinutes:29,dishes:[{itemId:'pad-thai',name:'Pad Thai',minutes:29},{itemId:'green-curry',name:'Green Curry',minutes:24}]}]};
 assert.equal(summary(row),'Extended holding: 29 min');assert.equal(needsReview(row),true);assert.deepEqual(dishes(row),['Pad Thai — 29 min before collection/dispatch','Green Curry — 24 min before collection/dispatch']);
 row.warnings[0].acknowledgement={staffActor:'staff@example.invalid'};assert.equal(needsReview(row),false);assert.equal(summary(row),'Extended holding: 29 min');
});
test('ordinary rows have no warning and missing names remain readable',()=>{
 assert.equal(summary({warnings:[]}),'');assert.equal(needsReview({warnings:[]}),false);
 assert.deepEqual(dishes({warnings:[{dishes:[{itemId:'salt-chips',minutes:25}]}]}),['salt chips — 25 min before collection/dispatch']);
});
