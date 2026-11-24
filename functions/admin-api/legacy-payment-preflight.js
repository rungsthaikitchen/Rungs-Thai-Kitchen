import cloudflareAccessPlugin from '../../_vendor/cloudflare-access/index.mjs';

// Separate read-only LEGACY preflight. No write endpoint and no mode switch.
export function createHandler({validate=cloudflareAccessPlugin,fetch=globalThis.fetch}={}){
 return async context=>{
  const {env,request}=context;
  const json=(body,status)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  if(env.LEGACY_PAYMENT_PREFLIGHT!=='enabled')return json({error:'LEGACY preflight disabled'},503);
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const allowed=(env.MASTER_WOK_REVIEW_ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.MASTER_WOK_REVIEW_ACCESS_DOMAIN||'')||
   !env.MASTER_WOK_REVIEW_ACCESS_AUD||!allowed.length||!env.RTK_PROXY_SECRET||
   (env.MASTER_WOK_REVIEW_ADMIN_SECRET||'').length<32)
   return json({error:'Admin access is not configured'},503);
  try{return await validate({domain:env.MASTER_WOK_REVIEW_ACCESS_DOMAIN,aud:env.MASTER_WOK_REVIEW_ACCESS_AUD})({
   ...context,next:async()=>{
    const email=context.data?.cloudflareAccess?.JWT?.payload?.email;
    if(typeof email!=='string'||!allowed.includes(email.toLowerCase()))return json({error:'Forbidden'},403);
    if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin'},403);
    const host=new URL(request.url).hostname;
    if(!['rungsthaikitchen.co.uk','www.rungsthaikitchen.co.uk'].includes(host)&&!env.RTK_ORDER_BACKEND_URL)
     return json({error:'Preview backend is not configured'},503);
    const raw=await request.text();
    if(new TextEncoder().encode(raw).length>4096)return json({error:'Request too large'},413);
    let payload;
    try{payload=JSON.parse(raw)}catch(_){return json({error:'Invalid JSON'},400)}
    if(!payload||Array.isArray(payload)||typeof payload!=='object'||payload.action!=='read'||
       typeof payload.orderId!=='string')return json({error:'Read-only order lookup required'},400);
    const response=await fetch(new URL('/admin-legacy-payment-preflight',
      env.RTK_ORDER_BACKEND_URL||'https://order-backend-production.up.railway.app'),{
      method:'POST',headers:{'Content-Type':'application/json',
       'x-rtk-proxy-secret':env.RTK_PROXY_SECRET,
       'x-rtk-review-admin-secret':env.MASTER_WOK_REVIEW_ADMIN_SECRET,
       'x-rtk-review-actor':email},
      body:JSON.stringify({action:'read',orderId:payload.orderId}),
      redirect:'manual',signal:AbortSignal.timeout(25000)});
    if(response.status>=300&&response.status<400)throw Error('REDIRECT_REFUSED');
    return new Response(await response.text(),{status:response.status,
      headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
   }
  });}catch(_){return json({error:'LEGACY payment lookup unavailable'},503)}
 };
}
export const onRequest=createHandler();
