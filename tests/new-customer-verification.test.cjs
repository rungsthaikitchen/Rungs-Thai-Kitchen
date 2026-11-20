const {test}=require('node:test');
const assert=require('node:assert/strict');
const {describe,contactLabel}=require('../new-customer-verification');
test('new customers receive advisory contact suggestion',()=>{
 const r=describe({classification:'new'});assert.equal(r.heading,'NEW CUSTOMER');assert.match(r.instruction,/contact before cooking/i);
});
test('uncertain history is never presented as definite new',()=>{
 const r=describe({classification:'possibly_new'});assert.equal(r.heading,'POSSIBLY NEW');
});
test('returning customers do not receive a new-customer suggestion',()=>{
 const r=describe({classification:'returning'});assert.equal(r.kind,'returning');assert.equal(r.instruction,'');
});
test('missing and malformed lookups fail closed without implying first order',()=>{
 for(const value of [null,undefined,{},[],{classification:'NEW'},{classification:'error'}]){
  assert.equal(describe(value).kind,'unavailable');
 }
});
test('contact statuses have safe defaults',()=>{
 assert.equal(contactLabel('contacted'),'Contacted');
 assert.equal(contactLabel('unreachable'),'Unable to reach');
 assert.equal(contactLabel('not_required'),'Not required');
 assert.equal(contactLabel('garbage'),'Contact recommended');
});

test('possibly new reasons explain uncertainty without asserting non-delivery',()=>{
 const cases={
  previous_order_not_confirmed:/completion not confirmed/i,
  shared_contact:/shared contact details/i,
  insufficient_identity:/not enough contact details/i,
  test_order:/test order/i
 };
 for(const [reason,expected] of Object.entries(cases)){
  const result=describe({classification:'possibly_new',reason});
  assert.equal(result.heading,'POSSIBLY NEW');
  assert.match(result.instruction,expected);
 }
});
