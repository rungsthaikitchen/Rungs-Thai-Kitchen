export async function onRequestPost(context){
 const host=new URL(context.request.url).hostname;
 if(!['rungsthaikitchen.co.uk','www.rungsthaikitchen.co.uk'].includes(host)&&!context.env.RTK_ORDER_BACKEND_URL)
  return Response.json({error:'Preview ordering backend is not configured'},{status:503});
 const base=context.env.RTK_ORDER_BACKEND_URL||'https://order-backend-production.up.railway.app';
 if(!context.env.RTK_PROXY_SECRET)return Response.json({error:'Ordering service unavailable'},{status:503});
 try{
  let body=await context.request.text();
  // Private rehearsal branch only. Bind browser UUID retries to the candidate's
  // fixture namespace; never rewrite production or another backend's orders.
  if(host==='feature-basket-review-stagin.rungsthaikitchen.pages.dev'&&
   base.replace(/\/$/,'')==='https://master-wok-booking-gateway-staging-master-wok-staging.up.railway.app'){
   let input;try{input=JSON.parse(body);}catch(_){return Response.json({error:'Invalid staging fixture'},{status:400});}
   if(!input||!/^\S+@example\.invalid$/.test(input.customer?.email||'')||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.key||''))
    return Response.json({error:'This private Preview accepts synthetic test orders only'},{status:403});
   body=JSON.stringify({...input,key:'release-nov6-delivery-'+input.key});
  }
  const response=await fetch(new URL('/book-order',base),{method:'POST',
   headers:{'Content-Type':'application/json','x-rtk-proxy-secret':context.env.RTK_PROXY_SECRET},
   body,redirect:'manual',signal:AbortSignal.timeout(25000)});
  // Workers supports manual redirects, not redirect:'error'. Never forward
  // redirects to the browser or send the proxy secret to another destination.
  if(response.status>=300&&response.status<400)throw Error('UPSTREAM_REDIRECT_REFUSED');
  return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch(_){return Response.json({error:'Ordering service unavailable; retry the same request'},{status:503});}
}
