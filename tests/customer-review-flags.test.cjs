const {test}=require('node:test'),assert=require('node:assert/strict');
const {describe}=require('../customer-review-flags-admin');
const flag={sourceOrderRef:'SYNTHETIC-1',matchTypes:['phone','email'],possibleMatch:false,reason:'No-show; food prepared, unpaid; phone unobtainable; email bounced.'};
test('contact matches produce a staff review warning with incident facts',()=>{const r=describe([flag]);assert.equal(r.possible,false);assert.match(r.heading,/review required/);assert.match(r.detail,/phone, email/);assert.match(r.detail,/food prepared, unpaid/);assert.match(r.instruction,/Confirm working contact/);});
test('name-only matches are explicitly tentative rather than an automatic block',()=>{const r=describe([{...flag,matchTypes:['name'],possibleMatch:true}]);assert.equal(r.possible,true);assert.match(r.heading,/Possible name match/);assert.match(r.instruction,/does not identify the same person/);});
test('empty lookups do not warn and a strong match takes priority over a name match',()=>{assert.equal(describe([]),null);assert.equal(describe(null),null);assert.equal(describe([{...flag,possibleMatch:true,matchTypes:['name']},flag]).possible,false);});
