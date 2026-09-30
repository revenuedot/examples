// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: Express app with POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import express from "express";
import { timingSafeEqual } from "node:crypto";
import { SIGNATURE_HEADER, verifySignature } from "./verify.js";

export function createApp({ secret, authorization, now = () => new Date() }) {
  const app = express();
  // At-least-once delivery: the same event.id can arrive twice. Use a unique index in production.
  const seen = new Set();

  // express.raw keeps the body as a Buffer: the signature covers the exact bytes, so parse JSON only after verifying.
  app.post("/webhooks/revenuedot", express.raw({ type: "application/json" }), (req, res) => {
    if (!verifySignature(req.body, req.get(SIGNATURE_HEADER), secret, { now: now() })) {
      return res.status(401).json({ error: "invalid signature" });
    }
    if (authorization) {
      const got = Buffer.from(req.get("authorization") ?? "");
      const want = Buffer.from(authorization);
      if (got.length !== want.length || !timingSafeEqual(got, want)) return res.status(401).json({ error: "invalid authorization" });
    }
    const { event } = JSON.parse(req.body.toString("utf8"));
    if (seen.has(event.id)) return res.json({ received: true, duplicate: true });
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
    res.json({ received: true });
  });
  return app;
}

// Run directly: `npm start` (reads .env).
if (import.meta.url === `file://${process.argv[1]}`) {
  const secret = process.env.REVENUEDOT_WEBHOOK_SECRET;
  if (!secret) throw new Error("Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)");
  const port = Number(process.env.PORT ?? 3000);
  createApp({ secret, authorization: process.env.REVENUEDOT_WEBHOOK_AUTHORIZATION || undefined })
    .listen(port, () => console.log(`Listening on http://localhost:${port}/webhooks/revenuedot`));
}
