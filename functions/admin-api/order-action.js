export async function onRequestPost(context){
 const host=new URL(context.request.url).hostname;
 if(!['rungsthaikitchen.co.uk','www.rungsthaikitchen.co.uk'].includes(host)&&!context.env.RTK_ORDER_BACKEND_URL)
  return Response.json({error:'Preview admin backend is not configured'},{status:503});
 const base=context.env.RTK_ORDER_BACKEND_URL||'https://order-backend-production.up.railway.app';
 if(!context.env.RTK_PROXY_SECRET)return Response.json({error:'Admin service unavailable'},{status:503});
 try{
  const response=await fetch(new URL('/admin-order-action',base),{method:'POST',
   headers:{'Content-Type':'application/json','x-rtk-proxy-secret':context.env.RTK_PROXY_SECRET},
   body:await context.request.text(),redirect:'manual',signal:AbortSignal.timeout(25000)});
  if(response.status>=300&&response.status<400)throw Error('UPSTREAM_REDIRECT_REFUSED');
  return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch(_){return Response.json({error:'Admin request could not be confirmed. Please refresh before retrying.'},{status:503});}
}
