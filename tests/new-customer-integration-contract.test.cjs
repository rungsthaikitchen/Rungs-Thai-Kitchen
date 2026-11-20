const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const history=fs.readFileSync(path.join(root,'sql/new-customer-history.sql'),'utf8');
const audit=fs.readFileSync(path.join(root,'sql/new-customer-contact-audit.sql'),'utf8');
const admin=fs.readFileSync(path.join(root,'new-customer-history-admin.js'),'utf8');
const page=fs.readFileSync(path.join(root,'admin.html'),'utf8');

test('test orders never get a definite new classification',()=>{
 assert.match(history,/WHEN t\.is_test IS TRUE THEN 'possibly_new'/);
});
test('earlier shared contact can be uncertain without completed status',()=>{
 const section=history.split('JOIN public.customers pc ON pc.id=p.customer_id')[1];
 assert.ok(section,'prior contact matching exists');
 assert.doesNotMatch(section.split(') THEN \'possibly_new\'')[0],/p\.status='completed'/);
});
test('historical lookup excludes explicit test orders and uses order creation time',()=>{
 assert.match(history,/p\.is_test IS DISTINCT FROM TRUE/);
 assert.match(history,/p\.created_at<t\.created_at/);
});
test('contact audit is append-only for the service role',()=>{
 assert.match(audit,/GRANT SELECT,INSERT ON public\.staff_customer_contact_audit TO service_role/);
 assert.doesNotMatch(audit,/GRANT [^;]*UPDATE[^;]* ON public\.staff_customer_contact_audit/);
 assert.match(audit,/ENABLE ROW LEVEL SECURITY/);
});
test('contact is optional and never modifies cooking or booking',()=>{
 assert.match(admin,/\/admin-api\/new-customer-contact/);
 assert.match(admin,/Contact recommended/);
 assert.doesNotMatch(admin,/master.wok|booking|order.confirm|order.accept/i);
});
test('admin loads new feature alongside existing review warnings',()=>{
 assert.match(page,/customer-review-flags-admin\.js/);
 assert.match(page,/new-customer-verification\.js/);
 assert.match(page,/new-customer-history-admin\.js/);
});

test('Admin rejects missing and duplicate history rows before rendering',()=>{
 assert.match(admin,/data\.classifications\.length!==new Set\(ids\)\.size/);
 assert.match(admin,/new Set\(data\.classifications\.map\(x=>x\.order_id\)\)\.size!==new Set\(ids\)\.size/);
});
test('Admin rejects duplicate contact rows',()=>{
 assert.match(admin,/new Set\(data\.contacts\.map\(x=>x\.order_id\)\)\.size!==data\.contacts\.length/);
});

test('failed contact update restores last confirmed saved status',()=>{
 assert.match(admin,/let confirmedStatus=result\?\.contact\?\.status\|\|''/);
 assert.match(admin,/confirmedStatus=selected/);
 assert.match(admin,/catch\(_\)\{select\.value=confirmedStatus/);
});

test('contact RPC explicitly rejects null statuses',()=>{
 assert.match(audit,/IF new_status IS NULL OR new_status NOT IN/);
});

test('completed earlier same-customer order is classified returning',()=>{
 assert.match(history,/p\.status='completed' AND p\.is_test IS DISTINCT FROM TRUE/);
 assert.match(history,/\) THEN 'returning'/);
});
test('uncertain earlier order carries an explicit explanation',()=>{
 assert.match(history,/THEN 'previous_order_not_confirmed'/);
 assert.match(history,/ELSE 'shared_contact'/);
 assert.match(admin,/x\.classification==='possibly_new'/);
 assert.match(admin,/x\.reason/);
});
