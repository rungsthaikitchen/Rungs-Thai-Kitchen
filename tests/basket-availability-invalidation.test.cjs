const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../customer-checkout.js'),'utf8');
test('changing a quantity invalidates hints and the selected time; unchanged rerenders do not',()=>{
 let handler,cancelled=0,cleared=0,selected='18:30',dialogClosed=0;
 const context={window:{basket:[{itemId:'salt-chickenchips',qty:2,mods:[],spice:1}],RTKBookingClient:{cancelAvailability(){cancelled++;}},addEventListener(_name,fn){handler=fn;}},document:{getElementById:()=>({value:'',close(){dialogClosed++;}}),querySelector:()=>({value:'collection'})},clearPreferredTimeSelect(){cleared++;selected='';},checkoutModal:{style:{display:'none'}},preferredDateInput:{value:'2026-11-13'}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('let masterWokTimeHints=null;'),source.indexOf('function showUnavailableBasketDialog')),context);
 handler();assert.equal(cancelled,0);context.window.basket[0].qty=4;handler();assert.equal(cancelled,1);assert.equal(cleared,1);assert.equal(selected,'');assert.equal(dialogClosed,1);assert.equal(vm.runInContext('preferredTimeGeneration',context),1);handler();assert.equal(cancelled,1);
});
