export function onRequestGet({env}){return Response.json({enabled:env.MASTER_WOK_PAYMENTS==='enabled'},{headers:{'Cache-Control':'no-store'}});}
