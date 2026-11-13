const {test}=require('node:test'),assert=require('node:assert/strict');
const {describeBalance,difference}=require('../master-wok-payments-admin');
test('payment difference uses pennies and does not include a separate tip',()=>{
 assert.equal(describeBalance(difference('23.25','22.95')),'Underpaid £0.30');
 assert.equal(describeBalance(difference('23.25','24.00')),'Overpaid £0.75 (not a tip)');
 assert.equal(describeBalance(difference('23.25','23.25')),'Bill paid in full');
});
