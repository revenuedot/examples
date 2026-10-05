// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: Express-style (req, res) handler that verifies, dedupes and handles RevenueDot events; no Firebase imports, so tests run without the SDK.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { timingSafeEqual } from "node:crypto";
import { SIGNATURE_HEADER, verifySignature } from "./verify.js";

const GRANTING = new Set(["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "PRODUCT_CHANGE"]);

export function createWebhookHandler({ secret, authorization, now = () => new Date() }) {
  // At-least-once delivery: the same event.id can arrive twice. This Set lives only as long as one function
  // instance; use a unique index in production (for example a Firestore document keyed by event.id, created with create()).
  const seen = new Set();

  return (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
    // Cloud Functions has already parsed req.body; req.rawBody keeps the exact bytes the signature covers.
    const raw = req.rawBody ?? Buffer.alloc(0);
    if (!verifySignature(raw, req.headers[SIGNATURE_HEADER], secret, { now: now() })) {
      return res.status(401).json({ error: "invalid signature" });
    }
    if (authorization) {
      const got = Buffer.from(req.headers.authorization ?? "");
      const want = Buffer.from(authorization);
      if (got.length !== want.length || !timingSafeEqual(got, want)) return res.status(401).json({ error: "invalid authorization" });
    }
    const { event } = JSON.parse(raw.toString("utf8"));
    if (seen.has(event.id)) return res.status(200).json({ received: true, duplicate: true });
    seen.add(event.id);

    // Keep the handler fast: only HTTP 200 counts as delivered, and slow answers time out and are retried.
    if (GRANTING.has(event.type)) {
      console.log(`grant ${event.entitlement_ids?.join(",") ?? "-"} to ${event.app_user_id} until ${event.expiration_at_ms ?? "forever"}`);
    } else if (event.type === "EXPIRATION") {
      console.log(`access ended for ${event.app_user_id} (${event.expiration_reason})`);
    } else {
      console.log(`${event.type} for ${event.app_user_id}`);
    }
    return res.status(200).json({ received: true });
  };
}
