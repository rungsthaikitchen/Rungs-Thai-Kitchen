// These Admin writers require Master Wok's authoritative transaction gate.
// Restore the ordinary controls during a deliberate legacy rollback.
export function createHandler({fetch:transport=globalThis.fetch}={}){
 return async({env})=>{
  let enabled=false;
  if(env.MASTER_WOK_PAYMENTS==='enabled')try{
   const base=env.RTK_ORDER_BACKEND_URL||'https://order-backend-production.up.railway.app';
   const response=await transport(new URL('/booking-mode',base),{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(5000)});
   if(response.status>=300&&response.status<400)throw Error('UPSTREAM_REDIRECT_REFUSED');
   enabled=response.ok&&(await response.json()).mode==='MASTER_WOK';
  }catch(_){}
  return Response.json({enabled},{headers:{'Cache-Control':'no-store'}});
 };
}
export const onRequestGet=createHandler();
