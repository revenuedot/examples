// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: POST /api/webhooks/revenuedot, the Next.js route handler that receives RevenueDot webhooks.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { SIGNATURE_HEADER, authorizationMatches, firstDelivery, verifySignature, type WebhookPayload } from "@/lib/revenuedot-webhook";

// node:crypto is needed for the HMAC check, so this route runs on the Node.js runtime.
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.REVENUEDOT_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "REVENUEDOT_WEBHOOK_SECRET is not set" }, { status: 500 });

  // Read the raw text first: the signature covers these exact bytes, not a re-serialised object.
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get(SIGNATURE_HEADER), secret)) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }
  if (!authorizationMatches(request.headers.get("authorization"), process.env.REVENUEDOT_WEBHOOK_AUTHORIZATION)) {
    return Response.json({ error: "invalid authorization" }, { status: 401 });
  }

  const { event } = JSON.parse(rawBody) as WebhookPayload;
  // Only HTTP 200 counts as delivered; anything else is retried after 5, 10, 20, 40 and 80 minutes.
  if (!firstDelivery(event.id)) return Response.json({ received: true, duplicate: true });

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "NON_RENEWING_PURCHASE":
    case "PRODUCT_CHANGE":
      // Grant access in your own database. Entitlements are listed in event.entitlement_ids.
      console.log(`grant ${event.entitlement_ids?.join(",") ?? "-"} to ${event.app_user_id} until ${event.expiration_at_ms ?? "forever"}`);
      break;
    case "EXPIRATION":
      console.log(`access ended for ${event.app_user_id} (${String(event.expiration_reason)})`);
      break;
    case "CANCELLATION":
      // Auto-renew was turned off or the purchase was refunded; access runs until expiration_at_ms unless refunded.
      console.log(`cancellation for ${event.app_user_id} (${String(event.cancel_reason)})`);
      break;
    case "TRANSFER":
      console.log(`purchases moved from ${String(event.transferred_from)} to ${String(event.transferred_to)}`);
      break;
    default:
      console.log(`${event.type} for ${event.app_user_id}`);
  }
  // For the authoritative state, fetch GET /v1/subscribers/{app_user_id} with a secret key instead of
  // rebuilding it from events: https://revenuedot.app/docs/api/sdk-endpoints
  return Response.json({ received: true });
}
