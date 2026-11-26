export function onRequestGet({env,request}){
 const host=new URL(request.url).hostname;
 const enabled=env.LEGACY_PAYMENT_RECORDING==='enabled'&&env.LEGACY_PAYMENT_PREFLIGHT==='enabled'&&
  (['rungsthaikitchen.co.uk','www.rungsthaikitchen.co.uk'].includes(host)||!!env.RTK_ORDER_BACKEND_URL);
 return Response.json({enabled},{headers:{'Cache-Control':'no-store'}});
}
