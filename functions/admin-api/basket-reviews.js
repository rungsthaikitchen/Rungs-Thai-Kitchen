import cloudflareAccessPlugin from '@cloudflare/pages-plugin-cloudflare-access';

export function createHandler({validate=cloudflareAccessPlugin,fetch=globalThis.fetch}={}){
 return async context=>{
  const {env,request}=context;
  const json=(body,status)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  if(env.MASTER_WOK_BASKET_REVIEWS!=='enabled')return json({error:'Basket reviews are disabled'},503);
  const allowed=(env.MASTER_WOK_REVIEW_ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.MASTER_WOK_REVIEW_ACCESS_DOMAIN||'')||
   !env.MASTER_WOK_REVIEW_ACCESS_AUD||!allowed.length||!env.RTK_PROXY_SECRET||
   (env.MASTER_WOK_REVIEW_ADMIN_SECRET||'').length<32)
   return json({error:'Review access is not configured'},503);
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  // A browser-supplied identity header is insufficient. Validate its signed
  // Access assertion for this specific application before forwarding any PII.
  try{return await validate({domain:env.MASTER_WOK_REVIEW_ACCESS_DOMAIN,aud:env.MASTER_WOK_REVIEW_ACCESS_AUD})({
   ...context,next:async()=>{
    const email=context.data?.cloudflareAccess?.JWT?.payload?.email;
    if(typeof email!=='string'||!allowed.includes(email.toLowerCase()))return json({error:'Forbidden'},403);
    if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin'},403);
    const host=new URL(request.url).hostname;
    if(!['rungsthaikitchen.co.uk','www.rungsthaikitchen.co.uk'].includes(host)&&!env.RTK_ORDER_BACKEND_URL)
     return json({error:'Preview review backend is not configured'},503);
    const raw=await request.text();
    if(new TextEncoder().encode(raw).length>4096)return json({error:'Request too large'},413);
    const response=await fetch(new URL('/admin-basket-reviews',env.RTK_ORDER_BACKEND_URL||'https://order-backend-production.up.railway.app'),{
     method:'POST',headers:{'Content-Type':'application/json','x-rtk-proxy-secret':env.RTK_PROXY_SECRET,
      'x-rtk-review-admin-secret':env.MASTER_WOK_REVIEW_ADMIN_SECRET},
     body:raw,redirect:'manual',signal:AbortSignal.timeout(25000)});
    if(response.status>=300&&response.status<400)throw Error('REDIRECT_REFUSED');
    return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
   }
  });}catch(_){return json({error:'Basket reviews are unavailable. Please refresh.'},503);}
 };
}
export const onRequest=createHandler();
