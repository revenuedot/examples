// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: verifies the HMAC signature on a RevenueDot webhook and parses the event.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { createHmac, timingSafeEqual } from "node:crypto";

/** The header RevenueDot signs every delivery with. Its X-RevenueCat- prefix matches RevenueDot's other compatibility headers. */
export const SIGNATURE_HEADER = "x-revenuecat-webhook-signature";

/** Deliveries older than this are refused, so a captured request cannot be replayed later. */
export const DEFAULT_TOLERANCE_SECONDS = 300;

/** The fields most handlers use. The full list is at https://revenuedot.app/docs/api/webhook-events */
export interface RevenueDotEvent {
  id: string;
  type: string;
  app_user_id: string;
  original_app_user_id: string;
  aliases: string[];
  product_id: string;
  entitlement_ids: string[] | null;
  environment: "SANDBOX" | "PRODUCTION";
  store: string;
  period_type: string;
  purchased_at_ms: number;
  expiration_at_ms: number | null;
  event_timestamp_ms: number;
  transaction_id: string | null;
  original_transaction_id: string | null;
  price: number | null;
  currency: string | null;
  [field: string]: unknown;
}

export interface WebhookPayload {
  api_version: string;
  event: RevenueDotEvent;
}

/**
 * Checks `X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex>`.
 * The signature is HMAC-SHA256(secret, `${t}.${rawBody}`), so it must be computed over the exact bytes received:
 * parse the JSON only after this returns true.
 */
export function verifySignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  opts: { now?: Date; toleranceSeconds?: number } = {},
): boolean {
  const match = /(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)/.exec(header ?? "");
  if (!match) return false;
  const timestamp = Number(match[1]);
  const nowSeconds = Math.floor((opts.now ?? new Date()).getTime() / 1000);
  if (Math.abs(nowSeconds - timestamp) > (opts.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS)) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  const received = Buffer.from(match[2]!, "hex");
  // Constant-time comparison, so the check does not leak how many bytes matched.
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Optional second check: the Authorization header value you configured on the webhook. */
export function authorizationMatches(header: string | null, expected: string | undefined): boolean {
  if (!expected) return true;
  if (!header || header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

/**
 * Deliveries are at-least-once: a retry after a timeout can bring the same event twice.
 * This in-memory set is enough for the example; in production store event.id with a unique index.
 */
const seen = new Set<string>();
export function firstDelivery(eventId: string): boolean {
  if (seen.has(eventId)) return false;
  seen.add(eventId);
  return true;
}
