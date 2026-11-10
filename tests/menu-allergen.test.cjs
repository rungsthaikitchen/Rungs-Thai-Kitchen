const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
test('Thai Sausage menu renders the production peanut warning in badges and icons',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const registry=html.slice(html.indexOf('  const ALLERGENS = {'),html.indexOf('// Paid EXTRAS'));
 const context={};vm.createContext(context);vm.runInContext(registry,context);
 const row=html.match(/\{ id: 'thai-sausage',[^\n]+/)[0].trim().replace(/,$/,'');
 const sausage=vm.runInContext('('+row+')',context);
 const badges=context.renderAllergenBadges(sausage.allergens);
 const compact=context.renderAllergenIconsCompact(sausage.allergens);
 for(const result of [badges,compact]){
  assert.match(result,/aria-label="Peanuts"/);
  assert.ok(result.includes('🥜'));
 }
});
