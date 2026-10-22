'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePayment, pennies } = require('./payment-validation');
const key = '3f97db2a-c6a5-4e9d-b5ab-a3b9f28c63af';
const base = { billMethod: 'card', billAmount: '32.00', tipAmount: '0.00', tipMethod: null, idempotencyKey: key };
test('card bill with no tip', () => {
  assert.deepEqual(validatePayment(base, '32.00'), base);
});
test('card bill with separate cash tip', () => {
  const r = validatePayment({ ...base, tipAmount: '3.00', tipMethod: 'cash' }, '32.00');
  assert.equal(r.tipAmount, '3.00'); assert.equal(r.tipMethod, 'cash'); assert.equal(r.billAmount, '32.00');
});
test('discounted final order total is authoritative', () => {
  assert.equal(validatePayment({ ...base, billAmount: '14.70', billMethod: 'cash' }, '14.70').billAmount, '14.70');
});
test('positive tip without method rejected', () => {
  assert.throws(() => validatePayment({ ...base, tipAmount: '3.00' }, '32.00'), /Tip method required/);
});
test('negative tip and excess decimals rejected', () => {
  for (const amount of ['-1.00', '0.001', 'NaN', '1e3', ' 1.00']) {
    assert.throws(() => validatePayment({ ...base, tipAmount: amount }, '32.00'));
  }
});
test('bill mismatch rejected', () => {
  assert.throws(() => validatePayment({ ...base, billAmount: '31.00' }, '32.00'), /does not match/);
});
test('method on zero tip rejected', () => {
  assert.throws(() => validatePayment({ ...base, tipMethod: 'cash' }, '32.00'), /must be empty/);
});
test('invalid bill or tip method rejected', () => {
  assert.throws(() => validatePayment({ ...base, billMethod: 'cheque' }, '32.00'), /Invalid bill/);
  assert.throws(() => validatePayment({ ...base, tipAmount: '1.00', tipMethod: 'cheque' }, '32.00'), /Tip method/);
});
test('missing idempotency key rejected', () => {
  assert.throws(() => validatePayment({ ...base, idempotencyKey: '' }, '32.00'), /idempotency/);
});
test('exact integer pennies without float rounding', () => {
  assert.equal(pennies('0.10'), 10); assert.equal(pennies('0.20'), 20); assert.equal(pennies('0.30'), 30);
});
test('non-string money rejected', () => {
  assert.throws(() => validatePayment({ ...base, billAmount: 32 }, '32.00'), /decimal string/);
});
