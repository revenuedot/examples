// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: verifies the HMAC signature on a RevenueDot webhook delivery with Web Crypto.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

/** The header RevenueDot signs every delivery with. Its X-RevenueCat- prefix matches RevenueDot's other compatibility headers. */
export const SIGNATURE_HEADER = "x-revenuecat-webhook-signature";

const encoder = new TextEncoder();

/**
 * Checks `X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`.
 * `rawBody` must be the exact bytes received, never JSON.stringify of a parsed object.
 */
export async function verifySignature(
  rawBody: string | Uint8Array,
  header: string | null | undefined,
  secret: string,
  { now = new Date(), toleranceSeconds = 300 }: { now?: Date; toleranceSeconds?: number } = {},
): Promise<boolean> {
  const match = /(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)/.exec(header ?? "");
  if (!match) return false;
  // Refuse old deliveries so a captured request cannot be replayed.
  if (Math.abs(Math.floor(now.getTime() / 1000) - Number(match[1])) > toleranceSeconds) return false;
  const body = typeof rawBody === "string" ? encoder.encode(rawBody) : rawBody;
  const prefix = encoder.encode(`${match[1]}.`);
  const signed = new Uint8Array(prefix.length + body.length);
  signed.set(prefix);
  signed.set(body, prefix.length);
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const received = new Uint8Array(match[2].match(/../g)!.map((byte) => parseInt(byte, 16)));
  // subtle.verify compares in constant time, unlike comparing hex strings with ===.
  return crypto.subtle.verify("HMAC", key, received, signed);
}

/** Constant-time string comparison for the optional Authorization header. */
export function safeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
