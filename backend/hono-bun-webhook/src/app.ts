// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: Hono app with POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { Hono } from "hono";
import { SIGNATURE_HEADER, safeEqual, verifySignature } from "./verify";

type WebhookEvent = {
  id: string;
  type: string;
  app_user_id: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  expiration_reason?: string;
};

export function createApp({ secret, authorization, now = () => new Date() }: { secret: string; authorization?: string; now?: () => Date }) {
  const app = new Hono();
  // At-least-once delivery: the same event.id can arrive twice. Use a unique index in production.
  const seen = new Set<string>();

  app.post("/webhooks/revenuedot", async (c) => {
    // The signature covers the exact bytes, so read them before parsing JSON.
    const raw = new Uint8Array(await c.req.arrayBuffer());
    if (!(await verifySignature(raw, c.req.header(SIGNATURE_HEADER), secret, { now: now() }))) {
      return c.json({ error: "invalid signature" }, 401);
    }
    if (authorization && !safeEqual(c.req.header("authorization") ?? "", authorization)) {
      return c.json({ error: "invalid authorization" }, 401);
    }
    const { event } = JSON.parse(new TextDecoder().decode(raw)) as { event: WebhookEvent };
    if (seen.has(event.id)) return c.json({ received: true, duplicate: true });
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
    return c.json({ received: true });
  });
  return app;
}
