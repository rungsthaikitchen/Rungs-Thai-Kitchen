// Run against Cloudflare's actual local workerd runtime, not Node's fetch.
// npm install --prefix /tmp/mw-cloudflare-test miniflare@4.20260730.0
// MW_CLOUDFLARE_RUNTIME_PACKAGE=/tmp/mw-cloudflare-test/node_modules/miniflare node tests/booking-worker-runtime.cjs
const {Miniflare}=require(process.env.MW_CLOUDFLARE_RUNTIME_PACKAGE||'miniflare');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
let redirect=false,calls=[];
const server=http.createServer(async(req,res)=>{
 let body='';for await(const part of req)body+=part;
 calls.push({path:req.url,body,secret:req.headers['x-rtk-proxy-secret']});
 if(redirect){res.writeHead(302,{Location:'/must-not-follow'});res.end();return;}
 res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(req.url==='/booking-mode'?{mode:'LEGACY'}:{success:true}));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  for(const [name,method,endpoint] of [['booking-mode','onRequestGet','/booking-mode'],['booking','onRequestPost','/book-order'],['booking-availability','onRequestPost','/booking-availability']]){
   const source=fs.readFileSync(path.join(__dirname,'../functions/api/'+name+'.js'),'utf8');
   const mf=new Miniflare({modules:true,cf:false,compatibilityDate:'2026-07-30',
    bindings:{RTK_ORDER_BACKEND_URL:base,RTK_PROXY_SECRET:'fixture-secret-not-a-real-credential'},
    script:source+`\nexport default {fetch(request,env){return ${method}({request,env});}};`});
   try{
    const options=method==='onRequestGet'?{}:{method:'POST',body:'{"fixture":true}'};
    redirect=false;calls=[];
    const response=await mf.dispatchFetch('https://review.rtk.pages.dev/api/'+name,options);
    assert.equal(response.status,200);assert.equal(calls.length,1);assert.equal(calls[0].path,endpoint);
    if(options.method){assert.equal(calls[0].body,options.body);assert.equal(calls[0].secret,'fixture-secret-not-a-real-credential');}
    redirect=true;calls=[];
    const refused=await mf.dispatchFetch('https://review.rtk.pages.dev/api/'+name,options);
    assert.equal(refused.status,503);assert.equal(refused.headers.get('Location'),null);assert.equal(calls.length,1);
    console.log(name+': actual workerd upstream request and redirect rejection PASS');
   }finally{await mf.dispose();}
  }
  const repro=new Miniflare({modules:true,cf:false,compatibilityDate:'2026-07-30',
   script:`export default {fetch(){try{new Request('https://example.invalid',{redirect:'error'});return new Response('unexpected');}catch(e){return Response.json({name:e.name});}}}`});
  try{assert.equal((await(await repro.dispatchFetch('https://fixture.invalid')).json()).name,'TypeError');
   console.log('Original redirect:error runtime failure reproduced: PASS');}finally{await repro.dispose();}
 }finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
