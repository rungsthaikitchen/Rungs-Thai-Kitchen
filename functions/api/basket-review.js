// Enquiries have a separate feature gate from booking authority.
export async function onRequestGet(context){
 return Response.json({enabled:context.env.MASTER_WOK_BASKET_REVIEWS==='enabled'},
  {headers:{'Cache-Control':'no-store'}});
}
export async function onRequestPost(context){
 if(context.env.MASTER_WOK_BASKET_REVIEWS!=='enabled')
  return Response.json({error:'Basket review is unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 const host=new URL(context.request.url).hostname;
 if(!['rungsthaikitchen.co.uk','www.rungsthaikitchen.co.uk'].includes(host)&&!context.env.RTK_ORDER_BACKEND_URL)
  return Response.json({error:'Preview ordering backend is not configured'},{status:503});
 const base=context.env.RTK_ORDER_BACKEND_URL||'https://order-backend-production.up.railway.app';
 if(!context.env.RTK_PROXY_SECRET)return Response.json({error:'Ordering service unavailable'},{status:503});
 try{
  const raw=await context.request.text();
  if(new TextEncoder().encode(raw).length>65536)return Response.json({error:'Request too large'},{status:413});
  const response=await fetch(new URL('/basket-review',base),{method:'POST',
   headers:{'Content-Type':'application/json','x-rtk-proxy-secret':context.env.RTK_PROXY_SECRET},
   body:raw,redirect:'manual',signal:AbortSignal.timeout(25000)});
  // Workers supports manual redirects, not redirect:'error'. Never forward
  // redirects to the browser or send the proxy secret to another destination.
  if(response.status>=300&&response.status<400)throw Error('UPSTREAM_REDIRECT_REFUSED');
  return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch(_){return Response.json({error:'Review could not be confirmed. Please retry the same request.'},{status:503});}
}
