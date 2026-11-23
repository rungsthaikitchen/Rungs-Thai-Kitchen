const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create}=require('../customer-checkout-customer-data');
const evidence=require('../CHECKOUT-CUSTOMER-DATA-EXTRACTION-2026-11-23.json');
function fixture(responses=[]){
 const calls=[],queue=[...responses],console={error:(...args)=>calls.push(['error',...args])};
 const sb={rpc:async name=>{calls.push(['rpc',name]);return queue.shift();},from:table=>{
  const query=[['from',table]],chain={};
  for(const name of ['select','eq','update','insert'])chain[name]=(...args)=>{query.push([name,...args]);return chain;};
  for(const name of ['single','maybeSingle'])chain[name]=async()=>{query.push([name]);calls.push(query);assert.ok(queue.length,'unexpected query');return queue.shift();};
  return chain;
 }};
 return {window:{sb},console,calls,queue};
}
const ok=data=>({data,error:null}),bad=error=>({data:null,error});
const customer={name:'Example',email:' EXAMPLE@example.com ',phone:' 07000000000 ',address:'Example address'};
function baseline(f){return vm.runInNewContext(evidence.regions.map(r=>r.before).join('\n')+'\n({getNextOrderRef,getOrCreateCustomer})',f);}
function normal(value){return JSON.parse(JSON.stringify(value));}
test('customer data extraction reconstructs released bootstrap',()=>{require('./customer-data-source.cjs').reconstructCustomerData();});
test('registration and creation do not call the database',()=>{
 const blocked=()=>{throw Error('unexpected database access');},window={sb:new Proxy({},{get:blocked})};
 vm.runInNewContext(fs.readFileSync(require.resolve('../customer-checkout-customer-data'),'utf8'),{window});
 assert.equal(typeof window.RTKCheckoutCustomerData.create,'function');create({window,console:{}});
});
test('order references preserve all supported RPC response shapes and errors',async()=>{
 for(const data of [[{assigned:7}],{assigned:1234},42,null,[]]){
  const f=fixture([ok(data)]),g=fixture([ok(data)]);
  assert.equal(await create(f).getNextOrderRef(),await baseline(g).getNextOrderRef());assert.deepEqual(f.calls,g.calls);
 }
 const f=fixture([bad({message:'offline'})]);await assert.rejects(create(f).getNextOrderRef(),e=>e.message==='offline');
 assert.equal(f.calls[1][0],'error');
});
test('customer lookup, insert and collision paths preserve results and exact database requests',async()=>{
 const duplicate={code:'23505',message:'duplicate'},failure={code:'ERROR',message:'failed'};
 const cases=[
  [ok({id:1,phone:null}),ok({id:1})],
  [ok({id:1,phone:'existing'}),ok({id:1})],
  [ok(null),ok({id:2,email:null}),ok({id:2})],
  [ok(null),ok({id:2,email:'existing'}),ok({id:2})],
  [ok(null),ok(null),ok({id:3})],
  [ok(null),ok(null),bad(duplicate),ok({id:4})],
  [ok(null),ok(null),bad(duplicate),ok(null),ok({id:5})],
  [ok(null),ok(null),bad(duplicate),ok(null),ok(null)],
  [bad(failure)], [ok({id:1}),bad(failure)], [ok(null),bad(failure)],
  [ok(null),ok({id:2}),bad(failure)], [ok(null),ok(null),bad(failure)],
  [ok(null),ok(null),bad(duplicate),bad(failure)],
  [ok(null),ok(null),bad(duplicate),ok(null),bad(failure)]
 ];
 for(const responses of cases){
  const f=fixture(responses),g=fixture(responses);
  const result=async api=>{try{return {value:await api.getOrCreateCustomer(customer)};}catch(error){return {error};}};
  assert.deepEqual(normal(await result(create(f))),normal(await result(baseline(g))));
  assert.deepEqual(normal(f.calls),normal(g.calls));assert.equal(f.queue.length,0);
 }
 const f=fixture([ok(null),ok(null),ok({id:3})]);await create(f).getOrCreateCustomer(customer);
 assert.deepEqual(f.calls[0][2],['eq','email','example@example.com']);
 assert.deepEqual(f.calls[2][1],['insert',[{full_name:'Example',email:'example@example.com',phone:'07000000000',address:'Example address'}]]);
});
test('missing contact fields insert nulls, and client replacement remains live',async()=>{
 const f=fixture([ok({id:1})]),api=create(f);
 await api.getOrCreateCustomer({name:'Example'});
 assert.deepEqual(f.calls[0][1],['insert',[{full_name:'Example',email:null,phone:null,address:null}]]);
 const next=fixture([ok({assigned:8})]);f.window.sb=next.window.sb;
 assert.equal(await api.getNextOrderRef(),'RTK-008');assert.equal(next.calls.length,1);
 delete f.window.sb;
 await assert.rejects(api.getNextOrderRef(),/Supabase client not initialised/);
 await assert.rejects(api.getOrCreateCustomer(customer),/Supabase client not initialised/);
});
