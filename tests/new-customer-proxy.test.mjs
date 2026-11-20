import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const origin='https://rungsthaikitchen.co.uk';
const env={
 MASTER_WOK_REVIEW_ACCESS_DOMAIN:'https://rtk.cloudflareaccess.com',
 MASTER_WOK_REVIEW_ACCESS_AUD:'test-audience',
 MASTER_WOK_REVIEW_ADMIN_EMAILS:'staff@example.test',
 RTK_CUSTOMER_VERIFICATION_ADMIN_SECRET:'x'.repeat(40),
 RTK_CUSTOMER_VERIFICATION_PROXY_SECRET:'proxy-secret',
 RTK_CUSTOMER_VERIFICATION_BACKEND_URL:'https://staging.example.test'
};
async function loadHandler(file){
 const source=await readFile(new URL('../functions/admin-api/'+file,import.meta.url),'utf8');
 const isolated=source.replace(/^import cloudflareAccessPlugin from .*;\s*/,'const cloudflareAccessPlugin=()=>()=>{};\n');
 return (await import('data:text/javascript;base64,'+Buffer.from(isolated).toString('base64'))).createHandler;
}
const handlers={
 history:await loadHandler('new-customer-history.js'),
 contact:await loadHandler('new-customer-contact.js')
};
function setup(kind,{email='staff@example.test',originHeader=origin,validateReject=false,missingAudience=false,wrongAudience=false,backendStatus=200,backendRedirect=false}={}){
 const calls=[];
 const validate=()=>async context=>{
  if(validateReject)throw Error('Access assertion rejected');
  context.data.cloudflareAccess={JWT:{payload:{email,...(missingAudience?{}:{aud:[wrongAudience?'other-audience':env.MASTER_WOK_REVIEW_ACCESS_AUD]})}}};
  return context.next();
 };
 const fetch=async(url,options)=>{
  calls.push({url:String(url),options});
  return backendRedirect ? new Response(null,{status:302,headers:{Location:'https://other.example'}}) : Response.json({success:true},{status:backendStatus});
 };
 const request=new Request(origin+'/admin-api/new-customer-'+kind,{
  method:'POST',headers:{'Content-Type':'application/json',Origin:originHeader},
  body:JSON.stringify(kind==='history'?{action:'classify',orderIds:[]}:{action:'record',orderId:'00000000-0000-4000-8000-000000000001',status:'contacted'})
 });
 return {calls,context:{env,request,data:{}},handler:handlers[kind]({validate,fetch})};
}
for(const kind of ['history','contact']){
 test(kind+' rejects invalid Access assertion without backend call',async()=>{
  const s=setup(kind,{validateReject:true});
  assert.equal((await s.handler(s.context)).status,503);
  assert.equal(s.calls.length,0);
 });
 test(kind+' rejects signed token missing audience',async()=>{
  const s=setup(kind,{missingAudience:true});
  assert.equal((await s.handler(s.context)).status,403);
  assert.equal(s.calls.length,0);
 });
 test(kind+' rejects token for another Access application',async()=>{
  const s=setup(kind,{wrongAudience:true});
  assert.equal((await s.handler(s.context)).status,403);
  assert.equal(s.calls.length,0);
 });
 test(kind+' rejects unauthorized staff without backend call',async()=>{
  const s=setup(kind,{email:'outsider@example.test'});
  assert.equal((await s.handler(s.context)).status,403);
  assert.equal(s.calls.length,0);
 });
 test(kind+' rejects cross-origin request without backend call',async()=>{
  const s=setup(kind,{originHeader:'https://attacker.example'});
  assert.equal((await s.handler(s.context)).status,403);
  assert.equal(s.calls.length,0);
 });
 test(kind+' refuses backend redirects',async()=>{
  const s=setup(kind,{backendRedirect:true});
  assert.equal((await s.handler(s.context)).status,503);
  assert.equal(s.calls.length,1);
 });
 test(kind+' propagates backend unavailable status',async()=>{
  const s=setup(kind,{backendStatus:503});
  assert.equal((await s.handler(s.context)).status,503);
 });
 test(kind+' forwards only verified staff identity and required backend secrets',async()=>{
  const s=setup(kind);
  assert.equal((await s.handler(s.context)).status,200);
  assert.equal(s.calls.length,1);
  assert.equal(s.calls[0].options.headers['x-rtk-review-actor'],'staff@example.test');
  assert.equal(s.calls[0].options.headers['x-rtk-proxy-secret'],'proxy-secret');
  assert.equal(s.calls[0].options.headers['x-rtk-review-admin-secret'],env.RTK_CUSTOMER_VERIFICATION_ADMIN_SECRET);
  assert.equal(new URL(s.calls[0].url).origin,'https://staging.example.test');
 });
}
