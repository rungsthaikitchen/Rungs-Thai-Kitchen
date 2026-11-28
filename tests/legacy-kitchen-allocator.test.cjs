const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create}=require('../customer-legacy-kitchen-allocator'),e=require('../LEGACY-KITCHEN-ALLOCATOR-EXTRACTION-2026-11-25.json');
const config={SLOT_MINUTES:15,KITCHEN_START_HOUR:16,KITCHEN_START_MINUTE:30,KITCHEN_STEP_MINUTES:5};
const actual=create(config),old=vm.runInNewContext(e.regions.map(r=>r.before).join('\n')+'\n({'+e.regions.map(r=>r.name).join(',')+'})',config);
const date=(h,m)=>new Date(2026,10,25,h,m,0,0),plain=x=>JSON.parse(JSON.stringify(x));
function snapshot(result,map){return {success:result.success,overCapacity:result.overCapacity,conflicts:plain(result.conflicts||[]),entries:[...map]};}
test('allocator extraction reconstructs released checkout bootstrap and registration has no side effects',()=>{require('./legacy-kitchen-allocator-source.cjs').reconstructLegacyKitchenAllocator();const blocked=new Proxy({},{get(){throw Error('startup effect');}}),window={};vm.runInNewContext(fs.readFileSync(require.resolve('../customer-legacy-kitchen-allocator'),'utf8'),{window,document:blocked,fetch:()=>{throw Error('network');}});create(config);assert.equal(typeof window.RTKLegacyKitchenAllocator.create,'function');});
test('actual date helpers preserve production boundary, complete slots and input date identity',()=>{
 for(const time of [date(16,30),date(16,35),date(17,0),date(17,14),date(17,15),date(20,55)]){const stamp=time.getTime();for(const name of ['getKitchenStartForDate','getLatestProductionSlotStart'])assert.equal(actual[name](time).toISOString(),old[name](time).toISOString());assert.equal(time.getTime(),stamp);}
 assert.equal(actual.getKitchenStartForDate(date(20,0)).getHours(),16);assert.equal(actual.getKitchenStartForDate(date(20,0)).getMinutes(),30);assert.equal(actual.getLatestProductionSlotStart(date(17,14)).getMinutes(),45);
});
test('actual allocator matches released empty/occupied maps and reserves only complete continuous runs',()=>{
 for(const ready of [date(16,30),date(16,35),date(16,40),date(17,5),date(20,0)])for(const load of [null,0,-1,1,2,3,10,'3',1.5])for(const occupied of [[],[[date(16,30).toISOString(),1]],[[new Date(ready.getTime()-10*60000).toISOString(),2]]]){
 const a=new Map(occupied),b=new Map(occupied),before=[...a],stamp=ready.getTime(),x=actual.allocateLoadBackwards(ready,load,a),y=old.allocateLoadBackwards(ready,load,b);assert.deepEqual(snapshot(x,a),snapshot(y,b));assert.equal(x.slotMap,a);assert.equal(ready.getTime(),stamp);if(!x.success)assert.deepEqual([...a],before);
 }
 const map=new Map([[date(16,35).toISOString(),1]]);const x=actual.allocateLoadBackwards(date(16,45),3,map);assert.equal(x.success,false);assert.equal(map.has(date(16,40).toISOString()),false);
});
test('forcing existing commitments preserves increments, conflict details and early-boundary truncation',()=>{
 for(const ready of [date(16,30),date(16,35),date(17,0),date(20,0)])for(const load of [0,1,3,10])for(const occupied of [[],[[new Date(ready.getTime()-5*60000).toISOString(),2]]]){const a=new Map(occupied),b=new Map(occupied),x=actual.forceAllocateExistingLoad(ready,load,a),y=old.forceAllocateExistingLoad(ready,load,b);assert.deepEqual(snapshot(x,a),snapshot(y,b));}
 const map=new Map([[date(16,30).toISOString(),2]]),result=actual.forceAllocateExistingLoad(date(16,35),4,map);assert.equal(result.overCapacity,true);assert.deepEqual(result.conflicts,[{time:date(16,30).toISOString(),existingLoad:2,newLoad:3}]);assert.equal(map.size,1);assert.equal(map.get(date(16,30).toISOString()),3);
});
test('released basket-fit probe calls extracted allocator on a copy and never reserves real capacity',()=>{
 const source=require('./checkout-capacity-probes-source.cjs').reconstructCapacityProbes(),start=source.indexOf('function canBasketFitInSlot('),end=source.indexOf('\r\n}',start)+3,fn=source.slice(start,end);
 for(const occupied of [false,true]){const kitchenSlotMap=new Map(occupied?[[date(16,55).toISOString(),1]]:[]),before=[...kitchenSlotMap],context={kitchenSlotMap,getBasketKitchenLoad:()=>3,allocateLoadBackwards:actual.allocateLoadBackwards};const fit=vm.runInNewContext(fn+'\ncanBasketFitInSlot',context);assert.equal(fit(date(17,0)),!occupied);assert.deepEqual([...kitchenSlotMap],before);}
});
