const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create}=require('../customer-checkout-display'),evidence=require('../CHECKOUT-DISPLAY-EXTRACTION-2026-11-24.json');
function fixture(orderType='collection',quote={},tagName='BUTTON',missing=[]){
 const nodes=Object.fromEntries(['checkout-order-summary','cust-address','addr-required-hint','preferred-time-message'].filter(id=>!missing.includes(id)).map(id=>[id,{innerHTML:'',textContent:'',value:'',required:false,style:{}}]));
 const button=missing.includes('submit')?null:{tagName,value:'',textContent:'',title:'',disabled:false,style:{}};
 const f={window:{deliveryQuoteState:quote},deliveryQuoteState:{},button,nodes,orderType};
 f.checkoutForm={querySelector:()=>f.button};
 f.document={getElementById:id=>nodes[id]||null,querySelector:()=>f.orderType?{value:f.orderType}:null};return f;
}
const plain=x=>JSON.parse(JSON.stringify(x));
function state(f){return plain({nodes:f.nodes,button:f.button});}
function baseline(f){return vm.runInNewContext(evidence.regions.map(r=>r.before).join('\n')+'\n({'+evidence.regions.map(r=>r.name).join(',')+'})',f);}
test('display extraction reconstructs released bootstrap',()=>{require('./display-source.cjs').reconstructDisplay();});
test('display registration and creation perform no DOM work',()=>{
 const blocked=()=>{throw Error('unexpected DOM access');},window={},document=new Proxy({},{get:blocked});
 vm.runInNewContext(fs.readFileSync(require.resolve('../customer-checkout-display'),'utf8'),{window,document});create({window,document});
 assert.equal(typeof window.RTKCheckoutDisplay.create,'function');
});
test('actual display module preserves summaries, address requirements and submit states',()=>{
 for(const type of ['collection','delivery',null])for(const quote of [{},{loading:true},{eligible:false},{eligible:true},{loading:true,eligible:false}])for(const tag of ['BUTTON','INPUT'])for(const address of ['', 'Example address']){
  const f=fixture(type,quote,tag),g=fixture(type,quote,tag);f.nodes['cust-address'].value=g.nodes['cust-address'].value=address;
  const actual=create(f),old=baseline(g);
  for(const name of ['updateCheckoutOrderSummary','updateAddressRequirement','updateCheckoutSubmitButton']){actual[name]();old[name]();}
  assert.deepEqual(state(f),state(g));
  assert.equal(f.nodes['cust-address'].required,type==='delivery');
  assert.equal(f.button.disabled,type==='delivery'&&!!(quote.loading||quote.eligible===false));
 }
});
test('live quote replacement updates the label and clears disabled styling and title',()=>{
 const f=fixture('delivery',{eligible:false}),api=create(f);api.updateCheckoutSubmitButton();
 assert.equal(f.button.textContent,'Outside delivery area');assert.ok(f.button.title);
 f.window.deliveryQuoteState={loading:true};api.updateCheckoutSubmitButton();assert.equal(f.button.textContent,'Checking delivery…');
 f.window.deliveryQuoteState={eligible:true};api.updateCheckoutSubmitButton();
 assert.equal(f.button.textContent,'Place Delivery Order');assert.equal(f.button.disabled,false);assert.equal(f.button.title,'');assert.equal(f.button.style.opacity,'1');
 delete f.window.deliveryQuoteState;f.deliveryQuoteState={eligible:false};api.updateCheckoutSubmitButton();assert.equal(f.button.disabled,true);
 f.orderType='collection';api.updateCheckoutSubmitButton();assert.equal(f.button.disabled,false);assert.equal(f.button.textContent,'Place Collection Order');
});
test('time messages show, replace and clear; missing optional elements remain harmless',()=>{
 const f=fixture(),api=create(f);api.showPreferredTimeMessage('Checking times…');
 assert.equal(f.nodes['preferred-time-message'].textContent,'Checking times…');assert.equal(f.nodes['preferred-time-message'].style.display,'block');
 api.showPreferredTimeMessage('Please retry');api.hidePreferredTimeMessage();assert.equal(f.nodes['preferred-time-message'].textContent,'');assert.equal(f.nodes['preferred-time-message'].style.display,'none');
 const empty=create(fixture('delivery',{},'BUTTON',['checkout-order-summary','cust-address','addr-required-hint','preferred-time-message','submit']));
 for(const fn of Object.values(empty))assert.doesNotThrow(()=>fn('message'));
});
