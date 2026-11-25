import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
test('LEGACY Admin payment integration is explicitly gated off by default',()=>{
 assert.match(html,/window\.RTK_LEGACY_PAYMENT_ADMIN_UI_ENABLED === true/);
 assert.doesNotMatch(html,/RTK_LEGACY_PAYMENT_ADMIN_UI_ENABLED\s*=\s*true/);
});
test('only LEGACY unpaid order rows can mount payment UI',()=>{
 assert.match(html,/o\.capacity_scheduler === 'LEGACY'/);
 assert.match(html,/if \(actions && !o\.paid\)/);
 assert.match(html,/src="\/admin-api\/legacy-payment-ui-config"/);
 assert.match(html,/import\('\/legacy-payment-admin-mount\.mjs'\)/);
 assert.match(html,/mountLegacyPaymentControl/);
});

test('legacy audited mode hides and blocks the old Mark paid shortcut',()=>{
 assert.match(html,/oldMarkPaid\.hidden = true/);
 assert.match(html,/oldMarkPaid\.disabled = true/);
 assert.match(html,/tr\.dataset\.capacityScheduler = o\.capacity_scheduler/);
 assert.match(html,/btn\.closest\('tr'\)\?\.dataset\.capacityScheduler === 'LEGACY'/);
 assert.match(html,/Use Record LEGACY payment for an audited payment record/);
});

test('Admin payment success refreshes using the real loadAndRender function',()=>{
 assert.match(html,/async function loadAndRender\s*\(/);
 assert.match(html,/onRecorded:\s*\(\)\s*=>\s*loadAndRender\(\)/);
 assert.doesNotMatch(html,/loadAndx\s*\(/);
});

test('production UI requires both Pages flags and stays off on preview hosts', async () => {
 const source = readFileSync(new URL('../functions/admin-api/legacy-payment-ui-config.js', import.meta.url));
 const {onRequestGet} = await import('data:text/javascript;base64,' + source.toString('base64'));
 const production = {url:'https://rungsthaikitchen.co.uk/admin-api/legacy-payment-ui-config'};
 const preview = {url:'https://preview.pages.dev/admin-api/legacy-payment-ui-config'};
 const flags = {LEGACY_PAYMENT_PREFLIGHT:'enabled', LEGACY_PAYMENT_RECORDING:'enabled'};
 for (const [request, env, enabled] of [
  [production, {}, false],
  [production, {LEGACY_PAYMENT_PREFLIGHT:'enabled'}, false],
  [production, {LEGACY_PAYMENT_RECORDING:'enabled'}, false],
  [preview, flags, false],
  [production, flags, true]
 ]) {
  const response = onRequestGet({env, request});
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(await response.text(), `window.RTK_LEGACY_PAYMENT_ADMIN_UI_ENABLED = ${enabled};`);
 }
});
