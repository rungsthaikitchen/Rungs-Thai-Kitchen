const RAILWAY_ADMIN_ORDER_ACTION_URL =
  "https://order-backend-production.up.railway.app/admin-order-action";

export async function onRequestPost(context) {
  try {
    const payload = await context.request.json();

    const railwayResponse = await fetch(
      RAILWAY_ADMIN_ORDER_ACTION_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
      "[admin-api/order-action] proxy failed:",
      error
    );

    return new Response(
      JSON.stringify({
        error: "Admin order action proxy failed"
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