export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "RTK Admin API is working"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}