const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../customer-checkout.js'),'utf8');
const start=source.indexOf("if (typeof deliveryNote !== 'undefined' && deliveryNote) {");
const end=source.indexOf('const discountRow',start);
const block=source.slice(start,end);
function render(quote,subtotal=29,orderType='delivery'){
 const deliveryNote={style:{},className:'',textContent:'',innerHTML:''};
 vm.runInNewContext(block,{deliveryNote,quote,orderType,getPreDiscountFoodSubtotal:()=>subtotal,DELIVERY_FREE_THRESHOLD:30,formatCurrency:n=>'£'+n.toFixed(2)});
 return deliveryNote;
}
test('verified radius with failed route pricing shows the fallback fee without rejecting the address',()=>{
 const n=render({eligible:true,usedFallback:true,straightLineMiles:0,fee:3});
 assert.equal(n.className,'');assert.equal(n.textContent,'Delivery £3.00 (standard charge; route pricing unavailable)');assert.equal(n.innerHTML,'');
});
test('missing address verification still displays the existing address warning',()=>{
 const n=render({eligible:true,usedFallback:true,straightLineMiles:null,fee:3});
 assert.equal(n.className,'delivery-error');assert.match(n.innerHTML,/could not confirm this delivery address/);
});
test('ineligible address is never described as an accepted fallback or free delivery',()=>{
 const n=render({eligible:false,usedFallback:true,straightLineMiles:4,fee:3},104.5);
 assert.equal(n.className,'delivery-error');assert.match(n.innerHTML,/could not confirm/);
});
test('free delivery remains available after radius verification despite route fallback',()=>{
 const n=render({eligible:true,usedFallback:true,straightLineMiles:1,fee:0},30);
 assert.equal(n.className,'');assert.match(n.textContent,/Free delivery/);
});
test('loading, successful route prices and collection keep their distinct messages',()=>{
 assert.equal(render({loading:true,usedFallback:true}).textContent,'Calculating delivery charge…');
 assert.equal(render({eligible:true,usedFallback:false,routeMiles:1.25,fee:2}).textContent,'Delivery £2.00 based on approx. route distance of 1.3 miles');
 assert.equal(render({},29,'collection').style.display,'none');
});
