const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildReport,ukDate,receiptHTML}=require('./master-wok-reconciliation');
const date='2026-11-12';
const order=(id,extra={})=>({id,order_ref:'RTK-'+id,status:'completed',total:'10.00',preferred_time:date+'T18:00:00Z',is_test:false,...extra});
const payment=(id,bill='cash',tip='0.00',tipMethod=null)=>({order_id:id,paid:true,payment:{bill_amount:'10.00',bill_method:bill,tip_amount:tip,tip_method:tipMethod}});
const report=(orders,payments,extra={})=>buildReport({date,orders,payments,generatedAt:date+'T22:00:00Z',...extra});
test('cash bills and card tips stay separate with integer penny arithmetic',()=>{
 const r=report([order('a'),order('b')],[payment('a','cash','1.50','card'),payment('b','card','2.30','cash')],{countedCash:'12.00'});
 assert.equal(r.completedSales,2000);assert.equal(r.methods.cash.bills,1000);assert.equal(r.methods.cash.tips,230);assert.equal(r.methods.card.total,1150);assert.equal(r.received,2380);assert.equal(r.cashDifference,-30);
});
test('confirmed date wins and unaccepted proposed time does not move service date',()=>{
 const r=report([order('a',{confirmed_time:'2026-11-13T18:00:00Z'}),order('b',{proposed_time:'2026-11-13T18:00:00Z'})],[payment('b')]);assert.equal(r.orders,1);
});
test('test orders excluded, cancelled payments still included and flagged',()=>{
 const r=report([order('test',{is_test:true}),order('cancel',{status:'cancelled'}),order('decline',{status:'declined'})],[payment('cancel'),{order_id:'decline',paid:false,payment:null}]);
 assert.equal(r.orders,2);assert.equal(r.completedSales,0);assert.equal(r.recordedBills,1000);assert.equal(r.exceptions.length,1);
});
test('unpaid and old paid-without-method orders remain explicit exceptions',()=>{
 const r=report([order('a'),order('b')],[{order_id:'a',paid:false,payment:null},{order_id:'b',paid:true,payment:null}]);assert.equal(r.exceptions.length,2);assert.equal(r.received,0);assert.match(r.exceptions[1].message,/method not recorded/);
});
test('partial, duplicate and malformed payment data cannot become a receipt',()=>{
 assert.throws(()=>report([order('a')],[]),/Incomplete/);
 assert.throws(()=>report([order('a')],[payment('a'),payment('a')]),/Duplicate/);
 assert.throws(()=>report([order('a'),order('a')],[payment('a')]),/Duplicate/);
 assert.throws(()=>report([order('a')],[payment('a','unknown')]),/Unknown/);
 const p=payment('a');p.payment.bill_amount='1.001';assert.throws(()=>report([order('a')],[p]),/Invalid money/);
});
test('UK dates handle summer midnight and DST change',()=>{
 assert.equal(ukDate('2026-07-10T23:30:00Z'),'2026-07-11');assert.equal(ukDate('2026-10-25T00:30:00Z'),'2026-10-25');assert.equal(ukDate('2026-10-25T23:30:00Z'),'2026-10-25');
});
test('empty service prints zero totals and no invented cash count',()=>{
 const r=report([],[]);assert.equal(r.received,0);assert.equal(r.cashDifference,null);assert.match(receiptHTML(r),/Counted cash: not entered/);
});
test('customer-supplied references are escaped in print markup',()=>{
 const r=report([order('a',{order_ref:'<img src=x onerror=alert(1)>'})],[{order_id:'a',paid:false,payment:null}]);const html=receiptHTML(r);assert.ok(!html.includes('<img'));assert.match(html,/&lt;img/);
});
test('bank transfer and unpaid pending orders do not inflate cash or completed sales',()=>{
 const r=report([order('a'),order('b',{status:'pending'})],[payment('a','bank_transfer','1.00','bank_transfer'),{order_id:'b',paid:false,payment:null}]);assert.equal(r.methods.bank_transfer.total,1100);assert.equal(r.expectedCash,0);assert.equal(r.completedSales,1000);assert.equal(r.exceptions.length,1);
});
