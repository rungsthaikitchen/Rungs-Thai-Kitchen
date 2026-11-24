import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
test('LEGACY Admin payment integration is explicitly gated off by default',()=>{
 assert.match(html,/window\.RTK_LEGACY_PAYMENT_ADMIN_UI_ENABLED === true/);
 assert.doesNotMatch(html,/RTK_LEGACY_PAYMENT_ADMIN_UI_ENABLED\s*=\s*true/);
});
test('only LEGACY unpaid order rows can mount payment UI',()=>{
 assert.match(html,/o\.capacity_scheduler === 'LEGACY' && !o\.paid/);
 assert.match(html,/import\('\/legacy-payment-admin-mount\.mjs'\)/);
 assert.match(html,/mountLegacyPaymentControl/);
});
