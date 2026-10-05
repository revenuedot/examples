// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: request handler for POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { SIGNATURE_HEADER, safeEqual, verifySignature } from "./verify.ts";

type WebhookEvent = {
  id: string;
  type: string;
  app_user_id: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  expiration_reason?: string;
};

export function createHandler({ secret, authorization, now = () => new Date() }: { secret: string; authorization?: string; now?: () => Date }) {
  // At-least-once delivery: the same event.id can arrive twice. Use a unique index in production.
  const seen = new Set<string>();

  return async (request: Request): Promise<Response> => {
    if (new URL(request.url).pathname !== "/webhooks/revenuedot") return new Response("not found", { status: 404 });
    if (request.method !== "POST") return new Response("method not allowed", { status: 405, headers: { allow: "POST" } });

    // The signature covers the exact bytes, so read them before parsing JSON.
    const raw = new Uint8Array(await request.arrayBuffer());
    if (!(await verifySignature(raw, request.headers.get(SIGNATURE_HEADER), secret, { now: now() }))) {
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }
    if (authorization && !safeEqual(request.headers.get("authorization") ?? "", authorization)) {
      return Response.json({ error: "invalid authorization" }, { status: 401 });
    }
    const { event } = JSON.parse(new TextDecoder().decode(raw)) as { event: WebhookEvent };
    if (seen.has(event.id)) return Response.json({ received: true, duplicate: true });
    seen.add(event.id);

    // Keep the handler fast: only HTTP 200 counts as delivered, and slow answers time out and are retried.
    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION":
      case "NON_RENEWING_PURCHASE":
      case "PRODUCT_CHANGE":
        console.log(`grant ${event.entitlement_ids?.join(",") ?? "-"} to ${event.app_user_id} until ${event.expiration_at_ms ?? "forever"}`);
        break;
      case "EXPIRATION":
        console.log(`access ended for ${event.app_user_id} (${event.expiration_reason})`);
        break;
      default:
        console.log(`${event.type} for ${event.app_user_id}`);
    }
    return Response.json({ received: true });
  };
}
