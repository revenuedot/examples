// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: verifies the HMAC signature on a RevenueDot webhook delivery (plain Node, no Nest imports).
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { createHmac, timingSafeEqual } from "node:crypto";

/** The header RevenueDot signs every delivery with. Its X-RevenueCat- prefix matches RevenueDot's other compatibility headers. */
export const SIGNATURE_HEADER = "x-revenuecat-webhook-signature";

/**
 * Checks `X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`.
 * `rawBody` must be the exact bytes received, never JSON.stringify of a parsed object.
 */
export function verifySignature(
  rawBody: Buffer | string,
  header: string | undefined,
  secret: string,
  { now = new Date(), toleranceSeconds = 300 }: { now?: Date; toleranceSeconds?: number } = {},
): boolean {
  const match = /(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)/.exec(header ?? "");
  if (!match) return false;
  const timestamp = Number(match[1]);
  // Refuse old deliveries so a captured request cannot be replayed.
  if (Math.abs(Math.floor(now.getTime() / 1000) - timestamp) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest();
  const received = Buffer.from(match[2], "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Constant-time string comparison for the optional Authorization header. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
