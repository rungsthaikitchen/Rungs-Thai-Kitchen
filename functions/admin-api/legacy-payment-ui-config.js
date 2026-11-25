export function onRequestGet({ env, request }) {
  const { hostname } = new URL(request.url);
  const enabled = (hostname === 'rungsthaikitchen.co.uk' || hostname === 'www.rungsthaikitchen.co.uk') &&
    env.LEGACY_PAYMENT_PREFLIGHT === 'enabled' &&
    env.LEGACY_PAYMENT_RECORDING === 'enabled';

  return new Response(`window.RTK_LEGACY_PAYMENT_ADMIN_UI_ENABLED = ${enabled};`, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
