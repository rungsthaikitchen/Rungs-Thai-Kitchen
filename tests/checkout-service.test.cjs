const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const evidence=require('../CHECKOUT-SERVICE-EXTRACTION-2026-11-24.json');
const moduleSource=fs.readFileSync(require.resolve('../customer-checkout-service'),'utf8');
class FixedDate extends Date{constructor(...args){super(...(args.length?args:['2026-11-24T12:00:00Z']));}}
function fixture(){
 const calls=[],banner={style:{},innerHTML:'',textContent:'',className:''};
 const notice={hidden:false,innerHTML:'',children:[],appendChild(node){this.children.push(node);}};
 const f={Date:FixedDate,serviceStatusNotice:notice,SERVICE_STATE:{mode:'normal'},CLOSED_RANGES:[],FULLY_BOOKED:[],calls,banner};
 f.console={warn:(...args)=>calls.push(['warn',...args]),log:(...args)=>calls.push(['log',...args])};
 f.document={getElementById:()=>banner,createElement:tag=>({tag}),createTextNode:text=>({text})};
 f.fetch=async url=>{calls.push(['fetch',url]);return f.response||{ok:true,json:async()=>({effective_service_state:{mode:'busy',customer_message:'Please allow extra time'}})};};
 f.sb={from:table=>{calls.push(['from',table]);const q={};for(const name of ['select','eq','lt','gt'])q[name]=(...args)=>{calls.push([name,...args]);return q;};q.then=resolve=>Promise.resolve(resolve(f.blackouts||{data:[],error:null}));return q;}};
 return f;
}
function actual(f){const m={exports:{}};vm.runInNewContext(moduleSource,{module:m,Date:FixedDate});return m.exports.create(f);}
function original(f){return vm.runInNewContext(evidence.regions.map(r=>r.before).join('\n')+'\n({'+evidence.regions.map(r=>r.name).join(',')+'})',f);}
const plain=x=>JSON.parse(JSON.stringify(x));
test('service extraction reconstructs the published bootstrap',()=>{require('./service-source.cjs').reconstructService();});
test('registration and factory creation have no DOM or network side effects',()=>{
 const blocked=()=>{throw Error('startup access');},window={},m={exports:{}};
 vm.runInNewContext(moduleSource,{window,module:m});m.exports.create({document:new Proxy({},{get:blocked}),console:{},fetch:blocked});assert.equal(typeof window.RTKCheckoutService.create,'function');
});
test('actual service notice preserves modes and renders customer messages as text nodes',()=>{
 for(const mode of ['normal','busy','very_busy','paused','unknown'])for(const customer_message of ['', '<b>Customer message</b>']){
  const f=fixture(),g=fixture();f.SERVICE_STATE=g.SERVICE_STATE={mode,customer_message};actual(f).renderServiceStatusNotice();original(g).renderServiceStatusNotice();
  assert.deepEqual(plain(f.serviceStatusNotice),plain(g.serviceStatusNotice));
  if(mode!=='normal'&&customer_message)assert.deepEqual(f.serviceStatusNotice.children[1],{text:customer_message});
 }
 const f=fixture(),api=actual(f);f.serviceStatusNotice=null;assert.doesNotThrow(api.renderServiceStatusNotice);
});
test('service fetch success, missing state and errors preserve state and requests',async()=>{
 for(const response of [{ok:true,json:async()=>({effective_service_state:{mode:'paused'}})},{ok:true,json:async()=>({})},{ok:false,json:async()=>({error:'offline'})},{ok:true,json:async()=>{throw Error('invalid JSON');}}]){
  const f=fixture(),g=fixture();f.response=g.response=response;await actual(f).loadServiceState();await original(g).loadServiceState();
  assert.deepEqual(plain(f.SERVICE_STATE),plain(g.SERVICE_STATE));assert.deepEqual(plain(f.calls),plain(g.calls));assert.deepEqual(plain(f.serviceStatusNotice),plain(g.serviceStatusNotice));
 }
});
test('blackout loading preserves query horizon, partitioning and failure retention',async()=>{
 const rows=[{kind:'closed',start_at:'2026-11-25T17:00:00Z',end_at:'2026-11-25T21:00:00Z',message:'Closed'},{kind:'fully_booked',start_at:'2026-11-26T17:00:00Z',end_at:'2026-11-26T19:00:00Z'},{kind:'other',start_at:'2026-11-26T17:00:00Z',end_at:'2026-11-26T19:00:00Z'}];
 for(const blackouts of [{data:rows,error:null},{data:null,error:null},{data:null,error:{message:'offline'}}]){
  const f=fixture(),g=fixture();f.blackouts=g.blackouts=blackouts;f.CLOSED_RANGES=g.CLOSED_RANGES=['previous'];await actual(f).loadBlackouts();await original(g).loadBlackouts();
  assert.deepEqual(plain(f.CLOSED_RANGES),plain(g.CLOSED_RANGES));assert.deepEqual(plain(f.FULLY_BOOKED),plain(g.FULLY_BOOKED));assert.deepEqual(plain(f.calls),plain(g.calls));
  assert.deepEqual(f.calls.slice(0,5),[['from','booking_blackouts'],['select','kind,start_at,end_at,message,active'],['eq','active',true],['lt','start_at','2027-01-23T12:00:00.000Z'],['gt','end_at','2026-11-24T12:00:00.000Z']]);
 }
});
test('closure banners and inclusive window boundaries preserve released behaviour',()=>{
 const f=fixture(),g=fixture(),a=actual(f),b=original(g);
 const win={start:new Date('2026-11-25T17:00:00Z'),end:new Date('2026-11-25T21:00:00Z'),message:'Closed tonight'};f.CLOSED_RANGES=g.CLOSED_RANGES=[win];
 for(const date of ['', '2026-11-25','2026-11-26']){a.showBlackoutBannerForDate(date);b.showBlackoutBannerForDate(date);assert.deepEqual(f.banner,g.banner);}
 for(const instant of ['2026-11-25T16:59:59Z','2026-11-25T17:00:00Z','2026-11-25T21:00:00Z','2026-11-25T21:00:01Z'])assert.equal(a.inAnyWindow(new Date(instant),[win]),b.inAnyWindow(new Date(instant),[win]));
 for(const kind of ['closed','fully_booked']){a.showCheckoutBanner(kind,'Message');b.showCheckoutBanner(kind,'Message');assert.deepEqual(f.banner,g.banner);}
});
