export async function onRequestGet(context){
 const host=new URL(context.request.url).hostname;
 if(!['rungsthaikitchen.co.uk','www.rungsthaikitchen.co.uk'].includes(host)&&!context.env.RTK_ORDER_BACKEND_URL)
  return Response.json({error:'Preview ordering backend is not configured'},{status:503});
 const base=context.env.RTK_ORDER_BACKEND_URL||'https://order-backend-production.up.railway.app';
 try{
  const response=await fetch(new URL('/booking-mode',base),{redirect:'manual',signal:AbortSignal.timeout(15000)});
  // Workers supports manual redirects, not redirect:'error'. Never forward
  // redirects to the browser or send the proxy secret to another destination.
  if(response.status>=300&&response.status<400)throw Error('UPSTREAM_REDIRECT_REFUSED');
  return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch(_){return Response.json({error:'Ordering availability could not be checked'},{status:503});}
}
