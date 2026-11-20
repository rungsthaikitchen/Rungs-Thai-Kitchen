import cloudflareAccessPlugin from '../../_vendor/cloudflare-access/index.mjs';

export function createHandler({validate=cloudflareAccessPlugin,fetch=globalThis.fetch}={}){
 return async context=>{
  const {env,request}=context;
  const json=(body,status)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  const allowed=(env.MASTER_WOK_REVIEW_ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  const invalid=[];
  if(!/^https:\\/\\/[a-z0-9-]+\\.cloudflareaccess\\.com$/.test(env.MASTER_WOK_REVIEW_ACCESS_DOMAIN||''))invalid.push('access_domain');
  if(!env.MASTER_WOK_REVIEW_ACCESS_AUD)invalid.push('access_audience');
  if(!allowed.length)invalid.push('staff_allowlist');
  if(!env.RTK_CUSTOMER_VERIFICATION_BACKEND_URL)invalid.push('customer_backend_url');
  if(!env.RTK_CUSTOMER_VERIFICATION_PROXY_SECRET)invalid.push('customer_proxy_secret');
  if((env.RTK_CUSTOMER_VERIFICATION_ADMIN_SECRET||'').length<32)invalid.push('customer_admin_secret');
  if(invalid.length)return json({error:'Customer history access is not configured',failed_checks:invalid},503);
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  // A browser-supplied identity header is insufficient. Validate its signed
  // Access assertion for this specific application before forwarding any PII.
  try{return await validate({domain:env.MASTER_WOK_REVIEW_ACCESS_DOMAIN,aud:env.MASTER_WOK_REVIEW_ACCESS_AUD})({
   ...context,next:async()=>{
    const claims=context.data?.cloudflareAccess?.JWT?.payload;
    if(!Array.isArray(claims?.aud)||!claims.aud.includes(env.MASTER_WOK_REVIEW_ACCESS_AUD))return json({error:'Forbidden'},403);
    const email=claims?.email;
    if(typeof email!=='string'||!allowed.includes(email.toLowerCase()))return json({error:'Forbidden'},403);
    if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin'},403);
    const host=new URL(request.url).hostname;
    if(!['rungsthaikitchen.co.uk','www.rungsthaikitchen.co.uk'].includes(host)&&!env.RTK_CUSTOMER_VERIFICATION_BACKEND_URL)
     return json({error:'Preview review backend is not configured'},503);
    let raw=await request.text();
    if(new TextEncoder().encode(raw).length>8192)return json({error:'Request too large'},413);
    const payload=JSON.parse(raw);
    if(payload?.action!=='classify')return json({error:'Invalid customer history lookup'},400);
    raw=JSON.stringify({...payload,staffActor:email});
    const response=await fetch(new URL('/admin-new-customer-history',env.RTK_CUSTOMER_VERIFICATION_BACKEND_URL),{
     method:'POST',headers:{'Content-Type':'application/json','x-rtk-proxy-secret':env.RTK_CUSTOMER_VERIFICATION_PROXY_SECRET,
      'x-rtk-review-admin-secret':env.RTK_CUSTOMER_VERIFICATION_ADMIN_SECRET, 'x-rtk-review-actor':email},
     body:raw,redirect:'manual',signal:AbortSignal.timeout(25000)});
    if(response.status>=300&&response.status<400)throw Error('REDIRECT_REFUSED');
    return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
   }
  });}catch(_){return json({error:'Customer history is unavailable. Please refresh.'},503);}
 };
}
export const onRequest=createHandler();
