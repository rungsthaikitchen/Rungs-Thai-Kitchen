const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('customer classic scripts load once in the original dependency order',()=>{
 const menu=html.indexOf('<script src="/customer-menu-basket.js?'),checkout=html.indexOf('<script src="/customer-checkout.js?');
 assert.ok(html.indexOf('window.sb =')<menu&&menu<checkout);
 for(const file of ['customer-menu-basket.js','customer-checkout.js']){
  assert.equal((html.match(new RegExp('<script src="/'+file.replaceAll('.','\\.')+'\\?','g'))||[]).length,1);
  const tag=html.match(new RegExp('<script[^>]+src="/'+file.replaceAll('.','\\.')+'[^>]+>'))[0];assert.doesNotMatch(tag,/\b(?:async|defer|type)=?/);
  assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}));
 }
});
