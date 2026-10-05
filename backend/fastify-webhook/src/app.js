// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: Fastify app with POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import Fastify from "fastify";
import { timingSafeEqual } from "node:crypto";
import { SIGNATURE_HEADER, verifySignature } from "./verify.js";

export function buildApp({ secret, authorization, now = () => new Date(), logger = false }) {
  const app = Fastify({ logger });
  // At-least-once delivery: the same event.id can arrive twice. Use a unique index in production.
  const seen = new Set();

  // Keep application/json bodies as a Buffer: the signature covers the exact bytes, so parse JSON only after verifying.
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => done(null, body));

  app.post("/webhooks/revenuedot", async (req, reply) => {
    if (!Buffer.isBuffer(req.body) || !verifySignature(req.body, req.headers[SIGNATURE_HEADER], secret, { now: now() })) {
      return reply.code(401).send({ error: "invalid signature" });
    }
    if (authorization) {
      const got = Buffer.from(req.headers.authorization ?? "");
      const want = Buffer.from(authorization);
      if (got.length !== want.length || !timingSafeEqual(got, want)) return reply.code(401).send({ error: "invalid authorization" });
    }
    const { event } = JSON.parse(req.body.toString("utf8"));
    if (seen.has(event.id)) return { received: true, duplicate: true };
    seen.add(event.id);

    // Keep the handler fast: only HTTP 200 counts as delivered, and slow answers time out and are retried.
    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION":
      case "NON_RENEWING_PURCHASE":
      case "PRODUCT_CHANGE":
        req.log.info(`grant ${event.entitlement_ids?.join(",") ?? "-"} to ${event.app_user_id} until ${event.expiration_at_ms ?? "forever"}`);
        break;
      case "EXPIRATION":
        req.log.info(`access ended for ${event.app_user_id} (${event.expiration_reason})`);
        break;
      default:
        req.log.info(`${event.type} for ${event.app_user_id}`);
    }
    return { received: true };
  });
  return app;
}
