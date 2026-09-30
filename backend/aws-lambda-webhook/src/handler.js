// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: AWS Lambda handler (Function URL or HTTP API, payload v2) that verifies, dedupes and handles RevenueDot events.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { timingSafeEqual } from "node:crypto";
import { SIGNATURE_HEADER, verifySignature } from "./verify.js";

const GRANTING = new Set(["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "PRODUCT_CHANGE"]);
const json = (statusCode, body) => ({ statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export function createHandler({ secret, authorization, now = () => new Date() }) {
  // At-least-once delivery: the same event.id can arrive twice. This Set lives only as long as one warm
  // Lambda instance; use a unique index in production (for example a DynamoDB conditional put on event.id).
  const seen = new Set();

  return async (event) => {
    if (event.requestContext?.http?.method !== "POST") return json(405, { error: "method not allowed" });
    // Lambda hands over the body as a string, base64-encoded when it is not plain text. The signature covers
    // the exact bytes, so rebuild them and parse JSON only after verifying.
    const raw = Buffer.from(event.body ?? "", event.isBase64Encoded ? "base64" : "utf8");
    // Payload v2 lower-cases every header name.
    const headers = event.headers ?? {};
    if (!verifySignature(raw, headers[SIGNATURE_HEADER], secret, { now: now() })) return json(401, { error: "invalid signature" });
    if (authorization) {
      const got = Buffer.from(headers.authorization ?? "");
      const want = Buffer.from(authorization);
      if (got.length !== want.length || !timingSafeEqual(got, want)) return json(401, { error: "invalid authorization" });
    }
    const { event: rcEvent } = JSON.parse(raw.toString("utf8"));
    if (seen.has(rcEvent.id)) return json(200, { received: true, duplicate: true });
    seen.add(rcEvent.id);

    // Keep the handler fast: only HTTP 200 counts as delivered, and slow answers time out and are retried.
    if (GRANTING.has(rcEvent.type)) {
      console.log(`grant ${rcEvent.entitlement_ids?.join(",") ?? "-"} to ${rcEvent.app_user_id} until ${rcEvent.expiration_at_ms ?? "forever"}`);
    } else if (rcEvent.type === "EXPIRATION") {
      console.log(`access ended for ${rcEvent.app_user_id} (${rcEvent.expiration_reason})`);
    } else {
      console.log(`${rcEvent.type} for ${rcEvent.app_user_id}`);
    }
    return json(200, { received: true });
  };
}

// The Lambda entry point (handler setting: src/handler.handler). It reads the secret on the first request,
// so the tests can import this file without it.
let live;
export const handler = (event) => {
  if (!live) {
    const secret = process.env.REVENUEDOT_WEBHOOK_SECRET;
    if (!secret) throw new Error("Set REVENUEDOT_WEBHOOK_SECRET in the function's environment variables");
    live = createHandler({ secret, authorization: process.env.REVENUEDOT_WEBHOOK_AUTHORIZATION || undefined });
  }
  return live(event);
};
