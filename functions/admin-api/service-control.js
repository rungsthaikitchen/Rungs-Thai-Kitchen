const RAILWAY_SERVICE_CONTROL_URL =
  "https://order-backend-production.up.railway.app/admin-service-control";

export async function onRequestPost(context) {
  try {
    const payload = await context.request.json();

    const railwayResponse = await fetch(
      RAILWAY_SERVICE_CONTROL_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rtk-proxy-secret": context.env.RTK_PROXY_SECRET
        },
        body: JSON.stringify(payload)
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
      "[admin-api/service-control] proxy failed:",
      error
    );

    return new Response(
      JSON.stringify({
        error: "Admin service control proxy failed"
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