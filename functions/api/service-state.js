const RAILWAY_SERVICE_CONTROL_URL =
  "https://order-backend-production.up.railway.app/admin-service-control";

export async function onRequestGet(context) {
  try {
    const railwayResponse = await fetch(
      RAILWAY_SERVICE_CONTROL_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rtk-proxy-secret": context.env.RTK_PROXY_SECRET
        },
        body: JSON.stringify({
          action: "get_service_state"
        })
      }
    );

    const body = await railwayResponse.text();

    return new Response(body, {
      status: railwayResponse.status,
      headers: {
        "Content-Type":
          railwayResponse.headers.get("Content-Type") ||
          "application/json"
      }
    });

  } catch (error) {
    console.error(
      "[api/service-state] proxy failed:",
      error
    );

    return new Response(
      JSON.stringify({
        error: "Service state proxy failed"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}