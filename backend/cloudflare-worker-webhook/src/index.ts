// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: Cloudflare Worker that answers POST /webhooks/revenuedot, verifies, dedupes and handles RevenueDot events.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { SIGNATURE_HEADER, safeEqual, verifySignature } from "./verify";

export interface Env {
  REVENUEDOT_WEBHOOK_SECRET: string;
  REVENUEDOT_WEBHOOK_AUTHORIZATION?: string;
}

type WebhookEvent = {
  id: string;
  type: string;
  app_user_id: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  expiration_reason?: string;
};

// At-least-once delivery: the same event.id can arrive twice. This set lives only as long as one Worker isolate,
// and Cloudflare runs many; use a unique index in D1 (or a KV key per event.id) in production.
const seen = new Set<string>();

export async function handleRequest(request: Request, env: Env, now = new Date()): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname !== "/webhooks/revenuedot") return new Response("not found", { status: 404 });
  if (request.method !== "POST") return new Response("method not allowed", { status: 405, headers: { allow: "POST" } });

  // The signature covers the exact bytes, so read them before parsing JSON.
  const raw = new Uint8Array(await request.arrayBuffer());
  if (!(await verifySignature(raw, request.headers.get(SIGNATURE_HEADER), env.REVENUEDOT_WEBHOOK_SECRET, { now }))) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }
  const authorization = env.REVENUEDOT_WEBHOOK_AUTHORIZATION;
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
}

export default {
  fetch: (request, env) => handleRequest(request, env),
} satisfies ExportedHandler<Env>;
